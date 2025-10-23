/**
 * useReadingPosition Hook
 * Manages reading position persistence with localStorage and database sync
 *
 * Features:
 * - Automatic saving every 5 seconds
 * - Save on page unload/visibility change
 * - Cross-device sync via database
 * - localStorage fallback for offline/unauthenticated users
 *
 * Usage:
 * const { isLoading, savedPosition, savePosition, resetPosition } = useReadingPosition({
 *   bookId,
 *   userId,
 *   onPositionLoaded: (position) => {
 *     if (position) {
 *       setCurrentChunk(position.currentBundleIndex);
 *       setEslLevel(position.cefrLevel);
 *       setCurrentMode(position.contentMode);
 *     }
 *   }
 * });
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { readingPositionService, ReadingPosition } from '@/lib/services/reading-position';

interface UseReadingPositionParams {
  bookId: string;
  userId?: string | null;
  onPositionLoaded?: (position: ReadingPosition | null) => void;
}

interface ReadingPositionData {
  sentenceIndex: number;
  audioTimestamp: number;
  scrollPosition: number;
  playbackSpeed: number;
  selectedVoice?: string;
  chapter: number;
  chunkIndex: number;
  cefrLevel: string;
  contentMode: 'simplified' | 'original';
}

export function useReadingPosition({
  bookId,
  userId,
  onPositionLoaded
}: UseReadingPositionParams) {
  const [isLoading, setIsLoading] = useState(true);
  const [savedPosition, setSavedPosition] = useState<ReadingPosition | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentPositionRef = useRef<ReadingPositionData | null>(null);

  /**
   * Load reading position on mount
   */
  useEffect(() => {
    const loadPosition = async () => {
      try {
        setIsLoading(true);
        const position = await readingPositionService.loadPosition(bookId);
        setSavedPosition(position);
        onPositionLoaded?.(position);
      } catch (error) {
        console.error('Error loading reading position:', error);
        onPositionLoaded?.(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosition();
  }, [bookId, onPositionLoaded]);

  /**
   * Save reading position
   */
  const savePosition = useCallback(async (data: ReadingPositionData, force: boolean = false) => {
    try {
      // Update current position ref for cleanup handlers
      currentPositionRef.current = data;

      // Calculate completion percentage (rough estimate)
      const completionPercentage = data.chunkIndex > 0
        ? Math.min(100, (data.chunkIndex / 100) * 100)
        : 0;

      const position: ReadingPosition = {
        currentSentenceIndex: data.sentenceIndex,
        currentBundleIndex: data.chunkIndex,
        currentChapter: data.chapter,
        playbackTime: data.audioTimestamp,
        totalTime: 0, // Will be updated by audio player if available
        cefrLevel: data.cefrLevel,
        playbackSpeed: data.playbackSpeed,
        contentMode: data.contentMode,
        completionPercentage,
        sentencesRead: data.sentenceIndex,
        sessionDuration: readingPositionService.getSessionDuration(),
      };

      if (force) {
        await readingPositionService.forceSave(bookId, position);
      } else {
        await readingPositionService.savePosition(bookId, position);
      }
    } catch (error) {
      console.error('Error saving reading position:', error);
      // Graceful degradation - localStorage will still have it
    }
  }, [bookId]);

  /**
   * Reset reading position
   */
  const resetPosition = useCallback(async () => {
    try {
      await readingPositionService.resetPosition(bookId);
      setSavedPosition(null);
      currentPositionRef.current = null;
    } catch (error) {
      console.error('Error resetting reading position:', error);
    }
  }, [bookId]);

  /**
   * Setup auto-save interval (every 5 seconds)
   */
  useEffect(() => {
    autoSaveIntervalRef.current = setInterval(() => {
      if (currentPositionRef.current) {
        savePosition(currentPositionRef.current, false);
      }
    }, 5000); // Save every 5 seconds

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [savePosition]);

  /**
   * Save on page unload
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentPositionRef.current) {
        // Use sendBeacon for reliable save on unload
        const position = currentPositionRef.current;
        const data = JSON.stringify({
          currentSentenceIndex: position.sentenceIndex,
          currentBundleIndex: position.chunkIndex,
          currentChapter: position.chapter,
          playbackTime: position.audioTimestamp,
          totalTime: 0,
          cefrLevel: position.cefrLevel,
          playbackSpeed: position.playbackSpeed,
          contentMode: position.contentMode,
          completionPercentage: Math.min(100, (position.chunkIndex / 100) * 100),
          sentencesRead: position.sentenceIndex,
          sessionDuration: readingPositionService.getSessionDuration(),
        });

        // Save to localStorage immediately (synchronous)
        localStorage.setItem(`reading_position_${bookId}`, data);

        // Try to send to server if user is authenticated
        if (userId) {
          try {
            navigator.sendBeacon(
              `/api/reading-position/${bookId}`,
              new Blob([data], { type: 'application/json' })
            );
          } catch (error) {
            console.warn('sendBeacon failed:', error);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [bookId, userId]);

  /**
   * Save on visibility change (tab switch, minimize)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && currentPositionRef.current) {
        // Force save when tab becomes hidden
        savePosition(currentPositionRef.current, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [savePosition]);

  /**
   * Cleanup: Force save on unmount
   */
  useEffect(() => {
    return () => {
      if (currentPositionRef.current) {
        // Synchronous save to localStorage on unmount
        const position = currentPositionRef.current;
        const data = JSON.stringify({
          currentSentenceIndex: position.sentenceIndex,
          currentBundleIndex: position.chunkIndex,
          currentChapter: position.chapter,
          playbackTime: position.audioTimestamp,
          totalTime: 0,
          cefrLevel: position.cefrLevel,
          playbackSpeed: position.playbackSpeed,
          contentMode: position.contentMode,
          completionPercentage: Math.min(100, (position.chunkIndex / 100) * 100),
          sentencesRead: position.sentenceIndex,
          sessionDuration: readingPositionService.getSessionDuration(),
        });
        localStorage.setItem(`reading_position_${bookId}`, data);
      }
    };
  }, [bookId]);

  return {
    isLoading,
    savedPosition,
    savePosition,
    resetPosition,
  };
}
