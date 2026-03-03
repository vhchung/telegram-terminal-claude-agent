/**
 * Terminal bridge service
 * Handles asynchronous execution and output streaming
 */

import type { ShellResult } from '../types/index.js';
import { executeShellCommand } from '../tools/shell.js';
import { executeClaudePrompt } from '../tools/claude.js';
import { logger } from '../utils/logger.js';

export interface TerminalExecutionOptions {
  timeout?: number;
  onChunk?: (chunk: string) => void;
  onComplete?: (result: ShellResult) => void;
  onError?: (error: string) => void;
}

/**
 * Execute a shell command with optional streaming
 */
export async function executeTerminalCommand(
  command: string,
  options: TerminalExecutionOptions = {}
): Promise<ShellResult> {
  const { timeout = 30000 } = options;

  logger.info(`Executing shell command: ${command}`);

  try {
    const result = await executeShellCommand(command, timeout);

    if (result.success) {
      logger.info(`Command completed successfully in ${result.duration}ms`);
    } else {
      logger.warn(`Command failed with exit code ${result.exitCode}`);
    }

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Command execution error: ${errorMsg}`);

    return {
      success: false,
      stdout: '',
      stderr: errorMsg,
      exitCode: -1,
      duration: 0,
    };
  }
}

/**
 * Execute a Claude prompt with optional streaming
 */
export async function executeClaudeCommand(
  prompt: string,
  options: TerminalExecutionOptions = {}
): Promise<ShellResult> {
  const { timeout = 300000 } = options; // 5 minutes default for Claude

  logger.info(`Executing Claude prompt: ${prompt.substring(0, 50)}...`);

  try {
    const result = await executeClaudePrompt(prompt, timeout);

    if (result.success) {
      logger.info(`Claude execution completed successfully in ${result.duration}ms`);
    } else {
      logger.warn(`Claude execution failed with exit code ${result.exitCode}`);
    }

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Claude execution error: ${errorMsg}`);

    return {
      success: false,
      stdout: '',
      stderr: errorMsg,
      exitCode: -1,
      duration: 0,
    };
  }
}

/**
 * Format shell result for Telegram display
 */
export function formatTerminalResult(result: ShellResult, command: string, useMarkdown: boolean = true): string {
  let output = '';

  if (useMarkdown) {
    if (result.success) {
      output += `✅ *Command executed successfully*\n`;
    } else {
      output += `❌ *Command failed* (exit code: ${result.exitCode})\n`;
    }

    output += `🔹 *Command*: \`${command}\`\n`;
    output += `⏱ *Duration*: ${result.duration}ms\n`;

    if (result.stdout) {
      output += `\n*Output*:\n\`\`\`bash\n${result.stdout}\n\`\`\`\n`;
    }

    if (result.stderr) {
      output += `\n*Errors*:\n\`\`\`text\n${result.stderr}\n\`\`\`\n`;
    }
  } else {
    // Plain text format (safer for complex output)
    if (result.success) {
      output += `✅ Command executed successfully\n`;
    } else {
      output += `❌ Command failed (exit code: ${result.exitCode})\n`;
    }

    output += `🔹 Command: ${command}\n`;
    output += `⏱ Duration: ${result.duration}ms\n`;

    if (result.stdout) {
      output += `\nOutput:\n${result.stdout}\n`;
    }

    if (result.stderr) {
      output += `\nErrors:\n${result.stderr}\n`;
    }
  }

  return output;
}

/**
 * Execute command and return formatted result for Telegram
 */
export async function executeAndFormatCommand(
  command: string,
  options: TerminalExecutionOptions = {}
): Promise<string> {
  const result = await executeTerminalCommand(command, options);
  return formatTerminalResult(result, command, true); // Use markdown for shell commands
}

/**
 * Execute Claude prompt and return formatted result for Telegram
 */
export async function executeAndFormatClaude(
  prompt: string,
  options: TerminalExecutionOptions = {}
): Promise<{formatted: string; plainText: string}> {
  const result = await executeClaudeCommand(prompt, options);
  const command = `claude "${prompt}"`;

  return {
    formatted: formatTerminalResult(result, command, true), // Markdown version
    plainText: formatTerminalResult(result, command, false), // Plain text version
  };
}
