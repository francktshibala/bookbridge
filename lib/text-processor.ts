/**
 * Text Processor for Progressive Voice Feature
 * Optimizes text for audio generation and word-level highlighting
 */

export interface ProcessedSentence {
  text: string;
  wordCount: number;
  estimatedDuration: number; // seconds
  words: string[];
  sentenceIndex: number;
}

export class TextProcessor {
  // Configuration for optimal audio chunks
  private static readonly MIN_WORDS_PER_CHUNK = 5;
  private static readonly MAX_WORDS_PER_CHUNK = 25;
  private static readonly OPTIMAL_WORDS_PER_CHUNK = 15;
  private static readonly AVG_WORDS_PER_MINUTE = 150; // Average speaking rate

  // Common abbreviations that shouldn't trigger sentence breaks
  private static readonly ABBREVIATIONS = new Set([
    'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.',
    'St.', 'Ave.', 'Blvd.', 'Rd.', 'Inc.', 'Ltd.', 'Co.',
    'vs.', 'etc.', 'i.e.', 'e.g.', 'a.m.', 'p.m.',
    'U.S.', 'U.K.', 'N.Y.', 'L.A.'
  ]);

  /**
   * Split text into optimized sentences for progressive audio generation
   * Target: 10-25 words per sentence for best audio performance
   */
  public static splitIntoSentences(text: string): ProcessedSentence[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Step 1: Clean and normalize text
    const cleanText = this.cleanText(text);
    
    // Step 2: Split into raw sentences
    const rawSentences = this.performInitialSplit(cleanText);
    
    // Step 3: Optimize sentence lengths for audio
    const optimizedSentences = this.optimizeSentenceLengths(rawSentences);
    
    // Step 4: Create ProcessedSentence objects with metadata
    return optimizedSentences.map((sentence, index) => {
      const words = this.extractWords(sentence);
      return {
        text: sentence.trim(),
        wordCount: words.length,
        estimatedDuration: this.estimateDuration(words.length),
        words,
        sentenceIndex: index
      };
    }).filter(sentence => sentence.wordCount > 0);
  }

  /**
   * Clean and normalize text for processing
   */
  private static cleanText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Fix common punctuation issues
      .replace(/([.!?])\s*([a-z])/g, '$1 $2')
      // Handle dialogue punctuation
      .replace(/([.!?])"(\s+[A-Z])/g, '$1" $2')
      // Remove excessive punctuation
      .replace(/([.!?]){2,}/g, '$1')
      .trim();
  }

  /**
   * Perform initial sentence splitting with smart abbreviation handling
   */
  private static performInitialSplit(text: string): string[] {
    const sentences: string[] = [];
    let currentSentence = '';
    let i = 0;

    while (i < text.length) {
      const char = text[i];
      currentSentence += char;

      // Check for sentence-ending punctuation
      if (char === '.' || char === '!' || char === '?') {
        const nextChar = text[i + 1];
        const prevWords = currentSentence.trim().split(' ');
        const lastWord = prevWords[prevWords.length - 1];

        // Check if this is an abbreviation
        if (this.ABBREVIATIONS.has(lastWord)) {
          i++;
          continue;
        }

        // Check if this looks like a decimal number
        if (char === '.' && this.isPartOfNumber(text, i)) {
          i++;
          continue;
        }

        // Check if next character indicates sentence continuation
        if (nextChar && /[a-z]/.test(nextChar)) {
          i++;
          continue;
        }

        // This appears to be a real sentence ending
        if (currentSentence.trim().length > 0) {
          sentences.push(currentSentence.trim());
          currentSentence = '';
        }
      }

      i++;
    }

    // Add any remaining text
    if (currentSentence.trim().length > 0) {
      sentences.push(currentSentence.trim());
    }

    return sentences.filter(s => s.length > 0);
  }

  /**
   * Check if a period is part of a decimal number
   */
  private static isPartOfNumber(text: string, periodIndex: number): boolean {
    const before = text[periodIndex - 1];
    const after = text[periodIndex + 1];
    return /\d/.test(before) && /\d/.test(after);
  }

  /**
   * Optimize sentence lengths for better audio generation
   */
  private static optimizeSentenceLengths(sentences: string[]): string[] {
    const optimized: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const sentenceWords = this.extractWords(sentence);
      const currentWords = this.extractWords(currentChunk);
      const combinedLength = currentWords.length + sentenceWords.length;

      // If combining sentences would be within optimal range
      if (currentChunk && combinedLength <= this.MAX_WORDS_PER_CHUNK) {
        currentChunk += ' ' + sentence;
      } else {
        // Save current chunk if it exists
        if (currentChunk) {
          optimized.push(currentChunk.trim());
        }

        // Handle very long sentences
        if (sentenceWords.length > this.MAX_WORDS_PER_CHUNK) {
          const splitSentences = this.splitLongSentence(sentence);
          optimized.push(...splitSentences);
          currentChunk = '';
        } else {
          currentChunk = sentence;
        }
      }
    }

    // Add final chunk
    if (currentChunk) {
      optimized.push(currentChunk.trim());
    }

