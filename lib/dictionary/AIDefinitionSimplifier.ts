// AI-powered definition simplification for ESL learners
// Converts complex definitions to simple, learner-friendly language

interface SimplificationRequest {
  word: string;
  originalDefinition: string;
  partOfSpeech?: string;
  cefrLevel?: string;
}

interface SimplifiedDefinition {
  definition: string;
  example: string;
  confidence: number; // 0-1 scale
  simplified: boolean;
}

// Cache for AI-simplified definitions to avoid repeated API calls
const simplificationCache = new Map<string, SimplifiedDefinition>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for AI results
const cacheTimestamps = new Map<string, number>();

// Rate limiting for AI calls
let lastAIRequest = 0;
const MIN_AI_INTERVAL = 1000; // 1 second between AI requests

export async function simplifyDefinitionWithAI(request: SimplificationRequest): Promise<SimplifiedDefinition> {
  const cacheKey = `${request.word}:${request.originalDefinition}`;

  // Check cache first
  if (simplificationCache.has(cacheKey)) {
    const timestamp = cacheTimestamps.get(cacheKey);
    if (timestamp && Date.now() - timestamp < CACHE_DURATION) {
      console.log('🤖 AI Simplifier: Using cached result for:', request.word);
      return simplificationCache.get(cacheKey)!;
    }
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastAIRequest;
  if (timeSinceLastRequest < MIN_AI_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_AI_INTERVAL - timeSinceLastRequest));
  }
  lastAIRequest = Date.now();

  try {
    console.log('🤖 AI Simplifier: Processing:', request.word);

    // Determine target CEFR level for simplification
    const targetLevel = getTargetCEFRLevel(request.cefrLevel);

    const result = await callAISimplificationAPI(request, targetLevel);

    // Cache the result
    simplificationCache.set(cacheKey, result);
    cacheTimestamps.set(cacheKey, Date.now());

    console.log('🤖 AI Simplifier: Successfully simplified:', request.word);
    return result;

  } catch (error) {
    console.error('🤖 AI Simplifier: Error for word:', request.word, error);

    // Fallback to manual simplification
    return manualSimplification(request);
  }
}

async function callAISimplificationAPI(request: SimplificationRequest, targetLevel: string): Promise<SimplifiedDefinition> {
  // Check if we have API keys available
  const hasOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-');
  const hasAnthropic = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-');

  if (!hasOpenAI && !hasAnthropic) {
    console.log('🤖 AI Simplifier: No API keys available, using manual simplification');
    return manualSimplification(request);
  }

  const prompt = createSimplificationPrompt(request, targetLevel);

  try {
    // Try OpenAI first (usually faster for this task)
    if (hasOpenAI) {
      return await callOpenAISimplification(prompt, request);
    }

    // Fallback to Anthropic
    if (hasAnthropic) {
      return await callAnthropicSimplification(prompt, request);
    }

  } catch (error) {
    console.error('🤖 AI Simplifier: API call failed:', error);
    return manualSimplification(request);
  }

  // This shouldn't happen, but just in case
  return manualSimplification(request);
}

function createSimplificationPrompt(request: SimplificationRequest, targetLevel: string): string {
  return `You are an ESL teacher helping students understand English words. Simplify this definition for ${targetLevel} level learners.

Word: "${request.word}"
Part of speech: ${request.partOfSpeech || 'unknown'}
Original definition: "${request.originalDefinition}"

Requirements:
1. Use only simple, common English words that ${targetLevel} students know
2. Keep the definition under 25 words
3. Make it clear and easy to understand
4. Avoid complex grammar or academic language
5. Create a simple example sentence using the word

Respond in this exact JSON format:
{
  "definition": "your simplified definition here",
  "example": "your example sentence here"
}`;
}

async function callOpenAISimplification(prompt: string, request: SimplificationRequest): Promise<SimplifiedDefinition> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.3, // Lower temperature for consistent, factual responses
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
    const parsed = JSON.parse(content);
    return {
      definition: parsed.definition,
      example: parsed.example,
      confidence: 0.9, // High confidence for AI-generated results
      simplified: true
    };
  } catch (parseError) {
    console.error('🤖 AI Simplifier: Failed to parse OpenAI response:', content);
    return manualSimplification(request);
  }
}

