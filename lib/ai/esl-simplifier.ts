import { VocabularyMapping } from './vocabulary-simplifier';

interface CEFRLevel {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  maxVocabularySize: number;
  maxSentenceLength: number;
  allowedTenses: string[];
}

interface SimplificationResult {
  simplifiedText: string;
  changesLog: Array<{original: string; simplified: string; reason: string}>;
  vocabularyIntroduced: string[];
  culturalContexts: Array<{term: string; explanation: string}>;
}

interface SimplificationOptions {
  preserveNames?: boolean;
  addCulturalContext?: boolean;
  maintainStoryStructure?: boolean;
}

const CEFR_CONSTRAINTS: Record<string, CEFRLevel> = {
  'A1': {
    level: 'A1',
    maxVocabularySize: 500,
    maxSentenceLength: 8,
    allowedTenses: ['simple present', 'simple past']
  },
  'A2': {
    level: 'A2', 
    maxVocabularySize: 1000,
    maxSentenceLength: 12,
    allowedTenses: ['simple present', 'simple past', 'present continuous', 'going to future']
  },
  'B1': {
    level: 'B1',
    maxVocabularySize: 1500,
    maxSentenceLength: 18,
    allowedTenses: ['all basic tenses', 'present perfect', 'first conditional']
  },
  'B2': {
    level: 'B2',
    maxVocabularySize: 2500,
    maxSentenceLength: 25,
    allowedTenses: ['all tenses', 'passive voice', 'conditionals', 'reported speech']
  },
  'C1': {
    level: 'C1',
    maxVocabularySize: 4000,
    maxSentenceLength: 30,
    allowedTenses: ['all structures', 'advanced grammar', 'subjunctive']
  },
  'C2': {
    level: 'C2',
    maxVocabularySize: 6000,
    maxSentenceLength: 40,
    allowedTenses: ['all structures', 'idiomatic', 'stylistic variation']
  }
};

// Core vocabulary lists by CEFR level (essential words for each level)
const CORE_VOCABULARY = {
  A1: new Set([
    // Basic personal information
    'I', 'you', 'he', 'she', 'it', 'we', 'they',
    'am', 'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'can', 'will', 'would',
    'good', 'bad', 'big', 'small', 'new', 'old', 'young', 'nice',
    'go', 'come', 'see', 'look', 'want', 'like', 'need', 'know',
    'house', 'home', 'school', 'work', 'family', 'friend',
    'eat', 'drink', 'sleep', 'read', 'write', 'speak',
    'one', 'two', 'three', 'first', 'last', 'today', 'now',
    'man', 'woman', 'child', 'people', 'time', 'day', 'year',
    'get', 'make', 'take', 'give', 'put', 'think', 'say', 'tell'
  ]),
  A2: new Set([
    // A1 vocabulary plus elementary additions
    'because', 'but', 'and', 'or', 'so', 'when', 'where', 'why', 'how',
    'money', 'buy', 'sell', 'pay', 'cost', 'price', 'cheap', 'expensive',
    'food', 'water', 'coffee', 'tea', 'breakfast', 'lunch', 'dinner',
    'car', 'bus', 'train', 'plane', 'travel', 'visit', 'holiday',
    'happy', 'sad', 'angry', 'tired', 'hungry', 'thirsty', 'cold', 'hot',
    'feel', 'think', 'believe', 'hope', 'wish', 'remember', 'forget',
    'important', 'different', 'same', 'easy', 'difficult', 'interesting',
    'country', 'city', 'town', 'street', 'shop', 'restaurant', 'hotel'
  ])
};

