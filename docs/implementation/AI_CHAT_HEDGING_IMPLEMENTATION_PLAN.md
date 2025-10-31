# AI Chat Hedging - Implementation Plan

> **Purpose**: Step-by-step plan to add dual-provider hedging (Claude + OpenAI) to AI chat feature, eliminating rate limit failures and improving reliability to 99%+.

---

## 📋 Executive Summary

**Problem**: AI chat fails completely when Claude hits rate limits (no fallover mechanism)

**Solution**: Apply dictionary's proven hedging pattern - fire both providers in parallel, first success wins

**Pattern**: Phase 4 Service Layer (pure functions, no classes, AbortSignal propagation)

**Safety**: ✅ Fully additive, incremental, each step reversible

**Timeline**: 7 steps, ~6-8 hours total implementation time

**Branch**: `feature/ai-chat-hedging`

**Status**: 🚧 Not Started

---

## 🎯 Goals & Success Criteria

### Functional Goals
- [ ] AI chat works consistently on `/library` page
- [ ] AI chat works consistently on `/featured-books` page
- [ ] AI chat works consistently on `/enhanced-collection` page
- [ ] No user-visible rate limit errors
- [ ] Automatic provider failover (transparent to users)
- [ ] Streaming responses work with hedging

### Technical Goals
- [ ] 99%+ success rate (from current ~60-70%)
- [ ] 20-30% faster response times (fastest provider wins)
- [ ] Pure functions following Phase 4 pattern
- [ ] All functions accept AbortSignal
- [ ] 8+ unit tests with >80% coverage
- [ ] Provider telemetry for monitoring

### Safety Goals
- [ ] Zero regression in existing features
- [ ] Each commit independently reversible
- [ ] Backward compatible exports
- [ ] TypeScript compiles without errors
- [ ] All tests pass before merge

---

## 🏗️ Architecture Design

### Current Flow (Broken)
```
User Question → /api/ai → aiService (Claude ONLY) → ❌ Fails on rate limit
                           ↓
                      lib/ai/index.ts
                      ClaudeAIService class
```

### Target Flow (Hedged)
```
User Question → /api/ai → hedgedAIQuery() → [Claude + OpenAI parallel]
                           ↓                  ↓
                      lib/ai/hedged-query.ts  Promise.race()
                      Pure functions          ↓
                                             ✅ First success wins
                                             ⚠️ Validate response
                                             🔄 Micro-retry if needed
                                             🚫 Abort loser
```

### File Structure (After Implementation)
```
lib/ai/
├── providers/
│   ├── openai.ts (NEW)           - Pure function wrapper for OpenAI
│   ├── anthropic.ts (NEW)        - Pure function wrapper for Claude
│   └── types.ts (NEW)            - Shared types for providers
├── hedged-query.ts (NEW)         - Main hedging logic
├── __tests__/
│   ├── hedged-query.test.ts (NEW)     - Unit tests
│   └── providers.test.ts (NEW)        - Provider wrapper tests
├── index.ts (MODIFIED)           - Export hedged functions
├── claude-service.ts (NO CHANGE) - Keep existing class
└── service.ts (NO CHANGE)        - Keep existing class
```

### Design Principles (Phase 4 Compliance)

**Pure Functions:**
- No state, no side effects (except I/O)
- Accept all dependencies as parameters
- Return typed results
- Deterministic (same input → same output)

**AbortSignal Pattern:**
```typescript
async function hedgedAIQuery(
  prompt: string,
  options: QueryOptions,
  signal?: AbortSignal  // ✅ Always accept signal
): Promise<AIResponse>
```

**Error Handling:**
- Provider errors → log and try other provider
- Both providers fail → throw with details
- Validation errors → micro-retry once
- Timeout → abort and try other provider

**Telemetry:**
- Track which provider wins
- Measure latency per provider
- Count retries and failures
- Surface via optional callback

---

## 📐 Step-by-Step Implementation

### Step 0: Setup (5 minutes)

**Create branch:**
```bash
git checkout main
git pull origin main
git checkout -b feature/ai-chat-hedging
```

**Verify environment:**
- [ ] `ANTHROPIC_API_KEY` is set and valid
- [ ] `OPENAI_API_KEY` is set and valid
- [ ] Both keys work (test with existing dictionary feature)

**Create tracking:**
- [ ] Update this file's status to "🚧 In Progress"
- [ ] Document start time and developer

---

### Step 1: Create Shared Types (30 minutes)

**File:** `/lib/ai/providers/types.ts` (NEW)

