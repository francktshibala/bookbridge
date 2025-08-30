/**
 * Background Sync Service for BookBridge PWA
 * Handles offline reading progress synchronization using Background Sync API
 * Research findings: Queue offline actions and sync when connection restored for seamless UX
 */

export interface ReadingProgress {
  bookId: string;
  userId: string;
  currentPage: number;
  totalPages: number;
  readingTime: number; // seconds
  lastPosition: number; // character position in text
  timestamp: number;
  sessionId: string;
  cefr?: string;
  voice?: string;
  audioPosition?: number; // seconds in audio
}

export interface BookmarkData {
  id: string;
  bookId: string;
  userId: string;
  page: number;
  position: number;
  note?: string;
  timestamp: number;
  type: 'bookmark' | 'highlight' | 'note';
  content?: string; // highlighted text
}

export interface SyncQueueItem {
  id: string;
  type: 'reading-progress' | 'bookmark' | 'preference' | 'achievement';
  data: ReadingProgress | BookmarkData | any;
  timestamp: number;
  attempts: number;
  maxAttempts: number;
  priority: 'high' | 'medium' | 'low';
  userId: string;
}

export interface SyncStats {
  totalQueued: number;
  totalSynced: number;
  totalFailed: number;
  lastSyncTime: number | null;
  queuedItems: SyncQueueItem[];
  failedItems: SyncQueueItem[];
}

