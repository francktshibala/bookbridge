/**
 * Anthropic (Claude) Provider Wrapper - Pure Functions
 *
 * Wraps Anthropic SDK with pure functions for hedging strategy.
 * Reuses existing ClaudeAIService for SDK configuration.
 *
 * Pattern: Phase 4 Service Layer (pure functions, no state)
 * Reference: /lib/dictionary/AIUniversalLookup.ts
 */

import { ClaudeAIService } from '../claude-service';
import { UnifiedAIResponse, ProviderOptions, StreamChunk } from './types';

const PROVIDER_TIMEOUT = 30000; // 30 seconds

/**
 * Call Anthropic (Claude) provider with pure function interface
 *
 * Strategy:
 * - Reuse existing SDK configuration from ClaudeAIService
 * - Add per-provider timeout with AbortController
 * - Validate response before returning
 * - Transform to unified response shape
 * - Handle errors with provider context
 *
 * @param prompt - The prompt to send to Claude
 * @param options - Provider options (signal, temperature, etc.)
 * @returns Unified AI response with Anthropic as provider
 * @throws Error with 'Claude:' prefix for hedging logic
 */
export async function callAnthropic(
  prompt: string,
  options: ProviderOptions
): Promise<UnifiedAIResponse> {
  const startTime = Date.now();

  // Use budget-aware timeout if provided, otherwise default to 30s
  const timeout = options.timeout || PROVIDER_TIMEOUT;

  // Create timeout abort controller
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`⏰ Claude: Timeout after ${timeout}ms`);
    timeoutController.abort();
  }, timeout);

  // Merge parent signal with timeout signal
  let aborted = false;
  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeoutId);
      throw new Error('Claude: Request aborted by parent signal');
    }
    options.signal.addEventListener('abort', () => {
      console.log('🚫 Claude: Aborted by parent signal');
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
    console.log(`🟣 Claude: Starting query (${prompt.substring(0, 50)}...)`);

    // Reuse existing service's SDK and config
    const claudeService = new ClaudeAIService();

    // Call existing service method (maintains consistency)
    const response = await claudeService.query(prompt, {
      userId: options.userId || 'hedged-query',
      bookId: options.bookId,
      bookContext: options.bookContext,
      maxTokens: options.maxTokens || 1500,
      temperature: options.temperature ?? 0.7,
      responseMode: options.responseMode || 'detailed',
      // Note: ClaudeAIService doesn't accept signal yet
      // This is OK - timeout controller will handle cancellation
    });

    clearTimeout(timeoutId);

    // Check if aborted during request
    if (aborted) {
      throw new Error('Claude: Request aborted during execution');
    }

    // Validate response
    if (!response || !response.content || response.content.trim().length === 0) {
      throw new Error('Claude: Empty response received');
    }

    if (!response.usage || response.usage.total_tokens === 0) {
      throw new Error('Claude: Invalid usage data');
    }

    const latency = Date.now() - startTime;
    console.log(`✅ Claude: Success (${latency}ms, ${response.usage.total_tokens} tokens)`);

    // Transform to unified shape
    return {
      text: response.content,
      tokens: {
        prompt: response.usage.prompt_tokens,
        completion: response.usage.completion_tokens,
        total: response.usage.total_tokens
      },
      provider: 'anthropic',
      model: response.model,
      latency
    };

  } catch (error: any) {
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    // Enhance error with provider context
    if (error.name === 'AbortError' || aborted) {
      throw new Error(`Claude: Request aborted (${latency}ms)`);
    }

    // Rate limit error
    if (error.status === 429 || error.message?.includes('rate limit') || error.message?.includes('429')) {
      console.warn(`⚠️ Claude: Rate limited (${latency}ms)`);
      throw new Error(`Claude: Rate limited`);
    }

    // Overloaded error (common with Claude)
    if (error.status === 529 || error.message?.includes('overloaded')) {
      console.warn(`⚠️ Claude: Service overloaded (${latency}ms)`);
      throw new Error(`Claude: Service overloaded`);
    }

    // Timeout error
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      console.warn(`⚠️ Claude: Timeout (${latency}ms)`);
      throw new Error(`Claude: Timeout after ${latency}ms`);
    }

    // Generic error
    console.error(`❌ Claude: Error (${latency}ms):`, error.message);
    throw new Error(`Claude: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Call Anthropic (Claude) provider with streaming
 *
 * Strategy:
 * - Start stream with timeout protection
 * - Yield chunks in unified format
 * - Handle abort signal throughout stream
 * - Track provider for telemetry
 *
 * @param prompt - The prompt to send to Claude
 * @param options - Provider options (signal, temperature, etc.)
 * @yields StreamChunk with content and metadata
 * @throws Error with 'Claude:' prefix for hedging logic
 */
export async function* callAnthropicStream(
  prompt: string,
  options: ProviderOptions
): AsyncGenerator<StreamChunk> {
  const startTime = Date.now();

  // Create timeout abort controller
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('⏰ Claude Stream: Timeout after 30s');
    timeoutController.abort();
  }, PROVIDER_TIMEOUT);

  // Merge parent signal with timeout signal
  let aborted = false;
  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeoutId);
      throw new Error('Claude Stream: Request aborted by parent signal');
    }
    options.signal.addEventListener('abort', () => {
      console.log('🚫 Claude Stream: Aborted by parent signal');
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
    console.log(`🟣 Claude Stream: Starting (${prompt.substring(0, 50)}...)`);

    // Reuse existing service's SDK and config
    const claudeService = new ClaudeAIService();

    // Call existing service method for streaming
    const stream = claudeService.queryStream(prompt, {
      userId: options.userId || 'hedged-query',
      bookId: options.bookId,
      bookContext: options.bookContext,
      maxTokens: options.maxTokens || 1500,
      temperature: options.temperature ?? 0.7,
      responseMode: options.responseMode || 'detailed',
    });

    let chunkCount = 0;
    let totalContent = '';

    for await (const chunk of stream) {
      // Check if aborted
      if (aborted) {
        console.log(`🚫 Claude Stream: Aborted after ${chunkCount} chunks`);
        throw new Error('Claude Stream: Aborted during streaming');
      }

      chunkCount++;
      totalContent += chunk;

      // Yield chunk in unified format
      yield {
        content: chunk,
        provider: 'anthropic',
        done: false
      };

      // Log progress periodically
      if (chunkCount === 1) {
        console.log(`✅ Claude Stream: First chunk received (${Date.now() - startTime}ms)`);
      }
    }

    clearTimeout(timeoutId);

    // Yield final chunk to signal completion
    yield {
      content: '',
      provider: 'anthropic',
      done: true
    };

    const latency = Date.now() - startTime;
    console.log(`✅ Claude Stream: Complete (${latency}ms, ${chunkCount} chunks, ${totalContent.length} chars)`);

  } catch (error: any) {
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    // Enhance error with provider context
    if (error.name === 'AbortError' || aborted) {
      throw new Error(`Claude Stream: Aborted (${latency}ms)`);
    }

    // Rate limit error
    if (error.status === 429 || error.message?.includes('rate limit') || error.message?.includes('429')) {
      console.warn(`⚠️ Claude Stream: Rate limited (${latency}ms)`);
      throw new Error(`Claude Stream: Rate limited`);
    }

    // Overloaded error
    if (error.status === 529 || error.message?.includes('overloaded')) {
      console.warn(`⚠️ Claude Stream: Service overloaded (${latency}ms)`);
      throw new Error(`Claude Stream: Service overloaded`);
    }

    // Timeout error
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      console.warn(`⚠️ Claude Stream: Timeout (${latency}ms)`);
      throw new Error(`Claude Stream: Timeout after ${latency}ms`);
    }

    // Generic error
    console.error(`❌ Claude Stream: Error (${latency}ms):`, error.message);
    throw new Error(`Claude Stream: ${error.message || 'Unknown error'}`);
  }
}
