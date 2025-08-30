'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { ReadingProgress } from '@/lib/background-sync';

interface ReadingProgressTrackerProps {
  bookId: string;
  userId: string;
  totalPages: number;
  currentPage: number;
  cefr?: string;
  voice?: string;
  onProgressUpdate?: (progress: ReadingProgress) => void;
}

export const ReadingProgressTracker: React.FC<ReadingProgressTrackerProps> = ({
  bookId,
  userId,
  totalPages,
  currentPage,
  cefr,
  voice,
  onProgressUpdate
}) => {
  const { queueReadingProgress, isOnline } = useBackgroundSync();
  const sessionStartTime = useRef(Date.now());
  const sessionId = useRef(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const lastSyncTime = useRef(0);
  const readingStartTime = useRef(Date.now());
  const currentPosition = useRef(0);
  const audioPosition = useRef<number | undefined>(undefined);
  const syncThrottleTimeout = useRef<NodeJS.Timeout | null>(null);

  // Throttled sync to avoid excessive API calls
  const throttledSync = useCallback(async (progress: ReadingProgress) => {
    if (syncThrottleTimeout.current) {
      clearTimeout(syncThrottleTimeout.current);
    }

    syncThrottleTimeout.current = setTimeout(async () => {
      try {
        await queueReadingProgress(progress);
        lastSyncTime.current = Date.now();
        
        if (onProgressUpdate) {
          onProgressUpdate(progress);
        }
      } catch (error) {
        console.error('ReadingProgressTracker: Failed to sync progress:', error);
      }
    }, isOnline ? 5000 : 1000); // Sync every 5s when online, 1s when offline for queuing
  }, [queueReadingProgress, isOnline, onProgressUpdate]);

  // Create progress object
  const createProgress = useCallback((): ReadingProgress => {
    const now = Date.now();
    const readingTime = Math.floor((now - readingStartTime.current) / 1000);

    return {
      bookId,
      userId,
      currentPage,
      totalPages,
      readingTime,
      lastPosition: currentPosition.current,
      timestamp: now,
      sessionId: sessionId.current,
      cefr,
      voice,
      audioPosition: audioPosition.current
    };
  }, [bookId, userId, currentPage, totalPages, cefr, voice]);

  // Update reading progress when page changes
  useEffect(() => {
    const progress = createProgress();
    throttledSync(progress);
  }, [currentPage, throttledSync, createProgress]);

  // Track scroll position for more granular progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      currentPosition.current = Math.floor(scrollPercent * 100);
    };

    const handleScrollThrottled = throttle(handleScroll, 1000);
    window.addEventListener('scroll', handleScrollThrottled);
    
    return () => {
      window.removeEventListener('scroll', handleScrollThrottled);
    };
  }, []);

  // Track audio position if available
  useEffect(() => {
    const updateAudioPosition = () => {
      const audioElements = document.querySelectorAll('audio');
      if (audioElements.length > 0) {
        const activeAudio = Array.from(audioElements).find(audio => !audio.paused);
        if (activeAudio && !isNaN(activeAudio.currentTime)) {
          audioPosition.current = activeAudio.currentTime;
        }
      }
    };

    const interval = setInterval(updateAudioPosition, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sync on page visibility change (when user switches tabs/apps)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Force immediate sync when leaving page
        if (syncThrottleTimeout.current) {
          clearTimeout(syncThrottleTimeout.current);
        }
        
        const progress = createProgress();
        queueReadingProgress(progress).catch(console.error);
      } else if (document.visibilityState === 'visible') {
        // Reset reading start time when returning
        readingStartTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [createProgress, queueReadingProgress]);

  // Sync before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (syncThrottleTimeout.current) {
        clearTimeout(syncThrottleTimeout.current);
      }
      
      const progress = createProgress();
      
      // Use sendBeacon for reliable sync on page unload
      if (navigator.sendBeacon && isOnline) {
        const blob = new Blob([JSON.stringify(progress)], { type: 'application/json' });
        navigator.sendBeacon('/api/reading-progress', blob);
      } else {
        // Fallback to queue for offline sync
        queueReadingProgress(progress).catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Final sync on component unmount
      if (syncThrottleTimeout.current) {
        clearTimeout(syncThrottleTimeout.current);
      }
      
      const progress = createProgress();
      queueReadingProgress(progress).catch(console.error);
    };
  }, [createProgress, queueReadingProgress, isOnline]);

  // Periodic sync every 30 seconds during active reading
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const progress = createProgress();
        throttledSync(progress);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [throttledSync, createProgress]);

  // This component doesn't render anything - it's just for tracking
  return null;
};

// Utility function for throttling
function throttle<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

export default ReadingProgressTracker;