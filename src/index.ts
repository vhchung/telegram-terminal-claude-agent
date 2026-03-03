/**
 * Main entry point - Telegram Bot with Claude Code integration
 */

import 'dotenv/config';
import { Bot, InlineKeyboard } from 'grammy';
import { config, validateConfig } from './config.js';
import { createProvider } from './agents/factory.js';
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

// Initialize the LLM provider based on configuration
const llmProvider = createProvider(
  config.provider,
  config.provider === 'gemini' ? config.geminiApiKey : config.groqApiKey,
  config.provider === 'gemini' ? config.geminiModel : config.groqModel
);

// Initialize the bot
const bot = new Bot(config.telegramToken);

// Inline keyboard button callbacks
const CALLBACK_ACTIONS = {
  CONFIRM_CLAUDE: 'confirm_claude',
  CANCEL_CLAUDE: 'cancel_claude',
  EDIT_PROMPT: 'edit_prompt',
  // Terminal session answer options
  ANSWER_PREFIX: 'answer_',
};

/**
 * Middleware: Admin whitelist
 */

/**
 * Execute Claude in terminal session mode with conversation history
 * Handles parsing AskUserQuestion tool calls and presenting options
 */
async function executeClaudeInTerminalMode(
  prompt: string,
  chatId: number,
  ctx: any
): Promise<{ response: string; needsAnswer: boolean }> {
  try {
    // Execute Claude with the prompt - get plain text for parsing
    const { plainText: result } = await executeAndFormatClaude(prompt);

    // Parse the output for AskUserQuestion tool calls
    // Claude's output will contain the tool call in a specific format
    const askUserMatch = result.match(/<ask_user_question>([\s\S]*?)<\/ask_user_question>/);

    if (askUserMatch) {
      // Extract the question and options
      const questionData = askUserMatch[1];
      const questionMatch = questionData.match(/<question>([\s\S]*?)<\/question>/);
      const optionsMatch = questionData.match(/<options>([\s\S]*?)<\/options>/);

      if (questionMatch) {
        const question = questionMatch[1].trim();
        let options: Array<{ label: string; value: string }> = [];

        if (optionsMatch) {
          // Parse options: each option is <option><label>X</label><value>Y</value></option>
          const optionRegex = /<option>\s*<label>(.*?)<\/label>\s*<value>(.*?)<\/value>\s*<\/option>/g;
          let match;
          while ((match = optionRegex.exec(optionsMatch[1])) !== null) {
            options.push({
              label: match[1].trim(),
              value: match[2].trim(),
            });
          }
        }

        // Store pending question
        sessionManager.setPendingClaudeQuestion(chatId, question, options);

        // Create inline keyboard
        const keyboard = new InlineKeyboard();
        if (options.length > 0) {
          // Add option buttons
          options.forEach((opt, index) => {
            const callbackData = `${CALLBACK_ACTIONS.ANSWER_PREFIX}${index}`;
            if (index % 2 === 0) {
              keyboard.row();
            }
            keyboard.text(opt.label, callbackData);
          });
        } else {
          // Default "Continue" button if no options
          keyboard.text('Continue', `${CALLBACK_ACTIONS.ANSWER_PREFIX}continue`);
        }

        // Send question with options
        const questionText = `❓ *Claude asks:*\n\n${escapeMarkdownV2(question)}`;

        await ctx.reply(questionText, {
          parse_mode: 'MarkdownV2',
          reply_markup: keyboard,
        });

        return { response: '', needsAnswer: true };
      }
    }

    // No question found, return the response
    return { response: result, needsAnswer: false };
  } catch (error) {
    logger.error('Error executing Claude in terminal mode:', error);
    return {
      response: formatError(error instanceof Error ? error.message : String(error)),
      needsAnswer: false,
    };
  }
}

