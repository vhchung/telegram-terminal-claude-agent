/**
 * Logging utilities
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_COLORS = {
  info: '\x1b[36m', // Cyan
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  debug: '\x1b[90m', // Gray
  reset: '\x1b[0m',
};

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, message: string): string {
  const color = LOG_COLORS[level];
  const reset = LOG_COLORS.reset;
  return `${color}[${level.toUpperCase()}]${reset} ${formatTimestamp()} - ${message}`;
}

export const logger = {
  info(message: string, ...args: unknown[]): void {
    console.log(formatMessage('info', message), ...args);
  },

  warn(message: string, ...args: unknown[]): void {
    console.warn(formatMessage('warn', message), ...args);
  },

  error(message: string, ...args: unknown[]): void {
    console.error(formatMessage('error', message), ...args);
  },

  debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG === 'true') {
      console.debug(formatMessage('debug', message), ...args);
    }
  },
};
