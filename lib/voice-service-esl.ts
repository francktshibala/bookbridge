'use client';

import { VoiceService, VoiceSettings, TTSOptions } from './voice-service';
import { supabase } from './supabase/client';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export function asCEFRLevel(level: unknown): CEFRLevel | undefined {
  const allowed: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  return typeof level === 'string' && (allowed as readonly string[]).includes(level)
    ? (level as CEFRLevel)
    : undefined;
}

export interface ESLAudioOptions extends VoiceSettings {
  eslLevel?: CEFRLevel;
  emphasizeDifficultWords?: boolean;
  pauseAfterSentences?: boolean;
  pronunciationGuide?: boolean;
  slowMotionWords?: string[];
  nativeLanguage?: string;
}

export interface PronunciationGuide {
  word: string;
  phonetic: string;
  audioUrl?: string;
  syllables: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export class ESLVoiceService {
  private static eslInstance: ESLVoiceService;
  private voiceService: VoiceService;
  private vocabularyDatabase: Map<string, Set<string>> = new Map();
  private phoneticDatabase: Map<string, string> = new Map();
  private difficultWordCache: Map<string, string[]> = new Map();
  
  // CEFR-aligned speech rates
  private readonly eslSpeechRates = {
    'A1': 0.6,  // 40% slower for beginners
    'A2': 0.7,  // 30% slower for elementary
    'B1': 0.8,  // 20% slower for intermediate
    'B2': 0.9,  // 10% slower for upper-intermediate
    'C1': 1.0,  // Normal speed for advanced
    'C2': 1.1   // Slightly faster for proficient
  };
  
  // Core vocabulary by CEFR level (sample - would be expanded)
  private readonly coreVocabulary = {
    A1: new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
      'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
      'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
      'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
      'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
      'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
      'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
    ]),
    A2: new Set([/* Extended A1 vocabulary + 500 more words */]),
    B1: new Set([/* Extended A2 vocabulary + 500 more words */]),
    B2: new Set([/* Extended B1 vocabulary + 1000 more words */]),
    C1: new Set([/* Extended B2 vocabulary + 1500 more words */]),
    C2: new Set([/* Extended C1 vocabulary + 2000 more words */])
  };
  
  // Common phonetic patterns for pronunciation guidance
  private readonly phoneticPatterns = new Map([
    ['ough', 'ʌf/ɔː/uː/aʊ'],
    ['tion', 'ʃən'],
    ['sion', 'ʒən'],
    ['ed', 't/d/ɪd'],
    ['ing', 'ɪŋ'],
    ['ph', 'f'],
    ['ch', 'tʃ/k/ʃ'],
    ['gh', 'f/g/silent'],
    ['kn', 'n'],
    ['wr', 'r'],
    ['mb', 'm'],
    ['mn', 'm'],
    ['ps', 's'],
    ['pt', 't']
  ]);

  private constructor() {
    this.voiceService = VoiceService.getInstance();
    this.initializeVocabularyDatabase();
    this.initializePhoneticDatabase();
  }

  public static getESLInstance(): ESLVoiceService {
    if (!ESLVoiceService.eslInstance) {
      ESLVoiceService.eslInstance = new ESLVoiceService();
    }
    return ESLVoiceService.eslInstance;
  }

  private initializeVocabularyDatabase(): void {
    // Initialize with core vocabulary
    this.vocabularyDatabase.set('A1', this.coreVocabulary.A1);
    // In production, this would load from a comprehensive database
  }

  private initializePhoneticDatabase(): void {
    // Common irregular pronunciations
    this.phoneticDatabase.set('colonel', 'ˈkɜːrnəl');
    this.phoneticDatabase.set('wednesday', 'ˈwenzdɪ');
    this.phoneticDatabase.set('february', 'ˈfebruəri');
    this.phoneticDatabase.set('comfortable', 'ˈkʌmftəbəl');
    this.phoneticDatabase.set('vegetable', 'ˈvedʒtəbəl');
    this.phoneticDatabase.set('interesting', 'ˈɪntrəstɪŋ');
    this.phoneticDatabase.set('restaurant', 'ˈrestrɒnt');
    this.phoneticDatabase.set('chocolate', 'ˈtʃɒklət');
    this.phoneticDatabase.set('different', 'ˈdɪfrənt');
    this.phoneticDatabase.set('temperature', 'ˈtemprətʃər');
  }

  /**
   * Main ESL-enhanced speech method
   */
  public async speakWithESLSupport(
    text: string,
    options: Partial<ESLAudioOptions> = {},
    callbacks: Pick<TTSOptions, 'onStart' | 'onEnd' | 'onError' | 'onWordBoundary'> = {}
  ): Promise<void> {
    // Get user's ESL profile if not provided
    if (!options.eslLevel) {
      const userProfile = await this.getUserESLProfile();
      if (userProfile?.eslLevel) {
        options.eslLevel = userProfile.eslLevel;
      }
    }

    // Merge with base voice settings to satisfy required fields
    const base: VoiceSettings = this.voiceService.getCurrentSettings();
    const merged: ESLAudioOptions = {
      rate: base.rate,
      pitch: base.pitch,
      volume: base.volume,
      voice: base.voice,
      provider: base.provider,
      elevenLabsVoice: base.elevenLabsVoice,
      openAIVoice: base.openAIVoice,
      ...options,
    };

    // Adjust speech rate based on ESL level
    const adjustedOptions = this.adjustOptionsForESL(merged);
    
    // Process text for ESL enhancements
    const enhancedText = await this.enhanceTextForESL(text, adjustedOptions);
    
    // Track vocabulary for learning analytics
    if (options.eslLevel) {
      await this.trackVocabularyExposure(text, options.eslLevel);
    }
    
    // Use parent class speak method with enhanced text and options
    return this.voiceService.speak({
      text: enhancedText,
      settings: adjustedOptions,
      onStart: callbacks.onStart,
      onEnd: callbacks.onEnd,
      onError: callbacks.onError,
      onWordBoundary: async (info) => {
        // Enhanced word boundary with pronunciation support
        if (options.pronunciationGuide) {
          const pronunciation = await this.getPronunciationForWord(info.word);
          console.log(`📚 Word: ${info.word} - Pronunciation: ${pronunciation.phonetic}`);
        }
        callbacks.onWordBoundary?.(info);
      }
    });
  }

  /**
   * Adjust audio options based on ESL level
   */
  private adjustOptionsForESL(options: ESLAudioOptions): ESLAudioOptions {
    const adjusted = { ...options };
    
    // Set appropriate speech rate for ESL level
    if (options.eslLevel && !options.rate) {
      adjusted.rate = this.eslSpeechRates[options.eslLevel];
      console.log(`🎓 ESL: Adjusting speech rate to ${adjusted.rate} for level ${options.eslLevel}`);
    }
    
    // Enable helpful features for lower levels
    if (options.eslLevel && ['A1', 'A2'].includes(options.eslLevel)) {
      adjusted.pauseAfterSentences = true;
      adjusted.emphasizeDifficultWords = true;
      console.log('🎓 ESL: Enabling beginner-friendly features (pauses, emphasis)');
    }
    
    return adjusted;
  }

  /**
   * Enhance text with ESL-specific modifications
   */
  private async enhanceTextForESL(
    text: string,
    options: ESLAudioOptions
  ): Promise<string> {
    let enhancedText = text;
    
    // Add pauses after sentences for comprehension
    if (options.pauseAfterSentences) {
      enhancedText = this.addPausesAfterSentences(enhancedText);
    }
    
    // Slow down difficult words
    if (options.slowMotionWords && options.slowMotionWords.length > 0) {
      enhancedText = this.addSlowMotionToWords(enhancedText, options.slowMotionWords);
    }
    
    // Add emphasis to vocabulary words above user's level
    if (options.emphasizeDifficultWords && options.eslLevel) {
      const difficultWords = await this.identifyDifficultWords(text, options.eslLevel);
      enhancedText = this.addEmphasisToWords(enhancedText, difficultWords);
    }
    
    // Add pronunciation breaks for complex words
    if (options.eslLevel && ['A1', 'A2', 'B1'].includes(options.eslLevel)) {
      enhancedText = this.addPronunciationBreaks(enhancedText);
    }
    
    return enhancedText;
  }

  /**
   * Add natural pauses after sentences
   */
  private addPausesAfterSentences(text: string): string {
    // Add SSML breaks after sentence endings
    return text
      .replace(/([.!?])\s+/g, '$1<break time="800ms"/> ')
      .replace(/(:)\s+/g, '$1<break time="500ms"/> ')
      .replace(/(,)\s+/g, '$1<break time="300ms"/> ');
  }

  /**
   * Slow down specific words for clarity
   */
  private addSlowMotionToWords(text: string, words: string[]): string {
    let processedText = text;
    
    words.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      processedText = processedText.replace(
        regex,
        `<prosody rate="0.6">${word}</prosody>`
      );
    });
    
    return processedText;
  }

  /**
   * Add emphasis to difficult vocabulary
   */
  private addEmphasisToWords(text: string, words: string[]): string {
    let processedText = text;
    
    words.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      processedText = processedText.replace(
        regex,
        `<emphasis level="moderate">${word}</emphasis>`
      );
    });
    
    return processedText;
  }

  /**
   * Add pronunciation breaks for complex words
   */
  private addPronunciationBreaks(text: string): string {
    // Split long words into syllables with micro-pauses
    const words = text.split(/\s+/);
    const processedWords = words.map(word => {
      // Words longer than 3 syllables get pronunciation breaks
      if (word.length > 10 && !word.includes('-')) {
        const syllables = this.syllableSplit(word);
        if (syllables.length > 3) {
          return syllables.join('<break time="50ms"/>');
        }
      }
      return word;
    });
    
    return processedWords.join(' ');
  }

  /**
   * Identify words above the user's ESL level
   */
  private async identifyDifficultWords(
    text: string,
    eslLevel: CEFRLevel
  ): Promise<string[]> {
    // Check cache first
    const cacheKey = `${eslLevel}:${text.substring(0, 100)}`;
    if (this.difficultWordCache.has(cacheKey)) {
      return this.difficultWordCache.get(cacheKey)!;
    }
    
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const uniqueWords = [...new Set(words)];
    const coreVocab = this.vocabularyDatabase.get(eslLevel) || this.coreVocabulary.A1;
    
    // Find words not in the user's level vocabulary
    const difficultWords = uniqueWords.filter(word => {
      // Skip very short words
      if (word.length <= 2) return false;
      
      // Check if word is above user's level
      return !coreVocab.has(word);
    });
    
    // Cache the result
    this.difficultWordCache.set(cacheKey, difficultWords);
    
    console.log(`🎓 ESL: Identified ${difficultWords.length} difficult words for ${eslLevel} level`);
    return difficultWords;
  }

  /**
   * Generate pronunciation guide for a word
   */
  public async generatePronunciationGuide(word: string): Promise<PronunciationGuide> {
    const lowerWord = word.toLowerCase();
    
    // Check phonetic database
    const phonetic = this.phoneticDatabase.get(lowerWord) || this.generatePhonetic(lowerWord);
    
    // Split into syllables
    const syllables = this.syllableSplit(lowerWord);
    
    // Determine difficulty based on patterns
    const difficulty = this.assessPronunciationDifficulty(lowerWord);
    
    // Generate audio URL (would integrate with TTS API in production)
    const audioUrl = await this.generateWordAudioUrl(word);
    
    return {
      word,
      phonetic,
      audioUrl,
      syllables,
      difficulty
    };
  }

  /**
   * Generate phonetic transcription
   */
  private generatePhonetic(word: string): string {
    // Simple phonetic generation (in production, use a proper phonetic dictionary)
    let phonetic = word;
    
    // Apply common patterns
    this.phoneticPatterns.forEach((sound, pattern) => {
      if (word.includes(pattern)) {
        phonetic = phonetic.replace(pattern, `[${sound}]`);
      }
    });
    
    return `/${phonetic}/`;
  }

  /**
   * Split word into syllables
   */
  private syllableSplit(word: string): string[] {
    // Simple syllable splitting algorithm
    const vowels = 'aeiouAEIOU';
    const syllables: string[] = [];
    let currentSyllable = '';
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const isVowel = vowels.includes(char);
      
      if (isVowel && !previousWasVowel && currentSyllable.length > 0) {
        // Start new syllable
        syllables.push(currentSyllable);
        currentSyllable = char;
      } else {
        currentSyllable += char;
      }
      
      previousWasVowel = isVowel;
    }
    
    if (currentSyllable) {
      syllables.push(currentSyllable);
    }
    
    return syllables.length > 0 ? syllables : [word];
  }

  /**
   * Assess pronunciation difficulty
   */
  private assessPronunciationDifficulty(word: string): 'easy' | 'medium' | 'hard' {
    // Check for difficult patterns
    const hardPatterns = ['ough', 'augh', 'eigh', 'tion', 'sion', 'ture'];
    const mediumPatterns = ['ph', 'ch', 'gh', 'kn', 'wr'];
    
    for (const pattern of hardPatterns) {
      if (word.includes(pattern)) return 'hard';
    }
    
    for (const pattern of mediumPatterns) {
      if (word.includes(pattern)) return 'medium';
    }
    
    // Check word length
    if (word.length > 10) return 'hard';
    if (word.length > 6) return 'medium';
    
    return 'easy';
  }

  /**
   * Generate audio for a single word
   */
  private async generateWordAudioUrl(word: string): Promise<string> {
    // In production, this would call TTS API for single word
    // For now, return placeholder
    return `/api/esl/pronunciation/${encodeURIComponent(word)}`;
  }

  /**
   * Get pronunciation info for word during reading
   */
  private async getPronunciationForWord(word: string): Promise<PronunciationGuide> {
    return this.generatePronunciationGuide(word);
  }

  /**
   * Track vocabulary exposure for learning analytics
   */
  private async trackVocabularyExposure(text: string, eslLevel: CEFRLevel): Promise<void> {
    try {
      const words = text.toLowerCase().match(/\b\w+\b/g) || [];
      const uniqueWords = [...new Set(words)];
      
      // Get user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Track difficult words encountered
      const difficultWords = await this.identifyDifficultWords(text, eslLevel);
      
      if (difficultWords.length > 0) {
        // Store vocabulary exposure in database
        const exposureRecords = difficultWords.map(word => ({
          user_id: user.id,
          word,
          difficulty_level: eslLevel,
          encounter_context: text.substring(0, 200),
          created_at: new Date().toISOString()
        }));
        
        // Batch insert (would be implemented in production)
        console.log(`📊 ESL: Tracking ${difficultWords.length} vocabulary exposures for user`);
      }
    } catch (error) {
      console.error('ESL: Error tracking vocabulary exposure:', error);
    }
  }

  /**
   * Get user's ESL profile from database
   */
  private async getUserESLProfile(): Promise<{ eslLevel?: CEFRLevel; nativeLanguage?: string } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('eslLevel, nativeLanguage')
        .eq('id', user.id)
        .single();
      
      if (error || !data) return null;
      
      return {
        eslLevel: asCEFRLevel(data.eslLevel),
        nativeLanguage: data.nativeLanguage ?? undefined,
      };
    } catch (error) {
      console.error('ESL: Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Generate reading speed recommendations
   */
  public getRecommendedReadingSpeed(eslLevel: CEFRLevel): {
    wpm: number;
    audioRate: number;
    description: string;
  } {
    const speeds = {
      'A1': { wpm: 80, audioRate: 0.6, description: 'Very slow pace for beginners' },
      'A2': { wpm: 100, audioRate: 0.7, description: 'Slow pace for elementary learners' },
      'B1': { wpm: 120, audioRate: 0.8, description: 'Moderate pace for intermediate learners' },
      'B2': { wpm: 150, audioRate: 0.9, description: 'Near-normal pace for upper-intermediate' },
      'C1': { wpm: 180, audioRate: 1.0, description: 'Normal reading pace for advanced learners' },
      'C2': { wpm: 200, audioRate: 1.1, description: 'Native-like reading pace' }
    };
    
    return speeds[eslLevel] || speeds['B1'];
  }

  /**
   * Provide contextual pronunciation tips
   */
  public getPronunciationTips(word: string, nativeLanguage?: string): string[] {
    const tips: string[] = [];
    const lowerWord = word.toLowerCase();
    
    // Check for common pronunciation challenges
    if (lowerWord.includes('th')) {
      tips.push('Place tongue between teeth for "th" sound');
      if (nativeLanguage === 'es') {
        tips.push('El sonido "th" no existe en español - practica con la lengua entre los dientes');
      }
    }
    
    if (lowerWord.includes('r')) {
      tips.push('English "r" is pronounced with tongue curved back');
      if (nativeLanguage === 'ja') {
        tips.push('英語の"r"は日本語の"ら"とは異なります');
      }
    }
    
    if (lowerWord.endsWith('ed')) {
      tips.push('"-ed" can be pronounced as /t/, /d/, or /ɪd/ depending on the preceding sound');
    }
    
    return tips;
  }
}

// Export singleton instance
export const eslVoiceService = ESLVoiceService.getESLInstance();