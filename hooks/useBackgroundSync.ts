'use client';

import { useState, useEffect, useCallback } from 'react';
import { backgroundSync, SyncStats, ReadingProgress, BookmarkData } from '@/lib/background-sync';

export interface BackgroundSyncHook {
  syncStats: SyncStats | null;
  isOnline: boolean;
  isSyncing: boolean;
  queueReadingProgress: (progress: ReadingProgress) => Promise<void>;
  queueBookmark: (bookmark: BookmarkData) => Promise<void>;
  queuePreferences: (preferences: any, userId: string) => Promise<void>;
  forceSyncNow: () => Promise<void>;
  clearFailedItems: () => Promise<void>;
}

export const useBackgroundSync = (): BackgroundSyncHook => {
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  const updateSyncStats = useCallback(async () => {
    try {
      const stats = await backgroundSync.getSyncStats();
      setSyncStats(stats);
    } catch (error) {
      console.error('useBackgroundSync: Failed to get sync stats:', error);
    }
  }, []);

  const handleSyncStatsUpdate = useCallback((stats: SyncStats) => {
    setSyncStats(stats);
  }, []);

  const handleOnlineStatusChange = useCallback(() => {
    setIsOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    // Initialize background sync service
    const initializeSync = async () => {
      try {
        await backgroundSync.initialize();
        await updateSyncStats();
      } catch (error) {
        console.error('useBackgroundSync: Failed to initialize:', error);
      }
    };

    initializeSync();

    // Listen for online/offline events
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    // Listen for sync stats updates
    backgroundSync.addSyncListener(handleSyncStatsUpdate);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
      backgroundSync.removeSyncListener(handleSyncStatsUpdate);
    };
  }, [handleOnlineStatusChange, handleSyncStatsUpdate, updateSyncStats]);

  const queueReadingProgress = useCallback(async (progress: ReadingProgress) => {
    try {
      await backgroundSync.queueReadingProgress(progress);
    } catch (error) {
      console.error('useBackgroundSync: Failed to queue reading progress:', error);
      throw error;
    }
  }, []);

  const queueBookmark = useCallback(async (bookmark: BookmarkData) => {
    try {
      await backgroundSync.queueBookmark(bookmark);
    } catch (error) {
      console.error('useBackgroundSync: Failed to queue bookmark:', error);
      throw error;
    }
  }, []);

  const queuePreferences = useCallback(async (preferences: any, userId: string) => {
    try {
      await backgroundSync.queuePreferences(preferences, userId);
    } catch (error) {
      console.error('useBackgroundSync: Failed to queue preferences:', error);
      throw error;
    }
  }, []);

  const forceSyncNow = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }

    setIsSyncing(true);
    try {
      await backgroundSync.forceSyncNow();
    } catch (error) {
      console.error('useBackgroundSync: Failed to force sync:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  const clearFailedItems = useCallback(async () => {
    try {
      await backgroundSync.clearFailedItems();
    } catch (error) {
      console.error('useBackgroundSync: Failed to clear failed items:', error);
      throw error;
    }
  }, []);

  return {
    syncStats,
    isOnline,
    isSyncing,
    queueReadingProgress,
    queueBookmark,
    queuePreferences,
    forceSyncNow,
    clearFailedItems
  };
};

export default useBackgroundSync;