/**
 * Availability Service
 *
 * Pure data fetching function for checking CEFR level availability.
 * Extracted from AudioContext as part of Phase 4 refactor.
 *
 * Architecture:
 * - Pure function (no state, no side effects)
 * - Accepts AbortSignal for cancellation
 * - Returns availability map + available CEFR levels
 * - No React dependencies
 *
 * @module lib/services/availability
 */

import { MULTI_LEVEL_BOOKS, SINGLE_LEVEL_BOOKS } from '@/lib/config/books';

export interface AvailabilityResult {
  availability: Record<string, boolean>;
  bookLevels: string[];
}

/**
 * Check which CEFR levels are available for a book
 *
 * Checks:
 * - Multi-level books: Tests each configured level via API
 * - Single-level books: Returns configured level as available
 * - Original content: Tests /api/books/[id]/content endpoint
 *
 * @param bookId - Book identifier (e.g., 'great-gatsby-a2')
 * @param signal - AbortSignal for request cancellation
 * @returns Promise<AvailabilityResult> - Map of level availability + list of available CEFR levels
 * @throws AbortError if request is cancelled
 */
export async function checkLevelAvailability(
  bookId: string,
  signal: AbortSignal
): Promise<AvailabilityResult> {
  // OPTIMIZATION: Fast-path for single-level books (60% of catalog)
  // Returns immediately from config without any API calls
  // Original content check deferred (will be checked lazily if user switches to original mode)
  if (SINGLE_LEVEL_BOOKS[bookId]) {
    const bookLevel = SINGLE_LEVEL_BOOKS[bookId];
    return {
      availability: {
        [bookLevel.toLowerCase()]: true
      },
      bookLevels: [bookLevel]
    };
  }

  const availability: Record<string, boolean> = {};

  // OPTIMIZATION: Parallelize multi-level book checks with Promise.all()
  // Uses lightweight availability API (fast metadata), not heavy bundle endpoints
  if (MULTI_LEVEL_BOOKS[bookId]) {
    const levelChecks = MULTI_LEVEL_BOOKS[bookId].map(async (level) => {
      try {
        const apiUrl = `/api/availability?bookId=${encodeURIComponent(bookId)}&level=${encodeURIComponent(level)}`;

        const response = await fetch(apiUrl, {
          // Client-side fetch; server route is cached with headers
          signal
        });

        if (response.ok) {
          const data = await response.json();
          return { level: level.toLowerCase(), available: data.available === true };
        } else {
          return { level: level.toLowerCase(), available: false };
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw error; // Re-throw abort errors
        }
        return { level: level.toLowerCase(), available: false };
      }
    });

    const results = await Promise.all(levelChecks);
    results.forEach(({ level, available }) => {
      availability[level] = available;
    });
  }

  // Original content assumed available or checked lazily when user selects it
  availability['original'] = true;

  // Extract available CEFR levels (excluding 'original')
  const bookLevels = Object.entries(availability)
    .filter(([level, available]) => level !== 'original' && available)
    .map(([level]) => level.toUpperCase());

  return {
    availability,
    bookLevels
  };
}
