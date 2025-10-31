/**
 * OpenAI Provider Wrapper - Pure Functions
 *
 * Wraps OpenAI SDK with pure functions for hedging strategy.
 * Reuses existing AccessibleAIService for SDK configuration.
 *
 * Pattern: Phase 4 Service Layer (pure functions, no state)
 * Reference: /lib/dictionary/AIUniversalLookup.ts
 */

import { AccessibleAIService } from '../service';
import { UnifiedAIResponse, ProviderOptions, StreamChunk } from './types';

const PROVIDER_TIMEOUT = 30000; // 30 seconds

/**
 * Call OpenAI provider with pure function interface
 *
 * Strategy:
 * - Reuse existing SDK configuration from AccessibleAIService
 * - Add per-provider timeout with AbortController
 * - Validate response before returning
 * - Transform to unified response shape
 * - Handle errors with provider context
 *
 * @param prompt - The prompt to send to OpenAI
 * @param options - Provider options (signal, temperature, etc.)
 * @returns Unified AI response with OpenAI as provider
 * @throws Error with 'OpenAI:' prefix for hedging logic
 */
export async function callOpenAI(
  prompt: string,
  options: ProviderOptions
): Promise<UnifiedAIResponse> {
  const startTime = Date.now();

  // Use budget-aware timeout if provided, otherwise default to 30s
  const timeout = options.timeout || PROVIDER_TIMEOUT;

  // Create timeout abort controller
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`⏰ OpenAI: Timeout after ${timeout}ms`);
    timeoutController.abort();
  }, timeout);

  // Merge parent signal with timeout signal
  let aborted = false;
  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeoutId);
      throw new Error('OpenAI: Request aborted by parent signal');
    }
    options.signal.addEventListener('abort', () => {
      console.log('🚫 OpenAI: Aborted by parent signal');
      aborted = true;
      timeoutController.abort();
    });
  }

  // Listen for timeout abort
  timeoutController.signal.addEventListener('abort', () => {
    if (!aborted) {
      aborted = true;
    }
  });

  try {
    console.log(`🔵 OpenAI: Starting query (${prompt.substring(0, 50)}...)`);

    // Reuse existing service's SDK and config
    const openaiService = new AccessibleAIService();

    // Call existing service method (maintains consistency)
    const response = await openaiService.query(prompt, {
      userId: options.userId || 'hedged-query',
      bookId: options.bookId,
      bookContext: options.bookContext,
      maxTokens: options.maxTokens || 1500,
      temperature: options.temperature ?? 0.7,
      // Note: AccessibleAIService doesn't accept signal yet
      // This is OK - timeout controller will handle cancellation
    });

    clearTimeout(timeoutId);

    // Check if aborted during request
    if (aborted) {
      throw new Error('OpenAI: Request aborted during execution');
    }

    // Validate response
    if (!response || !response.content || response.content.trim().length === 0) {
      throw new Error('OpenAI: Empty response received');
    }

    if (!response.usage || response.usage.total_tokens === 0) {
      throw new Error('OpenAI: Invalid usage data');
    }

    const latency = Date.now() - startTime;
    console.log(`✅ OpenAI: Success (${latency}ms, ${response.usage.total_tokens} tokens)`);

    // Transform to unified shape
    return {
      text: response.content,
      tokens: {
        prompt: response.usage.prompt_tokens,
        completion: response.usage.completion_tokens,
        total: response.usage.total_tokens
      },
      provider: 'openai',
      model: response.model,
      latency
    };

  } catch (error: any) {
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    // Enhance error with provider context
    if (error.name === 'AbortError' || aborted) {
      throw new Error(`OpenAI: Request aborted (${latency}ms)`);
    }

    // Rate limit error
    if (error.status === 429 || error.message?.includes('rate limit')) {
      console.warn(`⚠️ OpenAI: Rate limited (${latency}ms)`);
      throw new Error(`OpenAI: Rate limited`);
    }

    // Timeout error
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      console.warn(`⚠️ OpenAI: Timeout (${latency}ms)`);
      throw new Error(`OpenAI: Timeout after ${latency}ms`);
    }

    // Generic error - log full error for debugging
    console.error(`❌ OpenAI: Error (${latency}ms):`, error);
    console.error(`❌ OpenAI: Error message:`, error.message);
    console.error(`❌ OpenAI: Error stack:`, error.stack);
    throw new Error(`OpenAI: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Call OpenAI provider with streaming
 *
 * Strategy:
 * - Start stream with timeout protection
 * - Yield chunks in unified format
 * - Handle abort signal throughout stream
 * - Track provider for telemetry
 *
 * @param prompt - The prompt to send to OpenAI
 * @param options - Provider options (signal, temperature, etc.)
 * @yields StreamChunk with content and metadata
 * @throws Error with 'OpenAI:' prefix for hedging logic
 */
export async function* callOpenAIStream(
  prompt: string,
  options: ProviderOptions
): AsyncGenerator<StreamChunk> {
  const startTime = Date.now();

  // Create timeout abort controller
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('⏰ OpenAI Stream: Timeout after 30s');
    timeoutController.abort();
  }, PROVIDER_TIMEOUT);

  // Merge parent signal with timeout signal
  let aborted = false;
  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeoutId);
      throw new Error('OpenAI Stream: Request aborted by parent signal');
    }
    options.signal.addEventListener('abort', () => {
      console.log('🚫 OpenAI Stream: Aborted by parent signal');
      aborted = true;
      timeoutController.abort();
    });
  }

  timeoutController.signal.addEventListener('abort', () => {
    if (!aborted) {
      aborted = true;
    }
  });

  try {
    console.log(`🔵 OpenAI Stream: Starting (${prompt.substring(0, 50)}...)`);

    // Reuse existing service's SDK and config
    const openaiService = new AccessibleAIService();

    // Call existing service method for streaming
    const stream = openaiService.queryStream(prompt, {
      userId: options.userId || 'hedged-query',
      bookId: options.bookId,
      bookContext: options.bookContext,
      maxTokens: options.maxTokens || 1500,
      temperature: options.temperature ?? 0.7,
    });

    let chunkCount = 0;
    let totalContent = '';

    for await (const chunk of stream) {
      // Check if aborted
      if (aborted) {
        console.log(`🚫 OpenAI Stream: Aborted after ${chunkCount} chunks`);
        throw new Error('OpenAI Stream: Aborted during streaming');
      }

      chunkCount++;
      totalContent += chunk;

      // Yield chunk in unified format
      yield {
        content: chunk,
        provider: 'openai',
        done: false
      };

      // Log progress periodically
      if (chunkCount === 1) {
        console.log(`✅ OpenAI Stream: First chunk received (${Date.now() - startTime}ms)`);
      }
    }

    clearTimeout(timeoutId);

    // Yield final chunk to signal completion
    yield {
      content: '',
      provider: 'openai',
      done: true
    };

    const latency = Date.now() - startTime;
    console.log(`✅ OpenAI Stream: Complete (${latency}ms, ${chunkCount} chunks, ${totalContent.length} chars)`);

  } catch (error: any) {
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    // Enhance error with provider context
    if (error.name === 'AbortError' || aborted) {
      throw new Error(`OpenAI Stream: Aborted (${latency}ms)`);
    }

    // Rate limit error
    if (error.status === 429 || error.message?.includes('rate limit')) {
      console.warn(`⚠️ OpenAI Stream: Rate limited (${latency}ms)`);
      throw new Error(`OpenAI Stream: Rate limited`);
    }

    // Timeout error
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      console.warn(`⚠️ OpenAI Stream: Timeout (${latency}ms)`);
      throw new Error(`OpenAI Stream: Timeout after ${latency}ms`);
    }

    // Generic error
    console.error(`❌ OpenAI Stream: Error (${latency}ms):`, error.message);
    throw new Error(`OpenAI Stream: ${error.message || 'Unknown error'}`);
  }
}
