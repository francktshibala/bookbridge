/**
 * Hedged AI Query - Core Hedging Logic
 *
 * Implements dual-provider hedging with parallel calls, automatic failover,
 * and micro-retry strategy for maximum reliability.
 *
 * Pattern: Phase 4 Service Layer (pure functions)
 * Reference: /lib/dictionary/AIUniversalLookup.ts:103-168 (hedging pattern)
 * Strategy: Fire both providers in parallel, first valid response wins
 */

import { callOpenAI, callOpenAIStream } from './providers/openai';
import { callAnthropic, callAnthropicStream } from './providers/anthropic';
import { UnifiedAIResponse, ProviderOptions, TelemetryData, TelemetryCallback } from './providers/types';

// Timeout configuration (GPT-5 recommendations)
const GLOBAL_TIMEOUT_CHAT = 25000; // 25s max total for non-streaming chat
const GLOBAL_TIMEOUT_STREAM_TTFT = 6000; // 6s time-to-first-token for streaming
const VALIDATION_WINDOW = 150; // ms to wait for second provider if first invalid
const MICRO_RETRY_DELAY = 250; // ms delay before micro-retry
const SAFETY_BUFFER = 300; // ms safety margin for budget calculations
const MIN_PROVIDER_TIMEOUT = 3000; // 3s minimum per provider
const MIN_RETRY_BUDGET = 5000; // 5s minimum to allow retry (includes validation + delay + attempt)

/**
 * Hedged AI query - fires both providers in parallel, returns first valid response
 *
 * Strategy:
 * 1. Check which providers are available (API keys)
 * 2. Fire both providers in parallel with budget-aware timeouts
 * 3. Promise.race for first response (with global 25s timeout)
 * 4. Validate response (non-empty, has tokens)
 * 5. If first invalid, wait VALIDATION_WINDOW for second provider
 * 6. If both fail AND sufficient budget, micro-retry once with lower temperature
 * 7. Abort losing provider when winner settles
 * 8. Track telemetry (winner, latency, retries)
 *
 * @param prompt - The prompt to send to AI providers
 * @param options - Provider options including telemetry callback
 * @returns Unified AI response from winning provider
 * @throws Error if both providers fail or global timeout exceeded
 */