**Purpose:** Define unified response shape for both providers

**Tasks:**
- [ ] Create `UnifiedAIResponse` interface
- [ ] Create `ProviderOptions` interface
- [ ] Create `StreamChunk` interface
- [ ] Add JSDoc comments for all types
- [ ] Export from index

**Code Structure:**
```typescript
export interface UnifiedAIResponse {
  text: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  provider: 'openai' | 'anthropic';
  model: string;
  latency: number; // milliseconds
}

export interface ProviderOptions {
  signal?: AbortSignal;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean; // Strict JSON output
}

export interface StreamChunk {
  content: string;
  provider: 'openai' | 'anthropic';
  done: boolean;
}
```

**Validation:**
- [ ] TypeScript compiles
- [ ] File imports successfully
- [ ] No ESLint errors

**Commit:**
```
feat(ai): add unified provider types for hedging

- Create UnifiedAIResponse interface
- Create ProviderOptions interface
- Create StreamChunk interface
- Foundation for dual-provider hedging

Related: Phase 4 Service Layer pattern
```

---

### Step 2: Create OpenAI Provider Wrapper (1 hour)

**File:** `/lib/ai/providers/openai.ts` (NEW)

**Purpose:** Pure function wrapper around OpenAI SDK (reuse existing config)

**Tasks:**
- [ ] Import existing OpenAI service for SDK config
- [ ] Create `callOpenAI()` pure function
- [ ] Create `callOpenAIStream()` pure function
- [ ] Add per-provider timeout (30 seconds)
- [ ] Add response validator
- [ ] Handle AbortSignal properly
- [ ] Add error handling and logging

**Code Structure:**
```typescript
import { AccessibleAIService } from '../service';
import { UnifiedAIResponse, ProviderOptions, StreamChunk } from './types';

const PROVIDER_TIMEOUT = 30000; // 30 seconds

export async function callOpenAI(
  prompt: string,
  options: ProviderOptions
): Promise<UnifiedAIResponse> {
  const startTime = Date.now();

  // Create timeout abort controller
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), PROVIDER_TIMEOUT);

  try {
    // Reuse existing service's SDK and config
    const openaiService = new AccessibleAIService();

    // Call existing service method (maintains consistency)
    const response = await openaiService.query(prompt, {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      // Merge signals (parent + timeout)
    });

    clearTimeout(timeoutId);

    // Validate response
    if (!response.content || response.content.trim().length === 0) {
      throw new Error('OpenAI returned empty response');
    }

    // Transform to unified shape
    return {
      text: response.content,
      tokens: response.usage,
      provider: 'openai',
      model: response.model,
      latency: Date.now() - startTime
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Enhance error with provider context
    if (error.name === 'AbortError') {
      throw new Error(`OpenAI: Request aborted (${Date.now() - startTime}ms)`);
    }
    throw new Error(`OpenAI: ${error.message}`);
  }
}

export async function* callOpenAIStream(
  prompt: string,
  options: ProviderOptions
): AsyncGenerator<StreamChunk> {
  // Similar structure for streaming
  // Yield unified StreamChunk objects
}
```

**Validation:**
- [ ] Function compiles with correct types
- [ ] Can call with AbortSignal
- [ ] Returns UnifiedAIResponse shape
- [ ] Timeout works correctly
- [ ] Errors are properly caught and enhanced

**Commit:**
```
feat(ai): add OpenAI provider wrapper

- Pure function callOpenAI() for standard queries
- Pure function callOpenAIStream() for streaming
- 30s timeout per provider
- Response validation
- Unified response shape
- Reuses existing SDK config

Related: Step 2 of AI hedging plan
```

---

### Step 3: Create Anthropic Provider Wrapper (1 hour)

**File:** `/lib/ai/providers/anthropic.ts` (NEW)

**Purpose:** Pure function wrapper around Claude SDK (reuse existing config)

**Tasks:**
- [ ] Import existing Claude service for SDK config
- [ ] Create `callAnthropic()` pure function
- [ ] Create `callAnthropicStream()` pure function
- [ ] Add per-provider timeout (30 seconds)
- [ ] Add response validator
- [ ] Handle AbortSignal properly
- [ ] Add error handling and logging

