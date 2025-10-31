// AI Service Factory - supports both OpenAI and Claude
import { ClaudeAIService } from './claude-service';

// Hedged functions (NEW - recommended for all new code)
export { hedgedAIQuery, hedgedAIQueryStream } from './hedged-query';
export type { TelemetryCallback, TelemetryData } from './providers/types';
export type { UnifiedAIResponse, ProviderOptions, StreamChunk } from './providers/types';

// Legacy exports (keep for backward compatibility)
export const aiService = new ClaudeAIService();
export type { AIResponse } from './service';

// Log which service is being used
if (typeof window === 'undefined') {
  console.log('Using Claude AI service (legacy) + Hedged queries available');
}