export async function hedgedAIQuery(
  prompt: string,
  options: ProviderOptions & { telemetry?: TelemetryCallback } = {}
): Promise<UnifiedAIResponse> {
  const startTime = Date.now();
  const errors: string[] = [];
  let retries = 0;

  // Check available providers (with cost guard toggles)
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY?.startsWith('sk-');
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-');

  // Cost guard: Allow disabling specific providers via env vars (GPT-5 recommendation)
  const isOpenAIDisabled = process.env.DISABLE_OPENAI_HEDGING === 'true';
  const isAnthropicDisabled = process.env.DISABLE_ANTHROPIC_HEDGING === 'true';

  const hasOpenAI = hasOpenAIKey && !isOpenAIDisabled;
  const hasAnthropic = hasAnthropicKey && !isAnthropicDisabled;

  if (!hasOpenAI && !hasAnthropic) {
    const reasons = [];
    if (!hasOpenAIKey) reasons.push('OpenAI: missing API key');
    if (!hasAnthropicKey) reasons.push('Anthropic: missing API key');
    if (isOpenAIDisabled) reasons.push('OpenAI: disabled via DISABLE_OPENAI_HEDGING');
    if (isAnthropicDisabled) reasons.push('Anthropic: disabled via DISABLE_ANTHROPIC_HEDGING');
    throw new Error(`No AI providers available: ${reasons.join(', ')}`);
  }

  if (isOpenAIDisabled) console.log('💰 Cost Guard: OpenAI disabled for hedging');
  if (isAnthropicDisabled) console.log('💰 Cost Guard: Anthropic disabled for hedging');

  console.log('🔀 Hedged AI Query: Starting parallel calls', {
    hasOpenAI,
    hasAnthropic,
    promptLength: prompt.length,
    globalBudget: `${GLOBAL_TIMEOUT_CHAT}ms`
  });

  // Global timeout wrapper (GPT-5 recommendation)
  const globalTimeoutController = new AbortController();
  const globalTimeoutId = setTimeout(() => {
    console.warn(`⏰ Hedged AI Query: Global timeout at ${GLOBAL_TIMEOUT_CHAT}ms`);
    globalTimeoutController.abort();
  }, GLOBAL_TIMEOUT_CHAT);

  try {
    // Wrap entire hedge in Promise.race with global timeout
    const result = await Promise.race([
      executeHedgedQueryWithRetry(
        prompt,
        options,
        hasOpenAI,
        hasAnthropic,
        errors,
        startTime,
        globalTimeoutController.signal
      ),
      new Promise<never>((_, reject) => {
        globalTimeoutController.signal.addEventListener('abort', () => {
          reject(new Error(`Global timeout: No response after ${GLOBAL_TIMEOUT_CHAT}ms`));
        });
      })
    ]);

    clearTimeout(globalTimeoutId);

    // Track success telemetry
    if (options.telemetry) {
      options.telemetry({
        winner: result.provider,
        latency: Date.now() - startTime,
        retries: result.retries || 0,
        errors
      });
    }

    console.log(`✅ Hedged AI Query: Success (${Date.now() - startTime}ms, ${result.retries || 0} retries)`);
    return result;

  } catch (error: any) {
    clearTimeout(globalTimeoutId);

    // Track failure telemetry
    if (options.telemetry) {
      options.telemetry({
        winner: 'none',
        latency: Date.now() - startTime,
        retries,
        errors: [...errors, error.message]
      });
    }

    console.error('❌ Hedged AI Query: Failed', error.message);
    throw error;
  }
}

/**
 * Execute hedged query with retry logic and budget awareness
 * Internal helper that handles attempt 1 + optional retry
 */
async function executeHedgedQueryWithRetry(
  prompt: string,
  options: ProviderOptions,
  hasOpenAI: boolean,
  hasAnthropic: boolean,
  errors: string[],
  startTime: number,
  globalSignal: AbortSignal
): Promise<UnifiedAIResponse & { retries?: number }> {
  // Calculate remaining budget for first attempt
  const elapsed = Date.now() - startTime;
  const remaining = GLOBAL_TIMEOUT_CHAT - elapsed - SAFETY_BUFFER;

  console.log(`🕐 Budget: ${remaining}ms remaining for first attempt`);

  // Attempt 1: Parallel calls with race
  try {
    const result = await executeHedgedQuery(
      prompt,
      options,
      hasOpenAI,
      hasAnthropic,
      errors,
      remaining,
      globalSignal
    );

    return { ...result, retries: 0 };

  } catch (firstAttemptError: any) {
    errors.push(`First attempt: ${firstAttemptError.message}`);
    console.warn('⚠️ Hedged AI Query: First attempt failed, checking retry budget...', errors);

    // Check if we have enough budget for retry
    const elapsedAfterFirst = Date.now() - startTime;
    const remainingAfterFirst = GLOBAL_TIMEOUT_CHAT - elapsedAfterFirst - SAFETY_BUFFER;

    if (remainingAfterFirst < MIN_RETRY_BUDGET) {
      console.warn(`⏰ Insufficient budget for retry (${remainingAfterFirst}ms < ${MIN_RETRY_BUDGET}ms)`);
      throw new Error(`All AI providers failed:\n${errors.join('\n')}`);
    }

    // Micro-retry with lower temperature
    console.log(`🔄 Retrying with ${remainingAfterFirst}ms budget remaining`);
    await new Promise(resolve => setTimeout(resolve, MICRO_RETRY_DELAY));

    try {
      const result = await executeHedgedQuery(
        prompt,
        { ...options, temperature: 0.1 }, // Lower temperature for retry
        hasOpenAI,
        hasAnthropic,
        errors,
        remainingAfterFirst - MICRO_RETRY_DELAY,
        globalSignal
      );

      console.log(`✅ Hedged AI Query: Micro-retry succeeded (${Date.now() - startTime}ms)`);
      return { ...result, retries: 1 };

    } catch (retryError: any) {
      errors.push(`Retry attempt: ${retryError.message}`);
      console.error('❌ Hedged AI Query: All attempts failed', errors);
      throw new Error(`All AI providers failed:\n${errors.join('\n')}`);
    }
  }
}

