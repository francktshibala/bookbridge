/**
 * Reading Position Service
 * Handles cross-device position tracking and synchronization
 */

export interface ReadingPosition {
  currentSentenceIndex: number;
  currentBundleIndex: number;
  currentChapter: number;
  playbackTime: number;
  totalTime: number;
  cefrLevel: string;
  playbackSpeed: number;
  contentMode: 'simplified' | 'original';
  completionPercentage: number;
  sentencesRead: number;
  lastAccessed?: Date;
  sessionDuration?: number;
}

export interface RecentBook {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  currentSentenceIndex: number;
  currentChapter: number;
  completionPercentage: number;
  sentencesRead: number;
  totalSentences: number;
  lastAccessed: Date;
  progressText: string;
  readingTimeMinutes: number;
  cefrLevel: string;
}

class ReadingPositionService {
  private sessionStartTime: number = Date.now();
  private lastSaveTime: number = 0;
  private readonly SAVE_INTERVAL = 5000; // Save every 5 seconds
  private saveTimeoutId: number | null = null;

  /**
   * Load reading position for a book
   */
  async loadPosition(bookId: string): Promise<ReadingPosition | null> {
    try {
      const response = await fetch(`/api/reading-position/${bookId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated, using local storage fallback');
          return this.loadLocalPosition(bookId);
        }
        if (response.status === 404) {
          console.log('Reading position API not found, using local storage fallback');
          return this.loadLocalPosition(bookId);
        }
        console.warn(`Failed to load reading position (${response.status}), using local storage fallback`);
        return this.loadLocalPosition(bookId);
      }

      const data = await response.json();

      if (data.success && data.position) {
        console.log('📖 Loaded reading position from database:', {
          bookId,
          sentence: data.position.currentSentenceIndex,
          chapter: data.position.currentChapter,
          completion: data.position.completionPercentage
        });

        return data.position;
      }

      // Fallback to localStorage if no database position
      return this.loadLocalPosition(bookId);

    } catch (error) {
      console.warn('Error loading reading position from database, falling back to localStorage:', error);
      return this.loadLocalPosition(bookId);
    }
  }

  /**
   * Save reading position (with throttling)
   */
  async savePosition(bookId: string, position: ReadingPosition): Promise<void> {
    // Save to localStorage immediately for fast local updates
    this.saveLocalPosition(bookId, position);

    // Throttle database saves to prevent excessive API calls
    const now = Date.now();
    if (now - this.lastSaveTime < this.SAVE_INTERVAL) {
      // Clear existing timeout and set a new one
      if (this.saveTimeoutId) {
        clearTimeout(this.saveTimeoutId);
      }

      this.saveTimeoutId = window.setTimeout(() => {
        this.saveToDatabase(bookId, position);
      }, this.SAVE_INTERVAL);

      return;
    }

    // Save immediately if enough time has passed
    await this.saveToDatabase(bookId, position);
  }

  /**
   * Force immediate save (for page unload, pause, etc.)
   */
  async forceSave(bookId: string, position: ReadingPosition): Promise<void> {
    // Clear any pending saves
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = null;
    }

    await this.saveToDatabase(bookId, position);
  }

  /**
   * Reset reading position for a book
   */
  async resetPosition(bookId: string): Promise<void> {
    try {
      // Clear from database
      const response = await fetch(`/api/reading-position/${bookId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('📖 Reset reading position in database');
      }

      // Clear from localStorage
      const key = this.getLocalStorageKey(bookId);
      localStorage.removeItem(key);

    } catch (error) {
      console.error('Error resetting reading position:', error);
      // At least clear localStorage
      const key = this.getLocalStorageKey(bookId);
      localStorage.removeItem(key);
    }
  }

  /**
   * Get recently read books
   */
  async getRecentBooks(limit: number = 5): Promise<RecentBook[]> {
    try {
      const response = await fetch(`/api/reading-position/recent?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load recent books');
      }

      const data = await response.json();
      return data.success ? data.recentBooks : [];

    } catch (error) {
      console.error('Error loading recent books:', error);
      return [];
    }
  }

  /**
   * Calculate session duration since page load
   */
  getSessionDuration(): number {
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }

  /**
   * Private methods
   */
  private async saveToDatabase(bookId: string, position: ReadingPosition): Promise<void> {
    try {
      const sessionDuration = this.getSessionDuration();

      const response = await fetch(`/api/reading-position/${bookId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...position,
          sessionDuration
        }),
      });

      if (response.ok) {
        this.lastSaveTime = Date.now();
        console.log('💾 Saved reading position to database:', {
          bookId,
          sentence: position.currentSentenceIndex,
          completion: position.completionPercentage.toFixed(1) + '%'
        });
      } else if (response.status === 404) {
        console.log('Reading position API not available, position saved to localStorage only');
      } else if (response.status === 401) {
        console.log('User not authenticated, position saved to localStorage only');
      } else {
        console.warn(`Failed to save reading position to database (${response.status}), saved to localStorage`);
      }

    } catch (error) {
      console.warn('Error saving reading position to database, saved to localStorage:', error);
    }
  }

  private loadLocalPosition(bookId: string): ReadingPosition | null {
    try {
      const key = this.getLocalStorageKey(bookId);
      const saved = localStorage.getItem(key);

      if (saved) {
        const position = JSON.parse(saved);
        console.log('📖 Loaded reading position from localStorage:', {
          bookId,
          sentence: position.currentSentenceIndex
        });
        return position;
      }

      return null;
    } catch (error) {
      console.error('Error loading local reading position:', error);
      return null;
    }
  }

  private saveLocalPosition(bookId: string, position: ReadingPosition): void {
    try {
      const key = this.getLocalStorageKey(bookId);
      localStorage.setItem(key, JSON.stringify(position));
    } catch (error) {
      console.error('Error saving local reading position:', error);
    }
  }

  private getLocalStorageKey(bookId: string): string {
    return `reading_position_${bookId}`;
  }
}

// Export singleton instance
export const readingPositionService = new ReadingPositionService();

// Export utility functions
export function formatReadingProgress(
  currentSentenceIndex: number,
  totalSentences: number,
  currentChapter: number
): string {
  if (totalSentences > 0) {
    const percentage = ((currentSentenceIndex + 1) / totalSentences * 100).toFixed(1);
    return `${percentage}% • Chapter ${currentChapter} • Sentence ${currentSentenceIndex + 1}/${totalSentences}`;
  }
  return `Chapter ${currentChapter} • Sentence ${currentSentenceIndex + 1}`;
}

export function calculateCompletionPercentage(
  currentSentenceIndex: number,
  totalSentences: number
): number {
  if (totalSentences <= 0) return 0;
  return Math.min(100, Math.max(0, (currentSentenceIndex + 1) / totalSentences * 100));
}