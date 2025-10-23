/**
 * IndexedDB Utility for Offline Book Storage
 * Stores book data, audio files, and metadata for offline access
 */

export interface OfflineBook {
  id: string;
  title: string;
  author: string;
  level: string;
  coverUrl?: string;
  downloadedAt: Date;
  lastAccessedAt: Date;
  totalSize: number; // bytes
  bundles: OfflineBundle[];
  metadata: {
    totalBundles: number;
    totalSentences: number;
    chapters?: any[];
  };
}

export interface OfflineBundle {
  bundleId: string;
  bundleIndex: number;
  audioBlob: Blob;
  audioUrl: string; // original URL for reference
  totalDuration: number;
  sentences: {
    sentenceId: string;
    sentenceIndex: number;
    text: string;
    startTime: number;
    endTime: number;
    wordTimings?: Array<{
      word: string;
      start: number;
      end: number;
    }>;
  }[];
}

export interface DownloadProgress {
  bookId: string;
  bundleIndex: number;
  totalBundles: number;
  downloaded: number;
  failed: number;
  status: 'downloading' | 'completed' | 'failed' | 'paused';
  bytesDownloaded: number;
  totalBytes: number;
  error?: string;
}

const DB_NAME = 'BookBridgeOffline';
const DB_VERSION = 1;

// Store names
const BOOKS_STORE = 'books';
const BUNDLES_STORE = 'bundles';
const PROGRESS_STORE = 'downloadProgress';

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB connection
   */
  async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Books store
        if (!db.objectStoreNames.contains(BOOKS_STORE)) {
          const booksStore = db.createObjectStore(BOOKS_STORE, { keyPath: 'id' });
          booksStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
          booksStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        }

        // Bundles store (separate for efficient loading)
        if (!db.objectStoreNames.contains(BUNDLES_STORE)) {
          const bundlesStore = db.createObjectStore(BUNDLES_STORE, { keyPath: ['bookId', 'bundleIndex'] });
          bundlesStore.createIndex('bookId', 'bookId', { unique: false });
        }

        // Download progress store
        if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
          db.createObjectStore(PROGRESS_STORE, { keyPath: 'bookId' });
        }

        console.log('📦 IndexedDB schema created');
      };
    });

    return this.initPromise;
  }

  /**
   * Save book metadata (without audio)
   */
  async saveBookMetadata(book: Omit<OfflineBook, 'bundles'>): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BOOKS_STORE], 'readwrite');
      const store = transaction.objectStore(BOOKS_STORE);

      const bookData = {
        ...book,
        bundles: [] // Bundles stored separately
      };

      const request = store.put(bookData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a single bundle with audio blob
   */
  async saveBundle(bookId: string, bundle: OfflineBundle): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BUNDLES_STORE], 'readwrite');
      const store = transaction.objectStore(BUNDLES_STORE);

      const bundleData = {
        bookId,
        ...bundle
      };

      const request = store.put(bundleData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all downloaded books
   */
  async getDownloadedBooks(): Promise<OfflineBook[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BOOKS_STORE], 'readonly');
      const store = transaction.objectStore(BOOKS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a specific book's metadata
   */
  async getBook(bookId: string): Promise<OfflineBook | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BOOKS_STORE], 'readonly');
      const store = transaction.objectStore(BOOKS_STORE);
      const request = store.get(bookId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all bundles for a book
   */
  async getBookBundles(bookId: string): Promise<OfflineBundle[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BUNDLES_STORE], 'readonly');
      const store = transaction.objectStore(BUNDLES_STORE);
      const index = store.index('bookId');
      const request = index.getAll(bookId);

      request.onsuccess = () => {
        const bundles = request.result.map((b: any) => {
          const { bookId: _, ...bundle } = b;
          return bundle;
        });
        resolve(bundles);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a specific bundle
   */
  async getBundle(bookId: string, bundleIndex: number): Promise<OfflineBundle | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BUNDLES_STORE], 'readonly');
      const store = transaction.objectStore(BUNDLES_STORE);
      const request = store.get([bookId, bundleIndex]);

      request.onsuccess = () => {
        if (request.result) {
          const { bookId: _, ...bundle } = request.result;
          resolve(bundle);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a book and all its bundles
   */
  async deleteBook(bookId: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BOOKS_STORE, BUNDLES_STORE, PROGRESS_STORE], 'readwrite');

      // Delete book metadata
      const booksStore = transaction.objectStore(BOOKS_STORE);
      booksStore.delete(bookId);

      // Delete all bundles
      const bundlesStore = transaction.objectStore(BUNDLES_STORE);
      const index = bundlesStore.index('bookId');
      const request = index.openCursor(bookId);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Delete progress
      const progressStore = transaction.objectStore(PROGRESS_STORE);
      progressStore.delete(bookId);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Update download progress
   */
  async saveProgress(progress: DownloadProgress): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROGRESS_STORE], 'readwrite');
      const store = transaction.objectStore(PROGRESS_STORE);
      const request = store.put(progress);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get download progress
   */
  async getProgress(bookId: string): Promise<DownloadProgress | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROGRESS_STORE], 'readonly');
      const store = transaction.objectStore(PROGRESS_STORE);
      const request = store.get(bookId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete download progress
   */
  async deleteProgress(bookId: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PROGRESS_STORE], 'readwrite');
      const store = transaction.objectStore(PROGRESS_STORE);
      const request = store.delete(bookId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if a book is fully downloaded
   */
  async isBookDownloaded(bookId: string): Promise<boolean> {
    const book = await this.getBook(bookId);
    if (!book) return false;

    const bundles = await this.getBookBundles(bookId);
    return bundles.length === book.metadata.totalBundles;
  }

  /**
   * Get total storage used
   */
  async getStorageSize(): Promise<number> {
    const books = await this.getDownloadedBooks();
    return books.reduce((total, book) => total + book.totalSize, 0);
  }

  /**
   * Update last accessed time
   */
  async updateLastAccessed(bookId: string): Promise<void> {
    const book = await this.getBook(bookId);
    if (!book) return;

    book.lastAccessedAt = new Date();
    await this.saveBookMetadata(book);
  }

  /**
   * Clear all offline data
   */
  async clearAll(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BOOKS_STORE, BUNDLES_STORE, PROGRESS_STORE], 'readwrite');

      transaction.objectStore(BOOKS_STORE).clear();
      transaction.objectStore(BUNDLES_STORE).clear();
      transaction.objectStore(PROGRESS_STORE).clear();

      transaction.oncomplete = () => {
        console.log('🧹 All offline data cleared');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Singleton instance
export const offlineDB = new IndexedDBManager();