bot.use(async (ctx, next) => {
  // Skip admin check for callback queries (handled separately)
  if (ctx.callbackQuery) {
    return next();
  }

  // Check if user is authorized
  const userId = ctx.from?.id;
  const username = ctx.from?.username;

  if (!userId) {
    logger.warn('Received message without user ID');
    return;
  }

  // Check authorization by ID or username
  let isAuthorized = false;

  if (config.adminId !== 0 && userId === config.adminId) {
    // Authorization by numeric ID
    isAuthorized = true;
  } else if (config.adminUsername && username === config.adminUsername) {
    // Authorization by username
    isAuthorized = true;

    // Auto-capture and store the user ID for future reference
    if (config.adminId === 0) {
      (config as any).adminId = userId;
      logger.info(`✓ Captured User ID for @${username}: ${userId}`);
    }
  }

  if (!isAuthorized) {
    logger.warn(`Unauthorized access attempt from user ID: ${userId}, username: @${username || 'none'}`);
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

/**
 * Command: /start - Start terminal session with Claude
 */
bot.command('start', async (ctx) => {
  const chatId = ctx.chat.id;

  // Check if already in terminal session
  if (sessionManager.isInTerminalSession(chatId)) {
    await ctx.reply(
      formatInfo('You are already in a terminal session\\. Use /exit to leave\\.')
    );
    return;
  }

  // Enter terminal session mode
  sessionManager.enterTerminalSession(chatId);

  await ctx.reply(
    formatSuccess(
      '🖥 *Terminal Session Started*\n\n' +
      'You are now in interactive mode with Claude\\. Send any message to:\\n' +
      '• Ask questions\\n' +
      '• Request code changes\\n' +
      '• Run terminal commands\\n\n' +
      'Claude can ask you questions and present options\\.\n\n' +
      'Commands:\n' +
      '• /exit \\- Leave terminal session\n' +
      '• /status \\- Show session status'
    ),
    { parse_mode: 'MarkdownV2' }
  );
});

/**
 * Command: /exit - Exit terminal session
 */
bot.command('exit', async (ctx) => {
  const chatId = ctx.chat.id;

  if (!sessionManager.isInTerminalSession(chatId)) {
    await ctx.reply(
      formatInfo('You are not in a terminal session\\. Use /start to enter one\\.')
    );
    return;
  }

  // Check if there's an active process
  if (sessionManager.hasActiveProcess(chatId)) {
    await ctx.reply(
      formatWarning(
        '⚠️ A command is currently running\\. Please wait for it to complete before exiting\\.'
      )
    );
    return;
  }

  // Exit terminal session
  sessionManager.exitTerminalSession(chatId);

  await ctx.reply(
    formatSuccess('👋 Terminal session ended\\. Use /start to enter again\\.'),
    { parse_mode: 'MarkdownV2' }
  );
});

/**
 * Command: /status - Show session status
 */
bot.command('status', async (ctx) => {
  const chatId = ctx.chat.id;

  const inSession = sessionManager.isInTerminalSession(chatId);
  const hasActive = sessionManager.hasActiveProcess(chatId);
  const hasPending = sessionManager.hasPendingClaudeQuestion(chatId);
  const history = sessionManager.getConversationHistory(chatId);

  let status = '📊 *Session Status*\n\n';
  status += `• Terminal Session: ${inSession ? '✅ Active' : '❌ Inactive'}\n`;
  status += `• Active Process: ${hasActive ? '✅ Running' : '❌ None'}\n`;
  status += `• Pending Question: ${hasPending ? '✅ Waiting' : '❌ None'}\n`;
  status += `• Messages in Session: ${history.length}\n`;

  if (inSession) {
    status += '\nUse /exit to leave the session\\.';
  } else {
    status += '\nUse /start to enter a session\\.';
  }

  await ctx.reply(status, { parse_mode: 'MarkdownV2' });
});

bot.on('message:text', async (ctx) => {
  const chatId = ctx.chat.id;
  const userMessage = ctx.message.text;

  logger.info(`[${chatId}] User message: ${userMessage}`);

  // === TERMINAL SESSION MODE ===
  if (sessionManager.isInTerminalSession(chatId)) {
    // Check if there's a pending question from Claude
    const pendingQuestion = sessionManager.getPendingClaudeQuestion(chatId);
    if (pendingQuestion) {
      // User is responding to Claude's question
      logger.info(`[${chatId}] User answered Claude's question`);

      await ctx.reply(formatInfo('⏳ Processing your answer...'));

      // Add answer to history
      sessionManager.addToConversationHistory(chatId, `User: ${userMessage}`);

      // Clear pending question
      sessionManager.clearPendingClaudeQuestion(chatId);

      // Execute Claude with the user's answer as context
      const conversationHistory = sessionManager.getConversationHistory(chatId);
      const fullPrompt =
        'Conversation history:\n' +
        conversationHistory.join('\n') +
        '\n\nCurrent user message: ' + userMessage;

      sessionManager.setCurrentProcess(chatId, 'claude');

      // Execute Claude and check for AskUserQuestion in the response
      const claudeResult = await executeClaudeInTerminalMode(fullPrompt, chatId, ctx);

      sessionManager.clearCurrentProcess(chatId);

      if (claudeResult.needsAnswer) {
        // Claude asked another question - buttons were already sent, session stays active
        return;
      }

      // No new question, add response to history and send it
      sessionManager.addToConversationHistory(chatId, `Claude: ${claudeResult.response}`);

      await ctx.reply(claudeResult.response); // No parse_mode to avoid Markdown escaping issues

      return;
    }

    // Normal terminal session mode - execute directly with Claude
    if (sessionManager.hasActiveProcess(chatId)) {
      await ctx.reply(formatInfo('A command is already running\\. Please wait\\.'));
      return;
    }

    await ctx.reply(formatInfo('🤖 Thinking\\.\\.\\.'));

    try {
      // Add user message to history
      sessionManager.addToConversationHistory(chatId, `User: ${userMessage}`);

      // Build context from history
      const history = sessionManager.getConversationHistory(chatId);
      const promptWithHistory =
        'Conversation history:\n' +
        history.join('\n') +
        '\n\nPlease respond to the latest message. If you need to ask the user a question, use the AskUserQuestion tool.';

      sessionManager.setCurrentProcess(chatId, 'claude');

      // Execute Claude with conversation history
      const result = await executeClaudeInTerminalMode(promptWithHistory, chatId, ctx);

      sessionManager.clearCurrentProcess(chatId);

      if (result.needsAnswer) {
        // Claude asked a question - buttons were already sent
        return;
      }

      // Add Claude's response to history
      sessionManager.addToConversationHistory(chatId, `Claude: ${result.response}`);

      await ctx.reply(result.response); // No parse_mode to avoid Markdown escaping issues
    } catch (error) {
      logger.error(`[${chatId}] Error in terminal session:`, error);
      sessionManager.clearCurrentProcess(chatId);
      await ctx.reply(
        formatError(error instanceof Error ? error.message : String(error)),
        { parse_mode: 'MarkdownV2' }
      );
    }

    return;
  }

  // === NORMAL MODE (with Gemini analysis) ===

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
    // Analyze the message using the configured LLM provider
    const { toolCall, reasoning } = await llmProvider.analyzeUserMessage(userMessage);

    if (!toolCall) {
      // No tool selected - return conversational response
      // Send without markdown formatting to avoid parsing errors
      try {
        await ctx.api.editMessageText(
          chatId,
          processingMsg.message_id,
          reasoning
        );
      } catch (editError) {
        // If edit fails, try sending as new message
        logger.error('Error editing message, sending new message:', editError);
        await ctx.api.sendMessage(chatId, reasoning);
      }
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
        // Use the original user message as the prompt for Claude
        logger.info(`[${chatId}] Claude action proposed for: ${userMessage}`);

        // Store pending action with original user message
        sessionManager.setPendingClaudeAction(chatId, userMessage);

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
          `🛠 *Proposed Claude Action:*\n\n${codeBlock('text', escapeMarkdownV2(userMessage))}\n\n*Choose an action:*`,
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
  const username = ctx.callbackQuery.from.username;
  let isAuthorized = false;

  if (config.adminId !== 0 && userId === config.adminId) {
    isAuthorized = true;
  } else if (config.adminUsername && username === config.adminUsername) {
    isAuthorized = true;
    // Auto-capture user ID
    if (config.adminId === 0) {
      (config as any).adminId = userId;
    }
  }

  if (!isAuthorized) {
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
        const { plainText: result } = await executeAndFormatClaude(pendingAction.optimizedPrompt);

        // Clear process
        sessionManager.clearCurrentProcess(chatId);

        // Send result (without parse_mode to avoid Markdown escaping issues)
        await ctx.api.sendMessage(chatId, result);
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
        // Check if this is an answer button (starts with ANSWER_PREFIX)
        if (action.startsWith(CALLBACK_ACTIONS.ANSWER_PREFIX)) {
          const pendingQuestion = sessionManager.getPendingClaudeQuestion(chatId);
          if (!pendingQuestion) {
            await ctx.answerCallbackQuery({
              text: 'No pending question',
              show_alert: true,
            });
            return;
          }

          await ctx.answerCallbackQuery({ text: '✓ Answer recorded' });

          // Extract the answer
          let answer: string;
          if (action === `${CALLBACK_ACTIONS.ANSWER_PREFIX}continue`) {
            answer = 'continue';
          } else {
            // Extract index from callback data
            const indexStr = action.replace(CALLBACK_ACTIONS.ANSWER_PREFIX, '');
            const index = parseInt(indexStr, 10);

            if (
              pendingQuestion.options &&
              index >= 0 &&
              index < pendingQuestion.options.length
            ) {
              answer = pendingQuestion.options[index].value;
            } else {
              answer = indexStr;
            }
          }

          logger.info(`[${chatId}] User answered: ${answer}`);

          // Add answer to conversation
          sessionManager.addToConversationHistory(chatId, `User answered: ${answer}`);

          // Clear the pending question
          sessionManager.clearPendingClaudeQuestion(chatId);

          // Delete the question message
          await ctx.api.deleteMessage(chatId, messageId);

          // Continue the conversation with the answer
          const history = sessionManager.getConversationHistory(chatId);
          const fullPrompt =
            'Conversation history:\n' +
            history.join('\n') +
            '\n\nThe user just answered: ' +
            answer +
            '\n\nContinue the conversation based on this answer.';

          sessionManager.setCurrentProcess(chatId, 'claude');

          // Send thinking message
          const thinkingMsg = await ctx.api.sendMessage(
            chatId,
            formatInfo('🤖 Processing your answer\\.\\.\\.'),
            { parse_mode: 'MarkdownV2' }
          );

          // Execute Claude with the answer
          const result = await executeClaudeInTerminalMode(fullPrompt, chatId, ctx);

          sessionManager.clearCurrentProcess(chatId);

          // Delete thinking message
          await ctx.api.deleteMessage(chatId, thinkingMsg.message_id);

          if (result.needsAnswer) {
            // Another question was asked - buttons were already sent
            return;
          }

          // Add Claude's response to history
          sessionManager.addToConversationHistory(chatId, `Claude: ${result.response}`);

          // Send the response (no parse_mode to avoid Markdown escaping issues)
          await ctx.api.sendMessage(chatId, result.response);

          break;
        }

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
    if (config.adminId !== 0) {
      logger.info(`✓ Admin ID: ${config.adminId}`);
    } else {
      logger.info(`✓ Admin Username: @${config.adminUsername}`);
    }

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
