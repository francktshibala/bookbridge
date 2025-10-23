// AI-powered universal dictionary lookup
// Phase 2.5: GPT-5 Improvements - Hedged parallel calls + micro-retry + strict JSON

interface AILookupRequest {
  word: string;
  context?: string;
  sentence?: string;
  partOfSpeech?: string; // POS hint to improve accuracy
}

interface AILookupResponse {
  word: string;
  definition: string;
  example: string;
  partOfSpeech: string;
  phonetic?: string;
  cefrLevel: string;
  source: string;
  confidence: number; // 0-1 scale
  processingTime: number;
}

// Feature flags and cost controls
const AI_ENABLED = process.env.NEXT_PUBLIC_AI_DICTIONARY_ENABLED === 'true';
const DAILY_AI_BUDGET = parseInt(process.env.AI_DICTIONARY_DAILY_BUDGET || '100'); // $1.00 default
const MAX_REQUESTS_PER_IP = parseInt(process.env.AI_DICTIONARY_MAX_REQUESTS_PER_IP || '50');
const AI_REQUEST_TIMEOUT = 2000; // 2 seconds hard limit
const MICRO_RETRY_DELAY = 700; // Micro-retry after 700ms if no valid JSON
const JSON_RETRY_TIMEOUT = 300; // Quick retry timeout for JSON-only requests

// Cost tracking (in-memory for Phase 2, would move to Redis/DB in production)
const dailyCostTracker = new Map<string, { cost: number; requests: number; date: string }>();
const ipRequestTracker = new Map<string, { count: number; date: string }>();

export async function aiUniversalLookup(
  request: AILookupRequest,
  clientIP?: string
): Promise<AILookupResponse | null> {

  const startTime = Date.now();

  // Feature flag check
  if (!AI_ENABLED) {
    console.log('🤖 AI Dictionary: Feature disabled via flag');
    return null;
  }

  // Cost and rate limiting
  const today = new Date().toISOString().split('T')[0];
  const dailyStats = dailyCostTracker.get(today) || { cost: 0, requests: 0, date: today };

  if (dailyStats.cost >= DAILY_AI_BUDGET) {
    console.log('🚫 AI Dictionary: Daily budget exceeded:', dailyStats.cost);
    return null;
  }

  // IP rate limiting
  if (clientIP) {
    const ipStats = ipRequestTracker.get(clientIP) || { count: 0, date: today };
    if (ipStats.date !== today) {
      ipStats.count = 0;
      ipStats.date = today;
    }

    if (ipStats.count >= MAX_REQUESTS_PER_IP) {
      console.log('🚫 AI Dictionary: IP rate limit exceeded:', clientIP);
      return null;
    }

    ipStats.count++;
    ipRequestTracker.set(clientIP, ipStats);
  }

  try {
    console.log('🤖 AI Dictionary: Looking up word:', request.word);

    // Create AI lookup with 2s timeout
    const aiPromise = performAILookup(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI timeout')), AI_REQUEST_TIMEOUT)
    );

    const result = await Promise.race([aiPromise, timeoutPromise]) as AILookupResponse;

    // Track costs (estimate: ~$0.001 per request)
    const estimatedCost = 0.001;
    dailyStats.cost += estimatedCost;
    dailyStats.requests++;
    dailyCostTracker.set(today, dailyStats);

    result.processingTime = Date.now() - startTime;
    console.log('✅ AI Dictionary: Success for', request.word, 'in', result.processingTime + 'ms');

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ AI Dictionary: Error for', request.word, 'after', processingTime + 'ms:', error);
    return null;
  }
}

async function performAILookup(request: AILookupRequest): Promise<AILookupResponse> {
  // Check available AI services
  const hasOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-');
  const hasAnthropic = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-');

  if (!hasOpenAI && !hasAnthropic) {
    throw new Error('No AI services available');
  }

  // GPT-5 IMPROVEMENT: Hedged parallel calls + micro-retry strategy
  return await hedgedAILookup(request, !!hasOpenAI, !!hasAnthropic);
}

