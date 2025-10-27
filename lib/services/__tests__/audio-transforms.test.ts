/**
 * Audio Transforms Test Suite
 * Tests pure transformation functions extracted in Phase 4
 */

import { determineFinalLevel, calculateHoursSinceLastRead } from '../audio-transforms';
import { type CEFRLevel, type ContentMode } from '@/contexts/AudioContext';

describe('Audio Transforms', () => {
  describe('determineFinalLevel', () => {
    test('should return "original" when mode is original', () => {
      const result = determineFinalLevel(
        'original' as ContentMode,
        'A2',
        { a1: true, a2: true },
        'great-gatsby-a2'
      );
      expect(result).toBe('original');
    });

    test('should return requested level when available', () => {
      const availability = { a1: true, a2: true, b1: false };
      const result = determineFinalLevel(
        'simplified' as ContentMode,
        'A2',
        availability,
        'great-gatsby-a2'
      );
      expect(result).toBe('A2');
    });

    test('should fallback to default level when requested level unavailable', () => {
      const availability = { a1: true, a2: true, b1: false };
      // Request B1 which is unavailable, should fall back to default (A2)
      const result = determineFinalLevel(
        'simplified' as ContentMode,
        'B1', // Requested level is unavailable
        availability,
        'great-gatsby-a2'
      );
      // The default for great-gatsby-a2 is A2, which is available
      expect(result).toBe('A2');
    });

    test('should handle missing availability map gracefully', () => {
      const result = determineFinalLevel(
        'simplified' as ContentMode,
        'A2',
        undefined,
        'great-gatsby-a2'
      );
      // Should use requested level when availability not yet loaded
      expect(result).toBe('A2');
    });

    test('should handle case-insensitive level lookup', () => {
      const availability = { a1: true, a2: true }; // lowercase keys
      const result = determineFinalLevel(
        'simplified' as ContentMode,
        'A2', // uppercase request
        availability,
        'great-gatsby-a2'
      );
      expect(result).toBe('A2');
    });

    test('should handle empty availability map', () => {
      const availability = {};
      const result = determineFinalLevel(
        'simplified' as ContentMode,
        'A2',
        availability,
        'great-gatsby-a2'
      );
      // Should fall back to default level
      expect(result).toBe('A2');
    });

    test('should work with all CEFR levels', () => {
      const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const availability = {
        a1: true,
        a2: true,
        b1: true,
        b2: true,
        c1: true,
        c2: true
      };

      levels.forEach(level => {
        const result = determineFinalLevel(
          'simplified' as ContentMode,
          level,
          availability,
          'great-gatsby-a2'
        );
        expect(result).toBe(level);
      });
    });
  });

  describe('calculateHoursSinceLastRead', () => {
    test('should return 999 for null lastAccessed', () => {
      const result = calculateHoursSinceLastRead(null);
      expect(result).toBe(999);
    });

    test('should return 999 for undefined lastAccessed', () => {
      const result = calculateHoursSinceLastRead(undefined);
      expect(result).toBe(999);
    });

    test('should calculate hours correctly for Date object', () => {
      // 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = calculateHoursSinceLastRead(twoHoursAgo);
      expect(result).toBeGreaterThanOrEqual(1.9);
      expect(result).toBeLessThanOrEqual(2.1);
    });

    test('should calculate hours correctly for date string', () => {
      // 3 hours ago
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const result = calculateHoursSinceLastRead(threeHoursAgo);
      expect(result).toBeGreaterThanOrEqual(2.9);
      expect(result).toBeLessThanOrEqual(3.1);
    });

    test('should calculate hours for very recent access', () => {
      // 5 minutes ago
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = calculateHoursSinceLastRead(fiveMinutesAgo);
      expect(result).toBeGreaterThanOrEqual(0.08); // ~5min
      expect(result).toBeLessThanOrEqual(0.1);
    });

    test('should calculate hours for old access', () => {
      // 48 hours ago
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const result = calculateHoursSinceLastRead(twoDaysAgo);
      expect(result).toBeGreaterThanOrEqual(47.9);
      expect(result).toBeLessThanOrEqual(48.1);
    });

    test('should handle invalid date string gracefully', () => {
      const result = calculateHoursSinceLastRead('invalid-date');
      expect(result).toBe(999); // Fallback to sentinel value
    });

    test('should handle future dates gracefully', () => {
      // 1 hour in the future
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      const result = calculateHoursSinceLastRead(futureDate);
      // Should return negative hours (elapsed is negative)
      expect(result).toBeLessThan(0);
      expect(result).toBeGreaterThanOrEqual(-1.1);
      expect(result).toBeLessThanOrEqual(-0.9);
    });

    test('should return positive number for past dates', () => {
      const pastDate = new Date(Date.now() - 1000);
      const result = calculateHoursSinceLastRead(pastDate);
      expect(result).toBeGreaterThan(0);
    });
  });
});
