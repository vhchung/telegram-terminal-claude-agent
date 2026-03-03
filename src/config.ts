/**
 * Configuration and environment variable validation
 */

import { $ } from 'bun';

interface Config {
  telegramToken: string;
  provider: 'gemini' | 'groq';
  geminiApiKey: string;
  geminiModel: string;
  groqApiKey: string;
  groqModel: string;
  adminId: number;
  adminUsername: string;
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
  provider: (process.env.PROVIDER as 'gemini' | 'groq') || 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  adminId: 0, // Will be set from ADMIN_ID or default to 0
  adminUsername: process.env.ADMIN_USERNAME || '',
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

    // Validate provider configuration
    const provider = config.provider;

    if (provider === 'gemini') {
      if (!config.geminiApiKey) {
        throw new Error('GEMINI_API_KEY is required when using gemini provider');
      }
      console.log(`✓ LLM Provider: Gemini (${config.geminiModel})`);
    } else if (provider === 'groq') {
      if (!config.groqApiKey) {
        throw new Error('GROQ_API_KEY is required when using groq provider');
      }
      console.log(`✓ LLM Provider: Groq (${config.groqModel})`);
    } else {
      console.warn(`⚠️  Unknown provider: ${provider}, falling back to Gemini`);
      (config as any).provider = 'gemini';
      if (!config.geminiApiKey) {
        throw new Error('GEMINI_API_KEY is required when using gemini provider (fallback)');
      }
      console.log(`✓ LLM Provider: Gemini (${config.geminiModel}) [fallback]`);
    }

    // Validate admin authentication method
    const adminId = process.env.ADMIN_ID;
    const adminUsername = process.env.ADMIN_USERNAME;

    if (!adminId && !adminUsername) {
      throw new Error('Missing required authentication: Set either ADMIN_ID (numeric) or ADMIN_USERNAME (string without @)');
    }

    if (adminId) {
      (config as any).adminId = parseInt(adminId, 10);
      if (isNaN((config as any).adminId)) {
        throw new Error('ADMIN_ID must be a valid number');
      }
      console.log(`✓ Admin authentication: User ID (${(config as any).adminId})`);
    } else {
      console.log(`✓ Admin authentication: Username (@${config.adminUsername})`);
      console.log(`  Note: User ID will be captured on first message`);
    }

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