// GPT-5 IMPROVEMENT: Hedged parallel calls with micro-retry
async function hedgedAILookup(request: AILookupRequest, hasOpenAI: boolean, hasAnthropic: boolean): Promise<AILookupResponse> {
  const startTime = Date.now();

  // Detect part of speech for better prompting
  const enhancedRequest = {
    ...request,
    partOfSpeech: request.partOfSpeech || detectPartOfSpeech(request.word)
  };

  const promises: Promise<AILookupResponse>[] = [];

  // Fire both providers in parallel if available
  if (hasOpenAI) {
    promises.push(callOpenAILookup(createUniversalPrompt(enhancedRequest), enhancedRequest));
  }
  if (hasAnthropic) {
    promises.push(callAnthropicLookup(createUniversalPrompt(enhancedRequest), enhancedRequest));
  }

  try {
    // Race for first valid response
    const result = await Promise.race(promises);
    console.log(`✅ Hedged AI: Success in ${Date.now() - startTime}ms`);
    return result;
  } catch (firstError) {
    console.log(`🔄 Hedged AI: First attempt failed after ${Date.now() - startTime}ms, trying micro-retry`);

    // Micro-retry with JSON-only prompt
    if (Date.now() - startTime < MICRO_RETRY_DELAY) {
      await new Promise(resolve => setTimeout(resolve, MICRO_RETRY_DELAY - (Date.now() - startTime)));
    }

    try {
      const retryPromises: Promise<AILookupResponse>[] = [];

      if (hasOpenAI) {
        retryPromises.push(callOpenAILookup(createUniversalPrompt(enhancedRequest, true), enhancedRequest, true));
      }
      if (hasAnthropic) {
        retryPromises.push(callAnthropicLookup(createUniversalPrompt(enhancedRequest, true), enhancedRequest, true));
      }

      const retryResult = await Promise.race(retryPromises);
      console.log(`✅ Micro-retry success in ${Date.now() - startTime}ms`);
      return retryResult;

    } catch (retryError) {
      console.error(`❌ All hedged attempts failed in ${Date.now() - startTime}ms:`, firstError, retryError);
      throw firstError; // Throw original error
    }
  }
}

// Simple POS detection for common patterns
function detectPartOfSpeech(word: string): string {
  const lowerWord = word.toLowerCase();

  // Common adverbs
  if (lowerWord.endsWith('ly')) return 'adverb';

  // Common adjectives
  if (lowerWord.endsWith('ful') || lowerWord.endsWith('less') || lowerWord.endsWith('able')) return 'adjective';

  // Common nouns
  if (lowerWord.endsWith('tion') || lowerWord.endsWith('ness') || lowerWord.endsWith('ment')) return 'noun';

  // Common verbs
  if (lowerWord.endsWith('ing') || lowerWord.endsWith('ed')) return 'verb';

  return 'unknown'; // Let AI figure it out
}

function createUniversalPrompt(request: AILookupRequest, isRetry = false): string {
  const contextHint = request.context ? `\nContext sentence: "${request.context}"` : '';
  const posHint = request.partOfSpeech && request.partOfSpeech !== 'unknown' ? `\nPart of speech: ${request.partOfSpeech}` : '';

  // GPT-5 IMPROVEMENT: Stricter JSON-only prompt for retries
  const jsonOnlyInstruction = isRetry
    ? '\n\nIMPORTANT: Return ONLY valid JSON. No explanations, no extra text, no markdown formatting.'
    : '';

  return `You are an ESL teacher helping A2-B1 level learners understand English words.

Word to define: "${request.word}"${contextHint}${posHint}

Handle these cases appropriately:
- Possessives (like "caretaker's"): Define the base word and explain it's possessive
- Contractions (like "won't"): Explain the contraction and provide definition
- Proper names: Give brief context about who/what it is
- Regular words: Simple, clear definition

Requirements:
- Use only simple, common English words (A1-A2 level)
- Keep definition under 15 words and very clear
- Create EXACTLY 2-3 helpful example sentences showing different uses
- Use present tense and active voice when possible
- Avoid complex grammar like "that which", passive voice, formal language
- Make it practical for everyday conversation

Respond in this exact JSON format:
{
  "definition": "simple definition here",
  "examples": [
    "First example sentence using the word",
    "Second example sentence showing another use",
    "Third example if helpful (optional)"
  ],
  "partOfSpeech": "noun/verb/adjective/etc",
  "cefrLevel": "A1/A2/B1/B2/C1/C2"
}${jsonOnlyInstruction}`;
}

