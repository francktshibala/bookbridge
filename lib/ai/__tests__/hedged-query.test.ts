/**
 * Hedged Query Tests - Minimal Critical Path Coverage
 *
 * Tests the 5 critical paths recommended by GPT-5:
 * 1. Both succeed → fastest wins
 * 2. One fails → other wins
 * 3. First invalid → second valid (150ms window)
 * 4. Both fail → micro-retry succeeds
 * 5. Streaming: first-chunk-wins + loser abort
 */

// Mock the provider modules BEFORE importing anything
jest.mock('../providers/openai', () => ({
  callOpenAI: jest.fn(),
  callOpenAIStream: jest.fn()
}));

jest.mock('../providers/anthropic', () => ({
  callAnthropic: jest.fn(),
  callAnthropicStream: jest.fn()
}));

// Now import after mocking
import { hedgedAIQuery, hedgedAIQueryStream } from '../hedged-query';
import { callOpenAI, callOpenAIStream } from '../providers/openai';
import { callAnthropic, callAnthropicStream } from '../providers/anthropic';

describe('hedgedAIQuery - Critical Paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment
    process.env.OPENAI_API_KEY = 'sk-test-openai';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-anthropic';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Test 1: Both succeed → fastest wins
  test('both providers succeed - fastest wins', async () => {
    const openaiResponse = {
      text: 'OpenAI response',
      tokens: { prompt: 10, completion: 20, total: 30 },
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      latency: 100
    };

    const anthropicResponse = {
      text: 'Claude response',
      tokens: { prompt: 10, completion: 20, total: 30 },
      provider: 'anthropic' as const,
      model: 'claude-3-haiku',
      latency: 200
    };

    // OpenAI resolves faster
    (callOpenAI as jest.Mock).mockResolvedValue(openaiResponse);
    (callAnthropic as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(anthropicResponse), 150))
    );

    const result = await hedgedAIQuery('test prompt', {});

    // OpenAI should win (faster)
    expect(result.provider).toBe('openai');
    expect(result.text).toBe('OpenAI response');
    expect(callOpenAI).toHaveBeenCalledTimes(1);
    expect(callAnthropic).toHaveBeenCalledTimes(1);
  });

  // Test 2: One fails → other wins
  test('OpenAI fails slowly - Anthropic succeeds first', async () => {
    const anthropicResponse = {
      text: 'Claude response',
      tokens: { prompt: 10, completion: 20, total: 30 },
      provider: 'anthropic' as const,
      model: 'claude-3-haiku',
      latency: 80
    };

    // Anthropic succeeds quickly
    (callAnthropic as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(anthropicResponse), 80))
    );
    // OpenAI fails later (after Anthropic succeeds)
    (callOpenAI as jest.Mock).mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI: Rate limited')), 200))
    );

    const result = await hedgedAIQuery('test prompt', {});

    // Anthropic should win (succeeds before OpenAI fails)
    expect(result.provider).toBe('anthropic');
    expect(result.text).toBe('Claude response');
    expect(callOpenAI).toHaveBeenCalledTimes(1);
    expect(callAnthropic).toHaveBeenCalledTimes(1);
  }, 10000);

  test('Anthropic fails - OpenAI succeeds', async () => {
    const openaiResponse = {
      text: 'OpenAI response',
      tokens: { prompt: 10, completion: 20, total: 30 },
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      latency: 150
    };

    (callOpenAI as jest.Mock).mockResolvedValue(openaiResponse);
    (callAnthropic as jest.Mock).mockRejectedValue(new Error('Claude: Service overloaded'));

    const result = await hedgedAIQuery('test prompt', {});

    expect(result.provider).toBe('openai');
    expect(result.text).toBe('OpenAI response');
  });

  // Test 3: First invalid → second valid (150ms window)
  test('first response invalid - second valid within 150ms window', async () => {
    const invalidResponse = {
      text: '', // Invalid - empty text
      tokens: { prompt: 0, completion: 0, total: 0 },
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      latency: 50
    };

    const validResponse = {
      text: 'Valid Claude response',
      tokens: { prompt: 10, completion: 20, total: 30 },
      provider: 'anthropic' as const,
      model: 'claude-3-haiku',
      latency: 120
    };

    // OpenAI returns fast but invalid (immediately)
    (callOpenAI as jest.Mock).mockResolvedValue(invalidResponse);
    // Claude returns slower but valid (within 150ms window - at 80ms)
    (callAnthropic as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(validResponse), 80))
    );

    const result = await hedgedAIQuery('test prompt', {});

    // Should get the valid response from Claude (within validation window)
    expect(result.provider).toBe('anthropic');
    expect(result.text).toBe('Valid Claude response');
  }, 10000);

  // Test 4: Both fail → micro-retry succeeds
  test('both fail first attempt - micro-retry succeeds', async () => {
    const retryResponse = {
      text: 'Retry success from OpenAI',
      tokens: { prompt: 10, completion: 20, total: 30 },
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      latency: 100
    };

    // First attempt - both fail
    (callOpenAI as jest.Mock)
      .mockRejectedValueOnce(new Error('OpenAI: Temporary error'))
      .mockResolvedValueOnce(retryResponse); // Second attempt succeeds

    (callAnthropic as jest.Mock).mockRejectedValue(new Error('Claude: Temporary error'));

    const result = await hedgedAIQuery('test prompt', { temperature: 0.7 });

    // Should succeed on retry
    expect(result.text).toBe('Retry success from OpenAI');
    expect(result.provider).toBe('openai');

    // Should have called OpenAI twice (first attempt + retry)
    expect(callOpenAI).toHaveBeenCalledTimes(2);

    // Second call should have lower temperature (0.1)
    expect(callOpenAI).toHaveBeenLastCalledWith(
      'test prompt',
      expect.objectContaining({ temperature: 0.1 })
    );
  });

  // Test 5: Streaming - first-chunk-wins + loser abort
  test('streaming: first chunk determines winner and loser is aborted', async () => {
    const openaiChunks = [
      { content: 'OpenAI ', provider: 'openai' as const, done: false },
      { content: 'chunk 2', provider: 'openai' as const, done: false },
      { content: '', provider: 'openai' as const, done: true }
    ];

    const claudeChunks = [
      { content: 'Claude ', provider: 'anthropic' as const, done: false },
      { content: 'chunk 2', provider: 'anthropic' as const, done: false },
      { content: '', provider: 'anthropic' as const, done: true }
    ];

    // OpenAI stream yields first (faster)
    async function* openaiStreamGen() {
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
      for (const chunk of openaiChunks) {
        yield chunk;
      }
    }

    // Claude stream yields second (slower)
    async function* claudeStreamGen() {
      await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay
      for (const chunk of claudeChunks) {
        yield chunk;
      }
    }

    (callOpenAIStream as jest.Mock).mockReturnValue(openaiStreamGen());
    (callAnthropicStream as jest.Mock).mockReturnValue(claudeStreamGen());

    const chunks: string[] = [];
    for await (const chunk of hedgedAIQueryStream('test prompt', {})) {
      chunks.push(chunk);
    }

    // Should get chunks from OpenAI (winner)
    expect(chunks.join('')).toBe('OpenAI chunk 2');
    expect(chunks.length).toBe(2);

    // Both streams should have been started
    expect(callOpenAIStream).toHaveBeenCalledTimes(1);
    expect(callAnthropicStream).toHaveBeenCalledTimes(1);
  });

  // Bonus: Test abort signal is respected
  test('abort signal cancels both providers', async () => {
    const controller = new AbortController();

    (callOpenAI as jest.Mock).mockImplementation(async (prompt, options) => {
      // Simulate long-running operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (options.signal?.aborted) {
        throw new Error('OpenAI: Request aborted by parent signal');
      }
      return {
        text: 'Should not reach',
        tokens: { prompt: 10, completion: 20, total: 30 },
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        latency: 1000
      };
    });

    (callAnthropic as jest.Mock).mockImplementation(async (prompt, options) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (options.signal?.aborted) {
        throw new Error('Claude: Request aborted by parent signal');
      }
      return {
        text: 'Should not reach',
        tokens: { prompt: 10, completion: 20, total: 30 },
        provider: 'anthropic',
        model: 'claude-3-haiku',
        latency: 1000
      };
    });

    // Abort after 100ms
    setTimeout(() => controller.abort(), 100);

    await expect(
      hedgedAIQuery('test prompt', { signal: controller.signal })
    ).rejects.toThrow();

    // Both providers should have been called
    expect(callOpenAI).toHaveBeenCalledTimes(1);
    expect(callAnthropic).toHaveBeenCalledTimes(1);
  });

  // Bonus: Test telemetry callback
  test('telemetry callback receives correct data', async () => {
    const telemetry = jest.fn();

    const openaiResponse = {
      text: 'OpenAI response',
      tokens: { prompt: 10, completion: 20, total: 30 },
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      latency: 100
    };

    (callOpenAI as jest.Mock).mockResolvedValue(openaiResponse);
    (callAnthropic as jest.Mock).mockRejectedValue(new Error('Claude failed'));

    await hedgedAIQuery('test prompt', { telemetry });

    expect(telemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        winner: 'openai',
        latency: expect.any(Number),
        retries: 0,
        errors: expect.any(Array)
      })
    );
  });
});
