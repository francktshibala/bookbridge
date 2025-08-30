interface CachedAudioData {
  id: string;
  bookId: string;
  chunkIndex: number;
  cefrLevel: string;
  voiceId: string;
  sentenceIndex: number;
  audioBlob: Blob;
  duration: number;
  wordTimings: WordTiming[];
  text: string;
  createdAt: number;
  expiresAt: number;
  // Enhanced PWA fields
  quality: AudioQuality;
  codec: AudioCodec;
  bitrate: number;
  priority: CachePriority;
  networkType: NetworkType;
  fileSize: number;
  lastAccessed: number;
}

enum AudioQuality {
  LOW = '2g',      // 32kbps Opus
  MEDIUM = '3g',   // 64kbps Opus  
  HIGH = '4g',     // 128kbps AAC
  HD = 'wifi'      // 192kbps AAC
}

enum AudioCodec {
  OPUS = 'opus',
  AAC = 'aac',
  MP3 = 'mp3'
}

enum CachePriority {
  CURRENT_BOOK = 1.0,
  FAVORITES = 0.8,
  RECENTLY_PLAYED = 0.6,
  PREGENERATED = 0.4,
  LOW = 0.2
}

enum NetworkType {
  SLOW_2G = 'slow-2g',
  TWOG = '2g',
  THREEG = '3g',
  FOURG = '4g',
  WIFI = 'wifi',
  UNKNOWN = 'unknown'
}

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
}

interface AudioCacheStats {
  totalSize: number;
  itemCount: number;
  oldestItem: number;
  newestItem: number;
}

export class AudioCacheDB {
  private static instance: AudioCacheDB;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'BookBridgeAudioCache';
  private readonly DB_VERSION = 2; // Increased for schema upgrade
  private readonly STORE_NAME = 'audioSentences';
  private readonly DEFAULT_EXPIRY_DAYS = 30;
  
  // Network-adaptive cache sizes (from PWA research)
  private readonly CACHE_SIZES = {
    [NetworkType.SLOW_2G]: 50 * 1024 * 1024,   // 50MB
    [NetworkType.TWOG]: 50 * 1024 * 1024,      // 50MB  
    [NetworkType.THREEG]: 150 * 1024 * 1024,   // 150MB
    [NetworkType.FOURG]: 500 * 1024 * 1024,    // 500MB
    [NetworkType.WIFI]: 1024 * 1024 * 1024,    // 1GB
    [NetworkType.UNKNOWN]: 100 * 1024 * 1024   // 100MB fallback
  };
  
  // Quality profiles for different networks
  private readonly QUALITY_PROFILES = {
    [NetworkType.SLOW_2G]: { quality: AudioQuality.LOW, codec: AudioCodec.OPUS, bitrate: 24 },
    [NetworkType.TWOG]: { quality: AudioQuality.LOW, codec: AudioCodec.OPUS, bitrate: 32 },
    [NetworkType.THREEG]: { quality: AudioQuality.MEDIUM, codec: AudioCodec.OPUS, bitrate: 64 },
    [NetworkType.FOURG]: { quality: AudioQuality.HIGH, codec: AudioCodec.AAC, bitrate: 128 },
    [NetworkType.WIFI]: { quality: AudioQuality.HD, codec: AudioCodec.AAC, bitrate: 192 },
    [NetworkType.UNKNOWN]: { quality: AudioQuality.MEDIUM, codec: AudioCodec.OPUS, bitrate: 64 }
  };

  static getInstance(): AudioCacheDB {
    if (!AudioCacheDB.instance) {
      AudioCacheDB.instance = new AudioCacheDB();
    }
    return AudioCacheDB.instance;
  }

