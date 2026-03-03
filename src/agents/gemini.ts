/**
 * Gemini Agent - LLM orchestrator using Google Gen AI SDK
 * Analyzes user intent and determines which tool to use
 */

import { GoogleGenAI } from '@google/genai';
import type { ToolCall } from '../types/index.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

// System prompt for the orchestrator
const SYSTEM_INSTRUCTION = `You are a Terminal Orchestrator. Your goal is to help a developer manage their machine via Telegram.

Your capabilities:
1. **execute_shell**: For lightweight, non-destructive commands like checking status (git, files, system). Examples:
   - "git status" → execute_shell
   - "list files" → execute_shell
   - "what's in this directory" → execute_shell
   - "current branch" → execute_shell

2. **propose_claude_action**: For any task involving code editing, refactoring, file modifications, or complex multi-step operations. Examples:
   - "Refactor auth" → propose_claude_action
   - "Add error handling" → propose_claude_action
   - "Create a new component" → propose_claude_action
   - "Fix the bug in the API" → propose_claude_action
   - "Update README" → propose_claude_action
   
**How to choose the right tool:**
- For simple, non-destructive commands, use execute_shell
- For code editing, refactoring, or complex operations related to code, use propose_claude_action

**Important Rules For propose_claude_action:**
- Do NOT try to optimize or rewrite the user's request
- The user's original message will be passed directly to the tool

**Response Format:**
You must respond with a JSON object ONLY. No additional text.

For execute_shell:
{
  "tool": "execute_shell",
  "reasoning": "User wants to check git status"
}

For propose_claude_action:
{
  "tool": "propose_claude_action",
  "reasoning": "This requires code editing"
}

For conversational response:
{
  "tool": null,
  "reasoning": "Your conversational response here"
}`;

export class GeminiAgent {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    logger.debug(`Initialized Google Gen AI SDK with model: ${config.geminiModel}`);
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

IMPORTANT: You must respond with a valid JSON object. Do not include any text before or after the JSON.

Example format:
{
  "tool": "execute_shell",
  "args": {"command": "ls -la"},
  "reasoning": "User wants to list files"
}

Or for conversational response:
{
  "tool": null,
  "reasoning": "Your response here"
}

Now analyze and respond with JSON only:`;

      const result = await this.ai.models.generateContent({
        model: config.geminiModel,
        contents: prompt
      });

      const text = result.text?.trim() || '';
      logger.debug(`Raw Gemini response: ${text.substring(0, 200)}`);

      // Try to extract JSON from the response
      let jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                      text.match(/```\n?([\s\S]*?)\n?```/) ||
                      text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        // No JSON found - treat as conversational response
        logger.debug('No JSON found in response, treating as conversational');
        return {
          toolCall: null,
          reasoning: text,
        };
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];

      try {
        const parsed = JSON.parse(jsonStr);
        logger.debug(`Parsed JSON: tool=${parsed.tool}`);

        // Validate and create tool call with args from AI response
        if (parsed.tool && (parsed.tool === 'execute_shell' || parsed.tool === 'propose_claude_action')) {
          const toolCall: ToolCall = {
            name: parsed.tool,
            args: parsed.args || {}, // Use args from AI response
          };

          logger.debug(`Tool selected: ${toolCall.name}`);

          return {
            toolCall,
            reasoning: parsed.reasoning || '',
          };
        }

        // No valid tool call - return conversational response
        return {
          toolCall: null,
          reasoning: parsed.reasoning || text,
        };
      } catch (parseError: any) {
        logger.error('JSON parse error:', parseError.message);
        // If JSON parsing fails, return the raw text as conversational
        return {
          toolCall: null,
          reasoning: text,
        };
      }
    } catch (error: any) {
      logger.error('Error analyzing message:', error);

      // Try to extract reasoning from error response
      try {
        const result = await this.ai.models.generateContent({
          model: config.geminiModel,
          contents: `User message: "${userMessage}"\n\nProvide a helpful conversational response. Do not use any tools.`
        });

        return {
          toolCall: null,
          reasoning: result.text || 'Sorry, I encountered an error analyzing your request.',
        };
      } catch (fallbackError) {
        logger.error('Fallback also failed:', fallbackError);
        return {
          toolCall: null,
          reasoning: 'Sorry, I encountered an error analyzing your request.',
        };
      }
    }
  }

  /**
   * Generate a conversational response
   */
  async generateResponse(userMessage: string): Promise<string> {
    try {
      const result = await this.ai.models.generateContent({
        model: config.geminiModel,
        contents: userMessage
      });
      return result.text || 'Sorry, I could not generate a response.';
    } catch (error) {
      logger.error('Error generating response:', error);
      return 'Sorry, I encountered an error generating a response.';
    }
  }
}

// Export singleton instance
export const geminiAgent = new GeminiAgent();
