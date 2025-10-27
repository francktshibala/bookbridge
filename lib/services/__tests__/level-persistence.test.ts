/**
 * Level Persistence Test Suite
 * Tests localStorage operations for CEFR level persistence
 */

import { saveLevelToStorage, loadLevelFromStorage } from '../level-persistence';
import { type CEFRLevel } from '@/contexts/AudioContext';

describe('Level Persistence', () => {
  // Mock localStorage
  let mockStorage: { [key: string]: string } = {};

  beforeEach(() => {
    // Clear mock storage before each test
    mockStorage = {};

    // Mock localStorage methods
    Storage.prototype.getItem = jest.fn((key: string) => mockStorage[key] || null);
    Storage.prototype.setItem = jest.fn((key: string, value: string) => {
      mockStorage[key] = value;
    });
    Storage.prototype.removeItem = jest.fn((key: string) => {
      delete mockStorage[key];
    });
    Storage.prototype.clear = jest.fn(() => {
      mockStorage = {};
    });

    // Clear console warnings for cleaner test output
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('saveLevelToStorage', () => {
    test('should save level to localStorage with correct key', () => {
      saveLevelToStorage('great-gatsby-a2', 'A2');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'bookbridge-book-great-gatsby-a2-level',
        'A2'
      );
      expect(mockStorage['bookbridge-book-great-gatsby-a2-level']).toBe('A2');
    });

    test('should save all CEFR levels correctly', () => {
      const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

      levels.forEach(level => {
        saveLevelToStorage('test-book', level);
        expect(mockStorage['bookbridge-book-test-book-level']).toBe(level);
      });
    });

    test('should overwrite existing level', () => {
      saveLevelToStorage('book1', 'A1');
      expect(mockStorage['bookbridge-book-book1-level']).toBe('A1');

      saveLevelToStorage('book1', 'B2');
      expect(mockStorage['bookbridge-book-book1-level']).toBe('B2');
    });

    test('should handle different book IDs independently', () => {
      saveLevelToStorage('book1', 'A1');
      saveLevelToStorage('book2', 'B2');

      expect(mockStorage['bookbridge-book-book1-level']).toBe('A1');
      expect(mockStorage['bookbridge-book-book2-level']).toBe('B2');
    });

    test('should handle localStorage errors gracefully', () => {
      // Mock setItem to throw error (e.g., quota exceeded)
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw, just warn
      expect(() => saveLevelToStorage('book1', 'A2')).not.toThrow();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('loadLevelFromStorage', () => {
    test('should load saved level from localStorage', () => {
      mockStorage['bookbridge-book-great-gatsby-a2-level'] = 'A2';

      const result = loadLevelFromStorage('great-gatsby-a2');

      expect(localStorage.getItem).toHaveBeenCalledWith(
        'bookbridge-book-great-gatsby-a2-level'
      );
      expect(result).toBe('A2');
    });

    test('should return null if no level saved', () => {
      const result = loadLevelFromStorage('new-book');
      expect(result).toBeNull();
    });

    test('should validate CEFR levels', () => {
      const validLevels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

      validLevels.forEach(level => {
        mockStorage['bookbridge-book-test-book-level'] = level;
        const result = loadLevelFromStorage('test-book');
        expect(result).toBe(level);
      });
    });

    test('should return null for invalid CEFR level', () => {
      mockStorage['bookbridge-book-book1-level'] = 'INVALID';

      const result = loadLevelFromStorage('book1');

      expect(result).toBeNull();
    });

    test('should return null for empty string', () => {
      mockStorage['bookbridge-book-book1-level'] = '';

      const result = loadLevelFromStorage('book1');

      expect(result).toBeNull();
    });

    test('should handle localStorage errors gracefully', () => {
      // Mock getItem to throw error
      Storage.prototype.getItem = jest.fn(() => {
        throw new Error('localStorage disabled');
      });

      const result = loadLevelFromStorage('book1');

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });

    test('should handle corrupted data gracefully', () => {
      // Save some invalid data
      mockStorage['bookbridge-book-book1-level'] = 'X9'; // Invalid level

      const result = loadLevelFromStorage('book1');

      expect(result).toBeNull();
    });
  });

  describe('Round-trip persistence', () => {
    test('should save and load level successfully', () => {
      const bookId = 'great-gatsby-a2';
      const level: CEFRLevel = 'B1';

      saveLevelToStorage(bookId, level);
      const loaded = loadLevelFromStorage(bookId);

      expect(loaded).toBe(level);
    });

    test('should handle multiple books independently', () => {
      saveLevelToStorage('book1', 'A1');
      saveLevelToStorage('book2', 'B2');
      saveLevelToStorage('book3', 'C1');

      expect(loadLevelFromStorage('book1')).toBe('A1');
      expect(loadLevelFromStorage('book2')).toBe('B2');
      expect(loadLevelFromStorage('book3')).toBe('C1');
    });

    test('should update level on subsequent saves', () => {
      const bookId = 'test-book';

      saveLevelToStorage(bookId, 'A1');
      expect(loadLevelFromStorage(bookId)).toBe('A1');

      saveLevelToStorage(bookId, 'A2');
      expect(loadLevelFromStorage(bookId)).toBe('A2');

      saveLevelToStorage(bookId, 'B1');
      expect(loadLevelFromStorage(bookId)).toBe('B1');
    });
  });
});