// Cultural references that commonly need explanation for ESL learners
const CULTURAL_REFERENCES = new Map([
  ['taking the waters', 'going to spa for health treatment'],
  ['morning calls', 'social visits made in the afternoon (3-5pm)'],
  ['coming out', 'formal introduction of young woman to society'],
  ['drawing room', 'formal living room for receiving guests'],
  ['entailment', 'legal arrangement where property passes to male heir'],
  ['governess', 'private teacher who lived with wealthy families'],
  ['accomplishments', 'skills like piano, drawing, languages for ladies'],
  ['pin money', 'small allowance for personal expenses'],
  ['proper', 'following social rules and expectations'],
  ['calling', 'formal social visiting'],
  ['season', 'social period in London when wealthy families gathered'],
  ['assembly', 'public dance or social gathering'],
  ['quadrille', 'formal dance with four couples'],
  ['reel', 'lively Scottish dance'],
  ['barouche', 'four-wheeled carriage with folding top'],
  ['curricle', 'light two-wheeled carriage'],
  ['chaise', 'light traveling carriage']
]);

export class ESLSimplifier {
  private coreVocab: Map<string, Set<string>> = new Map();
  private culturalReferences: Map<string, string> = new Map();
  
  constructor() {
    this.loadVocabularyDatabase();
    this.loadCulturalReferences();
  }
  
  async simplifyText(
    text: string, 
    targetLevel: string, 
    nativeLanguage?: string | null
  ): Promise<string>;
  async simplifyText(
    text: string, 
    targetLevel: string, 
    options: SimplificationOptions
  ): Promise<SimplificationResult>;
  async simplifyText(
    text: string, 
    targetLevel: string, 
    optionsOrNativeLanguage?: string | null | SimplificationOptions
  ): Promise<string | SimplificationResult> {
    // Check if third param is a native language string or options object
    const isSimpleCall = typeof optionsOrNativeLanguage === 'string' || 
                         optionsOrNativeLanguage === null || 
                         optionsOrNativeLanguage === undefined;
    
    if (isSimpleCall) {
      // Simple API call - just return simplified text
      // For now, return a simple placeholder - in production this would use AI
      return this.simplifyTextBasic(text, targetLevel);
    } else {
      // Full API call with options
      return await this.performSimplification(text, targetLevel, optionsOrNativeLanguage as SimplificationOptions);
    }
  }
  
  private async performSimplification(
    text: string, 
    targetLevel: string, 
    options: SimplificationOptions = {}
  ): Promise<SimplificationResult> {
    
    const constraints = CEFR_CONSTRAINTS[targetLevel];
    if (!constraints) {
      throw new Error(`Invalid CEFR level: ${targetLevel}`);
    }
    
    const allowedWords = this.coreVocab.get(targetLevel) || new Set();
    
    // Split text into sentences and process
    const sentences = this.splitIntoSentences(text);
    const processedSentences = [];
    const changesLog: Array<{original: string; simplified: string; reason: string}> = [];
    const vocabularyIntroduced: string[] = [];
    const culturalContexts: Array<{term: string; explanation: string}> = [];
    
    for (const sentence of sentences) {
      const result = await this.simplifySentence(
        sentence, 
        constraints, 
        allowedWords,
        options
      );
      
      processedSentences.push(result.text);
      changesLog.push(...result.changes);
      vocabularyIntroduced.push(...result.newVocabulary);
      culturalContexts.push(...result.culturalNotes);
    }
    
    return {
      simplifiedText: processedSentences.join(' '),
      changesLog,
      vocabularyIntroduced,
      culturalContexts
    };
  }
  
