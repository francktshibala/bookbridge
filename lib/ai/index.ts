// AI Service Factory - supports both OpenAI and Claude
import { ClaudeAIService } from './claude-service';

// Force use of Claude service since ANTHROPIC_API_KEY is available
export const aiService = new ClaudeAIService();

// Log which service is being used
if (typeof window === 'undefined') {
  console.log('Using Claude AI service');
}

export type { AIResponse } from './service';