/**
 * Execute a single hedged query attempt
 *
 * Internal function that handles the parallel execution logic:
 * - Creates abort controllers for each provider
 * - Fires both providers in parallel with budget-derived timeouts
 * - Races for first valid response
 * - Implements validation window for second chance
 * - Aborts losing provider
 *
 * @param prompt - The prompt to send
 * @param options - Provider options
 * @param hasOpenAI - Whether OpenAI is available
 * @param hasAnthropic - Whether Anthropic is available
 * @param errors - Array to collect error messages
 * @param remainingBudget - Remaining time budget in ms
 * @param globalSignal - Global timeout signal
 * @returns Unified AI response from winner
 * @throws Error if no valid response
 */
async function executeHedgedQuery(
  prompt: string,
  options: ProviderOptions,
  hasOpenAI: boolean,
  hasAnthropic: boolean,
  errors: string[],
  remainingBudget: number,
  globalSignal: AbortSignal
): Promise<UnifiedAIResponse> {

  // Calculate provider timeout from remaining budget (GPT-5 recommendation)
  const providerTimeout = Math.max(MIN_PROVIDER_TIMEOUT, remainingBudget);
  console.log(`⏱️ Provider timeout: ${providerTimeout}ms (from ${remainingBudget}ms budget)`);

  // Create abort controllers for each provider
  const controllers = {
    openai: new AbortController(),
    anthropic: new AbortController()
  };

  // Merge parent signal + global signal with provider signals
  const mergeSignalAbort = () => {
    console.log('🚫 Hedged Query: Signal aborted, cancelling both providers');
    controllers.openai.abort();
    controllers.anthropic.abort();
  };

  if (options.signal) {
    if (options.signal.aborted) {
      throw new Error('Request aborted by parent signal before starting');
    }
    options.signal.addEventListener('abort', mergeSignalAbort);
  }

  if (globalSignal.aborted) {
    throw new Error('Request aborted by global timeout before starting');
  }
  globalSignal.addEventListener('abort', mergeSignalAbort);

  // Build provider promises
  const promises: Array<Promise<UnifiedAIResponse & { _providerKey: 'openai' | 'anthropic' }>> = [];

  if (hasOpenAI) {
    promises.push(
      callOpenAI(prompt, {
        ...options,
        signal: controllers.openai.signal,
        timeout: providerTimeout // Pass budget-derived timeout
      })
        .then(response => ({ ...response, _providerKey: 'openai' as const }))
        .catch(error => {
          const errorMsg = `OpenAI: ${error.message}`;
          errors.push(errorMsg);
          throw new Error(errorMsg);
        })
    );
  }

  if (hasAnthropic) {
    promises.push(
      callAnthropic(prompt, {
        ...options,
        signal: controllers.anthropic.signal,
        timeout: providerTimeout // Pass budget-derived timeout
      })
        .then(response => ({ ...response, _providerKey: 'anthropic' as const }))
        .catch(error => {
          const errorMsg = `Claude: ${error.message}`;
          errors.push(errorMsg);
          throw new Error(errorMsg);
        })
    );
  }

  if (promises.length === 0) {
    throw new Error('No provider promises to execute');
  }

  try {
    // Race for first response
    const firstResponse = await Promise.race(promises);

    // Validate first response
    const isValid = validateResponse(firstResponse);

    if (isValid) {
      // Abort the losing provider
      const loser = firstResponse._providerKey === 'openai' ? 'anthropic' : 'openai';
      controllers[loser].abort();

      console.log(`✅ Hedged AI: ${firstResponse.provider} won (${firstResponse.latency}ms, first valid)`);

      // Remove internal tracking field before returning
      const { _providerKey, ...cleanResponse } = firstResponse;
      return cleanResponse;
    }

    // First response invalid, wait for second provider
    console.warn(`⚠️ Hedged AI: First response invalid, waiting ${VALIDATION_WINDOW}ms for second provider`);

    try {
      // Wait for the other promise with a timeout
      // Determine which promise won and get the other one
      const winnerIndex = firstResponse._providerKey === 'openai' ?
        (hasOpenAI && hasAnthropic ? 0 : 0) :
        (hasOpenAI && hasAnthropic ? 1 : 0);
      const otherPromise = promises[winnerIndex === 0 ? 1 : 0];

      const secondResponse = await Promise.race([
        otherPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Validation window expired')), VALIDATION_WINDOW)
        )
      ]);

      // Validate second response
      if (validateResponse(secondResponse)) {
        const loser = secondResponse._providerKey === 'openai' ? 'anthropic' : 'openai';
        controllers[loser].abort();

        console.log(`✅ Hedged AI: ${secondResponse.provider} won (${secondResponse.latency}ms, second chance)`);

        const { _providerKey, ...cleanResponse } = secondResponse;
        return cleanResponse;
      }

      throw new Error('Second response also invalid');

    } catch (secondError: any) {
      errors.push(`Second chance: ${secondError.message}`);
      throw new Error('No valid response from any provider within validation window');
    }

  } catch (raceError: any) {
    // Both providers failed or validation window expired
    throw raceError;
  } finally {
    // Ensure both providers are aborted
    controllers.openai.abort();
    controllers.anthropic.abort();
  }
}

