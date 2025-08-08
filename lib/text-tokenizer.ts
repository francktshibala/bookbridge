/**
 * Text Tokenization Service for Synchronized Highlighting
 * Converts AI response text into individual word tokens with estimated timing
 */

export interface WordToken {
  id: string;
  text: string;
  startTime: number;  // estimated seconds from audio start
  endTime: number;    // estimated seconds from audio start
  isSpace: boolean;
  isPunctuation: boolean;
  isNewline: boolean;
  originalIndex: number; // position in original text
}

export interface FormattedTextSegment {
  type: 'word' | 'punctuation' | 'space' | 'newline' | 'formatting';
  content: string;
  wordToken?: WordToken;
  formattingType?: 'bold' | 'italic' | 'quote' | 'citation';
}

export interface TimingSettings {
  baseWordsPerMinute: number;
  punctuationPauseMs: number;
  sentenceEndPauseMs: number;
  paragraphBreakPauseMs: number;
  shortWordSpeedMultiplier: number; // words under 3 chars
  longWordSpeedMultiplier: number;  // words over 8 chars
}

export class TextTokenizer {
  private defaultTimingSettings: TimingSettings = {
    baseWordsPerMinute: 160, // Average human speech rate
    punctuationPauseMs: 200,
    sentenceEndPauseMs: 500,
    paragraphBreakPauseMs: 800,
    shortWordSpeedMultiplier: 1.3, // Short words spoken faster
    longWordSpeedMultiplier: 0.8   // Long words spoken slower
  };

  /**
   * Main tokenization function - converts text to timed word tokens
   */
  tokenizeText(text: string, estimatedDuration: number, customSettings?: Partial<TimingSettings>): WordToken[] {
    const settings = { ...this.defaultTimingSettings, ...customSettings };
    
    // Clean and prepare text
    const cleanedText = this.cleanTextForTokenization(text);
    
    // Extract words while preserving structure
    const words = this.extractWords(cleanedText);
    
    // Calculate timing for each word
    const timedTokens = this.estimateWordTiming(words, estimatedDuration, settings);
    
    return timedTokens;
  }

  /**
   * Clean text while preserving important structure for timing
   */
  private cleanTextForTokenization(text: string): string {
    return text
      // Normalize markdown bold formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      
      // Preserve paragraph breaks as special markers
      .replace(/\n\n+/g, ' [PARAGRAPH_BREAK] ')
      .replace(/\n/g, ' ')
      
      // Normalize whitespace but preserve structure
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract individual words with metadata
   */
  private extractWords(text: string): Array<{ word: string; isPunctuation: boolean; isSpecial: boolean }> {
    const words: Array<{ word: string; isPunctuation: boolean; isSpecial: boolean }> = [];
    
    // Split on whitespace but capture everything
    const tokens = text.split(/(\s+)/);
    
    for (const token of tokens) {
      if (!token) continue;
      
      if (/^\s+$/.test(token)) {
        // Skip pure whitespace - we'll add spaces between words
        continue;
      }
      
      if (token === '[PARAGRAPH_BREAK]') {
        words.push({ word: token, isPunctuation: false, isSpecial: true });
        continue;
      }
      
      // Split words from attached punctuation
      const matches = token.match(/(\w+|[^\w\s])/g);
      if (matches) {
        for (const match of matches) {
          const isPunctuation = /^[^\w\s]$/.test(match);
          words.push({ word: match, isPunctuation, isSpecial: false });
        }
      }
    }
    
    return words;
  }

  /**
   * Calculate estimated timing for each word
   */
  private estimateWordTiming(
    words: Array<{ word: string; isPunctuation: boolean; isSpecial: boolean }>, 
    totalDuration: number, 
    settings: TimingSettings
  ): WordToken[] {
    const tokens: WordToken[] = [];
    let currentTime = 0;
    
    // Calculate total "speaking time" needed
    const totalSpeakingTime = this.calculateTotalSpeakingTime(words, settings);
    
    // Scaling factor to fit within actual audio duration
    const timeScale = totalDuration / totalSpeakingTime;
    
    for (let i = 0; i < words.length; i++) {
      const { word, isPunctuation, isSpecial } = words[i];
      
      const startTime = currentTime;
      let duration: number;
      
      if (isSpecial && word === '[PARAGRAPH_BREAK]') {
        // Paragraph break - just pause, don't create token
        currentTime += (settings.paragraphBreakPauseMs / 1000) * timeScale;
        continue;
      }
      
      if (isPunctuation) {
        // Punctuation gets a short pause
        duration = this.getPunctuationDuration(word, settings) * timeScale;
      } else {
        // Regular word - calculate based on length and complexity
        duration = this.getWordDuration(word, settings) * timeScale;
      }
      
      const endTime = startTime + duration;
      
      const token: WordToken = {
        id: `word-${i}-${Date.now()}`,
        text: word,
        startTime,
        endTime,
        isSpace: false,
        isPunctuation,
        isNewline: false,
        originalIndex: i
      };
      
      tokens.push(token);
      currentTime = endTime;
      
      // Add small gap between words (except before punctuation)
      if (!isPunctuation && i < words.length - 1 && !words[i + 1].isPunctuation) {
        currentTime += 0.05 * timeScale; // 50ms gap between words
      }
    }
    
    return tokens;
  }

  /**
   * Calculate total estimated speaking time before scaling
   */
  private calculateTotalSpeakingTime(
    words: Array<{ word: string; isPunctuation: boolean; isSpecial: boolean }>, 
    settings: TimingSettings
  ): number {
    let totalTime = 0;
    
    for (const { word, isPunctuation, isSpecial } of words) {
      if (isSpecial && word === '[PARAGRAPH_BREAK]') {
        totalTime += settings.paragraphBreakPauseMs / 1000;
      } else if (isPunctuation) {
        totalTime += this.getPunctuationDuration(word, settings);
      } else {
        totalTime += this.getWordDuration(word, settings);
      }
    }
    
    return totalTime;
  }

  /**
   * Get duration for a single word based on characteristics
   */
  private getWordDuration(word: string, settings: TimingSettings): number {
    const baseTimePerWord = 60 / settings.baseWordsPerMinute; // seconds per word
    
    let multiplier = 1;
    
    // Adjust for word length
    if (word.length <= 2) {
      multiplier *= settings.shortWordSpeedMultiplier;
    } else if (word.length >= 8) {
      multiplier *= settings.longWordSpeedMultiplier;
    }
    
    // Adjust for complexity (syllable estimation)
    const estimatedSyllables = this.estimateSyllables(word);
    if (estimatedSyllables > 3) {
      multiplier *= 0.9; // Longer words take slightly more time per syllable
    }
    
    return baseTimePerWord * multiplier;
  }

  /**
   * Get pause duration for punctuation
   */
  private getPunctuationDuration(punctuation: string, settings: TimingSettings): number {
    switch (punctuation) {
      case '.':
      case '!':
      case '?':
        return settings.sentenceEndPauseMs / 1000;
      case ',':
      case ';':
      case ':':
        return settings.punctuationPauseMs / 1000;
      default:
        return 0.1; // Brief pause for other punctuation
    }
  }

  /**
   * Rough syllable estimation for timing
   */
  private estimateSyllables(word: string): number {
    const vowels = 'aeiouyAEIOUY';
    let syllableCount = 0;
    let prevWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !prevWasVowel) {
        syllableCount++;
      }
      prevWasVowel = isVowel;
    }
    
