/**
 * Claude Code CLI execution tool
 */

import { spawn } from 'bun';
import type { ShellResult } from '../types/index.js';
import { config } from '../config.js';

/**
 * Execute a prompt using Claude CLI
 * Uses Bun.spawn for handling potentially large output streams
 * All commands are executed in the configured working directory
 */
export async function executeClaudePrompt(
  prompt: string,
  timeout: number = 300000 // 5 minutes default
): Promise<ShellResult> {
  const startTime = Date.now();

  try {
    // Spawn the Claude CLI process in the working directory
    const proc = spawn({
      cmd: [config.claudeCliPath, prompt],
      cwd: config.workingDir,
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: 'inherit',
    });

    // Set up timeout
    const timeoutId = setTimeout(() => {
      proc.kill();
    }, timeout);

    // Collect output
    const stdoutChunks: Uint8Array[] = [];
    const stderrChunks: Uint8Array[] = [];

    if (proc.stdout) {
      for await (const chunk of proc.stdout) {
        stdoutChunks.push(chunk);
      }
    }

    if (proc.stderr) {
      for await (const chunk of proc.stderr) {
        stderrChunks.push(chunk);
      }
    }

    const exitCode = await proc.exited;
    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;
    const stdout = Buffer.from(Buffer.concat(stdoutChunks)).toString();
    const stderr = Buffer.from(Buffer.concat(stderrChunks)).toString();

    return {
      success: exitCode === 0,
      stdout,
      stderr,
      exitCode,
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
 * Check if Claude CLI is available
 */
export async function checkClaudeAvailable(): Promise<boolean> {
  try {
    const proc = spawn({
      cmd: [config.claudeCliPath, '--version'],
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}
