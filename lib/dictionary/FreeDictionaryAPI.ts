// Free Dictionary API integration for real-time word definitions
// API: https://dictionaryapi.dev/

interface FreeDictionaryResponse {
  word: string;
  phonetic?: string;
  phonetics: Array<{
    text?: string;
    audio?: string;
  }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }>;
  }>;
  sourceUrls?: string[];
}

interface StandardDefinition {
  word: string;
  phonetic?: string;
  pronunciation?: string;
  definition: string;
  example?: string;
  partOfSpeech?: string;
  cefrLevel?: string;
  source: string;
  audioUrl?: string; // Add audio URL support
}

// In-memory cache to avoid repeated API calls
const definitionCache = new Map<string, StandardDefinition | null>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const cacheTimestamps = new Map<string, number>();

// Rate limiting to avoid overwhelming the API
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests

export async function fetchDefinitionFromAPI(word: string): Promise<StandardDefinition | null> {
  const cleanWord = word.toLowerCase().trim();

  // Check cache first
  if (definitionCache.has(cleanWord)) {
    const timestamp = cacheTimestamps.get(cleanWord);
    if (timestamp && Date.now() - timestamp < CACHE_DURATION) {
      console.log('📖 Dictionary: Using cached definition for:', cleanWord);
      return definitionCache.get(cleanWord) || null;
    }
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  try {
    console.log('📖 Dictionary: Fetching definition for:', cleanWord);

    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('📖 Dictionary: Word not found in API:', cleanWord);
        // Cache null result to avoid repeated failed requests
        definitionCache.set(cleanWord, null);
        cacheTimestamps.set(cleanWord, Date.now());
        return null;
      }
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: FreeDictionaryResponse[] = await response.json();

    if (!data || data.length === 0) {
      console.log('📖 Dictionary: No data returned for:', cleanWord);
      definitionCache.set(cleanWord, null);
      cacheTimestamps.set(cleanWord, Date.now());
      return null;
    }

    // Transform API response to our standard format
    const standardDef = transformAPIResponse(data[0]);

    // Cache the result
    definitionCache.set(cleanWord, standardDef);
    cacheTimestamps.set(cleanWord, Date.now());

    console.log('📖 Dictionary: Successfully fetched definition for:', cleanWord);
    return standardDef;

  } catch (error) {
    console.error('📖 Dictionary: API error for word:', cleanWord, error);

    // Don't cache errors, allow retry
    return null;
  }
}

function transformAPIResponse(apiData: FreeDictionaryResponse): StandardDefinition {
  // Get the best phonetic pronunciation
  const phonetic = apiData.phonetic ||
    apiData.phonetics.find(p => p.text)?.text ||
    '';

  // Get the best audio pronunciation
  const audioUrl = apiData.phonetics.find(p => p.audio)?.audio;

  // Get the first (most common) meaning and definition
  const firstMeaning = apiData.meanings[0];
  const firstDefinition = firstMeaning?.definitions[0];

  if (!firstDefinition) {
    throw new Error('No definition found in API response');
  }

  // Simplify definition for ESL learners (enhanced cleanup)
  let definition = firstDefinition.definition;

  // Remove technical linguistic notation
  definition = definition.replace(/\(([^)]*linguistics?[^)]*)\)/gi, '');
  definition = definition.replace(/\(([^)]*grammar[^)]*)\)/gi, '');

  // Replace complex words with simpler ESL-friendly alternatives
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
    'pondering': 'thinking about'
  };

  // Apply simplifications
  Object.entries(simplifications).forEach(([complex, simple]) => {
    const regex = new RegExp(`\\b${complex}\\b`, 'gi');
    definition = definition.replace(regex, simple);
  });

  // Clean up extra spaces
  definition = definition.replace(/\s+/g, ' ').trim();

  // Ensure it starts with capital letter
  definition = definition.charAt(0).toUpperCase() + definition.slice(1);

  // Limit length for ESL learners (max 150 characters)
  if (definition.length > 150) {
    const sentences = definition.split('. ');
    definition = sentences[0] + '.';
  }

  return {
    word: apiData.word,
    phonetic: phonetic,
    pronunciation: phoneticToSimple(phonetic),
    definition: definition,
    example: firstDefinition.example || generateSimpleExample(apiData.word, firstMeaning.partOfSpeech),
    partOfSpeech: firstMeaning.partOfSpeech,
    cefrLevel: estimateCEFRLevel(apiData.word), // Simple heuristic
    source: 'Free Dictionary API',
    audioUrl: audioUrl // Include audio URL for pronunciation
  };
}

