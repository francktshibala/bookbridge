/**
 * Audio Transforms
 *
 * Pure transformation functions for audio session business logic.
 * Extracted from AudioContext as part of Phase 4 refactor.
 *
 * Architecture:
 * - Pure functions (no state, no side effects)
 * - Deterministic input → output transformations
 * - No React dependencies
 * - Testable in isolation
 *
 * @module lib/services/audio-transforms
 */

import { type CEFRLevel, type ContentMode } from '@/contexts/AudioContext';
import { getBookDefaultLevel } from '@/lib/config/books';

/**
 * Determine final CEFR level with fallback logic
 *
 * Applies the following rules:
 * 1. If mode is 'original', return 'original'
 * 2. If requested level is available, use it
 * 3. If requested level is unavailable, fall back to book default level
 *
 * @param mode - Content mode ('original' | 'simplified')
 * @param requestedLevel - User-requested CEFR level
 * @param availability - Map of level availability (e.g., { 'a1': true, 'a2': false })
 * @param bookId - Book identifier for default level lookup
 * @returns CEFRLevel | 'original' - Final level to use
 */
export function determineFinalLevel(
  mode: ContentMode,
  requestedLevel: CEFRLevel,
  availability: { [key: string]: boolean } | undefined,
  bookId: string
): CEFRLevel | 'original' {
  // Rule 1: Original mode always returns 'original'
  if (mode === 'original') {
    return 'original';
  }

  // Rule 2: If availability not yet loaded, use requested level
  if (!availability) {
    return requestedLevel;
  }

  // Rule 3: If requested level is available, use it
  if (availability[requestedLevel.toLowerCase()]) {
    return requestedLevel;
  }

  // Rule 4: Fall back to book default level
  const defaultLevel = getBookDefaultLevel(bookId);
  console.log(`📋 [audio-transforms] Level ${requestedLevel} not available, using default: ${defaultLevel}`);
  return defaultLevel as CEFRLevel;
}

/**
 * Calculate hours elapsed since last access
 *
 * Used for resume info UI ("You last read this 2.5 hours ago").
 * Returns 999 if lastAccessed is null/undefined (indicating first read).
 *
 * @param lastAccessed - Date of last access (or null/undefined if never accessed)
 * @returns number - Hours since last access, or 999 if never accessed
 */
export function calculateHoursSinceLastRead(lastAccessed: Date | string | null | undefined): number {
  if (!lastAccessed) {
    return 999; // Sentinel value for "never read before"
  }

  try {
    const lastAccessTime = typeof lastAccessed === 'string'
      ? new Date(lastAccessed).getTime()
      : lastAccessed.getTime();

    const elapsed = Date.now() - lastAccessTime;
    const hours = elapsed / (1000 * 60 * 60);

    return hours;
  } catch (error) {
    console.warn('[audio-transforms] Failed to calculate hours since last read:', error);
    return 999; // Fallback to sentinel value
  }
}