async function callAnthropicSimplification(prompt: string, request: SimplificationRequest): Promise<SimplifiedDefinition> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
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
    const parsed = JSON.parse(content);
    return {
      definition: parsed.definition,
      example: parsed.example,
      confidence: 0.9, // High confidence for AI-generated results
      simplified: true
    };
  } catch (parseError) {
    console.error('🤖 AI Simplifier: Failed to parse Anthropic response:', content);
    return manualSimplification(request);
  }
}

function manualSimplification(request: SimplificationRequest): SimplifiedDefinition {
  let definition = request.originalDefinition;

  // Apply the same manual simplifications we have in other files
  const simplifications: Record<string, string> = {
    'amazement': 'surprise',
    'awe': 'great surprise',
    'marvel': 'something wonderful',
    'astonishment': 'great surprise',
    'bewilderment': 'confusion',
    'perplexity': 'confusion',
    'elegance': 'beauty',
    'refinement': 'good taste',
    'sophistication': 'being smart and stylish',
    'magnificence': 'great beauty',
    'splendor': 'great beauty',
    'grandeur': 'greatness',
    'contemplation': 'thinking',
    'consideration': 'thinking about',
    'pondering': 'thinking about',
    'phenomenon': 'something that happens',
    'occurrence': 'something that happens',
    'manifestation': 'something you can see',
    'demonstration': 'showing',
    'exhibition': 'showing',
    'fascinate': 'interest very much',
    'persuade': 'make someone agree',
    'seduce': 'attract strongly',
    'captivate': 'interest completely',
    'enchant': 'make very happy',
    'allure': 'attract',
    'entice': 'encourage to do',
    'mesmerize': 'hold attention completely'
  };

  // Apply simplifications
  Object.entries(simplifications).forEach(([complex, simple]) => {
    const regex = new RegExp(`\\b${complex}\\b`, 'gi');
    definition = definition.replace(regex, simple);
  });

  // Shorten if too long
  if (definition.length > 100) {
    const sentences = definition.split('. ');
    definition = sentences[0] + '.';
  }

  // Generate simple example
  const example = generateSimpleExample(request.word, request.partOfSpeech || '');

  return {
    definition: definition,
    example: example,
    confidence: 0.7, // Lower confidence for manual simplification
    simplified: true
  };
}

function generateSimpleExample(word: string, partOfSpeech: string): string {
  const pos = partOfSpeech.toLowerCase();

  switch (pos) {
    case 'noun':
      return `The ${word} is important.`;
    case 'verb':
      return `They ${word} every day.`;
    case 'adjective':
      return `This is very ${word}.`;
    case 'adverb':
      return `She speaks ${word}.`;
    default:
      return `I know the word "${word}".`;
  }
}

function getTargetCEFRLevel(currentLevel?: string): string {
  // If word is already high level, aim for B1
  // If word is basic level, keep it simple
  switch (currentLevel) {
    case 'C1':
    case 'C2':
      return 'B1'; // Significantly simplify advanced words
    case 'B2':
      return 'A2'; // Moderately simplify
    case 'B1':
      return 'A2'; // Slightly simplify
    default:
      return 'A1'; // Make as simple as possible
  }
}

// Clear cache utility
export function clearSimplificationCache(): void {
  simplificationCache.clear();
  cacheTimestamps.clear();
  console.log('🤖 AI Simplifier: Cache cleared');
}

// Get cache statistics
export function getSimplificationCacheStats(): { size: number; oldestEntry: string | null } {
  const now = Date.now();
  let oldestEntry: string | null = null;
  let oldestTime = now;

  for (const [key, timestamp] of cacheTimestamps.entries()) {
    if (timestamp < oldestTime) {
      oldestTime = timestamp;
      oldestEntry = key.split(':')[0]; // Extract word from cache key
    }
  }

  return {
    size: simplificationCache.size,
    oldestEntry
  };
}