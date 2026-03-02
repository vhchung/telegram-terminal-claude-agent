/**
 * Shell execution tools using Bun Shell
 */

import { $ } from 'bun';
import type { ShellResult } from '../types/index.js';
import { config } from '../config.js';

/**
 * Execute a shell command and return the result
 * Uses Bun.$ for simple commands
 * All commands are executed in the configured working directory
 */
export async function executeShellCommand(
  command: string,
  timeout: number = 30000
): Promise<ShellResult> {
  const startTime = Date.now();

  try {
    // Change to working directory and execute command
    // This ensures all commands run in the restricted directory
    const result = await $`cd "${config.workingDir}" && sh -c ${command}`.quiet();

    const duration = Date.now() - startTime;
    const stdout = result.stdout.toString();
    const stderr = result.stderr.toString();
    const exitCode = result.exitCode;

    return {
      success: exitCode === 0,
      stdout,
      stderr,
      exitCode: exitCode ?? 0,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: -1,
      duration,
    };
  }
}

/**
 * Check if a command is safe to execute directly
 * (non-destructive, read-only operations)
 */
export function isSafeCommand(command: string): boolean {
  const unsafePatterns = [
    'rm -rf',
    'rm -r',
    'mkfs',
    'dd if=',
    'chmod -R 000',
    'chown -R',
    'kill -9',
    'killall',
    'shutdown',
    'reboot',
    'init 0',
    'halt',
    'poweroff',
    '> /dev/',
    'format',
    'del /',
    'rmdir /',
  ];

  const lowerCmd = command.toLowerCase();
  return !unsafePatterns.some(pattern => lowerCmd.includes(pattern));
}

/**
 * Get common safe commands that can be executed
 */
export function getCommandType(command: string): 'git' | 'file' | 'system' | 'other' {
  const cmd = command.trim().toLowerCase();

  if (cmd.startsWith('git ')) return 'git';
  if (cmd.startsWith('ls ') || cmd.startsWith('ll ') || cmd.startsWith('la ')) return 'file';
  if (cmd.startsWith('pwd') || cmd.startsWith('whoami') || cmd.startsWith('hostname')) return 'system';

  return 'other';
}
