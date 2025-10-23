// Simple English lemmatizer for ESL dictionary lookups
// Converts word variations to base forms (charming → charm, running → run)

interface LemmaRule {
  suffix: string;
  replacement: string;
  minLength?: number;
}

// Common suffix rules for English lemmatization
const SUFFIX_RULES: LemmaRule[] = [
  // Present participle (-ing)
  { suffix: 'ing', replacement: '', minLength: 5 }, // running → run, charming → charm

  // Past tense and past participle (-ed)
  { suffix: 'ed', replacement: '', minLength: 4 }, // played → play, charmed → charm

  // Plural nouns (-s, -es)
  { suffix: 'es', replacement: '', minLength: 4 }, // boxes → box, wishes → wish
  { suffix: 's', replacement: '', minLength: 3 }, // cats → cat, books → book

  // Comparative and superlative (-er, -est)
  { suffix: 'est', replacement: '', minLength: 5 }, // fastest → fast
  { suffix: 'er', replacement: '', minLength: 4 }, // faster → fast, charmer → charm

  // Adverbs (-ly)
  { suffix: 'ly', replacement: '', minLength: 4 }, // quickly → quick, charmingly → charming
];

// Irregular verbs that don't follow standard rules
const IRREGULAR_VERBS: Record<string, string> = {
  // Common irregular verbs
  'went': 'go',
  'came': 'come',
  'saw': 'see',
  'said': 'say',
  'did': 'do',
  'had': 'have',
  'was': 'be',
  'were': 'be',
  'got': 'get',
  'took': 'take',
  'gave': 'give',
  'made': 'make',
  'knew': 'know',
  'thought': 'think',
  'found': 'find',
  'told': 'tell',
  'felt': 'feel',
  'left': 'leave',
  'brought': 'bring',
  'bought': 'buy',
  'caught': 'catch',
  'taught': 'teach',
  'fought': 'fight',
  'sought': 'seek',
  'children': 'child',
  'men': 'man',
  'women': 'woman',
  'feet': 'foot',
  'teeth': 'tooth',
  'mice': 'mouse',
  'geese': 'goose'
};

// Words that should NOT be lemmatized (already base forms)
const STOP_LEMMATIZATION = new Set([
  'being', 'during', 'something', 'anything', 'everything', 'nothing',
  'king', 'ring', 'sing', 'wing', 'thing', 'bring', 'spring', 'string',
  'morning', 'evening', 'feeling', 'meaning', 'reading', 'writing',
  'yes', 'this', 'his', 'its', 'as', 'was', 'has', 'is'
]);

export function lemmatize(word: string): string {
  const cleanWord = word.toLowerCase().trim();

  // Skip empty or very short words
  if (!cleanWord || cleanWord.length < 3) {
    return cleanWord;
  }

  // Check if word should not be lemmatized
  if (STOP_LEMMATIZATION.has(cleanWord)) {
    return cleanWord;
  }

  // Check irregular verbs first
  if (IRREGULAR_VERBS[cleanWord]) {
    return IRREGULAR_VERBS[cleanWord];
  }

  // Apply suffix rules
  for (const rule of SUFFIX_RULES) {
    if (cleanWord.endsWith(rule.suffix) &&
        cleanWord.length >= (rule.minLength || 3)) {

      const candidate = cleanWord.slice(0, -rule.suffix.length) + rule.replacement;

      // Special handling for doubling consonants (running → run, not runn)
      if (rule.suffix === 'ing' || rule.suffix === 'ed') {
        const stem = candidate;
        if (stem.length >= 3) {
          const lastThree = stem.slice(-3);
          const lastTwo = stem.slice(-2);

          // Handle doubled consonants: running → run, stopped → stop
          if (lastTwo[0] === lastTwo[1] &&
              'bcdfghjklmnpqrstvwxz'.includes(lastTwo[0]) &&
              'aeiou'.includes(lastThree[0])) {
            return stem.slice(0, -1);
          }
        }
      }

      // Special handling for -ies → -y (studies → study)
      if (rule.suffix === 'es' && cleanWord.endsWith('ies')) {
        return cleanWord.slice(0, -3) + 'y';
      }

      return candidate;
    }
  }

  // Return original word if no rules apply
  return cleanWord;
}

// Get multiple lemma candidates for better lookup success
export function getLemmaCandidates(word: string): string[] {
  const candidates = new Set<string>();
  const baseWord = word.toLowerCase().trim();

  // Always include original word
  candidates.add(baseWord);

  // Add lemmatized version
  const lemma = lemmatize(baseWord);
  if (lemma !== baseWord) {
    candidates.add(lemma);
  }

  // For words ending in -ing, also try without -ing and with -e
  if (baseWord.endsWith('ing') && baseWord.length > 5) {
    const stem = baseWord.slice(0, -3);
    candidates.add(stem);
    candidates.add(stem + 'e'); // charming → charm, but also caring → care
  }

  // For words ending in -ed, also try with -e
  if (baseWord.endsWith('ed') && baseWord.length > 4) {
    const stem = baseWord.slice(0, -2);
    candidates.add(stem);
    candidates.add(stem + 'e'); // used → use, danced → dance
  }

  return Array.from(candidates);
}

// Test the lemmatizer with common examples
export function testLemmatizer(): void {
  const testCases = [
    ['charming', 'charm'],
    ['running', 'run'],
    ['beautiful', 'beautiful'], // no change
    ['studies', 'study'],
    ['boxes', 'box'],
    ['quickly', 'quick'],
    ['fastest', 'fast'],
    ['went', 'go'],
    ['children', 'child'],
    ['being', 'being'], // stop word
    ['ring', 'ring'], // stop word
  ];

  console.log('🔤 Lemmatizer Test Results:');
  testCases.forEach(([input, expected]) => {
    const result = lemmatize(input);
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} ${input} → ${result} (expected: ${expected})`);
  });
}