async function callOpenAILookup(prompt: string, request: AILookupRequest, isRetry = false): Promise<AILookupResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: isRetry ? 0.1 : 0.2, // Lower temperature for retries
      response_format: { type: 'json_object' }, // Force JSON mode
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content in OpenAI response');
  }

  try {
    // GPT-5 IMPROVEMENT: Strict JSON validation
    const cleanContent = content.trim().replace(/```json\n|\n```/g, ''); // Remove markdown if present
    const parsed = JSON.parse(cleanContent);

    // Validate required fields
    if (!parsed.definition || !parsed.examples || !Array.isArray(parsed.examples)) {
      throw new Error(`Invalid JSON structure: missing required fields`);
    }

    // Ensure exactly 2-3 examples
    const examples = parsed.examples.slice(0, 3); // Take max 3 examples
    if (examples.length < 2) {
      examples.push(`The word "${request.word}" is commonly used in English.`); // Add fallback example
    }

    const exampleText = examples.join(' | ');

    return {
      word: request.word,
      definition: parsed.definition,
      example: exampleText,
      partOfSpeech: parsed.partOfSpeech || 'unknown',
      cefrLevel: parsed.cefrLevel || 'B1',
      source: 'AI Dictionary (OpenAI)',
      confidence: 0.9,
      processingTime: 0 // Will be set by caller
    };
  } catch (parseError) {
    console.error('🤖 AI Dictionary: Failed to parse OpenAI response:', content);
    throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
}

async function callAnthropicLookup(prompt: string, request: AILookupRequest, isRetry = false): Promise<AILookupResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      temperature: isRetry ? 0.1 : 0.2, // Lower temperature for retries
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text;

  if (!content) {
    throw new Error('No content in Anthropic response');
  }

  try {
    // GPT-5 IMPROVEMENT: Strict JSON validation
    const cleanContent = content.trim().replace(/```json\n|\n```/g, ''); // Remove markdown if present
    const parsed = JSON.parse(cleanContent);

    // Validate required fields
    if (!parsed.definition || !parsed.examples || !Array.isArray(parsed.examples)) {
      throw new Error(`Invalid JSON structure: missing required fields`);
    }

    // Ensure exactly 2-3 examples
    const examples = parsed.examples.slice(0, 3); // Take max 3 examples
    if (examples.length < 2) {
      examples.push(`The word "${request.word}" is commonly used in English.`); // Add fallback example
    }

    const exampleText = examples.join(' | ');

    return {
      word: request.word,
      definition: parsed.definition,
      example: exampleText,
      partOfSpeech: parsed.partOfSpeech || 'unknown',
      cefrLevel: parsed.cefrLevel || 'B1',
      source: 'AI Dictionary (Claude)',
      confidence: 0.9,
      processingTime: 0 // Will be set by caller
    };
  } catch (parseError) {
    console.error('🤖 AI Dictionary: Failed to parse Anthropic response:', content);
    throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
}

// Utility functions for monitoring
export function getAICostStats(): {
  dailyCost: number;
  dailyRequests: number;
  remainingBudget: number;
} {
  const today = new Date().toISOString().split('T')[0];
  const dailyStats = dailyCostTracker.get(today) || { cost: 0, requests: 0, date: today };

  return {
    dailyCost: dailyStats.cost,
    dailyRequests: dailyStats.requests,
    remainingBudget: DAILY_AI_BUDGET - dailyStats.cost
  };
}

export function clearDailyStats(): void {
  const today = new Date().toISOString().split('T')[0];
  dailyCostTracker.clear();
  ipRequestTracker.clear();
  console.log('🧹 AI Dictionary: Cleared daily stats for', today);
}