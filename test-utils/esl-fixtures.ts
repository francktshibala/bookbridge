/**
 * ESL Test Fixtures with Real Book Content
 * Based on Pride & Prejudice and other public domain works
 */

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface ESLTestContent {
  level: CEFRLevel;
  appropriate: string;
  challenging: string;
  vocabulary: string[];
  maxWords: number;
  avgSentenceLength: number;
}

export interface CulturalReference {
  term: string;
  explanation: string;
  context?: string;
}

export interface BookTestContent {
  id: string;
  title: string;
  challengingPassages: Array<{
    chapter: number;
    text: string;
    difficulty: CEFRLevel;
    culturalContext?: string[];
    expectedSimplification?: Record<CEFRLevel, string>;
  }>;
}

/**
 * CEFR-level content for testing simplification accuracy
 * Based on real ESL vocabulary standards
 */
export const ESL_TEST_CONTENT: Record<CEFRLevel, ESLTestContent> = {
  A1: {
    level: 'A1',
    appropriate: 'The cat is big. It sits on the chair. The chair is red.',
    challenging: 'The magnificent feline positioned itself regally upon the ornate furniture.',
    vocabulary: ['big', 'sits', 'red', 'chair', 'cat'],
    maxWords: 8, // Max new words per chunk for A1
    avgSentenceLength: 8
  },
  A2: {
    level: 'A2', 
    appropriate: 'Elizabeth walked through the garden. She thought about her conversation with Mr. Darcy.',
    challenging: 'Elizabeth perambulated through the botanical environs, contemplating her discourse.',
    vocabulary: ['walked', 'garden', 'thought', 'conversation'],
    maxWords: 12,
    avgSentenceLength: 12
  },
  B1: {
    level: 'B1',
    appropriate: 'Elizabeth walked through the garden thinking about her conversation with Mr. Darcy. She wondered if she had been too harsh in her judgment.',
    challenging: 'Elizabeth perambulated through the botanical environs, contemplating her discourse with the gentleman and ruminating upon whether her assessment had been unduly severe.',
    vocabulary: ['conversation', 'thinking', 'through', 'garden', 'walked', 'wondered', 'harsh', 'judgment'],
    maxWords: 15,
    avgSentenceLength: 18
  },
  B2: {
    level: 'B2',
    appropriate: 'It was a truth universally acknowledged that a single man with a good fortune must be in want of a wife. However, little consideration was given to the feelings of such a man.',
    challenging: 'It constituted an axiom of universal acknowledgment that an unattached gentleman possessing considerable pecuniary resources must necessarily experience a profound yearning for matrimonial companionship.',
    vocabulary: ['universally', 'acknowledged', 'fortune', 'consideration', 'feelings'],
    maxWords: 18,
    avgSentenceLength: 25
  },
  C1: {
    level: 'C1',
    appropriate: 'The intricate social dynamics of Regency England permeated every aspect of daily life, influencing courtship rituals and establishing rigid hierarchical structures that governed personal relationships.',
    challenging: 'The labyrinthine societal machinations characteristic of the Regency epoch suffused the quotidian existence, precipitating elaborate matrimonial protocols whilst instantiating inflexible stratified configurations.',
    vocabulary: ['intricate', 'dynamics', 'permeated', 'influencing', 'hierarchical', 'governed'],
    maxWords: 20,
    avgSentenceLength: 30
  },
  C2: {
    level: 'C2',
    appropriate: 'Austen\'s masterful deployment of free indirect discourse enables readers to access the psychological interiority of her protagonists while maintaining narrative objectivity.',
    challenging: 'Austen\'s consummate utilization of erlebte rede facilitates readerly penetration of the psychic substrata whilst preserving narratorial detachment.',
    vocabulary: ['masterful', 'deployment', 'discourse', 'psychological', 'interiority', 'protagonists', 'objectivity'],
    maxWords: 25,
    avgSentenceLength: 35
  }
};

/**
 * Cultural references from Victorian-era literature
 * Used for testing cultural context annotation
 */
export const CULTURAL_REFERENCES: Record<string, CulturalReference> = {
  'drawing-room': {
    term: 'drawing-room',
    explanation: 'A formal living room in wealthy homes where guests were received',
    context: 'Victorian social customs'
  },
  'entailment': {
    term: 'entailment', 
    explanation: 'A legal restriction on inheritance, usually to male heirs',
    context: 'British property law in Austen\'s time'
  },
  'living': {
    term: 'living',
    explanation: 'A church position that provided income to a clergyman',
    context: 'Church of England hierarchy'
  },
  'accomplishments': {
    term: 'accomplishments',
    explanation: 'Skills like drawing, languages, and music that well-bred young ladies were expected to have',
    context: 'Female education in Regency England'
  },
  'pin money': {
    term: 'pin money',
    explanation: 'A small allowance given to a wife for personal expenses',
    context: 'Women\'s financial dependence in the 19th century'
  }
};