  async initialize(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          this.createIndexes(store);
        } else if (oldVersion < 2) {
          // Upgrade existing store for v2
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          const store = transaction?.objectStore(this.STORE_NAME);
          if (store) {
            this.createIndexes(store);
          }
        }
      };
    });
  }

  private createIndexes(store: IDBObjectStore): void {
    // Existing indexes
    if (!store.indexNames.contains('bookChunkLevel')) {
      store.createIndex('bookChunkLevel', ['bookId', 'chunkIndex', 'cefrLevel'], { unique: false });
    }
    if (!store.indexNames.contains('bookChunkLevelVoice')) {
      store.createIndex('bookChunkLevelVoice', ['bookId', 'chunkIndex', 'cefrLevel', 'voiceId'], { unique: false });
    }
    if (!store.indexNames.contains('expiresAt')) {
      store.createIndex('expiresAt', 'expiresAt', { unique: false });
    }
    if (!store.indexNames.contains('createdAt')) {
      store.createIndex('createdAt', 'createdAt', { unique: false });
    }
    
    // New PWA indexes for multi-quality storage
    if (!store.indexNames.contains('quality')) {
      store.createIndex('quality', 'quality', { unique: false });
    }
    if (!store.indexNames.contains('priority')) {
      store.createIndex('priority', 'priority', { unique: false });
    }
    if (!store.indexNames.contains('lastAccessed')) {
      store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
    }
    if (!store.indexNames.contains('networkType')) {
      store.createIndex('networkType', 'networkType', { unique: false });
    }
    if (!store.indexNames.contains('fileSize')) {
      store.createIndex('fileSize', 'fileSize', { unique: false });
    }
  }

  private detectNetworkType(): NetworkType {
    if (!('connection' in navigator)) {
      return NetworkType.UNKNOWN;
    }

    const connection = (navigator as any).connection;
    const effectiveType = connection.effectiveType;

    switch (effectiveType) {
      case 'slow-2g': return NetworkType.SLOW_2G;
      case '2g': return NetworkType.TWOG;
      case '3g': return NetworkType.THREEG;
      case '4g': return NetworkType.FOURG;
      default:
        // Fallback to checking connection type
        if (connection.type === 'wifi' || connection.type === 'ethernet') {
          return NetworkType.WIFI;
        }
        return NetworkType.UNKNOWN;
    }
  }

  private getMaxCacheSize(): number {
    const networkType = this.detectNetworkType();
    return this.CACHE_SIZES[networkType];
  }

  private getQualityProfile(networkType?: NetworkType) {
    const type = networkType || this.detectNetworkType();
    return this.QUALITY_PROFILES[type];
  }

  private generateCacheKey(bookId: string, chunkIndex: number, cefrLevel: string, voiceId: string, sentenceIndex: number): string {
    return `${bookId}_${chunkIndex}_${cefrLevel}_${voiceId}_${sentenceIndex}`;
  }

  async storeAudioSentence(
    bookId: string,
    chunkIndex: number,
    cefrLevel: string,
    voiceId: string,
    sentenceIndex: number,
    audioBlob: Blob,
    duration: number,
    wordTimings: WordTiming[],
    text: string,
    priority: CachePriority = CachePriority.PREGENERATED,
    networkType?: NetworkType
  ): Promise<boolean> {
    try {
      await this.initialize();
      if (!this.db) throw new Error('Database not initialized');

      // Check cache size before storing
      await this.enforceStorageLimit();

      // Get quality profile for current/specified network
      const currentNetworkType = networkType || this.detectNetworkType();
      const qualityProfile = this.getQualityProfile(currentNetworkType);

      const cacheData: CachedAudioData = {
        id: this.generateCacheKey(bookId, chunkIndex, cefrLevel, voiceId, sentenceIndex),
        bookId,
        chunkIndex,
        cefrLevel,
        voiceId,
        sentenceIndex,
        audioBlob,
        duration,
        wordTimings,
        text,
        createdAt: Date.now(),
        expiresAt: Date.now() + (this.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        // New PWA fields
        quality: qualityProfile.quality,
        codec: qualityProfile.codec,
        bitrate: qualityProfile.bitrate,
        priority,
        networkType: currentNetworkType,
        fileSize: audioBlob.size,
        lastAccessed: Date.now()
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.put(cacheData);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(new Error('Failed to store audio cache'));
      });
    } catch (error) {
      console.error('AudioCacheDB: Failed to store audio sentence:', error);
      return false;
    }
  }

  async getAudioSentence(
    bookId: string,
    chunkIndex: number,
    cefrLevel: string,
    voiceId: string,
    sentenceIndex: number,
    preferredQuality?: AudioQuality
  ): Promise<CachedAudioData | null> {
    try {
      await this.initialize();
      if (!this.db) return null;

      const cacheKey = this.generateCacheKey(bookId, chunkIndex, cefrLevel, voiceId, sentenceIndex);

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.get(cacheKey);

        request.onsuccess = () => {
          const result = request.result;
          
          if (!result) {
            resolve(null);
            return;
          }

          // Check if cache has expired
          if (result.expiresAt < Date.now()) {
            // Delete expired cache asynchronously
            this.deleteAudioSentence(bookId, chunkIndex, cefrLevel, voiceId, sentenceIndex);
            resolve(null);
            return;
          }

          resolve(result);
        };

        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error('AudioCacheDB: Failed to get audio sentence:', error);
      return null;
    }
  }

  async getChunkAudio(
    bookId: string,
    chunkIndex: number,
    cefrLevel: string,
    voiceId: string
  ): Promise<CachedAudioData[]> {
    try {
      await this.initialize();
      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const index = store.index('bookChunkLevelVoice');
        const request = index.getAll([bookId, chunkIndex, cefrLevel, voiceId]);

        request.onsuccess = () => {
          const results = request.result || [];
          
          // Filter out expired items and sort by sentence index
          const validResults = results
            .filter(item => item.expiresAt >= Date.now())
            .sort((a, b) => a.sentenceIndex - b.sentenceIndex);

          resolve(validResults);
        };

        request.onerror = () => resolve([]);
      });
    } catch (error) {
      console.error('AudioCacheDB: Failed to get chunk audio:', error);
      return [];
    }
  }

  async deleteAudioSentence(
    bookId: string,
    chunkIndex: number,
    cefrLevel: string,
    voiceId: string,
    sentenceIndex: number
  ): Promise<boolean> {
    try {
      await this.initialize();
      if (!this.db) return false;

      const cacheKey = this.generateCacheKey(bookId, chunkIndex, cefrLevel, voiceId, sentenceIndex);

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.delete(cacheKey);

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch (error) {
      console.error('AudioCacheDB: Failed to delete audio sentence:', error);
      return false;
    }
  }

  async clearBookCache(bookId: string): Promise<number> {
    try {
      await this.initialize();
      if (!this.db) return 0;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const index = store.index('bookChunkLevel');
        let deletedCount = 0;

        // Get all entries for this book
        const request = index.openCursor(IDBKeyRange.bound([bookId], [bookId, '\uffff']));

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };

        request.onerror = () => resolve(0);
      });
    } catch (error) {
      console.error('AudioCacheDB: Failed to clear book cache:', error);
      return 0;
    }
  }

  async clearExpiredCache(): Promise<number> {
    try {
      await this.initialize();
      if (!this.db) return 0;

      const now = Date.now();
      let deletedCount = 0;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const index = store.index('expiresAt');
        const request = index.openCursor(IDBKeyRange.upperBound(now));

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };

        request.onerror = () => resolve(0);
      });
    } catch (error) {
      console.error('AudioCacheDB: Failed to clear expired cache:', error);
      return 0;
    }
  }

  async getCacheStats(): Promise<AudioCacheStats> {
    try {
      await this.initialize();
      if (!this.db) {
        return { totalSize: 0, itemCount: 0, oldestItem: 0, newestItem: 0 };
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const items = request.result || [];
          
          if (items.length === 0) {
            resolve({ totalSize: 0, itemCount: 0, oldestItem: 0, newestItem: 0 });
            return;
          }

          const totalSize = items.reduce((sum, item) => sum + item.audioBlob.size, 0);
          const createdTimes = items.map(item => item.createdAt);
          
          resolve({
            totalSize,
            itemCount: items.length,
            oldestItem: Math.min(...createdTimes),
            newestItem: Math.max(...createdTimes)
          });
        };

        request.onerror = () => resolve({ totalSize: 0, itemCount: 0, oldestItem: 0, newestItem: 0 });
      });
    } catch (error) {
      console.error('AudioCacheDB: Failed to get cache stats:', error);
      return { totalSize: 0, itemCount: 0, oldestItem: 0, newestItem: 0 };
    }
  }

  private async enforceStorageLimit(): Promise<void> {
    try {
      const stats = await this.getCacheStats();
      const maxCacheSize = this.getMaxCacheSize();
      
      if (stats.totalSize <= maxCacheSize) {
        return;
      }

      console.log(`AudioCacheDB: Enforcing storage limit ${maxCacheSize / 1024 / 1024}MB, current: ${stats.totalSize / 1024 / 1024}MB`);

      // Priority-based eviction: Remove lowest priority items first, then oldest within same priority
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const items = request.result || [];
          
          // Sort by priority (ascending - lowest first) then by lastAccessed (oldest first)
          items.sort((a, b) => {
            if (a.priority !== b.priority) {
              return a.priority - b.priority; // Lower priority first
            }
            return a.lastAccessed - b.lastAccessed; // Older first within same priority
          });

          let currentSize = stats.totalSize;
          const deletePromises: Promise<void>[] = [];

          for (const item of items) {
            if (currentSize <= maxCacheSize) break;
            
            // Skip high-priority current book items unless we're really over limit
            if (item.priority === CachePriority.CURRENT_BOOK && currentSize < maxCacheSize * 1.2) {
              continue;
            }

            currentSize -= item.fileSize;
            
            const deleteRequest = store.delete(item.id);
            deletePromises.push(new Promise((deleteResolve) => {
              deleteRequest.onsuccess = () => deleteResolve();
              deleteRequest.onerror = () => deleteResolve();
            }));
          }

          Promise.all(deletePromises).then(() => resolve()).catch(() => resolve());
        };

        request.onerror = () => resolve();
      });
    } catch (error) {
      console.error('AudioCacheDB: Failed to enforce storage limit:', error);
    }
  }

  async isSupported(): Promise<boolean> {
    return 'indexedDB' in window && 'Blob' in window;
  }

  async clearAllCache(): Promise<void> {
    try {
      await this.initialize();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    } catch (error) {
      console.error('AudioCacheDB: Failed to clear all cache:', error);
    }
  }

  // New PWA methods for network-adaptive caching

  async getBestQualityAudio(
    bookId: string,
    chunkIndex: number,
    cefrLevel: string,
    voiceId: string,
    sentenceIndex: number
  ): Promise<CachedAudioData | null> {
    const currentNetworkType = this.detectNetworkType();
    const preferredProfile = this.getQualityProfile(currentNetworkType);
    
    // Try to get the preferred quality first
    let result = await this.getAudioSentence(bookId, chunkIndex, cefrLevel, voiceId, sentenceIndex, preferredProfile.quality);
    
    if (result) {
      // Update last accessed time
      await this.updateLastAccessed(result.id);
      return result;
    }

    // Fallback: Try to get any cached quality for this audio
    try {
      await this.initialize();
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const index = store.index('bookChunkLevelVoice');
        const request = index.getAll([bookId, chunkIndex, cefrLevel, voiceId]);

        request.onsuccess = () => {
          const results = request.result || [];
          const validResults = results.filter(item => 
            item.sentenceIndex === sentenceIndex && item.expiresAt >= Date.now()
          );

          if (validResults.length === 0) {
            resolve(null);
            return;
          }

          // Sort by quality preference (best available for current network)
          const sortedResults = this.sortByQualityPreference(validResults, currentNetworkType);
          const bestResult = sortedResults[0];

          // Update last accessed time
          this.updateLastAccessed(bestResult.id);
          resolve(bestResult);
        };

        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error('AudioCacheDB: Failed to get best quality audio:', error);
      return null;
    }
  }

  private sortByQualityPreference(items: CachedAudioData[], networkType: NetworkType): CachedAudioData[] {
    const preferredProfile = this.getQualityProfile(networkType);
    
    return items.sort((a, b) => {
      // Prefer exact quality match
      if (a.quality === preferredProfile.quality && b.quality !== preferredProfile.quality) return -1;
      if (b.quality === preferredProfile.quality && a.quality !== preferredProfile.quality) return 1;
      
      // Otherwise prefer higher quality on faster networks, lower on slower
      const qualityOrder = [AudioQuality.LOW, AudioQuality.MEDIUM, AudioQuality.HIGH, AudioQuality.HD];
      const aIndex = qualityOrder.indexOf(a.quality);
      const bIndex = qualityOrder.indexOf(b.quality);
      
      if (networkType === NetworkType.WIFI || networkType === NetworkType.FOURG) {
        return bIndex - aIndex; // Higher quality first for fast networks
      } else {
        return aIndex - bIndex; // Lower quality first for slow networks
      }
    });
  }

  private async updateLastAccessed(id: string): Promise<void> {
    try {
      if (!this.db) return;

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.lastAccessed = Date.now();
          store.put(item);
        }
      };
    } catch (error) {
      console.error('AudioCacheDB: Failed to update last accessed:', error);
    }
  }

  async updateCachePriority(bookId: string, priority: CachePriority): Promise<void> {
    try {
      await this.initialize();
      if (!this.db) return;

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('bookChunkLevel');
      const request = index.openCursor(IDBKeyRange.bound([bookId], [bookId, '\uffff']));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const item = cursor.value;
          item.priority = priority;
          item.lastAccessed = Date.now();
          cursor.update(item);
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('AudioCacheDB: Failed to update cache priority:', error);
    }
  }

  getCurrentNetworkInfo(): { type: NetworkType; maxCacheSize: number; qualityProfile: any } {
    const networkType = this.detectNetworkType();
    return {
      type: networkType,
      maxCacheSize: this.getMaxCacheSize(),
      qualityProfile: this.getQualityProfile(networkType)
    };
  }
}

// Export types for use in other files
export { AudioQuality, AudioCodec, CachePriority, NetworkType };
export type { CachedAudioData };

// Export singleton instance
export const audioCacheDB = AudioCacheDB.getInstance();