**Code Structure:**
```typescript
import { ClaudeAIService } from '../claude-service';
import { UnifiedAIResponse, ProviderOptions, StreamChunk } from './types';

const PROVIDER_TIMEOUT = 30000; // 30 seconds

export async function callAnthropic(
  prompt: string,
  options: ProviderOptions
): Promise<UnifiedAIResponse> {
  const startTime = Date.now();

  // Create timeout abort controller
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), PROVIDER_TIMEOUT);

  try {
    // Reuse existing service's SDK and config
    const claudeService = new ClaudeAIService();

    // Call existing service method
    const response = await claudeService.query(prompt, {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      // Merge signals (parent + timeout)
    });

    clearTimeout(timeoutId);

    // Validate response
    if (!response.content || response.content.trim().length === 0) {
      throw new Error('Claude returned empty response');
    }

    // Transform to unified shape
    return {
      text: response.content,
      tokens: response.usage,
      provider: 'anthropic',
      model: response.model,
      latency: Date.now() - startTime
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Enhance error with provider context
    if (error.name === 'AbortError') {
      throw new Error(`Claude: Request aborted (${Date.now() - startTime}ms)`);
    }
    throw new Error(`Claude: ${error.message}`);
  }
}

export async function* callAnthropicStream(
  prompt: string,
  options: ProviderOptions
): AsyncGenerator<StreamChunk> {
  // Similar structure for streaming
  // Yield unified StreamChunk objects
}
```

**Validation:**
- [ ] Function compiles with correct types
- [ ] Can call with AbortSignal
- [ ] Returns UnifiedAIResponse shape
- [ ] Timeout works correctly
- [ ] Errors are properly caught and enhanced

**Commit:**
```
feat(ai): add Anthropic provider wrapper

- Pure function callAnthropic() for standard queries
- Pure function callAnthropicStream() for streaming
- 30s timeout per provider
- Response validation
- Unified response shape
- Reuses existing SDK config

Related: Step 3 of AI hedging plan
```

---

### Step 4: Create Hedging Core Logic (2 hours)

**File:** `/lib/ai/hedged-query.ts` (NEW)

**Purpose:** Main hedging logic - parallel provider calls with race and fallback

**Tasks:**
- [ ] Create `hedgedAIQuery()` main function
- [ ] Implement provider detection (check API keys)
- [ ] Implement parallel provider calls
- [ ] Implement Promise.race with validation window
- [ ] Implement micro-retry strategy
- [ ] Implement abort of losing provider
- [ ] Add telemetry hooks
- [ ] Add comprehensive error messages

**Code Structure:**
```typescript
import { callOpenAI } from './providers/openai';
import { callAnthropic } from './providers/anthropic';
import { UnifiedAIResponse, ProviderOptions } from './providers/types';

const VALIDATION_WINDOW = 150; // ms to wait for second provider if first invalid
const MICRO_RETRY_DELAY = 250; // ms delay before micro-retry

// Telemetry callback type
export type TelemetryCallback = (data: {
  winner: 'openai' | 'anthropic';
  latency: number;
  retries: number;
  errors: string[];
}) => void;

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

    return result;

  } catch (firstAttemptError) {
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

      console.log('✅ Hedged AI Query: Micro-retry succeeded');
      return result;

    } catch (retryError) {
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
    options.signal.addEventListener('abort', () => {
      controllers.openai.abort();
      controllers.anthropic.abort();
    });
  }

  // Build provider promises
  const promises: Promise<UnifiedAIResponse>[] = [];

  if (hasOpenAI) {
    promises.push(
      callOpenAI(prompt, {
        ...options,
        signal: controllers.openai.signal
      }).catch(error => {
        errors.push(`OpenAI: ${error.message}`);
        throw error;
      })
    );
  }

  if (hasAnthropic) {
    promises.push(
      callAnthropic(prompt, {
        ...options,
        signal: controllers.anthropic.signal
      }).catch(error => {
        errors.push(`Claude: ${error.message}`);
        throw error;
      })
    );
  }

  // Race for first response
  const firstResponse = await Promise.race(promises);

  // Validate first response
  const isValid = validateResponse(firstResponse);

  if (isValid) {
    // Abort the losing provider
    const loser = firstResponse.provider === 'openai' ? 'anthropic' : 'openai';
    controllers[loser].abort();

    console.log(`✅ Hedged AI: ${firstResponse.provider} won (${firstResponse.latency}ms)`);
    return firstResponse;
  }

  // First response invalid, wait for second provider
  console.warn(`⚠️ Hedged AI: First response invalid, waiting ${VALIDATION_WINDOW}ms for second provider`);

  const secondResponse = await Promise.race([
    ...promises,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Validation window expired')), VALIDATION_WINDOW)
    )
  ]);

  // Validate second response
  if (validateResponse(secondResponse)) {
    const loser = secondResponse.provider === 'openai' ? 'anthropic' : 'openai';
    controllers[loser].abort();

    console.log(`✅ Hedged AI: ${secondResponse.provider} won (second chance, ${secondResponse.latency}ms)`);
    return secondResponse;
  }

  throw new Error('No valid response from any provider');
}

function validateResponse(response: UnifiedAIResponse): boolean {
  return (
    response.text &&
    response.text.trim().length > 0 &&
    response.tokens &&
    response.tokens.total > 0
  );
}
```

