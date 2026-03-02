/**
 * Configuration and environment variable validation
 */

import { $ } from 'bun';

interface Config {
  telegramToken: string;
  geminiApiKey: string;
  adminId: number;
  claudeCliPath: string;
  workingDir: string;
}

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string): number {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return num;
}

export const config: Config = {
  telegramToken: getEnvVar('TELEGRAM_TOKEN'),
  geminiApiKey: getEnvVar('GEMINI_API_KEY'),
  adminId: getEnvNumber('ADMIN_ID'),
  claudeCliPath: process.env.CLAUDE_CLI_PATH || 'claude',
  workingDir: process.cwd(), // Temporary value, will be updated in validateConfig
};

/**
 * Validate and resolve the working directory
 */
async function resolveWorkingDir(dir: string): Promise<string> {
  try {
    // Try to cd into the directory and get its absolute path
    const result = await $`cd "${dir}" && pwd`.quiet();

    if (result.exitCode === 0) {
      return result.stdout.toString().trim();
    } else {
      console.warn(`⚠️  Warning: Working directory "${dir}" may not exist, using as-is`);
      return dir;
    }
  } catch (error) {
    console.warn(`⚠️  Warning: Could not resolve working directory "${dir}", using as-is`);
    return dir;
  }
}

/**
 * Validate configuration at startup
 */
export async function validateConfig(): Promise<void> {
  try {
    // Validate required environment variables
    getEnvVar('TELEGRAM_TOKEN');
    getEnvVar('GEMINI_API_KEY');
    getEnvNumber('ADMIN_ID');

    // Resolve and validate working directory
    const workingDirSetting = process.env.WORKING_DIR || process.cwd();
    const resolvedDir = await resolveWorkingDir(workingDirSetting);

    // Update the config with the resolved directory
    (config as any).workingDir = resolvedDir;

    console.log('✓ Configuration validated successfully');
    console.log(`✓ Working directory: ${resolvedDir}`);
  } catch (error) {
    console.error('✗ Configuration validation failed:', error);
    process.exit(1);
  }
}