export class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private dbName = 'bookbridge-sync';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private syncInProgress = false;
  private maxRetryAttempts = 3;
  private syncListeners: Array<(stats: SyncStats) => void> = [];

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  async initialize(): Promise<void> {
    console.log('BackgroundSync: Initializing background sync service');
    
    await this.initializeDatabase();
    await this.registerServiceWorkerSync();
    await this.setupPeriodicSync();
    
    // Listen for online events
    window.addEventListener('online', () => this.onNetworkRestore());
    
    console.log('BackgroundSync: Initialization complete');
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('userId', 'userId', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('priority', 'priority', { unique: false });
        }
        
        // Sync history store
        if (!db.objectStoreNames.contains('syncHistory')) {
          const historyStore = db.createObjectStore('syncHistory', { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          historyStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  private async registerServiceWorkerSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        console.log('BackgroundSync: Service worker ready, sync API available');
        
        // Register sync events (cast to any to handle experimental API)
        const syncManager = (registration as any).sync;
        if (syncManager) {
          await syncManager.register('background-sync-reading-progress');
          await syncManager.register('background-sync-bookmarks');
          await syncManager.register('background-sync-preferences');
        }
        
      } catch (error) {
        console.warn('BackgroundSync: Failed to register sync:', error);
      }
    } else {
      console.warn('BackgroundSync: Background sync not supported, falling back to manual sync');
    }
  }

  private setupPeriodicSync(): void {
    // Attempt sync every 30 seconds when online
    setInterval(async () => {
      if (navigator.onLine && !this.syncInProgress) {
        await this.processSyncQueue();
      }
    }, 30000);
  }

  private async onNetworkRestore(): Promise<void> {
    console.log('BackgroundSync: Network restored, attempting sync');
    
    // Small delay to ensure connection is stable
    setTimeout(async () => {
      await this.processSyncQueue();
    }, 2000);
  }

  // Queue reading progress for sync
  async queueReadingProgress(progress: ReadingProgress): Promise<void> {
    const syncItem: SyncQueueItem = {
      id: `progress-${progress.bookId}-${progress.userId}-${Date.now()}`,
      type: 'reading-progress',
      data: progress,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: this.maxRetryAttempts,
      priority: 'high',
      userId: progress.userId
    };

    await this.addToSyncQueue(syncItem);
    console.log(`BackgroundSync: Queued reading progress for book ${progress.bookId}`);
    
    // Try immediate sync if online
    if (navigator.onLine) {
      this.processSyncQueue().catch(console.error);
    }
  }

  // Queue bookmark/highlight for sync
  async queueBookmark(bookmark: BookmarkData): Promise<void> {
    const syncItem: SyncQueueItem = {
      id: `bookmark-${bookmark.id}-${Date.now()}`,
      type: 'bookmark',
      data: bookmark,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: this.maxRetryAttempts,
      priority: 'medium',
      userId: bookmark.userId
    };

    await this.addToSyncQueue(syncItem);
    console.log(`BackgroundSync: Queued ${bookmark.type} for book ${bookmark.bookId}`);
    
    if (navigator.onLine) {
      this.processSyncQueue().catch(console.error);
    }
  }

  // Queue user preferences for sync
  async queuePreferences(preferences: any, userId: string): Promise<void> {
    const syncItem: SyncQueueItem = {
      id: `prefs-${userId}-${Date.now()}`,
      type: 'preference',
      data: preferences,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: this.maxRetryAttempts,
      priority: 'low',
      userId
    };

    await this.addToSyncQueue(syncItem);
    
    if (navigator.onLine) {
      this.processSyncQueue().catch(console.error);
    }
  }

  private async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;
    console.log('BackgroundSync: Processing sync queue');

    try {
      const queuedItems = await this.getQueuedItems();
      console.log(`BackgroundSync: Found ${queuedItems.length} items to sync`);

      // Sort by priority and timestamp
      const sortedItems = queuedItems.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return a.timestamp - b.timestamp;
      });

      // Process items in batches
      const batchSize = 5;
      for (let i = 0; i < sortedItems.length; i += batchSize) {
        const batch = sortedItems.slice(i, i + batchSize);
        await Promise.allSettled(batch.map(item => this.syncItem(item)));
      }

    } catch (error) {
      console.error('BackgroundSync: Error processing sync queue:', error);
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    try {
      let success = false;

      switch (item.type) {
        case 'reading-progress':
          success = await this.syncReadingProgress(item.data as ReadingProgress);
          break;
        case 'bookmark':
          success = await this.syncBookmark(item.data as BookmarkData);
          break;
        case 'preference':
          success = await this.syncPreferences(item.data, item.userId);
          break;
        default:
          console.warn(`BackgroundSync: Unknown sync type: ${item.type}`);
          success = true; // Remove unknown items
      }

      if (success) {
        await this.removeFromQueue(item.id);
        await this.addToSyncHistory(item, 'success');
        console.log(`BackgroundSync: Successfully synced ${item.type} (${item.id})`);
      } else {
        await this.handleSyncFailure(item);
      }

    } catch (error) {
      console.error(`BackgroundSync: Error syncing item ${item.id}:`, error);
      await this.handleSyncFailure(item);
    }
  }

  private async syncReadingProgress(progress: ReadingProgress): Promise<boolean> {
    try {
      const response = await fetch('/api/reading-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progress)
      });

      return response.ok;
    } catch (error) {
      console.error('BackgroundSync: Failed to sync reading progress:', error);
      return false;
    }
  }

  private async syncBookmark(bookmark: BookmarkData): Promise<boolean> {
    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookmark)
      });

      return response.ok;
    } catch (error) {
      console.error('BackgroundSync: Failed to sync bookmark:', error);
      return false;
    }
  }

  private async syncPreferences(preferences: any, userId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, preferences })
      });

      return response.ok;
    } catch (error) {
      console.error('BackgroundSync: Failed to sync preferences:', error);
      return false;
    }
  }

  private async handleSyncFailure(item: SyncQueueItem): Promise<void> {
    item.attempts++;
    
    if (item.attempts >= item.maxAttempts) {
      console.warn(`BackgroundSync: Max attempts reached for ${item.id}, marking as failed`);
      await this.removeFromQueue(item.id);
      await this.addToSyncHistory(item, 'failed');
    } else {
      console.log(`BackgroundSync: Retry ${item.attempts}/${item.maxAttempts} for ${item.id}`);
      await this.updateQueueItem(item);
    }
  }

  private async removeFromQueue(itemId: string): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(itemId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async updateQueueItem(item: SyncQueueItem): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async addToSyncHistory(item: SyncQueueItem, result: 'success' | 'failed'): Promise<void> {
    if (!this.db) return;
    
    const historyItem = {
      id: `${item.id}-${result}-${Date.now()}`,
      originalId: item.id,
      type: item.type,
      result,
      timestamp: Date.now(),
      attempts: item.attempts,
      userId: item.userId
    };
    
    const transaction = this.db.transaction(['syncHistory'], 'readwrite');
    const store = transaction.objectStore('syncHistory');
    
    return new Promise((resolve, reject) => {
      const request = store.add(historyItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getQueuedItems(): Promise<SyncQueueItem[]> {
    if (!this.db) return [];
    
    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Public methods for monitoring
  async getSyncStats(): Promise<SyncStats> {
    const queuedItems = await this.getQueuedItems();
    const failedItems = queuedItems.filter(item => item.attempts >= item.maxAttempts);
    
    return {
      totalQueued: queuedItems.length,
      totalSynced: 0, // Would need to count from history
      totalFailed: failedItems.length,
      lastSyncTime: await this.getLastSyncTime(),
      queuedItems,
      failedItems
    };
  }

  private async getLastSyncTime(): Promise<number | null> {
    if (!this.db) return null;
    
    const transaction = this.db.transaction(['syncHistory'], 'readonly');
    const store = transaction.objectStore('syncHistory');
    const index = store.index('timestamp');
    
    return new Promise((resolve) => {
      const request = index.openCursor(null, 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value.timestamp : null);
      };
      request.onerror = () => resolve(null);
    });
  }

  addSyncListener(listener: (stats: SyncStats) => void): void {
    this.syncListeners.push(listener);
  }

  removeSyncListener(listener: (stats: SyncStats) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  private async notifyListeners(): Promise<void> {
    if (this.syncListeners.length === 0) return;
    
    const stats = await this.getSyncStats();
    this.syncListeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('BackgroundSync: Error in sync listener:', error);
      }
    });
  }

  // Manual sync trigger
  async forceSyncNow(): Promise<void> {
    if (navigator.onLine) {
      await this.processSyncQueue();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  // Clear failed items
  async clearFailedItems(): Promise<void> {
    const queuedItems = await this.getQueuedItems();
    const failedItems = queuedItems.filter(item => item.attempts >= item.maxAttempts);
    
    for (const item of failedItems) {
      await this.removeFromQueue(item.id);
    }
    
    this.notifyListeners();
  }
}

// Export singleton instance
export const backgroundSync = BackgroundSyncService.getInstance();