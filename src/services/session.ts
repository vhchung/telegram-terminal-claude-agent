/**
 * Session state management
 * In-memory Map for storing pending approval states
 */

import type { SessionState, PendingClaudeAction } from '../types/index.js';
import { logger } from '../utils/logger.js';

class SessionManager {
  private sessions: Map<number, SessionState> = new Map();

  /**
   * Get session state for a chat
   */
  getSession(chatId: number): SessionState {
    if (!this.sessions.has(chatId)) {
      this.sessions.set(chatId, {});
    }
    return this.sessions.get(chatId)!;
  }

  /**
   * Set pending Claude action for approval
   */
  setPendingClaudeAction(chatId: number, optimizedPrompt: string): void {
    const session = this.getSession(chatId);
    session.pendingClaudeAction = {
      optimizedPrompt,
      timestamp: Date.now(),
    };
  }

  /**
   * Get pending Claude action
   */
  getPendingClaudeAction(chatId: number): PendingClaudeAction | undefined {
    const session = this.getSession(chatId);
    return session.pendingClaudeAction;
  }

  /**
   * Clear pending Claude action
   */
  clearPendingClaudeAction(chatId: number): void {
    const session = this.getSession(chatId);
    delete session.pendingClaudeAction;
  }

  /**
   * Set current running process
   */
  setCurrentProcess(
    chatId: number,
    type: 'shell' | 'claude'
  ): void {
    const session = this.getSession(chatId);
    session.currentProcess = {
      type,
      startTime: Date.now(),
    };
  }

  /**
   * Get current running process
   */
  getCurrentProcess(chatId: number): { type: 'shell' | 'claude'; startTime: number } | undefined {
    const session = this.getSession(chatId);
    return session.currentProcess;
  }

  /**
   * Clear current running process
   */
  clearCurrentProcess(chatId: number): void {
    const session = this.getSession(chatId);
    delete session.currentProcess;
  }

  /**
   * Enter terminal session mode
   */
  enterTerminalSession(chatId: number): void {
    const session = this.getSession(chatId);
    session.isInTerminalSession = true;
    session.terminalSessionStartTime = Date.now();
    session.conversationHistory = [];
    logger.info(`[${chatId}] Entered terminal session mode`);
  }

  /**
   * Exit terminal session mode
   */
  exitTerminalSession(chatId: number): void {
    const session = this.getSession(chatId);
    session.isInTerminalSession = false;
    delete session.terminalSessionStartTime;
    delete session.conversationHistory;
    delete session.pendingClaudeQuestion;
    logger.info(`[${chatId}] Exited terminal session mode`);
  }

  /**
   * Check if chat is in terminal session mode
   */
  isInTerminalSession(chatId: number): boolean {
    const session = this.getSession(chatId);
    return !!session.isInTerminalSession;
  }

  /**
   * Add message to conversation history
   */
  addToConversationHistory(chatId: number, message: string): void {
    const session = this.getSession(chatId);
    if (!session.conversationHistory) {
      session.conversationHistory = [];
    }
    session.conversationHistory.push(message);
    
    // Keep only last 20 messages to avoid memory issues
    if (session.conversationHistory.length > 20) {
      session.conversationHistory = session.conversationHistory.slice(-20);
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(chatId: number): string[] {
    const session = this.getSession(chatId);
    return session.conversationHistory || [];
  }

  /**
   * Set pending Claude question (waiting for user response)
   */
  setPendingClaudeQuestion(
    chatId: number,
    question: string,
    options?: Array<{ label: string; value: string }>
  ): void {
    const session = this.getSession(chatId);
    session.pendingClaudeQuestion = {
      question,
      options,
      timestamp: Date.now(),
    };
  }

  /**
   * Get pending Claude question
   */
  getPendingClaudeQuestion(chatId: number): {
    question: string;
    options?: Array<{ label: string; value: string }>;
    timestamp: number;
  } | undefined {
    const session = this.getSession(chatId);
    return session.pendingClaudeQuestion;
  }

  /**
   * Clear pending Claude question
   */
  clearPendingClaudeQuestion(chatId: number): void {
    const session = this.getSession(chatId);
    delete session.pendingClaudeQuestion;
  }

  /**
   * Check if there's a pending question from Claude
   */
  hasPendingClaudeQuestion(chatId: number): boolean {
    const session = this.getSession(chatId);
    return !!session.pendingClaudeQuestion;
  }

  /**
   * Check if chat has an active process
   */
  hasActiveProcess(chatId: number): boolean {
    const session = this.getSession(chatId);
    return !!session.currentProcess;
  }

  /**
   * Clean up old sessions (optional - call periodically)
   */
  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [chatId, session] of this.sessions.entries()) {
      // Remove sessions with no pending actions and no active processes
      if (
        !session.pendingClaudeAction &&
        !session.currentProcess
      ) {
        this.sessions.delete(chatId);
        continue;
      }

      // Remove expired pending actions (older than maxAge)
      if (
        session.pendingClaudeAction &&
        now - session.pendingClaudeAction.timestamp > maxAge
      ) {
        delete session.pendingClaudeAction;
      }
    }
  }

  /**
   * Get session count (for monitoring)
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions (for testing)
   */
  clearAll(): void {
    this.sessions.clear();
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Cleanup old sessions every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    sessionManager.cleanup(600000); // 10 minutes
  }, 300000); // Check every 5 minutes
}
