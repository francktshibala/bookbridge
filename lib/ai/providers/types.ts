/**
 * Shared types for AI provider hedging
 *
 * These types provide a unified interface for both OpenAI and Anthropic providers,
 * enabling seamless hedging and failover between providers.
 *
 * Pattern: Phase 4 Service Layer (pure functions, unified interfaces)
 * Reference: /lib/dictionary/AIUniversalLookup.ts
 */

/**
 * Unified response shape from any AI provider
 *
 * All providers (OpenAI, Anthropic) return responses in this format,
 * making them interchangeable for hedging strategy.
 */
export interface UnifiedAIResponse {
  /** The generated text response from the AI */
  text: string;

  /** Token usage statistics */
  tokens: {
    /** Number of tokens in the prompt */
    prompt: number;
    /** Number of tokens in the completion */
    completion: number;
    /** Total tokens used (prompt + completion) */
    total: number;
  };

  /** Which provider generated this response */
  provider: 'openai' | 'anthropic';

  /** The specific model used (e.g., 'gpt-3.5-turbo', 'claude-3-5-sonnet-20241022') */
  model: string;

  /** Response latency in milliseconds (from request start to completion) */
  latency: number;
}

/**
 * Options passed to provider functions
 *
 * These options are accepted by both provider wrappers and allow
 * control over generation parameters and cancellation.
 */
export interface ProviderOptions {
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;

  /** System prompt to guide the AI's behavior */
  systemPrompt?: string;

  /** Temperature controls randomness (0.0 = deterministic, 1.0 = creative) */
  temperature?: number;

  /** Maximum number of tokens to generate */
  maxTokens?: number;

  /** Enable strict JSON mode (for structured outputs) */
  jsonMode?: boolean;

  /** User ID for tracking and rate limiting */
  userId?: string;

  /** Book ID for context */
  bookId?: string;

  /** Book context for enriched responses */
  bookContext?: string;

  /** Response mode (brief vs detailed) */
  responseMode?: 'brief' | 'detailed';
}

/**
 * Single chunk from a streaming response
 *
 * Streaming responses yield these chunks incrementally as the AI generates text.
 */
export interface StreamChunk {
  /** Text content of this chunk */
  content: string;

  /** Which provider is streaming this chunk */
  provider: 'openai' | 'anthropic';

  /** Whether this is the final chunk in the stream */
  done: boolean;
}

/**
 * Telemetry data for monitoring provider performance
 *
 * Tracks which provider won, latency, retries, and errors for analysis.
 */
export interface TelemetryData {
  /** Which provider successfully returned a response ('none' if both failed) */
  winner: 'openai' | 'anthropic' | 'none';

  /** Total latency from request start to completion (milliseconds) */
  latency: number;

  /** Number of retry attempts (0 = success on first try, 1 = micro-retry) */
  retries: number;

  /** Array of error messages from failed attempts */
  errors: string[];
}

/**
 * Callback function for telemetry tracking
 *
 * Called after each hedged query completes (success or failure) with performance data.
 */
export type TelemetryCallback = (data: TelemetryData) => void;
