/**
 * Level Persistence Service
 *
 * Pure functions for persisting CEFR level selections to localStorage.
 * Extracted from AudioContext as part of Phase 4 refactor.
 *
 * Architecture:
 * - Pure functions (no state, no side effects beyond storage)
 * - No React dependencies
 * - Testable in isolation
 *
 * @module lib/services/level-persistence
 */

import { type CEFRLevel } from '@/contexts/AudioContext';

/**
 * Save CEFR level to localStorage
 *
 * Provides immediate persistence of level selection for fast recovery.
 * Used alongside readingPositionService for dual-layer persistence.
 *
 * @param bookId - Book identifier (e.g., 'great-gatsby-a2')
 * @param level - CEFR level to save ('A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2')
 * @throws Silently handles localStorage errors (may be full or disabled)
 */
export function saveLevelToStorage(bookId: string, level: CEFRLevel): void {
  try {
    const key = `bookbridge-book-${bookId}-level`;
    localStorage.setItem(key, level);
  } catch (error) {
    console.warn('[level-persistence] Failed to save level to localStorage:', error);
  }
}

/**
 * Load CEFR level from localStorage
 *
 * Retrieves previously saved level selection.
 * Returns null if no level was saved or localStorage is unavailable.
 *
 * @param bookId - Book identifier (e.g., 'great-gatsby-a2')
 * @returns CEFRLevel | null - Saved level or null if not found
 */
export function loadLevelFromStorage(bookId: string): CEFRLevel | null {
  try {
    const key = `bookbridge-book-${bookId}-level`;
    const saved = localStorage.getItem(key);

    if (saved && isValidCEFRLevel(saved)) {
      return saved as CEFRLevel;
    }

    return null;
  } catch (error) {
    console.warn('[level-persistence] Failed to load level from localStorage:', error);
    return null;
  }
}

/**
 * Validate CEFR level string
 *
 * Type guard to ensure loaded string is a valid CEFRLevel.
 *
 * @param value - String to validate
 * @returns boolean - True if value is valid CEFR level
 */
function isValidCEFRLevel(value: string): boolean {
  return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(value);
}
