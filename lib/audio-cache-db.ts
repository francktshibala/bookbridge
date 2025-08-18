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
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'audioSentences';
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly DEFAULT_EXPIRY_DAYS = 30;

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
        
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          
          // Create indexes for efficient lookups
          store.createIndex('bookChunkLevel', ['bookId', 'chunkIndex', 'cefrLevel'], { unique: false });
          store.createIndex('bookChunkLevelVoice', ['bookId', 'chunkIndex', 'cefrLevel', 'voiceId'], { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
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
    text: string
  ): Promise<boolean> {
    try {
      await this.initialize();
      if (!this.db) throw new Error('Database not initialized');

      // Check cache size before storing
      await this.enforceStorageLimit();

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
        expiresAt: Date.now() + (this.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
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
    sentenceIndex: number
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
      
      if (stats.totalSize <= this.MAX_CACHE_SIZE) {
        return;
      }

      // Remove oldest items until we're under the limit
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('createdAt');
      const request = index.openCursor();

      let currentSize = stats.totalSize;

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor && currentSize > this.MAX_CACHE_SIZE) {
            const item = cursor.value;
            currentSize -= item.audioBlob.size;
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
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
}

// Export singleton instance
export const audioCacheDB = AudioCacheDB.getInstance();