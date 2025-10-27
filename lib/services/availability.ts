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

import { MULTI_LEVEL_BOOKS, SINGLE_LEVEL_BOOKS, getBookApiEndpoint } from '@/lib/config/books';

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
  const availability: Record<string, boolean> = {};

  // Handle multi-level books
  if (MULTI_LEVEL_BOOKS[bookId]) {
    for (const level of MULTI_LEVEL_BOOKS[bookId]) {
      try {
        const apiEndpoint = getBookApiEndpoint(bookId, level);
        const apiUrl = `${apiEndpoint}?bookId=${bookId}&level=${level}&t=${Date.now()}`;

        const response = await fetch(apiUrl, {
          cache: 'no-store',
          signal
        });

        if (response.ok) {
          const data = await response.json();
          availability[level.toLowerCase()] = data.success === true;
        } else {
          availability[level.toLowerCase()] = false;
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw error; // Re-throw abort errors
        }
        availability[level.toLowerCase()] = false;
      }
    }
  }
  // Handle single-level books
  else if (SINGLE_LEVEL_BOOKS[bookId]) {
    const bookLevel = SINGLE_LEVEL_BOOKS[bookId];
    availability[bookLevel.toLowerCase()] = true;
  }

  // Handle original content check for all books
  try {
    const response = await fetch(`/api/books/${bookId}/content`, {
      cache: 'no-store',
      signal
    });
    availability['original'] = response.ok;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error; // Re-throw abort errors
    }
    availability['original'] = false;
  }

  // Extract available CEFR levels (excluding 'original')
  const bookLevels = Object.entries(availability)
    .filter(([level, available]) => level !== 'original' && available)
    .map(([level]) => level.toUpperCase());

  return {
    availability,
    bookLevels
  };
}