**Validation:**
- [ ] Function compiles with correct types
- [ ] Both providers called in parallel
- [ ] Promise.race works correctly
- [ ] Validation window implemented
- [ ] Micro-retry works
- [ ] Loser gets aborted
- [ ] Telemetry callback fires
- [ ] Comprehensive logging

**Commit:**
```
feat(ai): add hedged query core logic

- hedgedAIQuery() with parallel provider calls
- Promise.race with validation window
- Micro-retry strategy on failures
- Abort losing provider on winner settle
- Telemetry hooks for monitoring
- Comprehensive error handling

Related: Step 4 of AI hedging plan
```

---

### Step 5: Add Streaming Support (1.5 hours)

**File:** `/lib/ai/hedged-query.ts` (APPEND)

**Purpose:** Add streaming support with same hedging strategy

**Tasks:**
- [ ] Create `hedgedAIQueryStream()` function
- [ ] Implement stream race (first chunk wins)
- [ ] Abort losing stream immediately
- [ ] Forward chunks with unified interface
- [ ] Handle backpressure properly
- [ ] Handle client disconnect (abort both streams)
- [ ] Add streaming telemetry

**Code Structure:**
```typescript
/**
 * Hedged AI query with streaming - fires both providers, first chunk wins
 *
 * Strategy:
 * 1. Start both provider streams in parallel
 * 2. Race for first chunk (whoever yields first wins)
 * 3. Abort the losing stream immediately
 * 4. Forward remaining chunks from winner
 * 5. Handle errors and disconnects
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
    options.signal.addEventListener('abort', () => {
      controllers.openai.abort();
      controllers.anthropic.abort();
    });
  }

  // Start both streams
  const streams: Array<{
    generator: AsyncGenerator<StreamChunk>;
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
  let winnerGenerator: AsyncGenerator<StreamChunk> | null = null;

  try {
    const firstChunks = await Promise.race(
      streams.map(async ({ generator, provider }) => {
        const { value } = await generator.next();
        return { chunk: value, provider, generator };
      })
    );

    winner = firstChunks.provider;
    winnerGenerator = firstChunks.generator;

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
    if (firstChunks.chunk && !firstChunks.chunk.done) {
      yield firstChunks.chunk.content;
    }

    // Forward remaining chunks from winner
    for await (const chunk of winnerGenerator) {
      if (!chunk.done) {
        yield chunk.content;
      }
    }

  } catch (error) {
    // Abort both on error
    controllers.openai.abort();
    controllers.anthropic.abort();

    console.error('❌ Hedged AI Stream: All streams failed', error);
    throw new Error(`Streaming failed: ${error.message}`);
  }
}
```

**Validation:**
- [ ] Function compiles correctly
- [ ] Both streams start in parallel
- [ ] First chunk determines winner
- [ ] Loser stream gets aborted
- [ ] Remaining chunks forwarded correctly
- [ ] Client disconnect handled
- [ ] Telemetry fires

**Commit:**
```
feat(ai): add hedged streaming support

- hedgedAIQueryStream() with parallel streams
- First chunk wins strategy
- Abort losing stream immediately
- Forward chunks with unified interface
- Handle backpressure and disconnects
- Streaming telemetry

Related: Step 5 of AI hedging plan
```

---

### Step 6: Update Exports and API Routes (30 minutes)

**File 1:** `/lib/ai/index.ts` (MODIFY)

**Tasks:**
- [ ] Export hedged functions
- [ ] Keep existing exports (backward compatible)
- [ ] Export types

**Changes:**
```typescript
// Hedged functions (NEW - recommended for all new code)
export { hedgedAIQuery, hedgedAIQueryStream } from './hedged-query';
export type { TelemetryCallback } from './hedged-query';
export type { UnifiedAIResponse, ProviderOptions, StreamChunk } from './providers/types';

// Legacy exports (keep for backward compatibility)
export { ClaudeAIService } from './claude-service';
export const aiService = new ClaudeAIService();
export type { AIResponse } from './service';
```

