/**
 * Shared TypeScript types and interfaces
 */

/**
 * Result of a shell command execution
 */
export interface ShellResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

/**
 * Tool call result from Gemini
 */
export interface ToolCall {
  name: 'execute_shell' | 'propose_claude_action';
  args: {
    command?: string;
    optimized_prompt?: string;
  };
}

/**
 * Pending Claude action state
 */
export interface PendingClaudeAction {
  optimizedPrompt: string;
  timestamp: number;
}

/**
 * Session state for a Telegram chat
 */
export interface SessionState {
  pendingClaudeAction?: PendingClaudeAction;
  currentProcess?: {
    type: 'shell' | 'claude';
    startTime: number;
  };
}
