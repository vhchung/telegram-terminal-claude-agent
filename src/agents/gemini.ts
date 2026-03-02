/**
 * Gemini Agent - LLM orchestrator using Google Generative AI
 * Analyzes user intent and determines which tool to use
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ToolCall } from '../types/index.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

// Tool definitions for Gemini
const TOOLS = [
  {
    name: 'execute_shell',
    description:
      'Execute a shell command for lightweight, non-destructive operations such as checking git status, listing files (ls), showing current directory (pwd), or viewing system information. Use this for read-only commands that provide quick information.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute (e.g., "git status", "ls -la", "pwd")',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'propose_claude_action',
    description:
      'Propose an action to be executed by Claude Code CLI. Use this for any task involving code editing, refactoring, file modifications, or complex multi-step coding operations. You MUST optimize the user\'s casual request into a professional, clear, and context-rich instruction for the Claude CLI. Do not ask for confirmation yourself; the system handles the UI approval flow.',
    parameters: {
      type: 'object',
      properties: {
        optimized_prompt: {
          type: 'string',
          description:
            'A technically dense, professionally rewritten prompt specifically for the Claude CLI. Include specific files, context, and technical details needed for the task.',
        },
      },
      required: ['optimized_prompt'],
    },
  },
];

// System prompt for the orchestrator
const SYSTEM_PROMPT = `You are a Terminal Orchestrator. Your goal is to help a developer manage their machine via Telegram.

Your capabilities:
1. **execute_shell**: For lightweight, non-destructive commands like checking status (git, files, system). Examples:
   - "git status" → execute_shell with "git status"
   - "list files" → execute_shell with "ls -la"
   - "what's in this directory" → execute_shell with "ls -la"
   - "current branch" → execute_shell with "git branch"

2. **propose_claude_action**: For any task involving code editing, refactoring, or complex multi-step CLI operations. Examples:
   - "Refactor auth" → propose_claude_action with optimized prompt
   - "Add error handling" → propose_claude_action with optimized prompt
   - "Create a new component" → propose_claude_action with optimized prompt
   - "Fix the bug in the API" → propose_claude_action with optimized prompt

**Important Rules:**
- When using propose_claude_action, you MUST optimize the user's casual request into a professional, clear, and context-rich instruction for the Claude CLI.
- Include specific file paths, function names, and technical details if mentioned or can be inferred.
- Make prompts technically dense and precise for Claude CLI.
- Do NOT ask for confirmation yourself; the system handles the UI button.
- If the user's intent is unclear, ask for clarification using execute_shell to gather information first.

**Prompt Optimization Examples:**
- User: "Refactor auth" → Optimized: "Refactor src/auth.ts to implement cookie-based authentication, replacing the current localStorage logic. Ensure CSRF protection is included and maintain backward compatibility."
- User: "Fix the login bug" → Optimized: "Investigate and fix the authentication bug in src/components/Login.tsx. The issue appears to be with token validation after form submission. Add proper error handling and user feedback."
- User: "Add types" → Optimized: "Add TypeScript type annotations to src/utils/helpers.ts. Create proper interfaces for function parameters and return types. Enable strict type checking."`;

export class GeminiAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp-thinking-cache',
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: TOOLS as any }],
    });
  }

  /**
   * Analyze user message and determine which tool to use
   */
  async analyzeUserMessage(userMessage: string): Promise<{
    toolCall: ToolCall | null;
    reasoning: string;
  }> {
    try {
      logger.debug(`Analyzing message: ${userMessage}`);

      const prompt = `User message: "${userMessage}"

Analyze this request and determine the appropriate action. Consider:
- Is this a simple status check or read-only command? → execute_shell
- Is this a code editing, refactoring, or complex task? → propose_claude_action

Provide your tool call recommendation.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const functionCall = response.functionCalls();

      if (functionCall && functionCall.length > 0) {
        const call = functionCall[0];
        const toolCall: ToolCall = {
          name: call.name as ToolCall['name'],
          args: call.args,
        };

        logger.debug(`Tool selected: ${toolCall.name}`);

        return {
          toolCall,
          reasoning: response.text() || '',
        };
      }

      // No tool call - return text response
      return {
        toolCall: null,
        reasoning: response.text() || 'No tool selected',
      };
    } catch (error) {
      logger.error('Error analyzing message:', error);
      return {
        toolCall: null,
        reasoning: 'Sorry, I encountered an error analyzing your request.',
      };
    }
  }

  /**
   * Generate an optimized prompt for Claude CLI
   */
  async optimizePrompt(userRequest: string): Promise<string> {
    try {
      const prompt = `Optimize this user request for the Claude CLI. Make it technical, precise, and context-rich.

User request: "${userRequest}"

Create a professional prompt that Claude Code can execute effectively. Include specific files, commands, or technical context if relevant.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const optimized = response.text().trim();

      logger.debug(`Optimized prompt: ${optimized}`);

      return optimized;
    } catch (error) {
      logger.error('Error optimizing prompt:', error);
      // Return original request if optimization fails
      return userRequest;
    }
  }

  /**
   * Generate a conversational response
   */
  async generateResponse(userMessage: string): Promise<string> {
    try {
      const result = await this.model.generateContent(userMessage);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('Error generating response:', error);
      return 'Sorry, I encountered an error generating a response.';
    }
  }
}

// Export singleton instance
export const geminiAgent = new GeminiAgent();