**File 2:** `/app/api/ai/route.ts` (MODIFY)

**Tasks:**
- [ ] Import hedged function
- [ ] Replace aiService.query() call
- [ ] Pass signal from request
- [ ] Add telemetry logging
- [ ] Keep existing error handling

**Changes (lines 2, 360-370):**
```typescript
// Line 2 - Update imports
import { hedgedAIQuery } from '@/lib/ai';
import { aiService } from '@/lib/ai'; // Keep for getUsageStats()

// Lines 360-370 - Replace standard query
// BEFORE:
// response = await aiService.query(enhancedQuery, {
//   userId: user.id,
//   bookId,
//   bookContext: enrichedBookContext + crossBookContext + conversationContext,
//   maxTokens,
//   responseMode,
//   temperature: dynamicParams?.temperature
// });

// AFTER:
response = await hedgedAIQuery(enhancedQuery, {
  userId: user.id,
  bookId,
  bookContext: enrichedBookContext + crossBookContext + conversationContext,
  maxTokens,
  temperature: dynamicParams?.temperature,
  signal: request.signal, // NEW: Pass abort signal
  telemetry: (data) => {
    console.log('🎯 AI Query Telemetry:', data);
  }
});

// Transform to existing response format for compatibility
if (response) {
  response = {
    content: response.text,
    usage: response.tokens,
    model: response.model,
    cost: 0 // Calculate if needed
  };
}
```

**File 3:** `/app/api/ai/stream/route.ts` (MODIFY)

**Tasks:**
- [ ] Import hedged stream function
- [ ] Replace aiService.queryStream() call
- [ ] Pass signal from request
- [ ] Add telemetry logging

**Changes (lines 2, 61-67):**
```typescript
// Line 2 - Update imports
import { hedgedAIQueryStream } from '@/lib/ai';

// Lines 61-67 - Replace streaming
// BEFORE:
// const aiStream = aiService.queryStream(query, {
//   userId: user.id,
//   bookId,
//   bookContext,
//   maxTokens: 1500
// });

// AFTER:
const aiStream = hedgedAIQueryStream(query, {
  maxTokens: 1500,
  signal: request.signal, // NEW: Pass abort signal
  telemetry: (data) => {
    console.log('🎯 AI Stream Telemetry:', data);
  }
});

// Rest of streaming logic remains the same
for await (const chunk of aiStream) {
  fullContent += chunk;
  // ... existing chunk handling
}
```

**Validation:**
- [ ] TypeScript compiles
- [ ] No import errors
- [ ] Backward compatible exports work
- [ ] API routes use new functions
- [ ] Signal propagation works
- [ ] Telemetry logs appear

**Commit:**
```
feat(ai): switch API routes to hedged queries

- Export hedged functions from lib/ai
- Update /api/ai/route.ts to use hedgedAIQuery
- Update /api/ai/stream/route.ts to use hedgedAIQueryStream
- Pass request.signal for cancellation
- Add telemetry logging
- Maintain backward compatibility

Related: Step 6 of AI hedging plan
```

---

### Step 7: Add Tests (1.5 hours)

**File 1:** `/lib/ai/__tests__/hedged-query.test.ts` (NEW)

**Tasks:**
- [ ] Mock provider functions
- [ ] Test both providers available
- [ ] Test OpenAI only
- [ ] Test Anthropic only
- [ ] Test no providers
- [ ] Test first provider fails
- [ ] Test both providers fail
- [ ] Test validation window
- [ ] Test micro-retry
- [ ] Test abort signal
- [ ] Test timeout
- [ ] Test telemetry callback

