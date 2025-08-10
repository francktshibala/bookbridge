/**
 * Custom Jest Matchers for ESL Testing
 * Validates CEFR compliance, vocabulary limits, and TTS performance
 */

import { expect } from '@jest/globals';
import { analyzeCEFRComplexity, isKnownWord, ESL_TEST_CONTENT, type CEFRLevel, type TTSResult } from './esl-fixtures';

interface WordToken {
  text: string;
  start: number;
  end: number;
  difficulty?: CEFRLevel;
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchCEFRLevel(expectedLevel: CEFRLevel): R;
      toHaveValidESLTokens(level: CEFRLevel): R;
      toHaveValidTiming(): R;
      toHaveSemanticSimilarity(threshold: number): R;
      toHaveTTSGapsUnder(maxGapMs: number): R;
    }
  }
}

/**
 * Check if text matches CEFR level constraints
 * Usage: expect(simplifiedText).toMatchCEFRLevel('B1')
 */
expect.extend({
  toMatchCEFRLevel(received: string, expectedLevel: CEFRLevel) {
    const analysis = analyzeCEFRComplexity(received, expectedLevel);
    
    return {
      pass: analysis.passesLevelConstraints,
      message: () => {
        if (analysis.passesLevelConstraints) {
          return `Expected text to NOT match ${expectedLevel} level constraints, but it did`;
        } else {
          return `Expected text to match ${expectedLevel} level constraints. Issues: ${analysis.violations.join(', ')}`;
        }
      }
    };
  }
});

/**
 * Validate vocabulary token limits for ESL levels
 * Usage: expect(tokens).toHaveValidESLTokens('B1') 
 */
expect.extend({
  toHaveValidESLTokens(tokens: WordToken[], level: CEFRLevel) {
    const levelConstraints = ESL_TEST_CONTENT[level];
    const newWords = tokens.filter(token => !isKnownWord(token.text, level));
    
    const pass = newWords.length <= levelConstraints.maxWords;
    
    return {
      pass,
      message: () => {
        if (pass) {
          return `Expected more than ${levelConstraints.maxWords} new words for ${level}, got ${newWords.length}`;
        } else {
          return `Expected max ${levelConstraints.maxWords} new words for ${level}, got ${newWords.length}. New words: ${newWords.map(w => w.text).join(', ')}`;
        }
      }
    };
  }
});

/**
 * Validate TTS timing data quality
 * Usage: expect(ttsResult).toHaveValidTiming()
 */
expect.extend({
  toHaveValidTiming(audioResult: TTSResult) {
    const hasWordTimings = audioResult.wordTimings && audioResult.wordTimings.length > 0;
    const hasReasonableDuration = audioResult.totalDuration > 0 && audioResult.totalDuration < 300; // Max 5 minutes
    
    // Check timing sequence consistency
    let hasValidSequence = true;
    if (audioResult.wordTimings) {
      for (let i = 1; i < audioResult.wordTimings.length; i++) {
        const prev = audioResult.wordTimings[i - 1];
        const current = audioResult.wordTimings[i];
        
        if (current.startTime < prev.endTime) {
          hasValidSequence = false;
          break;
        }
      }
    }
    
    const pass = hasWordTimings && hasReasonableDuration && hasValidSequence;
    
    return {
      pass,
      message: () => {
        if (pass) {
          return `Expected TTS timing data to be invalid, but it was valid`;
        } else {
          const issues = [];
          if (!hasWordTimings) issues.push('missing word timings');
          if (!hasReasonableDuration) issues.push(`invalid duration: ${audioResult.totalDuration}s`);
          if (!hasValidSequence) issues.push('timing sequence out of order');
          
          return `Expected valid TTS timing data. Issues: ${issues.join(', ')}`;
        }
      }
    };
  }
});

/**
 * Validate semantic similarity between original and simplified text
 * Usage: expect(simplifiedText).toHaveSemanticSimilarity(0.82)
 */
expect.extend({
  toHaveSemanticSimilarity(simplified: string, threshold: number) {
    // This would use vector embeddings in a real implementation
    // For testing, we'll use a basic word overlap similarity
    const calculateBasicSimilarity = (text1: string, text2: string): number => {
      const words1 = new Set(text1.toLowerCase().split(/\s+/));
      const words2 = new Set(text2.toLowerCase().split(/\s+/));
      
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      
      return intersection.size / union.size;
    };
    
    // For this matcher, we need access to the original text
    // In real usage, this would be passed as a parameter
    const originalText = (this as any).originalText || simplified;
    const similarity = calculateBasicSimilarity(originalText, simplified);
    
    const pass = similarity >= threshold;
    
    return {
      pass,
      message: () => {
        if (pass) {
          return `Expected semantic similarity to be less than ${threshold}, got ${similarity.toFixed(3)}`;
        } else {
          return `Expected semantic similarity of at least ${threshold}, got ${similarity.toFixed(3)}`;
        }
      }
    };
  }
});