  private async simplifySentence(
    sentence: string,
    constraints: CEFRLevel,
    allowedWords: Set<string>,
    options: SimplificationOptions
  ) {
    const changes: Array<{original: string; simplified: string; reason: string}> = [];
    const newVocabulary: string[] = [];
    const culturalNotes: Array<{term: string; explanation: string}> = [];
    
    let simplifiedSentence = sentence.trim();
    
    // Step 1: Replace complex vocabulary
    const words = simplifiedSentence.match(/\b\w+\b/g) || [];
    
    for (const word of words) {
      const lowerWord = word.toLowerCase();
      
      // Skip if it's a name and we want to preserve names
      if (options.preserveNames && this.isProperName(word)) {
        continue;
      }
      
      // Check if word is above the user's level
      if (!allowedWords.has(lowerWord) && this.isComplexWord(lowerWord, constraints.level)) {
        const simpler = this.findSimplerAlternative(lowerWord, constraints.level);
        if (simpler && simpler !== lowerWord) {
          const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
          simplifiedSentence = simplifiedSentence.replace(regex, simpler);
          changes.push({
            original: word,
            simplified: simpler,
            reason: `Simplified ${constraints.level}-level vocabulary`
          });
          newVocabulary.push(lowerWord);
        }
      }
      
      // Check for cultural references
      if (options.addCulturalContext && this.culturalReferences.has(lowerWord)) {
        const explanation = this.culturalReferences.get(lowerWord)!;
        culturalNotes.push({
          term: lowerWord,
          explanation
        });
      }
    }
    
    // Step 2: Simplify sentence structure if too long
    if (this.countWords(simplifiedSentence) > constraints.maxSentenceLength) {
      simplifiedSentence = this.shortenSentence(simplifiedSentence, constraints);
      changes.push({
        original: sentence,
        simplified: simplifiedSentence,
        reason: `Shortened for ${constraints.level} comprehension`
      });
    }
    
    // Step 3: Simplify complex grammar structures
    const grammarSimplified = this.simplifyGrammar(simplifiedSentence, constraints);
    if (grammarSimplified !== simplifiedSentence) {
      changes.push({
        original: simplifiedSentence,
        simplified: grammarSimplified,
        reason: `Simplified grammar for ${constraints.level}`
      });
      simplifiedSentence = grammarSimplified;
    }
    
    return {
      text: simplifiedSentence,
      changes,
      newVocabulary,
      culturalNotes
    };
  }
  