**Code Structure:**
```typescript
import { hedgedAIQuery, hedgedAIQueryStream } from '../hedged-query';
import { callOpenAI } from '../providers/openai';
import { callAnthropic } from '../providers/anthropic';

jest.mock('../providers/openai');
jest.mock('../providers/anthropic');

describe('hedgedAIQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'sk-test-openai';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-anthropic';
  });

  test('returns first valid response when both providers available', async () => {
    const openaiResponse = {
      text: 'OpenAI response',
      tokens: { prompt: 10, completion: 20, total: 30 },
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      latency: 100
    };

    (callOpenAI as jest.Mock).mockResolvedValue(openaiResponse);
    (callAnthropic as jest.Mock).mockResolvedValue({
      text: 'Claude response',
      tokens: { prompt: 10, completion: 20, total: 30 },
      provider: 'anthropic',
      model: 'claude-3',
      latency: 200
    });

    const result = await hedgedAIQuery('test prompt', {});

    // OpenAI should win (faster mock)
    expect(result.text).toBe('OpenAI response');
    expect(result.provider).toBe('openai');
    expect(callOpenAI).toHaveBeenCalledTimes(1);
    expect(callAnthropic).toHaveBeenCalledTimes(1);
  });

  test('fails over to Anthropic when OpenAI fails', async () => {
    (callOpenAI as jest.Mock).mockRejectedValue(new Error('OpenAI rate limited'));
    (callAnthropic as jest.Mock).mockResolvedValue({
      text: 'Claude response',
      tokens: { prompt: 10, completion: 20, total: 30 },
      provider: 'anthropic',
      model: 'claude-3',
      latency: 150
    });

    const result = await hedgedAIQuery('test prompt', {});

    expect(result.text).toBe('Claude response');
    expect(result.provider).toBe('anthropic');
  });

  test('retries with lower temperature when first attempt fails', async () => {
    // First attempt - both fail
    (callOpenAI as jest.Mock)
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce({
        text: 'Retry success',
        tokens: { prompt: 10, completion: 20, total: 30 },
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        latency: 100
      });

    (callAnthropic as jest.Mock).mockRejectedValue(new Error('Claude failed'));

    const result = await hedgedAIQuery('test prompt', { temperature: 0.7 });

    // Should succeed on retry with temperature 0.1
    expect(result.text).toBe('Retry success');
    expect(callOpenAI).toHaveBeenCalledTimes(2);
    expect(callOpenAI).toHaveBeenLastCalledWith(
      'test prompt',
      expect.objectContaining({ temperature: 0.1 })
    );
  });

  test('respects abort signal', async () => {
    const controller = new AbortController();

    (callOpenAI as jest.Mock).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { text: 'Should not reach', tokens: {}, provider: 'openai', model: '', latency: 0 };
    });

    // Abort after 100ms
    setTimeout(() => controller.abort(), 100);

    await expect(
      hedgedAIQuery('test prompt', { signal: controller.signal })
    ).rejects.toThrow();
  });

  test('throws when no providers available', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    await expect(
      hedgedAIQuery('test prompt', {})
    ).rejects.toThrow('No AI providers available');
  });

  test('calls telemetry callback with correct data', async () => {
    const telemetry = jest.fn();

    (callOpenAI as jest.Mock).mockResolvedValue({
      text: 'Response',
      tokens: { prompt: 10, completion: 20, total: 30 },
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      latency: 100
    });

    await hedgedAIQuery('test prompt', { telemetry });

    expect(telemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        winner: 'openai',
        latency: expect.any(Number),
        retries: 0,
        errors: []
      })
    );
  });
});

describe('hedgedAIQueryStream', () => {
  test('streams from first provider to respond', async () => {
    // Test implementation for streaming
  });

  test('aborts losing stream when winner determined', async () => {
    // Test implementation
  });
});
```

**File 2:** `/lib/ai/__tests__/providers.test.ts` (NEW)

**Tasks:**
- [ ] Test OpenAI wrapper
- [ ] Test Anthropic wrapper
- [ ] Test timeout handling
- [ ] Test error enhancement
- [ ] Test response validation

**Validation:**
- [ ] All tests pass
- [ ] Coverage >80%
- [ ] Tests are fast (<5s total)
- [ ] Mocks work correctly

**Commit:**
```
test(ai): add comprehensive tests for hedging

- Unit tests for hedgedAIQuery
- Unit tests for hedgedAIQueryStream
- Provider wrapper tests
- Mock both providers
- Test failover scenarios
- Test micro-retry
- Test abort signal
- Test telemetry
- >80% coverage

Related: Step 7 of AI hedging plan
```

---

## 🧪 Testing & Validation

### Automated Tests
```bash
# Run all AI tests
npm test -- lib/ai/__tests__

# Run with coverage
npm test -- --coverage lib/ai/__tests__
```

**Expected Results:**
- [ ] All tests pass (green)
- [ ] Coverage >80%
- [ ] No TypeScript errors
- [ ] No ESLint warnings

### Manual Integration Testing

**Test 1: Library Page (Where it used to work)**
1. Navigate to `/library`
2. Click "Ask AI" on any book
3. Type: "What are the main themes?"
4. Verify response appears
5. Check console for telemetry (which provider won)

