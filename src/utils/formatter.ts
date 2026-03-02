/**
 * Telegram MarkdownV2 formatting utilities
 */

/**
 * Escape special characters for Telegram MarkdownV2 format
 * Based on: https://core.telegram.org/bots/api#formatting-options
 */
const MARKDOWN_V2_SPECIAL_CHARS = [
  '_',
  '*',
  '[',
  ']',
  '(',
  ')',
  '~',
  '`',
  '>',
  '#',
  '+',
  '-',
  '=',
  '|',
  '{',
  '}',
  '.',
  '!',
];

export function escapeMarkdownV2(text: string): string {
  let escaped = text;
  for (const char of MARKDOWN_V2_SPECIAL_CHARS) {
    escaped = escaped.split(char).join(`\\${char}`);
  }
  return escaped;
}

/**
 * Wrap text in a code block with proper escaping
 */
export function codeBlock(language: string, code: string): string {
  // Don't escape content inside code blocks, but ensure the backticks are safe
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

/**
 * Wrap text in inline code
 */
export function inlineCode(code: string): string {
  // Don't escape content inside inline code
  return '`' + code + '`';
}

/**
 * Format shell output for Telegram
 */
export function formatShellOutput(output: string): string {
  // Trim excessive whitespace but preserve structure
  const trimmed = output.trim();
  // If output is too long, truncate it
  const maxLength = 4000; // Telegram message limit is 4096
  if (trimmed.length > maxLength) {
    return trimmed.substring(0, maxLength - 3) + '...';
  }
  return trimmed;
}

/**
 * Format error message
 */
export function formatError(error: string): string {
  return `❌ *Error*:\n${codeBlock('text', error)}`;
}

/**
 * Format success message
 */
export function formatSuccess(message: string): string {
  return `✅ ${message}`;
}

/**
 * Format info message
 */
export function formatInfo(message: string): string {
  return `ℹ️ ${message}`;
}

/**
 * Format warning message
 */
export function formatWarning(message: string): string {
  return `⚠️ ${message}`;
}