    // Handle very short chunks by combining them
    return this.combineShortChunks(optimized);
  }

  /**
   * Split very long sentences at natural break points
   */
  private static splitLongSentence(sentence: string): string[] {
    const words = this.extractWords(sentence);
    const chunks: string[] = [];
    
    // Look for natural break points (commas, conjunctions, etc.)
    const breakWords = ['and', 'but', 'or', 'so', 'yet', 'for', 'nor', 'because', 'although', 'while', 'since'];
    const breakPoints: number[] = [];

    words.forEach((word, index) => {
      if (breakWords.includes(word.toLowerCase()) || word.endsWith(',')) {
        breakPoints.push(index);
      }
    });

    // If no natural break points, split at midpoint
    if (breakPoints.length === 0) {
      const midPoint = Math.floor(words.length / 2);
      breakPoints.push(midPoint);
    }

    let lastIndex = 0;
    for (const breakPoint of breakPoints) {
      const chunkWords = words.slice(lastIndex, breakPoint + 1);
      if (chunkWords.length >= this.MIN_WORDS_PER_CHUNK) {
        chunks.push(chunkWords.join(' '));
        lastIndex = breakPoint + 1;
      }
    }

    // Add remaining words
    if (lastIndex < words.length) {
      const remainingWords = words.slice(lastIndex);
      if (remainingWords.length >= this.MIN_WORDS_PER_CHUNK) {
        chunks.push(remainingWords.join(' '));
      } else if (chunks.length > 0) {
        // Combine with last chunk if too short
        chunks[chunks.length - 1] += ' ' + remainingWords.join(' ');
      } else {
        chunks.push(remainingWords.join(' '));
      }
    }

    return chunks;
  }

  /**
   * Combine chunks that are too short
   */
  private static combineShortChunks(chunks: string[]): string[] {
    const combined: string[] = [];
    let currentChunk = '';

    for (const chunk of chunks) {
      const chunkWords = this.extractWords(chunk);
      const currentWords = this.extractWords(currentChunk);

      if (chunkWords.length < this.MIN_WORDS_PER_CHUNK && currentChunk) {
        // Combine with previous chunk if total is reasonable
        if (currentWords.length + chunkWords.length <= this.MAX_WORDS_PER_CHUNK) {
          currentChunk += ' ' + chunk;
          continue;
        }
      }

      // Save current chunk
      if (currentChunk) {
        combined.push(currentChunk.trim());
      }
      currentChunk = chunk;
    }

    // Add final chunk
    if (currentChunk) {
      combined.push(currentChunk.trim());
    }

    return combined;
  }

  /**
   * Extract clean words from text for timing analysis
   */
  public static extractWords(text: string): string[] {
    if (!text) return [];

    return text
      // Split on whitespace and punctuation but preserve word boundaries
      .split(/\s+/)
      .map(word => word.trim())
      .filter(word => word.length > 0)
      .map(word => {
        // Remove punctuation but keep contractions and hyphens
        return word.replace(/^[^\w''-]+|[^\w''-]+$/g, '');
      })
      .filter(word => word.length > 0);
  }

  /**
   * Estimate audio duration based on word count
   */
  private static estimateDuration(wordCount: number): number {
    // Average speaking rate: 150 words per minute
    const wordsPerSecond = this.AVG_WORDS_PER_MINUTE / 60;
    return Math.round((wordCount / wordsPerSecond) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Validate that text processing is working correctly
   */
  public static validateProcessing(originalText: string, processedSentences: ProcessedSentence[]): {
    isValid: boolean;
    issues: string[];
    stats: {
      originalLength: number;
      processedLength: number;
      sentenceCount: number;
      avgWordsPerSentence: number;
      totalEstimatedDuration: number;
    };
  } {
    const issues: string[] = [];
    
    // Check if we lost significant content
    const originalWords = this.extractWords(originalText);
    const processedWords = processedSentences.flatMap(s => s.words);
    
    if (Math.abs(originalWords.length - processedWords.length) > originalWords.length * 0.05) {
      issues.push(`Significant word count difference: ${originalWords.length} -> ${processedWords.length}`);
    }

    // Check sentence length distribution
    const tooShort = processedSentences.filter(s => s.wordCount < this.MIN_WORDS_PER_CHUNK);
    const tooLong = processedSentences.filter(s => s.wordCount > this.MAX_WORDS_PER_CHUNK);

    if (tooShort.length > 0) {
      issues.push(`${tooShort.length} sentences are too short (< ${this.MIN_WORDS_PER_CHUNK} words)`);
    }

    if (tooLong.length > 0) {
      issues.push(`${tooLong.length} sentences are too long (> ${this.MAX_WORDS_PER_CHUNK} words)`);
    }

    const totalWords = processedSentences.reduce((sum, s) => sum + s.wordCount, 0);
    const avgWordsPerSentence = totalWords / processedSentences.length;
    const totalDuration = processedSentences.reduce((sum, s) => sum + s.estimatedDuration, 0);

    return {
      isValid: issues.length === 0,
      issues,
      stats: {
        originalLength: originalWords.length,
        processedLength: processedWords.length,
        sentenceCount: processedSentences.length,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 100) / 100,
        totalEstimatedDuration: Math.round(totalDuration * 100) / 100
      }
    };
  }

  /**
   * Get optimal chunk configuration for debugging
   */
  public static getConfiguration(): {
    minWords: number;
    maxWords: number;
    optimalWords: number;
    wordsPerMinute: number;
  } {
    return {
      minWords: this.MIN_WORDS_PER_CHUNK,
      maxWords: this.MAX_WORDS_PER_CHUNK,
      optimalWords: this.OPTIMAL_WORDS_PER_CHUNK,
      wordsPerMinute: this.AVG_WORDS_PER_MINUTE
    };
  }
}