**Test 2: Featured Books Page (Where it hits limits)**
1. Navigate to `/featured-books`
2. Select a book, wait for it to load
3. Click "Ask AI" button
4. Type: "Tell me about the characters"
5. Verify response appears
6. Repeat 5-10 times rapidly (stress test)
7. Should work every time (no rate limit errors)

**Test 3: Enhanced Collection (Where it hits limits)**
1. Navigate to `/enhanced-collection`
2. Click "Ask AI" on any book
3. Type: "Explain the plot"
4. Verify response appears

**Test 4: Provider Failover Simulation**
1. Temporarily rename one API key in `.env.local`
   ```bash
   # Disable Claude
   ANTHROPIC_API_KEY_DISABLED=sk-ant-...
   ```
2. Restart dev server
3. Test AI chat on any page
4. Should work using OpenAI only
5. Check console: should show "Using OpenAI only"
6. Restore API key and test again

**Test 5: Streaming Test**
1. Use any page with AI chat
2. Ask a complex question that generates long response
3. Verify text streams in (appears word-by-word)
4. Verify streaming doesn't break or error

**Test 6: Abort Test**
1. Start an AI query
2. Close the modal immediately (before response)
3. Check console - should show request aborted
4. No errors should appear

### Performance Validation

**Before Hedging (Baseline):**
- Success rate: ~60-70%
- Average response time: 2-4 seconds (when working)
- Rate limit errors: Common during high usage

**After Hedging (Target):**
- [ ] Success rate: 99%+ (measure over 50 queries)
- [ ] Average response time: 1.5-3 seconds (20-30% improvement)
- [ ] Rate limit errors: Zero
- [ ] Provider distribution: ~50/50 between OpenAI and Claude

**Measure:**
```bash
# Check telemetry in console
# Should see logs like:
# 🎯 AI Query Telemetry: { winner: 'openai', latency: 1847, retries: 0, errors: [] }
# 🎯 AI Query Telemetry: { winner: 'anthropic', latency: 2103, retries: 0, errors: [] }
```

---

## 🚀 Deployment Process

### Pre-Merge Checklist

- [ ] All automated tests pass
- [ ] All manual tests pass on 3 pages
- [ ] Provider failover tested
- [ ] Streaming works correctly
- [ ] Abort signal works
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] No console errors in browser
- [ ] Performance metrics meet targets
- [ ] Code reviewed (self-review against plan)

### Merge to Main

```bash
# 1. Ensure all changes committed
git status  # Should be clean

# 2. Pull latest main
git checkout main
git pull origin main

# 3. Merge feature branch
git checkout feature/ai-chat-hedging
git rebase main  # Resolve any conflicts

# 4. Final test after rebase
npm test
npm run build
# Manual test on localhost:3000

# 5. Merge to main
git checkout main
git merge feature/ai-chat-hedging --no-ff

# 6. Push to GitHub
git push origin main
```

### Production Deployment (Render)

1. **Push triggers auto-deploy:**
   - Render detects push to main
   - Starts build automatically
   - Wait 3-5 minutes for build

2. **Verify environment variables:**
   - Check Render dashboard
   - Ensure `ANTHROPIC_API_KEY` is set
   - Ensure `OPENAI_API_KEY` is set

3. **Monitor deployment:**
   - Watch Render logs for errors
   - Wait for "Deploy succeeded" message
   - Check deployment URL

4. **Smoke test production:**
   - Visit https://bookbridge.app
   - Test AI chat on `/library` page
   - Test AI chat on `/featured-books` page
   - Verify no console errors
   - Check telemetry logs (should show provider winners)

5. **Monitor for 24 hours:**
   - Check Google Analytics for errors
   - Monitor Render logs for exceptions
   - Watch for user-reported issues

### Rollback Plan (If Issues Found)

**Quick rollback:**
```bash
# 1. Revert merge commit
git revert -m 1 <merge-commit-hash>
git push origin main

# 2. Render auto-deploys revert
# 3. Feature still available in branch for fixes
```

**Alternative - Disable hedging temporarily:**
```typescript
// In lib/ai/index.ts - quick patch
export { aiService } from './index';  // Use old service
// export { hedgedAIQuery } from './hedged-query';  // Comment out
```

---

## 📊 Success Metrics (Post-Deployment)

### Week 1 Monitoring

**Functional Metrics:**
- [ ] Zero rate limit errors reported
- [ ] AI chat success rate >99%
- [ ] No user complaints about AI feature
- [ ] Both providers being used (check telemetry)