    // Handle silent 'e' and ensure minimum of 1 syllable
    if (word.endsWith('e') && syllableCount > 1) {
      syllableCount--;
    }
    
    return Math.max(1, syllableCount);
  }

  /**
   * Preserve original formatting while creating word-based structure
   */
  preserveFormatting(text: string): FormattedTextSegment[] {
    const segments: FormattedTextSegment[] = [];
    
    // This will be enhanced in Step 1.2 when we build the renderer
    // For now, return basic segments
    const words = text.split(/(\s+)/);
    
    for (const word of words) {
      if (/^\s+$/.test(word)) {
        segments.push({
          type: 'space',
          content: word
        });
      } else {
        segments.push({
          type: 'word',
          content: word
        });
      }
    }
    
    return segments;
  }

  /**
   * Utility: Find word token by time position
   */
  findWordAtTime(tokens: WordToken[], currentTime: number): WordToken | null {
    // Find the word that should be highlighted at current time
    for (const token of tokens) {
      if (currentTime >= token.startTime && currentTime < token.endTime) {
        return token;
      }
    }
    
    // If no exact match, find the closest upcoming word
    const upcomingWord = tokens.find(token => token.startTime > currentTime);
    if (upcomingWord) return upcomingWord;
    
    // If we're past the end, return the last word
    return tokens[tokens.length - 1] || null;
  }

  /**
   * Utility: Get timing settings optimized for different TTS providers
   */
  getProviderOptimizedSettings(provider: 'web-speech' | 'openai' | 'elevenlabs', userSpeed: number = 1.0): TimingSettings {
    const baseSettings = { ...this.defaultTimingSettings };
    
    // Adjust base rate for provider characteristics
    switch (provider) {
      case 'web-speech':
        baseSettings.baseWordsPerMinute = 150; // Tends to be slightly slower
        break;
      case 'openai':
        baseSettings.baseWordsPerMinute = 170; // Generally faster, more natural
        break;
      case 'elevenlabs':
        baseSettings.baseWordsPerMinute = 160; // Well-paced, natural
        break;
    }
    
    // Adjust for user speed setting
    baseSettings.baseWordsPerMinute *= userSpeed;
    
    return baseSettings;
  }
}

// Export singleton instance
export const textTokenizer = new TextTokenizer();