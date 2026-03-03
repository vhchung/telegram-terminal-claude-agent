/**
 * Base interface for LLM providers
 */

export type ToolCall = {
  name: 'execute_shell' | 'propose_claude_action';
  args: Record<string, any>;
};

export interface ProviderResponse {
  toolCall: ToolCall | null;
  reasoning: string;
}

export interface ILLMProvider {
  /**
   * Analyze user message and determine which tool to use
   */
  analyzeUserMessage(userMessage: string): Promise<ProviderResponse>;

  /**
   * Generate a conversational response
   */
  generateResponse(userMessage: string): Promise<string>;
}