/**
 * Real book content from Pride & Prejudice for testing
 * Uses actual Project Gutenberg text
 */
export const REAL_BOOKS: Record<string, BookTestContent> = {
  'pride-prejudice': {
    id: 'gutenberg-1342',
    title: 'Pride and Prejudice',
    challengingPassages: [
      {
        chapter: 1,
        text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.',
        difficulty: 'B2',
        culturalContext: ['universal truth', 'good fortune', 'rightful property'],
        expectedSimplification: {
          A1: 'Everyone thinks that a man with money wants to get married. When a rich man comes to live somewhere new, all the families think he should marry one of their daughters.',
          A2: 'Everyone believes that a single man with money wants to get married. When such a man moves to a new place, the local families all think he should marry one of their daughters.',
          B1: 'Everyone believes that a single man with money must want to get married. When such a man comes to live in a new area, this belief is so strong that the local families consider him the rightful match for one of their daughters.',
          B2: 'It is universally acknowledged that a wealthy single man must want a wife. Regardless of his actual feelings, when he enters a new community, the surrounding families regard him as the proper match for one of their daughters.'
        }
      },
      {
        chapter: 1,
        text: '"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?" Mr. Bennet replied that he had not. "But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."',
        difficulty: 'A2',
        culturalContext: ['Netherfield Park', 'let'],
        expectedSimplification: {
          A1: '"Dear husband," Mrs. Bennet said, "did you hear that someone rented Netherfield Park?" Mr. Bennet said no. "But someone did," she said. "Mrs. Long told me."',
          A2: '"My dear husband," Mrs. Bennet said, "have you heard that Netherfield Park has been rented?" Mr. Bennet said he had not heard this. "But it has been," she replied, "Mrs. Long just visited and told me everything."'
        }
      }
    ]
  },
  'christmas-carol': {
    id: 'gutenberg-46',
    title: 'A Christmas Carol',
    challengingPassages: [
      {
        chapter: 1,
        text: 'Marley was dead: to begin with. There is no doubt whatever about that. The register of his burial was signed by the clergyman, the clerk, the undertaker, and the chief mourner. Scrooge signed it: and Scrooge\'s name was good upon \'Change, for anything he chose to put his hand to.',
        difficulty: 'B1',
        culturalContext: ['register', 'clergyman', 'undertaker', '\'Change'],
        expectedSimplification: {
          A1: 'Marley was dead. This was completely true. Many people signed the paper when he was buried. Scrooge signed it too. Scrooge was well-known in business.',
          A2: 'First, you must know that Marley was dead. There was no doubt about this. The burial record was signed by the priest, the clerk, the funeral director, and the main mourner. Scrooge also signed it, and his name was respected in business.'
        }
      }
    ]
  }
};

/**
 * Test utilities for CEFR level validation
 */
export interface CEFRAnalysis {
  newWordsPerChunk: number;
  averageSentenceLength: number;
  passesLevelConstraints: boolean;
  violations: string[];
}

/**
 * Analyze text for CEFR level compliance
 */
export function analyzeCEFRComplexity(text: string, targetLevel: CEFRLevel): CEFRAnalysis {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const avgSentenceLength = words.length / sentences.length;
  
  const levelConstraints = ESL_TEST_CONTENT[targetLevel];
  const violations: string[] = [];
  
  if (avgSentenceLength > levelConstraints.avgSentenceLength) {
    violations.push(`Average sentence length ${avgSentenceLength.toFixed(1)} exceeds ${levelConstraints.avgSentenceLength} for ${targetLevel}`);
  }
  
  // Simple vocabulary check (in real implementation, this would check against CEFR word lists)
  const complexWords = words.filter(word => word.length > 8);
  if (complexWords.length > levelConstraints.maxWords) {
    violations.push(`Too many complex words: ${complexWords.length} exceeds ${levelConstraints.maxWords} for ${targetLevel}`);
  }
  
  return {
    newWordsPerChunk: complexWords.length,
    averageSentenceLength: avgSentenceLength,
    passesLevelConstraints: violations.length === 0,
    violations
  };
}

/**
 * Check if a word is considered "known" at a given CEFR level
 * This is a simplified version - real implementation would use comprehensive word lists
 */
