/**
 * Auto-Resume LocalStorage Utilities
 * Handles localStorage operations for Netflix-style auto-resume feature
 */

import type { ReadingPosition } from '../services/reading-position';

const LAST_BOOK_ID_KEY = 'bookbridge_last_book_id';
const READING_POSITION_PREFIX = 'reading_position_';

/**
 * Get the ID of the last book the user was reading
 * @returns bookId or null if none exists
 */
export function getLastBookId(): string | null {
  try {
    // SSR guard: return null on server-side
    if (typeof window === 'undefined') {
      return null;
    }

    const bookId = localStorage.getItem(LAST_BOOK_ID_KEY);

    if (bookId) {
      console.log('📚 [Auto-Resume Storage] Retrieved last book ID:', bookId);
      return bookId;
    }

    return null;
  } catch (error) {
    console.error('❌ [Auto-Resume Storage] Error reading last book ID:', error);
    return null;
  }
}

/**
 * Save the ID of the book the user is currently reading
 * @param bookId - The ID of the book to save
 */
export function setLastBookId(bookId: string): void {
  try {
    // SSR guard: skip on server-side
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(LAST_BOOK_ID_KEY, bookId);
    console.log('💾 [Auto-Resume Storage] Saved last book ID:', bookId);
  } catch (error) {
    console.error('❌ [Auto-Resume Storage] Error saving last book ID:', error);
  }
}

/**
 * Get the reading position for a specific book from localStorage
 * @param bookId - The ID of the book
 * @returns ReadingPosition object or null if not found
 */
export function getLocalPosition(bookId: string): ReadingPosition | null {
  try {
    // SSR guard: return null on server-side
    if (typeof window === 'undefined') {
      return null;
    }

    const key = `${READING_POSITION_PREFIX}${bookId}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      const position = JSON.parse(saved) as ReadingPosition;
      console.log('📖 [Auto-Resume Storage] Retrieved reading position:', {
        bookId,
        chapter: position.currentChapter,
        sentence: position.currentSentenceIndex,
        completion: `${position.completionPercentage.toFixed(1)}%`
      });
      return position;
    }

    console.log('📖 [Auto-Resume Storage] No saved position found for book:', bookId);
    return null;
  } catch (error) {
    console.error('❌ [Auto-Resume Storage] Error reading position for book:', bookId, error);
    return null;
  }
}

/**
 * Clear the last book ID (useful for testing or manual reset)
 */
export function clearLastBookId(): void {
  try {
    // SSR guard: skip on server-side
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.removeItem(LAST_BOOK_ID_KEY);
    console.log('🧹 [Auto-Resume Storage] Cleared last book ID');
  } catch (error) {
    console.error('❌ [Auto-Resume Storage] Error clearing last book ID:', error);
  }
}