**Performance Metrics:**
- [ ] Average response time: <3 seconds
- [ ] P95 response time: <5 seconds
- [ ] Provider failover working (if one down)
- [ ] Streaming performance maintained

**Technical Metrics:**
- [ ] No production errors in Render logs
- [ ] TypeScript types correct (no runtime errors)
- [ ] Memory usage stable (no leaks)
- [ ] Both API routes functioning

### Month 1 Analysis

**Provider Performance:**
```
Analyze telemetry logs:
- Which provider wins more often?
- Average latency per provider
- Failure rate per provider
- Cost comparison
```

**User Engagement:**
```
Google Analytics:
- AI chat usage rate (before vs after)
- Session duration with AI chat
- AI chat completion rate
- Pages with AI chat usage
```

**Recommendations:**
- If one provider consistently faster: Consider provider preference
- If costs too high: Implement usage limits
- If users engaging more: Expand AI features

---

## 📝 Documentation Updates

### After Completion

**Update files:**
1. `/docs/implementation/ARCHITECTURE_OVERVIEW.md`
   - Add AI hedging section
   - Document new service layer pattern
   - Add code anchors for hedged-query.ts

2. `/docs/implementation/FEATURED_BOOKS_REFACTOR_PLAN.md`
   - Mark AI hedging as complete
   - Add to success examples

3. This file (`AI_CHAT_HEDGING_IMPLEMENTATION_PLAN.md`)
   - Mark status as "✅ Complete"
   - Add completion date
   - Document lessons learned

**Create completion report (optional):**
- Implementation time vs estimate
- Challenges encountered
- What worked well
- What to improve next time
- Recommendations for future work

---

## 🎯 Future Enhancements (Not in Scope)

**After hedging is stable, consider:**

1. **Provider Preferences:**
   - User can choose preferred provider
   - Fallback to other if preferred fails

2. **Smart Provider Selection:**
   - Route queries based on complexity
   - Use cheaper provider for simple queries
   - Use better provider for complex analysis

3. **Cost Optimization:**
   - Track cost per provider
   - Implement daily/monthly budgets
   - Alert when approaching limits

4. **Quality Scoring:**
   - User feedback on responses
   - Track quality per provider
   - Adapt selection based on feedback

5. **Third Provider:**
   - Add Google Gemini as third option
   - Three-way race for best response

6. **Caching Layer:**
   - Cache common questions
   - Semantic similarity matching
   - Reduce API costs

---

## 📚 References

**Architecture Documentation:**
- `/docs/implementation/ARCHITECTURE_OVERVIEW.md:1619-1770` - Phase 4 Service Layer
- `/docs/implementation/FEATURED_BOOKS_REFACTOR_PLAN.md:1110-1160` - Rules & Guardrails

**Code References:**
- `/lib/dictionary/AIUniversalLookup.ts:103-168` - Hedging pattern source
- `/lib/services/analytics-service.ts` - Pure functions example
- `/lib/services/book-loader.ts` - AbortSignal pattern example

**Current Implementation:**
- `/lib/ai/index.ts` - AI service exports
- `/lib/ai/claude-service.ts` - Claude implementation
- `/lib/ai/service.ts` - OpenAI implementation
- `/app/api/ai/route.ts` - Main API route
- `/app/api/ai/stream/route.ts` - Streaming API route

---

## ✅ Completion Checklist

**Implementation:**
- [ ] Step 0: Setup and branch creation
- [ ] Step 1: Shared types created
- [ ] Step 2: OpenAI provider wrapper
- [ ] Step 3: Anthropic provider wrapper
- [ ] Step 4: Hedging core logic
- [ ] Step 5: Streaming support
- [ ] Step 6: Exports and API routes
- [ ] Step 7: Tests added

**Validation:**
- [ ] All automated tests pass
- [ ] Manual tests pass on 3 pages
- [ ] Provider failover tested
- [ ] Performance targets met
- [ ] No regressions found

**Deployment:**
- [ ] Merged to main
- [ ] Deployed to production
- [ ] Smoke tests pass
- [ ] Monitoring active

**Documentation:**
- [ ] Architecture docs updated
- [ ] This plan marked complete
- [ ] Lessons learned documented

---

**Status:** 🚧 Ready to Begin
**Branch:** `feature/ai-chat-hedging`
**Estimated Time:** 6-8 hours
**Developer:** _[Your name]_
**Start Date:** _[Date]_
**Completion Date:** _[Date]_

---

*This plan combines Claude Code's Phase 4 architecture analysis with GPT-5's hedging refinements for a robust, production-ready implementation.*
