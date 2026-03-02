/**
 * Main entry point - Telegram Bot with Claude Code integration
 */

import { Bot, InlineKeyboard } from 'grammy';
import { config, validateConfig } from './config.js';
import { geminiAgent } from './agents/gemini.js';
import { sessionManager } from './services/session.js';
import {
  executeAndFormatCommand,
  executeAndFormatClaude,
} from './services/terminal.js';
import {
  codeBlock,
  escapeMarkdownV2,
  formatError,
  formatInfo,
  formatSuccess,
  formatWarning,
} from './utils/formatter.js';
import { logger } from './utils/logger.js';

// Initialize the bot
const bot = new Bot(config.telegramToken);

// Inline keyboard button callbacks
const CALLBACK_ACTIONS = {
  CONFIRM_CLAUDE: 'confirm_claude',
  CANCEL_CLAUDE: 'cancel_claude',
  EDIT_PROMPT: 'edit_prompt',
};

/**
 * Middleware: Admin whitelist
 */
bot.use(async (ctx, next) => {
  // Skip admin check for callback queries (handled separately)
  if (ctx.callbackQuery) {
    return next();
  }

  // Check if user is authorized
  const userId = ctx.from?.id;
  if (!userId) {
    logger.warn('Received message without user ID');
    return;
  }

  if (userId !== config.adminId) {
    logger.warn(`Unauthorized access attempt from user ID: ${userId}`);
    await ctx.reply(
      '⛔ Unauthorized Access\n\nYou are not authorized to use this bot.'
    );
    return;
  }

  // Authorized - proceed
  await next();
});

/**
 * Handle text messages
 */