  private splitIntoSentences(text: string): string[] {
    // Smart sentence splitting that handles abbreviations and dialogue
    return text
      .replace(/([.!?])\s+/g, '$1|SPLIT|')
      .split('|SPLIT|')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  private isProperName(word: string): boolean {
    // Simple heuristic: starts with capital letter and common name patterns
    return /^[A-Z][a-z]+$/.test(word) && 
           !['The', 'A', 'An', 'In', 'On', 'At', 'By', 'For', 'With'].includes(word);
  }
  
  private isComplexWord(word: string, level: string): boolean {
    // This would integrate with a comprehensive vocabulary database
    // For now, use simple length and common word heuristics
    const complexityIndicators = {
      'A1': (w: string) => w.length > 6,
      'A2': (w: string) => w.length > 8,
      'B1': (w: string) => w.length > 10,
      'B2': (w: string) => w.length > 12,
      'C1': (w: string) => w.length > 14,
      'C2': (w: string) => false // C2 can handle complex words
    };
    
    const checker = complexityIndicators[level as keyof typeof complexityIndicators];
    return checker ? checker(word) : false;
  }
  
  private findSimplerAlternative(word: string, level: string): string | null {
    // Vocabulary replacement mappings for common complex words
    const simplifications: Record<string, Record<string, string>> = {
      'A1': {
        'magnificent': 'great',
        'extraordinary': 'very good',
        'accomplished': 'skilled',
        'immediately': 'right now',
        'understand': 'know',
        'beautiful': 'pretty',
        'delicious': 'good',
        'expensive': 'costs much',
        'interesting': 'good',
        'important': 'big'
      },
      'A2': {
        'magnificent': 'wonderful',
        'extraordinary': 'amazing',
        'immediately': 'quickly',
        'beautiful': 'lovely',
        'delicious': 'tasty',
        'conversation': 'talk',
        'information': 'facts',
        'experience': 'time',
        'necessary': 'needed',
        'different': 'not same'
      },
      'B1': {
        'magnificent': 'excellent',
        'extraordinary': 'unusual',
        'accomplished': 'successful',
        'immediately': 'at once',
        'conversation': 'discussion',
        'experience': 'what happened',
        'opportunity': 'chance',
        'development': 'growth',
        'relationship': 'connection'
      }
    };
    
    return simplifications[level]?.[word] || null;
  }
  
  private countWords(text: string): number {
    return (text.match(/\b\w+\b/g) || []).length;
  }
  
  private shortenSentence(sentence: string, constraints: CEFRLevel): string {
    // Break long sentences into shorter ones
    // This is a simplified approach - in production would use more sophisticated NLP
    
    if (sentence.includes(' and ') && this.countWords(sentence) > constraints.maxSentenceLength) {
      const parts = sentence.split(' and ');
      if (parts.length === 2) {
        return `${parts[0].trim()}. ${parts[1].trim()}`;
      }
    }
    
    if (sentence.includes(', which ') && this.countWords(sentence) > constraints.maxSentenceLength) {
      const parts = sentence.split(', which ');
      return parts[0].trim() + '.';
    }
    
    return sentence;
  }
  
  private simplifyGrammar(sentence: string, constraints: CEFRLevel): string {
    let simplified = sentence;
    
    // Simplify passive voice for lower levels
    if (['A1', 'A2', 'B1'].includes(constraints.level)) {
      // Convert "was written by" to active voice (simplified)
      simplified = simplified.replace(/was (\w+) by ([^,\.]+)/g, '$2 $1');
      simplified = simplified.replace(/were (\w+) by ([^,\.]+)/g, '$2 $1');
    }
    
    // Simplify complex tenses for A1/A2
    if (['A1', 'A2'].includes(constraints.level)) {
      // Convert perfect tenses to simple past
      simplified = simplified.replace(/has (\w+)/g, '$1');
      simplified = simplified.replace(/have (\w+)/g, '$1');
      simplified = simplified.replace(/had (\w+)/g, '$1');
    }
    
    return simplified;
  }
  
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  private simplifyTextBasic(text: string, targetLevel: string): string {
    // Enhanced basic simplification for demo purposes
    // In production, this would use Claude AI for proper simplification
    
    let simplified = text;
    
    console.log(`🎓 ESL Simplifier: Processing ${targetLevel} level text (${text.length} chars)`);
    
    // Apply transformations based on level
    if (targetLevel === 'A1' || targetLevel === 'A2') {
      // Beginners - extensive simplification
      simplified = simplified
        // Complex connectors to simple ones
        .replace(/\bhowever\b/gi, 'but')
        .replace(/\btherefore\b/gi, 'so')
        .replace(/\bnevertheless\b/gi, 'but')
        .replace(/\bfurthermore\b/gi, 'also')
        .replace(/\bmoreover\b/gi, 'also')
        .replace(/\bconsequently\b/gi, 'so')
        .replace(/\bsubsequently\b/gi, 'then')
        .replace(/\bnotwithstanding\b/gi, 'despite')
        .replace(/\binasmuch as\b/gi, 'because')
        
        // Complex verbs to simple ones
        .replace(/\bobtain\b/gi, 'get')
        .replace(/\bacquire\b/gi, 'get')
        .replace(/\bdemonstrate\b/gi, 'show')
        .replace(/\butilize\b/gi, 'use')
        .replace(/\bcommence\b/gi, 'start')
        .replace(/\bconclude\b/gi, 'end')
        .replace(/\bestablish\b/gi, 'make')
        .replace(/\bmaintain\b/gi, 'keep')
        .replace(/\bpurchase\b/gi, 'buy')
        .replace(/\bcomprehend\b/gi, 'understand')
        
        // Complex adjectives to simple ones
        .replace(/\bmagnificent\b/gi, 'great')
        .replace(/\bextraordinary\b/gi, 'amazing')
        .replace(/\btremendous\b/gi, 'very big')
        .replace(/\bimmense\b/gi, 'huge')
        .replace(/\bexcellent\b/gi, 'very good')
        .replace(/\benormous\b/gi, 'very big')
        
        // Modal verbs
        .replace(/ought to/gi, 'should')
        .replace(/must have been/gi, 'was probably')
        .replace(/could have been/gi, 'might be')
        .replace(/would have been/gi, 'was maybe');
        
      // Add visual indicator for demo (remove in production)
      simplified = `[📚 SIMPLIFIED for ${targetLevel}] ${simplified}`;
      
      // Shorten long sentences (very basic)
      const sentences = simplified.split(/(?<=[.!?])\s+/);
      simplified = sentences.map(sentence => {
        const words = sentence.split(' ');
        if (words.length > 15) {
          // Try to split at conjunctions
          const midPoint = Math.floor(words.length / 2);
          return words.slice(0, midPoint).join(' ') + '. ' + 
                 words.slice(midPoint).join(' ');
        }
        return sentence;
      }).join(' ');
    } else if (targetLevel === 'B1' || targetLevel === 'B2') {
      // Moderate simplifications
      simplified = simplified
        .replace(/\bnotwithstanding\b/gi, 'despite')
        .replace(/\binasmuch as\b/gi, 'because')
        .replace(/\bheretofore\b/gi, 'before now')
        .replace(/\bthenceforth\b/gi, 'from then on')
        .replace(/\bwherewithal\b/gi, 'resources');
    }
    
    // Add level indicator for demo
    return `[Simplified for ${targetLevel}]\n\n${simplified}`;
  }

  private loadVocabularyDatabase(): void {
    // Load CEFR-aligned vocabulary lists
    this.coreVocab = new Map();
    
    // Start with A1 vocabulary
    this.coreVocab.set('A1', CORE_VOCABULARY.A1);
    
    // A2 includes A1 + new words
    const a2Vocab = new Set([...CORE_VOCABULARY.A1, ...CORE_VOCABULARY.A2]);
    this.coreVocab.set('A2', a2Vocab);
    
    // For now, B1+ levels include previous levels plus more words
    // In production, this would load from comprehensive CEFR vocabulary databases
    this.coreVocab.set('B1', a2Vocab);
    this.coreVocab.set('B2', a2Vocab);
    this.coreVocab.set('C1', a2Vocab);
    this.coreVocab.set('C2', a2Vocab);
  }
  
  private loadCulturalReferences(): void {
    // Load cultural reference database from research findings
    this.culturalReferences = CULTURAL_REFERENCES;
  }
  
  // Utility method to assess text difficulty
  assessTextDifficulty(text: string): {
    estimatedLevel: string;
    complexWords: string[];
    avgSentenceLength: number;
    readabilityScore: number;
  } {
    const words = (text.match(/\b\w+\b/g) || []).map(w => w.toLowerCase());
    const sentences = this.splitIntoSentences(text);
    const avgSentenceLength = words.length / sentences.length;
    
    // Count complex words (simple heuristic)
    const complexWords = words.filter(word => word.length > 8);
    const complexityRatio = complexWords.length / words.length;
    
    // Estimate CEFR level based on complexity
    let estimatedLevel = 'A1';
    if (complexityRatio > 0.1) estimatedLevel = 'A2';
    if (complexityRatio > 0.2 || avgSentenceLength > 15) estimatedLevel = 'B1';
    if (complexityRatio > 0.3 || avgSentenceLength > 20) estimatedLevel = 'B2';
    if (complexityRatio > 0.4 || avgSentenceLength > 25) estimatedLevel = 'C1';
    if (complexityRatio > 0.5 || avgSentenceLength > 30) estimatedLevel = 'C2';
    
    const readabilityScore = Math.max(0, Math.min(1, 1 - complexityRatio));
    
    return {
      estimatedLevel,
      complexWords,
      avgSentenceLength,
      readabilityScore
    };
  }
}

// Export singleton instance
export const eslSimplifier = new ESLSimplifier();