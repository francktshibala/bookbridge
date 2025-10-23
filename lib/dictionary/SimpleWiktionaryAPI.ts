// Simple Wiktionary API integration for ESL-friendly definitions
// API: https://simple.wiktionary.org/api/rest_v1/

interface SimpleWiktionaryResponse {
  type: string;
  title: string;
  displaytitle: string;
  wikibase_item: string;
  extract: string;
  extract_html: string;
  content_urls: {
    desktop: {
      page: string;
      revisions: string;
      edit: string;
      talk: string;
    };
    mobile: {
      page: string;
      revisions: string;
      edit: string;
      talk: string;
    };
  };
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
  audioUrl?: string;
}

// In-memory cache for Simple Wiktionary definitions
const simpleWiktionaryCache = new Map<string, StandardDefinition | null>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour (longer than Free Dictionary)
const cacheTimestamps = new Map<string, number>();

// Rate limiting for Simple Wiktionary
let lastSimpleWiktionaryRequest = 0;
const MIN_REQUEST_INTERVAL = 200; // 200ms between requests (more conservative)

export async function fetchSimpleWiktionaryDefinition(word: string): Promise<StandardDefinition | null> {
  const cleanWord = word.toLowerCase().trim();

  console.log('📚 Simple Wiktionary: Attempting to fetch definition for:', cleanWord);

  // Check cache first
  if (simpleWiktionaryCache.has(cleanWord)) {
    const timestamp = cacheTimestamps.get(cleanWord);
    if (timestamp && Date.now() - timestamp < CACHE_DURATION) {
      console.log('📚 Simple Wiktionary: Using cached definition for:', cleanWord);
      return simpleWiktionaryCache.get(cleanWord) || null;
    }
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastSimpleWiktionaryRequest;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastSimpleWiktionaryRequest = Date.now();

  try {
    // Use Simple English Wiktionary extract API
    const response = await fetch(
      `https://simple.wiktionary.org/api/rest_v1/page/summary/${encodeURIComponent(cleanWord)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BookBridge ESL Learning App (educational use)'
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log('📚 Simple Wiktionary: Word not found:', cleanWord);
        // Cache null result
        simpleWiktionaryCache.set(cleanWord, null);
        cacheTimestamps.set(cleanWord, Date.now());
        return null;
      }
      throw new Error(`Simple Wiktionary API error: ${response.status}`);
    }

    const data: SimpleWiktionaryResponse = await response.json();

    if (!data || !data.extract) {
      console.log('📚 Simple Wiktionary: No extract found for:', cleanWord);
      simpleWiktionaryCache.set(cleanWord, null);
      cacheTimestamps.set(cleanWord, Date.now());
      return null;
    }

    // Transform Simple Wiktionary response to our standard format
    const standardDef = transformSimpleWiktionaryResponse(data, cleanWord);

    // Cache the result
    simpleWiktionaryCache.set(cleanWord, standardDef);
    cacheTimestamps.set(cleanWord, Date.now());

    console.log('📚 Simple Wiktionary: Successfully fetched definition for:', cleanWord);
    return standardDef;

  } catch (error) {
    console.error('📚 Simple Wiktionary: API error for word:', cleanWord, error);
    return null;
  }
}

function transformSimpleWiktionaryResponse(data: SimpleWiktionaryResponse, word: string): StandardDefinition {
  let definition = data.extract;

  // Clean up the definition for ESL learners
  definition = cleanSimpleWiktionaryDefinition(definition);

  // Extract part of speech from the beginning if present
  const partOfSpeech = extractPartOfSpeech(definition);

  // Remove part of speech from definition if extracted
  if (partOfSpeech) {
    definition = definition.replace(new RegExp(`^${partOfSpeech}[\\s\\.]+`, 'i'), '');
  }

  // Generate a simple example
  const example = generateESLExample(word, partOfSpeech || 'word');

  return {
    word: word,
    phonetic: '', // Simple Wiktionary doesn't typically have phonetics
    pronunciation: '',
    definition: definition,
    example: example,
    partOfSpeech: partOfSpeech,
    cefrLevel: estimateAdvancedCEFRLevel(word, definition), // More sophisticated than basic API
    source: 'Simple Wiktionary',
    audioUrl: undefined // Simple Wiktionary doesn't provide audio
  };
}

function cleanSimpleWiktionaryDefinition(definition: string): string {
  // Remove common Wiktionary artifacts
  definition = definition.replace(/\s*\([^)]*\)\s*/g, ' '); // Remove parenthetical notes
  definition = definition.replace(/\s*\[[^\]]*\]\s*/g, ' '); // Remove bracketed references
  definition = definition.replace(/\s*\{[^}]*\}\s*/g, ' '); // Remove template references

  // Remove multiple spaces
  definition = definition.replace(/\s+/g, ' ').trim();

  // Ensure it starts with capital letter and ends with period
  if (definition.length > 0) {
    definition = definition.charAt(0).toUpperCase() + definition.slice(1);
    if (!definition.endsWith('.') && !definition.endsWith('!') && !definition.endsWith('?')) {
      definition += '.';
    }
  }

  // Limit length for ESL learners (max 150 characters)
  if (definition.length > 150) {
    const sentences = definition.split('. ');
    definition = sentences[0] + '.';
  }

  return definition;
}

function extractPartOfSpeech(text: string): string | undefined {
  const partsOfSpeech = [
    'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition',
    'conjunction', 'interjection', 'determiner', 'article'
  ];

  const lowerText = text.toLowerCase();

  for (const pos of partsOfSpeech) {
    if (lowerText.startsWith(pos)) {
      return pos;
    }
  }

  return undefined;
}

function generateESLExample(word: string, partOfSpeech: string): string {
  const pos = partOfSpeech.toLowerCase();

  switch (pos) {
    case 'noun':
      return `I saw a ${word} today.`;
    case 'verb':
      return `They ${word} every morning.`;
    case 'adjective':
      return `The weather is very ${word}.`;
    case 'adverb':
      return `She speaks ${word}.`;
    case 'pronoun':
      return `${word.charAt(0).toUpperCase() + word.slice(1)} is important.`;
    case 'preposition':
      return `The book is ${word} the table.`;
    case 'conjunction':
      return `I like tea ${word} coffee.`;
    default:
      return `This sentence uses the word "${word}".`;
  }
}

// More sophisticated CEFR level estimation for Simple Wiktionary
function estimateAdvancedCEFRLevel(word: string, definition: string): string {
  const wordLength = word.length;
  const definitionLength = definition.length;

  // Check against common word lists (expanded)
  if (isA1Word(word)) return 'A1';
  if (isA2Word(word)) return 'A2';
  if (isB1Word(word)) return 'B1';

  // Use definition complexity as a factor
  const simpleWords = definition.toLowerCase().split(' ').filter(w =>
    ['the', 'a', 'an', 'is', 'are', 'was', 'of', 'to', 'and', 'or', 'but', 'in', 'on', 'at', 'for', 'with'].includes(w)
  ).length;

  const complexityRatio = simpleWords / definition.split(' ').length;

  // Algorithm combining word length, definition complexity, and common patterns
  if (wordLength <= 4 && complexityRatio > 0.3) return 'A2';
  if (wordLength <= 6 && complexityRatio > 0.25) return 'B1';
  if (wordLength <= 8 && complexityRatio > 0.2) return 'B2';
  if (wordLength <= 10) return 'B2';

  return 'C1';
}

// Expanded common word lists for better CEFR estimation
function isA1Word(word: string): boolean {
  const a1Words = [
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'can', 'could', 'may', 'might', 'must', 'should',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
    'here', 'there', 'where', 'when', 'what', 'who', 'why', 'how',
    'one', 'two', 'three', 'four', 'five', 'first', 'last', 'big', 'small', 'good', 'bad',
    'new', 'old', 'hot', 'cold', 'long', 'short', 'high', 'low', 'fast', 'slow',
    'eat', 'drink', 'go', 'come', 'see', 'look', 'hear', 'say', 'tell', 'get', 'give', 'take', 'put',
    'house', 'home', 'work', 'school', 'car', 'book', 'food', 'water', 'time', 'day', 'year',
    'man', 'woman', 'child', 'boy', 'girl', 'friend', 'family', 'mother', 'father', 'sister', 'brother'
  ];

  return a1Words.includes(word.toLowerCase());
}

function isA2Word(word: string): boolean {
  const a2Words = [
    'about', 'after', 'again', 'against', 'all', 'also', 'always', 'another', 'any', 'around', 'because',
    'before', 'best', 'better', 'between', 'both', 'call', 'city', 'country', 'different', 'each',
    'early', 'every', 'example', 'far', 'feel', 'find', 'free', 'great', 'group', 'hand', 'help',
    'important', 'information', 'interest', 'keep', 'kind', 'know', 'large', 'leave', 'let', 'life',
    'little', 'live', 'local', 'make', 'money', 'move', 'much', 'name', 'need', 'never', 'next',
    'night', 'number', 'often', 'only', 'other', 'own', 'part', 'people', 'place', 'play', 'point',
    'program', 'public', 'question', 'read', 'really', 'right', 'room', 'same', 'seem', 'service',
    'show', 'side', 'small', 'social', 'something', 'start', 'state', 'story', 'student', 'study',
    'system', 'think', 'through', 'today', 'together', 'turn', 'understand', 'university', 'until',
    'use', 'very', 'want', 'way', 'week', 'well', 'while', 'without', 'word', 'world', 'write', 'young'
  ];

  return a2Words.includes(word.toLowerCase());
}

function isB1Word(word: string): boolean {
  const b1Words = [
    'able', 'accept', 'access', 'according', 'account', 'across', 'action', 'activity', 'actually',
    'address', 'administration', 'admit', 'adult', 'affect', 'afford', 'afraid', 'age', 'agency',
    'agent', 'agree', 'agreement', 'ahead', 'air', 'allow', 'almost', 'alone', 'along', 'already',
    'although', 'amazing', 'among', 'amount', 'analysis', 'analyze', 'animal', 'announce', 'annual',
    'answer', 'anyone', 'anything', 'appear', 'apply', 'approach', 'appropriate', 'area', 'argue',
    'arm', 'army', 'arrive', 'article', 'artist', 'assume', 'attack', 'attempt', 'attend', 'attention',
    'attitude', 'attract', 'available', 'avoid', 'away', 'baby', 'back', 'background', 'ball', 'bank',
    'bar', 'base', 'basic', 'battle', 'beach', 'beat', 'beautiful', 'become', 'bed', 'begin', 'behavior',
    'behind', 'believe', 'benefit', 'beyond', 'bill', 'billion', 'bit', 'black', 'blood', 'blue',
    'board', 'body', 'bone', 'born', 'box', 'break', 'bring', 'brother', 'budget', 'build', 'building',
    'business', 'buy', 'campaign', 'cancer', 'candidate', 'capital', 'card', 'care', 'career', 'carry',
    'case', 'catch', 'cause', 'cell', 'center', 'central', 'century', 'certain', 'certainly', 'chair',
    'challenge', 'chance', 'change', 'character', 'charge', 'check', 'choice', 'choose', 'church',
    'citizen', 'civil', 'claim', 'class', 'clear', 'clearly', 'close', 'coach', 'cold', 'collection',
    'college', 'color', 'commercial', 'common', 'community', 'company', 'compare', 'computer', 'concern',
    'condition', 'conference', 'congress', 'consider', 'consumer', 'contain', 'continue', 'control',
    'cost', 'couple', 'course', 'court', 'cover', 'create', 'crime', 'cultural', 'culture', 'cup',
    'current', 'customer', 'cut', 'dark', 'data', 'daughter', 'dead', 'deal', 'death', 'debate',
    'decade', 'decide', 'decision', 'deep', 'defense', 'degree', 'democratic', 'describe', 'design',
    'despite', 'detail', 'determine', 'develop', 'development', 'die', 'difference', 'difficult',
    'dinner', 'direction', 'director', 'discover', 'discuss', 'discussion', 'disease', 'door',
    'down', 'draw', 'dream', 'drive', 'drop', 'drug', 'during', 'east', 'economic', 'economy',
    'edge', 'education', 'effect', 'effort', 'eight', 'either', 'election', 'else', 'employee',
    'end', 'energy', 'enough', 'enter', 'entire', 'environment', 'environmental', 'especially',
    'establish', 'even', 'evening', 'event', 'ever', 'everybody', 'everyone', 'everything',
    'evidence', 'exactly', 'examine', 'exist', 'expect', 'experience', 'expert', 'explain', 'eye',
    'face', 'fact', 'factor', 'fail', 'fall', 'family', 'fast', 'father', 'fear', 'federal',
    'few', 'field', 'fight', 'figure', 'fill', 'film', 'final', 'finally', 'financial', 'finger',
    'finish', 'fire', 'firm', 'fish', 'fit', 'floor', 'fly', 'focus', 'follow', 'food', 'foot',
    'force', 'foreign', 'forget', 'form', 'former', 'forward', 'four', 'friend', 'front', 'full',
    'fund', 'future', 'game', 'garden', 'general', 'generation', 'girl', 'goal', 'government',
    'ground', 'grow', 'growth', 'guess', 'gun', 'guy', 'hair', 'half', 'happen', 'hard', 'head',
    'health', 'heart', 'heat', 'heavy', 'himself', 'history', 'hit', 'hold', 'hope', 'hospital',
    'hotel', 'hour', 'however', 'huge', 'human', 'hundred', 'husband', 'idea', 'identify', 'image',
    'imagine', 'impact', 'improve', 'include', 'including', 'increase', 'indeed', 'indicate',
    'individual', 'industry', 'instead', 'institution', 'international', 'interview', 'investment',
    'involve', 'issue', 'item', 'itself', 'job', 'join', 'just', 'kill', 'kitchen', 'land',
    'language', 'later', 'laugh', 'law', 'lawyer', 'lay', 'lead', 'leader', 'learn', 'least',
    'legal', 'less', 'level', 'lie', 'light', 'likely', 'line', 'list', 'listen', 'look', 'lose',
    'loss', 'lot', 'love', 'machine', 'magazine', 'main', 'maintain', 'major', 'majority',
    'manage', 'management', 'manager', 'many', 'market', 'marriage', 'material', 'matter', 'maybe',
    'mean', 'measure', 'media', 'medical', 'meet', 'meeting', 'member', 'memory', 'mention',
    'message', 'method', 'middle', 'military', 'million', 'mind', 'minute', 'miss', 'mission',
    'model', 'modern', 'moment', 'month', 'morning', 'most', 'mother', 'mouth', 'mouth', 'myself',
    'nation', 'national', 'natural', 'nature', 'near', 'nearly', 'necessary', 'neck', 'network',
    'news', 'newspaper', 'nice', 'none', 'nor', 'north', 'note', 'nothing', 'notice', 'occur',
    'offer', 'office', 'officer', 'official', 'oil', 'once', 'open', 'operation', 'opportunity',
    'option', 'order', 'organization', 'others', 'outside', 'over', 'page', 'pain', 'painting',
    'paper', 'parent', 'particularly', 'party', 'pass', 'past', 'patient', 'pattern', 'pay',
    'peace', 'perform', 'performance', 'perhaps', 'period', 'person', 'personal', 'phone', 'physical',
    'pick', 'picture', 'piece', 'plan', 'plant', 'player', 'PM', 'policy', 'political', 'politics',
    'poor', 'popular', 'population', 'position', 'positive', 'possible', 'power', 'practice',
    'prepare', 'present', 'president', 'pressure', 'pretty', 'prevent', 'price', 'private',
    'probably', 'problem', 'process', 'produce', 'product', 'production', 'professional', 'professor',
    'project', 'property', 'protect', 'provide', 'purpose', 'push', 'quality', 'quickly', 'quite',
    'race', 'radio', 'raise', 'range', 'rate', 'rather', 'reach', 'reality', 'realize', 'reason',
    'receive', 'recent', 'recognize', 'record', 'red', 'reduce', 'reflect', 'region', 'relate',
    'relationship', 'religious', 'remain', 'remember', 'remove', 'report', 'represent', 'republican',
    'require', 'research', 'resource', 'respond', 'response', 'responsibility', 'rest', 'result',
    'return', 'reveal', 'rich', 'rise', 'risk', 'road', 'rock', 'role', 'rule', 'run', 'safe',
    'save', 'scene', 'school', 'science', 'scientist', 'score', 'sea', 'season', 'seat', 'second',
    'section', 'security', 'sell', 'send', 'senior', 'sense', 'series', 'serious', 'serve',
    'set', 'seven', 'several', 'sex', 'shake', 'share', 'shoot', 'short', 'shot', 'shoulder',
    'simple', 'simply', 'since', 'sing', 'single', 'sister', 'sit', 'site', 'situation', 'six',
    'size', 'skill', 'skin', 'smile', 'so', 'social', 'society', 'soldier', 'some', 'somebody',
    'someone', 'sometimes', 'son', 'song', 'soon', 'sort', 'sound', 'source', 'south', 'southern',
    'space', 'speak', 'special', 'specific', 'spend', 'sport', 'spring', 'staff', 'stage',
    'standard', 'star', 'station', 'stay', 'step', 'still', 'stock', 'stop', 'store', 'strategy',
    'street', 'strong', 'structure', 'stuff', 'style', 'subject', 'success', 'successful', 'such',
    'suddenly', 'suffer', 'suggest', 'summer', 'support', 'sure', 'surface', 'table', 'take',
    'talk', 'task', 'tax', 'teach', 'teacher', 'team', 'technology', 'television', 'ten', 'tend',
    'term', 'test', 'than', 'thank', 'themselves', 'theory', 'thing', 'third', 'thought',
    'thousand', 'threat', 'three', 'throw', 'thus', 'time', 'title', 'today', 'top', 'total',
    'tough', 'toward', 'town', 'trade', 'traditional', 'training', 'travel', 'treat', 'treatment',
    'tree', 'trial', 'trip', 'trouble', 'true', 'truth', 'try', 'type', 'under', 'unit', 'upon',
    'us', 'usually', 'value', 'various', 'view', 'violence', 'visit', 'voice', 'vote', 'wait',
    'walk', 'wall', 'war', 'watch', 'water', 'weapon', 'wear', 'weight', 'west', 'western',
    'what', 'whatever', 'white', 'whole', 'whom', 'whose', 'wide', 'wife', 'win', 'wind', 'window',
    'wish', 'within', 'woman', 'wonder', 'worker', 'worry', 'wrong', 'yard', 'yeah', 'yourself'
  ];

  return b1Words.includes(word.toLowerCase());
}

// Clear cache utility
export function clearSimpleWiktionaryCache(): void {
  simpleWiktionaryCache.clear();
  cacheTimestamps.clear();
  console.log('📚 Simple Wiktionary: Cache cleared');
}

// Get cache statistics
export function getSimpleWiktionaryCacheStats(): { size: number; oldestEntry: string | null } {
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
    size: simpleWiktionaryCache.size,
    oldestEntry
  };
}