export function isKnownWord(word: string, level: CEFRLevel): boolean {
  const commonWords = {
    A1: ['the', 'is', 'a', 'to', 'and', 'of', 'in', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'i', 'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'into', 'him', 'has', 'two', 'more', 'very', 'after', 'words', 'first', 'where', 'did', 'get', 'may', 'way', 'down', 'day', 'been', 'long', 'no', 'come', 'made', 'part'],
    A2: ['think', 'know', 'take', 'good', 'see', 'could', 'go', 'new', 'write', 'our', 'me', 'man', 'too', 'any', 'day', 'same', 'right', 'look', 'also', 'around', 'another', 'came', 'come', 'work', 'three', 'must', 'because', 'does', 'part', 'even', 'place', 'well', 'such', 'here', 'why', 'things', 'help', 'put', 'years', 'different', 'away', 'again', 'off', 'went', 'old', 'number', 'great', 'tell', 'men', 'say', 'small', 'every', 'found', 'still', 'between', 'name', 'should', 'home', 'big', 'give', 'air', 'line', 'set', 'own', 'under', 'read', 'last', 'never', 'us', 'left', 'end', 'along', 'while', 'might', 'next', 'sound', 'below', 'saw', 'something', 'thought', 'both', 'few', 'those', 'always', 'show', 'large', 'often', 'together', 'asked', 'house', 'world', 'going', 'want', 'school', 'important', 'until', 'form', 'food', 'keep', 'children', 'feet', 'land', 'side', 'without', 'boy', 'once', 'animal', 'life', 'enough', 'took', 'sometimes', 'four', 'head', 'above', 'kind', 'began', 'almost', 'live', 'page', 'got', 'earth', 'need', 'far', 'hand', 'high', 'year', 'mother', 'light', 'country', 'father', 'let', 'night', 'picture', 'being', 'study', 'second', 'soon', 'story', 'since', 'white', 'ever', 'paper', 'hard', 'near', 'sentence', 'better', 'best', 'across', 'during', 'today', 'however', 'sure', 'knew', 'try', 'told', 'young', 'sun', 'thing', 'whole', 'hear', 'example', 'heard', 'several', 'change', 'answer', 'room', 'sea', 'against', 'top', 'turned', 'learn', 'point', 'city', 'play', 'toward', 'five', 'himself', 'usually', 'money', 'seen', 'car', 'morning', 'body', 'upon', 'family', 'later', 'turn', 'move', 'face', 'door', 'cut', 'done', 'group', 'true', 'leave', 'song', 'close', 'open', 'run', 'book', 'remember', 'tree', 'walk', 'grow', 'river', 'carry', 'state', 'hear', 'stop', 'miss', 'idea', 'eat', 'watch', 'really', 'girl', 'mountain', 'talk', 'list']
  };
  
  const knownWords = commonWords[level] || commonWords.A1;
  return knownWords.includes(word.toLowerCase());
}

/**
 * Generate semantic similarity score for testing
 * This is a mock implementation - real version would use vector embeddings
 */
export function calculateSemanticSimilarity(original: string, simplified: string): number {
  // Very basic similarity based on shared words
  const originalWords = new Set(original.toLowerCase().split(/\s+/));
  const simplifiedWords = new Set(simplified.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...originalWords].filter(x => simplifiedWords.has(x)));
  const union = new Set([...originalWords, ...simplifiedWords]);
  
  return intersection.size / union.size;
}

/**
 * Mock TTS timing data for testing audio continuity
 */
export interface TTSResult {
  success: boolean;
  provider: string;
  wordTimings?: Array<{
    word: string;
    startTime: number;
    endTime: number;
  }>;
  totalDuration: number;
  fallbackReason?: string;
}

export function generateMockTTSResult(text: string, provider = 'web-speech'): TTSResult {
  const words = text.split(/\s+/);
  const avgWordsPerMinute = 150; // Typical reading speed
  const wordDuration = 60 / avgWordsPerMinute; // seconds per word
  
  const wordTimings = words.map((word, index) => ({
    word,
    startTime: index * wordDuration,
    endTime: (index + 1) * wordDuration
  }));
  
  return {
    success: true,
    provider,
    wordTimings,
    totalDuration: words.length * wordDuration
  };
}

/**
 * Test data for vocabulary SRS system
 */
export interface VocabularyTestData {
  userId: string;
  word: string;
  definition: string;
  difficulty: CEFRLevel;
  encounters: number;
  mastery_level: number;
  ease_factor: number;
  srs_interval: number;
  repetitions: number;
  next_review: Date;
}

export const MOCK_VOCABULARY_DATA: VocabularyTestData[] = [
  {
    userId: 'test-user-1',
    word: 'acknowledged',
    definition: 'accepted as true or valid',
    difficulty: 'B2',
    encounters: 3,
    mastery_level: 2,
    ease_factor: 2.5,
    srs_interval: 7,
    repetitions: 1,
    next_review: new Date(Date.now() - 86400000) // 1 day overdue
  },
  {
    userId: 'test-user-1', 
    word: 'fortune',
    definition: 'wealth; luck',
    difficulty: 'B1',
    encounters: 5,
    mastery_level: 3,
    ease_factor: 2.8,
    srs_interval: 14,
    repetitions: 2,
    next_review: new Date(Date.now() + 86400000) // 1 day from now
  }
];