'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { downloadManager } from '@/lib/offline/download-manager';
import { offlineDB, type OfflineBook, type DownloadProgress } from '@/lib/offline/indexeddb';
import { offlineAudioProvider } from '@/lib/offline/offline-audio-provider';

interface OfflineContextState {
  // Connection status
  isOnline: boolean;

  // Downloaded books
  downloadedBooks: OfflineBook[];
  refreshDownloadedBooks: () => Promise<void>;

  // Download operations
  downloadBook: (bookId: string, level: string) => Promise<void>;
  cancelDownload: (bookId: string) => void;
  pauseDownload: (bookId: string) => Promise<void>;
  resumeDownload: (bookId: string, level: string) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;

  // Download progress
  downloadProgress: Map<string, DownloadProgress>;
  getProgress: (bookId: string) => DownloadProgress | undefined;

  // Status checks
  isBookAvailableOffline: (bookId: string) => Promise<boolean>;
  isDownloading: (bookId: string) => boolean;

  // Storage info
  storageUsed: number; // bytes
  storageFormatted: string;
  refreshStorage: () => Promise<void>;

  // Audio provider
  getOfflineAudioProvider: () => typeof offlineAudioProvider;
}

const OfflineContext = createContext<OfflineContextState | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [downloadedBooks, setDownloadedBooks] = useState<OfflineBook[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Map<string, DownloadProgress>>(new Map());
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageFormatted, setStorageFormatted] = useState('0 Bytes');

  // Initialize
  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    // Load initial data
    refreshDownloadedBooks();
    refreshStorage();

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('🌐 Connection restored');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('📴 Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  // Handle service worker messages
  const handleServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data.type === 'SYNC_DOWNLOADS') {
      console.log('📡 Sync downloads message received');
      refreshDownloadedBooks();
    }

    if (event.data.type === 'QUOTA_EXCEEDED') {
      console.warn('⚠️ Storage quota exceeded');
      // Could show a notification to user
    }
  };

  // Refresh downloaded books list
  const refreshDownloadedBooks = useCallback(async () => {
    try {
      const books = await downloadManager.getDownloadedBooks();
      setDownloadedBooks(books);
    } catch (error) {
      console.error('Failed to refresh downloaded books:', error);
    }
  }, []);

  // Refresh storage info
  const refreshStorage = useCallback(async () => {
    try {
      const { bytes, formatted } = await downloadManager.getStorageUsed();
      setStorageUsed(bytes);
      setStorageFormatted(formatted);
    } catch (error) {
      console.error('Failed to refresh storage:', error);
    }
  }, []);

  // Download a book
  const downloadBook = useCallback(async (bookId: string, level: string) => {
    try {
      await downloadManager.downloadBook(
        { bookId, level },
        {
          onProgress: (progress) => {
            setDownloadProgress(prev => {
              const newMap = new Map(prev);
              newMap.set(bookId, progress);
              return newMap;
            });
          },
          onBundleDownloaded: (index, total) => {
            console.log(`📦 Bundle ${index}/${total} downloaded`);
          },
          onComplete: async (bookId) => {
            console.log(`✅ Download complete: ${bookId}`);
            await refreshDownloadedBooks();
            await refreshStorage();
            // Remove from progress map
            setDownloadProgress(prev => {
              const newMap = new Map(prev);
              newMap.delete(bookId);
              return newMap;
            });
          },
          onError: (error) => {
            console.error('Download error:', error);
          },
        }
      );
    } catch (error) {
      console.error('Failed to start download:', error);
      throw error;
    }
  }, [refreshDownloadedBooks, refreshStorage]);

  // Cancel download
  const cancelDownload = useCallback((bookId: string) => {
    downloadManager.cancelDownload(bookId);
    setDownloadProgress(prev => {
      const newMap = new Map(prev);
      newMap.delete(bookId);
      return newMap;
    });
  }, []);

  // Pause download
  const pauseDownload = useCallback(async (bookId: string) => {
    await downloadManager.pauseDownload(bookId);
    // Progress will be updated by the manager
  }, []);

  // Resume download
  const resumeDownload = useCallback(async (bookId: string, level: string) => {
    await downloadBook(bookId, level);
  }, [downloadBook]);

  // Delete book
  const deleteBook = useCallback(async (bookId: string) => {
    await downloadManager.deleteBook(bookId);
    await refreshDownloadedBooks();
    await refreshStorage();
  }, [refreshDownloadedBooks, refreshStorage]);

  // Get progress for a book
  const getProgress = useCallback((bookId: string) => {
    return downloadProgress.get(bookId);
  }, [downloadProgress]);

  // Check if book is available offline
  const isBookAvailableOffline = useCallback(async (bookId: string) => {
    return downloadManager.isBookAvailableOffline(bookId);
  }, []);

  // Check if book is being downloaded
  const isDownloading = useCallback((bookId: string) => {
    return downloadManager.isDownloading(bookId);
  }, []);

  // Get offline audio provider
  const getOfflineAudioProvider = useCallback(() => {
    return offlineAudioProvider;
  }, []);

  // SSR safety
  if (!mounted) {
    return (
      <OfflineContext.Provider value={{
        isOnline: true,
        downloadedBooks: [],
        refreshDownloadedBooks: async () => {},
        downloadBook: async () => {},
        cancelDownload: () => {},
        pauseDownload: async () => {},
        resumeDownload: async () => {},
        deleteBook: async () => {},
        downloadProgress: new Map(),
        getProgress: () => undefined,
        isBookAvailableOffline: async () => false,
        isDownloading: () => false,
        storageUsed: 0,
        storageFormatted: '0 Bytes',
        refreshStorage: async () => {},
        getOfflineAudioProvider: () => offlineAudioProvider,
      }}>
        {children}
      </OfflineContext.Provider>
    );
  }

  return (
    <OfflineContext.Provider value={{
      isOnline,
      downloadedBooks,
      refreshDownloadedBooks,
      downloadBook,
      cancelDownload,
      pauseDownload,
      resumeDownload,
      deleteBook,
      downloadProgress,
      getProgress,
      isBookAvailableOffline,
      isDownloading,
      storageUsed,
      storageFormatted,
      refreshStorage,
      getOfflineAudioProvider,
    }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
