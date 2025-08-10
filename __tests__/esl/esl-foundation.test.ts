/**
 * ESL Foundation Tests
 * Validates that the basic ESL infrastructure is working correctly
 */

import { ESL_TEST_CONTENT, REAL_BOOKS, analyzeCEFRComplexity, calculateSemanticSimilarity, generateMockTTSResult } from '../../test-utils/esl-fixtures';
import '../../test-utils/esl-matchers';

describe('ESL Foundation Infrastructure', () => {
  describe('CEFR Test Content', () => {
    it('has valid test content for all CEFR levels', () => {
      const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
      
      levels.forEach(level => {
        const content = ESL_TEST_CONTENT[level];
        expect(content).toBeDefined();
        expect(content.level).toBe(level);
        expect(content.appropriate).toBeTruthy();
        expect(content.challenging).toBeTruthy();
        expect(content.vocabulary.length).toBeGreaterThan(0);
        expect(content.maxWords).toBeGreaterThan(0);
        expect(content.avgSentenceLength).toBeGreaterThan(0);
      });
    });

    it('has appropriate text complexity for each level', () => {
      // A1 should be much simpler than C2
      const a1Content = ESL_TEST_CONTENT.A1.appropriate;
      const c2Content = ESL_TEST_CONTENT.C2.appropriate;
      
      expect(a1Content.split(' ').length).toBeLessThan(c2Content.split(' ').length);
      expect(a1Content.split('.').length).toBeGreaterThanOrEqual(c2Content.split('.').length);
    });
  });

  describe('Real Book Content', () => {
    it('has Pride and Prejudice test passages', () => {
      const prideAndPrejudice = REAL_BOOKS['pride-prejudice'];
      
      expect(prideAndPrejudice).toBeDefined();
      expect(prideAndPrejudice.id).toBe('gutenberg-1342');
      expect(prideAndPrejudice.title).toBe('Pride and Prejudice');
      expect(prideAndPrejudice.challengingPassages.length).toBeGreaterThan(0);
      
      const firstPassage = prideAndPrejudice.challengingPassages[0];
      expect(firstPassage.chapter).toBe(1);
      expect(firstPassage.text).toContain('universally acknowledged');
      expect(firstPassage.difficulty).toBe('B2');
      expect(firstPassage.culturalContext).toContain('universal truth');
    });

    it('has expected simplifications for different levels', () => {
      const passage = REAL_BOOKS['pride-prejudice'].challengingPassages[0];
      
      expect(passage.expectedSimplification?.A1).toBeTruthy();
      expect(passage.expectedSimplification?.A2).toBeTruthy();
      expect(passage.expectedSimplification?.B1).toBeTruthy();
      
      // A1 should be simpler than A2
      const a1Text = passage.expectedSimplification?.A1 || '';
      const a2Text = passage.expectedSimplification?.A2 || '';
      
      expect(a1Text.split(' ').length).toBeLessThanOrEqual(a2Text.split(' ').length);
    });
  });

  describe('CEFR Analysis Functions', () => {
    it('correctly analyzes text complexity', () => {
      const simpleText = 'The cat is big. It sits on the chair.';
      const complexText = 'The magnificent feline positioned itself regally upon the ornate furniture.';
      
      const simpleAnalysis = analyzeCEFRComplexity(simpleText, 'A1');
      const complexAnalysis = analyzeCEFRComplexity(complexText, 'A1');
      
      expect(simpleAnalysis.passesLevelConstraints).toBe(true);
      expect(complexAnalysis.passesLevelConstraints).toBe(false);
      expect(complexAnalysis.violations.length).toBeGreaterThan(0);
    });

    it('calculates semantic similarity', () => {
      const original = 'The cat is big and sits on the chair.';
      const similar = 'The cat is large and sits on the chair.';
      const different = 'The dog runs in the park.';
      
      const similarScore = calculateSemanticSimilarity(original, similar);
      const differentScore = calculateSemanticSimilarity(original, different);
      
      expect(similarScore).toBeGreaterThan(differentScore);
      expect(similarScore).toBeGreaterThan(0.5);
      expect(differentScore).toBeLessThan(0.5);
    });
  });

  describe('TTS Test Utilities', () => {
    it('generates valid TTS timing data', () => {
      const text = 'Hello world this is a test';
      const result = generateMockTTSResult(text);
      
      expect(result).toHaveValidTiming();
      expect(result.wordTimings).toHaveLength(6);
      expect(result.totalDuration).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });

    it('creates proper timing sequences', () => {
      const text = 'First word second word';
      const result = generateMockTTSResult(text);
      
      if (result.wordTimings) {
        for (let i = 1; i < result.wordTimings.length; i++) {
          const prev = result.wordTimings[i - 1];
          const current = result.wordTimings[i];
          expect(current.startTime).toBeGreaterThanOrEqual(prev.endTime);
        }
      }
    });
  });

  describe('Custom Jest Matchers', () => {
    it('validates CEFR level compliance', () => {
      const a1Text = ESL_TEST_CONTENT.A1.appropriate;
      const c2Text = ESL_TEST_CONTENT.C2.appropriate;
      
      expect(a1Text).toMatchCEFRLevel('A1');
      expect(c2Text).not.toMatchCEFRLevel('A1');
    });

    it('validates TTS timing quality', () => {
      const validResult = generateMockTTSResult('Test text');
      const invalidResult = {
        success: false,
        provider: 'test',
        totalDuration: -1,
        wordTimings: []
      };
      
      expect(validResult).toHaveValidTiming();
      expect(invalidResult).not.toHaveValidTiming();
    });

    it('validates TTS gap measurements', () => {
      const goodGaps = [45, 67, 89, 12]; // All under 100ms
      const badGaps = [45, 67, 150, 12]; // One over 100ms
      
      expect(goodGaps).toHaveTTSGapsUnder(100);
      expect(badGaps).not.toHaveTTSGapsUnder(100);
    });
  });
});