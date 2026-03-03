/**
 * Provider Factory - Creates LLM provider instances based on configuration
 */

import type { ILLMProvider } from './base.js';
import { GeminiProvider } from './gemini.js';
import { GroqProvider } from './groq.js';
import { logger } from '../utils/logger.js';

export type ProviderType = 'gemini' | 'groq';

/**
 * Create an LLM provider instance based on the specified type
 */
export function createProvider(type: ProviderType, apiKey: string, model?: string): ILLMProvider {
  switch (type) {
    case 'gemini':
      logger.info(`Creating Gemini provider with model: ${model || 'gemini-2.5-flash'}`);
      return new GeminiProvider(apiKey, model || 'gemini-2.5-flash');

    case 'groq':
      logger.info(`Creating Groq provider with model: ${model || 'llama-3.3-70b-versatile'}`);
      return new GroqProvider(apiKey, model || 'llama-3.3-70b-versatile');

    default:
      logger.warn(`Unknown provider type: ${type}, falling back to Gemini`);
      return new GeminiProvider(apiKey, model || 'gemini-2.5-flash');
  }
}