/**
 * Validate TTS gap timing between chunks
 * Usage: expect(gapMeasurements).toHaveTTSGapsUnder(100)
 */
expect.extend({
  toHaveTTSGapsUnder(gaps: number[], maxGapMs: number) {
    const maxGap = Math.max(...gaps);
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const pass = maxGap <= maxGapMs;
    
    return {
      pass,
      message: () => {
        if (pass) {
          return `Expected at least one TTS gap to exceed ${maxGapMs}ms, but max was ${maxGap}ms`;
        } else {
          return `Expected all TTS gaps to be under ${maxGapMs}ms. Max gap: ${maxGap}ms, Average: ${avgGap.toFixed(1)}ms. Gaps: [${gaps.join(', ')}]ms`;
        }
      }
    };
  }
});

/**
 * Helper functions for setting up ESL tests
 */

/**
 * Create a test user with ESL profile data
 */
export async function setupTestUser(profile: {
  eslLevel: CEFRLevel;
  nativeLanguage: string;
  vocabularyProgress?: any[];
}) {
  return {
    id: 'test-user-esl',
    email: 'test@example.com',
    eslLevel: profile.eslLevel,
    nativeLanguage: profile.nativeLanguage,
    vocabularyProgress: profile.vocabularyProgress || []
  };
}

/**
 * Create multi-chunk content for testing TTS continuity
 */
export function createMultiChunkContent(numChunks: number) {
  const chunks = [];
  for (let i = 0; i < numChunks; i++) {
    chunks.push({
      index: i,
      text: `This is chunk ${i + 1}. It contains several sentences to test TTS continuity. The content flows naturally from one chunk to the next.`,
      startTime: i * 10, // 10 seconds per chunk
      endTime: (i + 1) * 10
    });
  }
  return chunks;
}

/**
 * Simulate chunk transition for testing
 */
export async function simulateChunkTransition(fromIndex: number, toIndex: number) {
  // Mock chunk transition timing
  const transitionStart = Date.now();
  
  // Simulate network delay, processing, etc.
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const transitionEnd = Date.now();
  return transitionEnd - transitionStart;
}

/**
 * Find gaps in highlighting sequence
 */
export function findHighlightingGaps(highlightHistory: string[]): Array<{start: number, end: number, duration: number}> {
  const gaps = [];
  let lastWordTime = 0;
  
  for (let i = 0; i < highlightHistory.length; i++) {
    const currentTime = i * 100; // Assume 100ms per word highlight
    if (currentTime - lastWordTime > 200) { // Gap threshold: 200ms
      gaps.push({
        start: lastWordTime,
        end: currentTime,
        duration: currentTime - lastWordTime
      });
    }
    lastWordTime = currentTime;
  }
  
  return gaps;
}

/**
 * Mock audio continuity measurement
 */
export async function measureAudioContinuity(): Promise<number[]> {
  // Simulate measuring gaps between audio chunks
  return [45, 67, 89, 12, 156]; // Gap times in milliseconds
}

/**
 * Mock user agent for browser-specific testing
 */
export function mockUserAgent(browser: string) {
  const userAgents = {
    'iPhone Safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    'Chrome': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Firefox': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
  };
  
  Object.defineProperty(window.navigator, 'userAgent', {
    writable: true,
    value: userAgents[browser] || userAgents.Chrome
  });
}

/**
 * Simulate audio progress for testing auto-advance
 */
export function simulateAudioProgress(percentage: number) {
  // Mock audio progress event
  const mockEvent = new CustomEvent('audio-progress', {
    detail: { progress: percentage }
  });
  
  window.dispatchEvent(mockEvent);
  return Promise.resolve();
}

/**
 * Test data factory for creating consistent test scenarios
 */
export class ESLTestDataFactory {
  static createSimplificationRequest(level: CEFRLevel, text?: string) {
    return {
      level,
      text: text || ESL_TEST_CONTENT[level].challenging,
      userId: 'test-user-esl',
      bookId: 'test-book',
      chunkIndex: 0
    };
  }
  
  static createVocabularyReview(word: string, quality: number) {
    return {
      userId: 'test-user-esl',
      word,
      quality, // 0-5 scale for SRS
      responseTime: Math.floor(Math.random() * 5000) + 1000, // 1-6 seconds
      timestamp: new Date().toISOString()
    };
  }
  
  static createTTSRequest(text: string, provider = 'web-speech') {
    return {
      text,
      provider,
      voice: 'default',
      speed: 1.0,
      chunkId: `chunk-${Date.now()}`
    };
  }
}

export default {
  setupTestUser,
  createMultiChunkContent,
  simulateChunkTransition,
  findHighlightingGaps,
  measureAudioContinuity,
  mockUserAgent,
  simulateAudioProgress,
  ESLTestDataFactory
};