/**
 * Validate an AI response
 *
 * Checks that response has:
 * - Non-empty text content
 * - Valid token usage data
 * - Total tokens > 0
 *
 * @param response - The unified AI response to validate
 * @returns true if valid, false otherwise
 */
function validateResponse(response: UnifiedAIResponse): boolean {
  return !!(
    response &&
    response.text &&
    response.text.trim().length > 0 &&
    response.tokens &&
    response.tokens.total > 0
  );
}

/**
 * Hedged AI query with streaming - fires both providers, first chunk wins
 *
 * Strategy (GPT-5 TTFT optimization):
 * 1. Start both provider streams in parallel
 * 2. Race for first chunk with 6s TTFT (time-to-first-token) timeout
 * 3. Abort the losing stream immediately
 * 4. Forward remaining chunks from winner (no timeout once streaming)
 * 5. Handle errors and disconnects
 *
 * @param prompt - The prompt to send to AI providers
 * @param options - Provider options including telemetry callback
 * @yields String chunks from winning provider
 * @throws Error if both streams fail or TTFT timeout exceeded
 */
export async function* hedgedAIQueryStream(
  prompt: string,
  options: ProviderOptions & { telemetry?: TelemetryCallback } = {}
): AsyncGenerator<string> {
  const startTime = Date.now();
  const errors: string[] = [];

  // Check available providers (with cost guard toggles)
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY?.startsWith('sk-');
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-');

  // Cost guard: Allow disabling specific providers via env vars (GPT-5 recommendation)
  const isOpenAIDisabled = process.env.DISABLE_OPENAI_HEDGING === 'true';
  const isAnthropicDisabled = process.env.DISABLE_ANTHROPIC_HEDGING === 'true';

  const hasOpenAI = hasOpenAIKey && !isOpenAIDisabled;
  const hasAnthropic = hasAnthropicKey && !isAnthropicDisabled;

  if (!hasOpenAI && !hasAnthropic) {
    const reasons = [];
    if (!hasOpenAIKey) reasons.push('OpenAI: missing API key');
    if (!hasAnthropicKey) reasons.push('Anthropic: missing API key');
    if (isOpenAIDisabled) reasons.push('OpenAI: disabled via DISABLE_OPENAI_HEDGING');
    if (isAnthropicDisabled) reasons.push('Anthropic: disabled via DISABLE_ANTHROPIC_HEDGING');
    throw new Error(`No AI providers available: ${reasons.join(', ')}`);
  }

  if (isOpenAIDisabled) console.log('💰 Cost Guard: OpenAI disabled for hedging (stream)');
  if (isAnthropicDisabled) console.log('💰 Cost Guard: Anthropic disabled for hedging (stream)');

  console.log('🔀 Hedged AI Stream: Starting parallel streams', {
    hasOpenAI,
    hasAnthropic,
    ttftBudget: `${GLOBAL_TIMEOUT_STREAM_TTFT}ms`
  });

  // Create abort controllers
  const controllers = {
    openai: new AbortController(),
    anthropic: new AbortController()
  };

  // Merge parent signal
  if (options.signal) {
    if (options.signal.aborted) {
      throw new Error('Stream aborted by parent signal before starting');
    }
    options.signal.addEventListener('abort', () => {
      console.log('🚫 Hedged Stream: Parent signal aborted, cancelling both streams');
      controllers.openai.abort();
      controllers.anthropic.abort();
    });
  }

  // Start both streams
  const streams: Array<{
    generator: AsyncGenerator<any>;
    provider: 'openai' | 'anthropic';
  }> = [];

  if (hasOpenAI) {
    streams.push({
      generator: callOpenAIStream(prompt, {
        ...options,
        signal: controllers.openai.signal
      }),
      provider: 'openai'
    });
  }

  if (hasAnthropic) {
    streams.push({
      generator: callAnthropicStream(prompt, {
        ...options,
        signal: controllers.anthropic.signal
      }),
      provider: 'anthropic'
    });
  }

  // Race for first chunk with TTFT timeout (GPT-5 recommendation)
  let winner: 'openai' | 'anthropic' | null = null;
  let winnerGenerator: AsyncGenerator<any> | null = null;
  let firstChunkValue: any = null;

  try {
    const firstChunkResult = await Promise.race([
      ...streams.map(async ({ generator, provider }) => {
        try {
          const { value, done } = await generator.next();
          return { chunk: value, provider, generator, done };
        } catch (error: any) {
          errors.push(`${provider}: ${error.message}`);
          throw error;
        }
      }),
      // TTFT timeout (6s)
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`TTFT timeout: No first chunk after ${GLOBAL_TIMEOUT_STREAM_TTFT}ms`));
        }, GLOBAL_TIMEOUT_STREAM_TTFT);
      })
    ]);

    winner = firstChunkResult.provider;
    winnerGenerator = firstChunkResult.generator;
    firstChunkValue = firstChunkResult.chunk;

    // Abort the loser
    const loser = winner === 'openai' ? 'anthropic' : 'openai';
    controllers[loser].abort();

    console.log(`✅ Hedged AI Stream: ${winner} won (${Date.now() - startTime}ms to first chunk)`);

    // Track telemetry
    if (options.telemetry) {
      options.telemetry({
        winner,
        latency: Date.now() - startTime,
        retries: 0,
        errors: []
      });
    }

    // Yield first chunk
    if (firstChunkValue && !firstChunkResult.done && firstChunkValue.content) {
      yield firstChunkValue.content;
    }

    // Forward remaining chunks from winner
    for await (const chunk of winnerGenerator) {
      if (!chunk.done && chunk.content) {
        yield chunk.content;
      }
    }

    console.log(`✅ Hedged AI Stream: Complete (${Date.now() - startTime}ms total)`);

  } catch (error: any) {
    // Abort both on error
    controllers.openai.abort();
    controllers.anthropic.abort();

    // Track failure telemetry
    if (options.telemetry) {
      options.telemetry({
        winner: 'none',
        latency: Date.now() - startTime,
        retries: 0,
        errors
      });
    }

    console.error('❌ Hedged AI Stream: All streams failed', errors);
    throw new Error(`Streaming failed: ${errors.join(', ')}`);
  }
}