bot.on('message:text', async (ctx) => {
  const chatId = ctx.chat.id;
  const userMessage = ctx.message.text;

  logger.info(`[${chatId}] User message: ${userMessage}`);

  // Check if there's a pending action
  const pendingAction = sessionManager.getPendingClaudeAction(chatId);
  if (pendingAction) {
    // User sent a message while having a pending action
    // This could be an edited prompt or cancellation
    await ctx.reply(
      formatWarning('You have a pending action\\nUse the buttons to Confirm or Cancel')
    );
    return;
  }

  // Check if there's an active process
  if (sessionManager.hasActiveProcess(chatId)) {
    await ctx.reply(formatInfo('A command is already running\\. Please wait\\.'));
    return;
  }

  // Send "Processing..." message
  const processingMsg = await ctx.reply(formatInfo('⏳ Analyzing your request...'));

  try {
    // Analyze the message using Gemini
    const { toolCall, reasoning } = await geminiAgent.analyzeUserMessage(userMessage);

    if (!toolCall) {
      // No tool selected - return conversational response
      await ctx.api.editMessageText(
        chatId,
        processingMsg.message_id,
        reasoning,
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    // Execute the appropriate tool
    switch (toolCall.name) {
      case 'execute_shell': {
        const command = toolCall.args.command;
        if (!command) {
          await ctx.api.editMessageText(
            chatId,
            processingMsg.message_id,
            formatError('Missing command parameter'),
            { parse_mode: 'MarkdownV2' }
          );
          return;
        }

        logger.info(`[${chatId}] Executing shell: ${command}`);

        // Update status
        sessionManager.setCurrentProcess(chatId, 'shell');
        await ctx.api.editMessageText(
          chatId,
          processingMsg.message_id,
          formatInfo(`🔧 Executing: \`${escapeMarkdownV2(command)}\``),
          { parse_mode: 'MarkdownV2' }
        );

        // Execute command
        const result = await executeAndFormatCommand(command);

        // Clear process
        sessionManager.clearCurrentProcess(chatId);

        // Send result
        await ctx.api.editMessageText(
          chatId,
          processingMsg.message_id,
          result,
          { parse_mode: 'MarkdownV2' }
        );
        break;
      }

      case 'propose_claude_action': {
        const optimizedPrompt = toolCall.args.optimized_prompt;
        if (!optimizedPrompt) {
          await ctx.api.editMessageText(
            chatId,
            processingMsg.message_id,
            formatError('Missing prompt parameter'),
            { parse_mode: 'MarkdownV2' }
          );
          return;
        }

        logger.info(`[${chatId}] Claude action proposed: ${optimizedPrompt}`);

        // Store pending action
        sessionManager.setPendingClaudeAction(chatId, optimizedPrompt);

        // Create inline keyboard
        const keyboard = new InlineKeyboard()
          .text('✅ Confirm & Run', CALLBACK_ACTIONS.CONFIRM_CLAUDE)
          .text('❌ Cancel', CALLBACK_ACTIONS.CANCEL_CLAUDE)
          .row()
          .text('📝 Edit Prompt', CALLBACK_ACTIONS.EDIT_PROMPT);

        // Send proposal message
        await ctx.api.editMessageText(
          chatId,
          processingMsg.message_id,
          `🛠 *Proposed Claude Action:\n\n${codeBlock('text', escapeMarkdownV2(optimizedPrompt))}\n\n*Choose an action:*`,
          {
            parse_mode: 'MarkdownV2',
            reply_markup: keyboard,
          }
        );
        break;
      }

      default:
        await ctx.api.editMessageText(
          chatId,
          processingMsg.message_id,
          formatError('Unknown tool selected'),
          { parse_mode: 'MarkdownV2' }
        );
    }
  } catch (error) {
    logger.error(`[${chatId}] Error processing message:`, error);
    sessionManager.clearCurrentProcess(chatId);
    await ctx.api.editMessageText(
      chatId,
      processingMsg.message_id,
      formatError(error instanceof Error ? error.message : String(error)),
      { parse_mode: 'MarkdownV2' }
    );
  }
});

/**
 * Handle callback queries (button presses)
 */
bot.on('callback_query:data', async (ctx) => {
  const chatId = ctx.callbackQuery.message?.chat.id;
  const userId = ctx.callbackQuery.from.id;
  const action = ctx.callbackQuery.data;
  const messageId = ctx.callbackQuery.message?.message_id;

  // Verify user is authorized
  if (userId !== config.adminId) {
    await ctx.answerCallbackQuery({
      text: '⛔ Unauthorized',
      show_alert: true,
    });
    return;
  }

  if (!chatId || !messageId) {
    logger.warn('Callback query without chat ID or message ID');
    await ctx.answerCallbackQuery({ text: 'Error: No chat ID' });
    return;
  }

  logger.info(`[${chatId}] Callback action: ${action}`);

  try {
    switch (action) {
      case CALLBACK_ACTIONS.CONFIRM_CLAUDE: {
        const pendingAction = sessionManager.getPendingClaudeAction(chatId);
        if (!pendingAction) {
          await ctx.api.editMessageText(
            chatId,
            messageId,
            formatError('No pending action found'),
            { parse_mode: 'MarkdownV2' }
          );
          await ctx.answerCallbackQuery();
          return;
        }

        await ctx.api.editMessageText(
          chatId,
          messageId,
          formatInfo('🚀 Executing Claude Code\\. This may take a while\\.\\.\\.'),
          { parse_mode: 'MarkdownV2' }
        );
        await ctx.answerCallbackQuery();

        // Set current process
        sessionManager.setCurrentProcess(chatId, 'claude');
        sessionManager.clearPendingClaudeAction(chatId);

        // Execute Claude
        const result = await executeAndFormatClaude(pendingAction.optimizedPrompt);

        // Clear process
        sessionManager.clearCurrentProcess(chatId);

        // Send result
        await ctx.api.sendMessage(chatId, result, { parse_mode: 'MarkdownV2' });
        break;
      }

      case CALLBACK_ACTIONS.CANCEL_CLAUDE: {
        sessionManager.clearPendingClaudeAction(chatId);
        await ctx.api.editMessageText(
          chatId,
          messageId,
          formatSuccess('Action cancelled'),
          { parse_mode: 'MarkdownV2' }
        );
        await ctx.answerCallbackQuery();
        break;
      }

      case CALLBACK_ACTIONS.EDIT_PROMPT: {
        const pendingAction = sessionManager.getPendingClaudeAction(chatId);
        if (!pendingAction) {
          await ctx.api.editMessageText(
            chatId,
            messageId,
            formatError('No pending action found'),
            { parse_mode: 'MarkdownV2' }
          );
          await ctx.answerCallbackQuery();
          return;
        }

        await ctx.api.editMessageText(
          chatId,
          messageId,
          formatInfo('📝 Send your edited prompt as a message\\.'),
          { parse_mode: 'MarkdownV2' }
        );
        await ctx.answerCallbackQuery();

        // Note: In a full implementation, you'd handle the next message
        // as an edited prompt and update the pending action
        // For now, we just clear the pending action
        sessionManager.clearPendingClaudeAction(chatId);
        break;
      }

      default:
        await ctx.answerCallbackQuery({ text: 'Unknown action' });
    }
  } catch (error) {
    logger.error(`[${chatId}] Error handling callback:`, error);
    await ctx.answerCallbackQuery({
      text: 'Error processing action',
      show_alert: true,
    });
  }
});

/**
 * Handle errors
 */
bot.catch((err) => {
  logger.error('Bot error:', err);
  const ctx = err.ctx;
  ctx.reply(formatError('An unexpected error occurred\\. Please try again\\.'), {
    parse_mode: 'MarkdownV2',
  });
});

/**
 * Start the bot
 */
async function startBot() {
  logger.info('Starting Telegram Terminal & Claude Agent...');

  try {
    // Validate configuration first (including working directory)
    await validateConfig();

    // Initialize the bot
    await bot.init();
    logger.info(`✓ Bot started: @${bot.botInfo?.username}`);
    logger.info(`✓ Admin ID: ${config.adminId}`);

    // Start polling
    await bot.start();

    // Log session count periodically
    setInterval(() => {
      const count = sessionManager.getSessionCount();
      if (count > 0) {
        logger.debug(`Active sessions: ${count}`);
      }
    }, 60000); // Every minute
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  bot.stop();
  process.exit(0);
});

// Start the bot
startBot();
