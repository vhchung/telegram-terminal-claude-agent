/**
 * Groq Provider - LLM orchestrator using Groq API
 * Fast inference with various model options
 */

import Groq from 'groq-sdk';
import type { ILLMProvider, ProviderResponse, ToolCall } from './base.js';
import { logger } from '../utils/logger.js';

export class GroqProvider implements ILLMProvider {
  private client: Groq;
  private model: string;

  constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile') {
    this.client = new Groq({ apiKey });
    this.model = model;
    logger.debug(`Initialized Groq SDK with model: ${model}`);
  }

  /**
   * Analyze user message and determine which tool to use
   */
  async analyzeUserMessage(userMessage: string): Promise<ProviderResponse> {
    try {
      logger.debug(`Analyzing message with Groq: ${userMessage}`);

      const systemPrompt = `You are a Terminal Orchestrator. Your goal is to help a developer manage their machine via Telegram.

Your capabilities:
1. **execute_shell**: For lightweight, non-destructive commands like checking status (git, files, system). Examples:
   - "git status" → execute_shell
   - "list files" → execute_shell
   - "what's in this directory" → execute_shell
   - "current branch" → execute_shell
   - "show recent commits" → execute_shell
   - "check disk space" → execute_shell

2. **propose_claude_action**: ONLY when user explicitly mentions "claude" or asks for AI assistance with code. Examples:
   - "claude, refactor auth" → propose_claude_action
   - "ask claude to fix the bug" → propose_claude_action
   - "get claude to create a component" → propose_claude_action
   - "claude, update the README" → propose_claude_action

**CRITICAL RULE - When to use propose_claude_action:**
- MUST check: Does the user message contain the word "claude" (case-insensitive)?
- If YES → use propose_claude_action
- If NO → use execute_shell or conversational response

**How to choose the right tool:**
1. First check if "claude" is mentioned:
   - If mentioned: propose_claude_action
   - If NOT mentioned: check if it's a simple command → execute_shell
2. For conversational messages (greetings, thanks, general questions): return tool: null

**Important Rules:**
- DO NOT use propose_claude_action for code tasks unless "claude" is explicitly mentioned
- DO NOT try to optimize or rewrite the user's request
- The user's original message will be passed directly to the tool

**Response Format:**
You must respond with a JSON object ONLY. No additional text.

For execute_shell:
{
  "tool": "execute_shell",
  "args": {"command": "git status"},
  "reasoning": "User wants to check git status"
}

For propose_claude_action:
{
  "tool": "propose_claude_action",
  "reasoning": "User explicitly mentioned claude and wants code assistance"
}

For conversational response:
{
  "tool": null,
  "reasoning": "Your conversational response here"
}`;

      const userPrompt = `User message: "${userMessage}"

Analyze this request and determine the appropriate action. Consider:

CRITICAL CHECK - Does the message contain "claude"?
- If YES and mentions code/editing → propose_claude_action
- If NO → Check if it's a simple shell command → execute_shell

Decision flow:
1. Check if "claude" is mentioned (case-insensitive):
   - "claude, refactor this" → propose_claude_action
   - "ask claude to fix bugs" → propose_claude_action
2. If no "claude" mentioned:
   - "git status" → execute_shell with command "git status"
   - "list files" → execute_shell with command "ls -la"
   - "show recent commits" → execute_shell with command "git log -10"
   - "hello" → conversational (tool: null)
   - "thanks" → conversational (tool: null)

IMPORTANT RULES:
- propose_claude_action ONLY when "claude" is explicitly mentioned
- execute_shell for simple terminal commands
- conversational (tool: null) for greetings, thanks, general chat

IMPORTANT: You must respond with a valid JSON object. Do not include any text before or after the JSON.

Now analyze and respond with JSON only:`;

      const result = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: 'json_object' }
      });

      const text = result.choices[0]?.message?.content?.trim() || '';
      logger.debug(`Raw Groq response: ${text.substring(0, 200)}`);

      try {
        const parsed = JSON.parse(text);
        logger.debug(`Parsed JSON: tool=${parsed.tool}`);

        // Validate and create tool call with args from AI response
        if (parsed.tool && (parsed.tool === 'execute_shell' || parsed.tool === 'propose_claude_action')) {
          const toolCall: ToolCall = {
            name: parsed.tool,
            args: parsed.args || {},
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
      logger.error('Error analyzing message with Groq:', error);

      // Try to extract reasoning from error response
      try {
        const result = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'user', content: `User message: "${userMessage}"\n\nProvide a helpful conversational response. Do not use any tools.` }
          ],
          max_tokens: 512
        });

        return {
          toolCall: null,
          reasoning: result.choices[0]?.message?.content || 'Sorry, I encountered an error analyzing your request.',
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
      const result = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: userMessage }
        ],
        max_tokens: 1024
      });

      return result.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (error) {
      logger.error('Error generating response with Groq:', error);
      return 'Sorry, I encountered an error generating a response.';
    }
  }
}
