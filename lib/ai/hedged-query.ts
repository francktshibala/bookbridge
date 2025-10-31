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

const VALIDATION_WINDOW = 150; // ms to wait for second provider if first invalid
const MICRO_RETRY_DELAY = 250; // ms delay before micro-retry

/**
 * Hedged AI query - fires both providers in parallel, returns first valid response
 *
 * Strategy:
 * 1. Check which providers are available (API keys)
 * 2. Fire both providers in parallel with individual timeouts
 * 3. Promise.race for first response
 * 4. Validate response (non-empty, has tokens)
 * 5. If first invalid, wait VALIDATION_WINDOW for second provider
 * 6. If both fail, micro-retry once with lower temperature
 * 7. Abort losing provider when winner settles
 * 8. Track telemetry (winner, latency, retries)
 *
 * @param prompt - The prompt to send to AI providers
 * @param options - Provider options including telemetry callback
 * @returns Unified AI response from winning provider
 * @throws Error if both providers fail
 */
export async function hedgedAIQuery(
  prompt: string,
  options: ProviderOptions & { telemetry?: TelemetryCallback } = {}
): Promise<UnifiedAIResponse> {
  const startTime = Date.now();
  const errors: string[] = [];
  let retries = 0;

  // Check available providers
  const hasOpenAI = !!process.env.OPENAI_API_KEY?.startsWith('sk-');
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-');

  if (!hasOpenAI && !hasAnthropic) {
    throw new Error('No AI providers available (missing API keys)');
  }

  console.log('🔀 Hedged AI Query: Starting parallel calls', {
    hasOpenAI,
    hasAnthropic,
    promptLength: prompt.length
  });

  // Attempt 1: Parallel calls with race
  try {
    const result = await executeHedgedQuery(
      prompt,
      options,
      hasOpenAI,
      hasAnthropic,
      errors
    );

    // Track success telemetry
    if (options.telemetry) {
      options.telemetry({
        winner: result.provider,
        latency: Date.now() - startTime,
        retries: 0,
        errors
      });
    }

    console.log(`✅ Hedged AI Query: Success on first attempt (${Date.now() - startTime}ms)`);
    return result;

  } catch (firstAttemptError: any) {
    errors.push(`First attempt: ${firstAttemptError.message}`);
    console.warn('⚠️ Hedged AI Query: First attempt failed, micro-retrying...', errors);

    // Micro-retry with lower temperature
    await new Promise(resolve => setTimeout(resolve, MICRO_RETRY_DELAY));
    retries = 1;

    try {
      const result = await executeHedgedQuery(
        prompt,
        { ...options, temperature: 0.1 }, // Lower temperature for retry
        hasOpenAI,
        hasAnthropic,
        errors
      );

      // Track retry success telemetry
      if (options.telemetry) {
        options.telemetry({
          winner: result.provider,
          latency: Date.now() - startTime,
          retries: 1,
          errors
        });
      }

      console.log(`✅ Hedged AI Query: Micro-retry succeeded (${Date.now() - startTime}ms)`);
      return result;

    } catch (retryError: any) {
      errors.push(`Retry attempt: ${retryError.message}`);
      console.error('❌ Hedged AI Query: All attempts failed', errors);

      // Track failure telemetry
      if (options.telemetry) {
        options.telemetry({
          winner: 'none',
          latency: Date.now() - startTime,
          retries: 1,
          errors
        });
      }

      throw new Error(`All AI providers failed:\n${errors.join('\n')}`);
    }
  }
}

/**
 * Execute a single hedged query attempt
 *
 * Internal function that handles the parallel execution logic:
 * - Creates abort controllers for each provider
 * - Fires both providers in parallel
 * - Races for first valid response
 * - Implements validation window for second chance
 * - Aborts losing provider
 *
 * @param prompt - The prompt to send
 * @param options - Provider options
 * @param hasOpenAI - Whether OpenAI is available
 * @param hasAnthropic - Whether Anthropic is available
 * @param errors - Array to collect error messages
 * @returns Unified AI response from winner
 * @throws Error if no valid response
 */
async function executeHedgedQuery(
  prompt: string,
  options: ProviderOptions,
  hasOpenAI: boolean,
  hasAnthropic: boolean,
  errors: string[]
): Promise<UnifiedAIResponse> {

  // Create abort controllers for each provider
  const controllers = {
    openai: new AbortController(),
    anthropic: new AbortController()
  };

  // Merge parent signal with provider signals
  if (options.signal) {
    if (options.signal.aborted) {
      throw new Error('Request aborted by parent signal before starting');
    }
    options.signal.addEventListener('abort', () => {
      console.log('🚫 Hedged Query: Parent signal aborted, cancelling both providers');
      controllers.openai.abort();
      controllers.anthropic.abort();
    });
  }

  // Build provider promises
  const promises: Array<Promise<UnifiedAIResponse & { _providerKey: 'openai' | 'anthropic' }>> = [];

  if (hasOpenAI) {
    promises.push(
      callOpenAI(prompt, {
        ...options,
        signal: controllers.openai.signal
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
        signal: controllers.anthropic.signal
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
 * Strategy:
 * 1. Start both provider streams in parallel
 * 2. Race for first chunk (whoever yields first wins)
 * 3. Abort the losing stream immediately
 * 4. Forward remaining chunks from winner
 * 5. Handle errors and disconnects
 *
 * @param prompt - The prompt to send to AI providers
 * @param options - Provider options including telemetry callback
 * @yields String chunks from winning provider
 * @throws Error if both streams fail
 */
export async function* hedgedAIQueryStream(
  prompt: string,
  options: ProviderOptions & { telemetry?: TelemetryCallback } = {}
): AsyncGenerator<string> {
  const startTime = Date.now();
  const errors: string[] = [];

  // Check available providers
  const hasOpenAI = !!process.env.OPENAI_API_KEY?.startsWith('sk-');
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-');

  if (!hasOpenAI && !hasAnthropic) {
    throw new Error('No AI providers available (missing API keys)');
  }

  console.log('🔀 Hedged AI Stream: Starting parallel streams', {
    hasOpenAI,
    hasAnthropic
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

  // Race for first chunk
  let winner: 'openai' | 'anthropic' | null = null;
  let winnerGenerator: AsyncGenerator<any> | null = null;
  let firstChunkValue: any = null;

  try {
    const firstChunkResult = await Promise.race(
      streams.map(async ({ generator, provider }) => {
        try {
          const { value, done } = await generator.next();
          return { chunk: value, provider, generator, done };
        } catch (error: any) {
          errors.push(`${provider}: ${error.message}`);
          throw error;
        }
      })
    );

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