// Convert IPA phonetic to simpler pronunciation guide
function phoneticToSimple(phonetic: string): string {
  if (!phonetic) return '';

  // Basic IPA to simple pronunciation mapping
  const simplifications: Record<string, string> = {
    'ˈ': '', // Remove primary stress marker
    'ˌ': '', // Remove secondary stress marker
    'θ': 'th',
    'ð': 'th',
    'ʃ': 'sh',
    'ʒ': 'zh',
    'tʃ': 'ch',
    'dʒ': 'j',
    'ŋ': 'ng',
    'ə': 'uh',
    'ɪ': 'i',
    'iː': 'ee',
    'ʊ': 'u',
    'uː': 'oo',
    'ɛ': 'e',
    'æ': 'a',
    'ɑː': 'ah',
    'ɔː': 'or',
    'aɪ': 'eye',
    'aʊ': 'ow',
    'ɔɪ': 'oy'
  };

  let simple = phonetic;
  Object.entries(simplifications).forEach(([ipa, simple_sound]) => {
    simple = simple.replace(new RegExp(ipa, 'g'), simple_sound);
  });

  return simple;
}

// Simple CEFR level estimation based on word characteristics
function estimateCEFRLevel(word: string): string {
  const length = word.length;

  // Very basic heuristic - this would be improved with a real CEFR word list
  if (length <= 4 && isCommonWord(word)) return 'A1';
  if (length <= 6) return 'A2';
  if (length <= 8) return 'B1';
  if (length <= 10) return 'B2';
  return 'C1';
}

// Check if word is in common vocabulary (very basic list)
function isCommonWord(word: string): boolean {
  const veryCommonWords = [
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'can', 'could', 'may', 'might', 'must', 'should',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
    'here', 'there', 'where', 'when', 'what', 'who', 'why', 'how',
    'one', 'two', 'three', 'four', 'five', 'first', 'last', 'big', 'small', 'good', 'bad',
    'new', 'old', 'hot', 'cold', 'long', 'short', 'high', 'low', 'fast', 'slow'
  ];

  return veryCommonWords.includes(word.toLowerCase());
}

// Generate a simple example if none provided
function generateSimpleExample(word: string, partOfSpeech: string): string {
  switch (partOfSpeech.toLowerCase()) {
    case 'noun':
      return `The ${word} is important.`;
    case 'verb':
      return `I ${word} every day.`;
    case 'adjective':
      return `This is very ${word}.`;
    case 'adverb':
      return `She speaks ${word}.`;
    default:
      return `This is an example with "${word}".`;
  }
}

// Clear cache (useful for testing or memory management)
export function clearDefinitionCache(): void {
  definitionCache.clear();
  cacheTimestamps.clear();
  console.log('📖 Dictionary: Cache cleared');
}

// Get cache statistics
export function getCacheStats(): { size: number; oldestEntry: string | null } {
  const now = Date.now();
  let oldestEntry: string | null = null;
  let oldestTime = now;

  for (const [word, timestamp] of cacheTimestamps.entries()) {
    if (timestamp < oldestTime) {
      oldestTime = timestamp;
      oldestEntry = word;
    }
  }

  return {
    size: definitionCache.size,
    oldestEntry
  };
}