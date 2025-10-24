// Client-side dictionary caching with IndexedDB + Memory LRU
// Phase 3: Instant lookups through local storage
// Version 3: Cache busting for AI-only mode

const CACHE_VERSION = 'v3';

interface CachedDefinition {
  word: string;
  definition: string;
  example: string;
  partOfSpeech: string;
  phonetic?: string;
  cefrLevel: string;
  source: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface DictionaryResponse {
  word: string;
  definition: string;
  example?: string;
  partOfSpeech?: string;
  phonetic?: string;
  audioUrl?: string;
  cefrLevel?: string;
  source: string;
  cached: boolean;
  responseTime: number;
}

// Memory LRU Cache (immediate access)
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// IndexedDB wrapper for persistent storage
class IndexedDBCache {
  private dbName = 'DictionaryCache';
  private storeName = 'definitions';
  private version = 3; // Bumped for cache busting
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Clear all object stores on version upgrade (cache busting)
        const existingStoreNames = Array.from(db.objectStoreNames);
        existingStoreNames.forEach(storeName => {
          db.deleteObjectStore(storeName);
        });

        // Recreate the store
        const store = db.createObjectStore(this.storeName, { keyPath: 'word' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('🗑️ IndexedDB cache cleared due to version upgrade');
      };
    });
  }

  async get(word: string): Promise<CachedDefinition | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(word);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as CachedDefinition | undefined;

        // Check if cached item has expired
        if (result && Date.now() - result.timestamp < result.ttl) {
          resolve(result);
        } else {
          // Remove expired item
          if (result) {
            this.delete(word);
          }
          resolve(null);
        }
      };
    });
  }

  async set(definition: CachedDefinition): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(definition);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(word: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(word);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async cleanup(): Promise<void> {
    // Remove entries older than 30 days
    if (!this.db) await this.init();

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(thirtyDaysAgo);
      const request = index.openCursor(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}

// Unified Dictionary Cache
class DictionaryCache {
  private memoryCache: LRUCache<string, CachedDefinition>;
  private indexedDBCache: IndexedDBCache;
  private isInitialized = false;

  constructor() {
    this.memoryCache = new LRUCache<string, CachedDefinition>(500); // 500 definitions in memory
    this.indexedDBCache = new IndexedDBCache();
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.indexedDBCache.init();
      // Clean up old entries on startup
      await this.indexedDBCache.cleanup();
      this.isInitialized = true;
      console.log('📦 Dictionary cache initialized successfully');
    } catch (error) {
      console.warn('⚠️ Dictionary cache init failed, using memory-only:', error);
      this.isInitialized = true; // Continue with memory-only cache
    }
  }

  private normalizeWord(word: string): string {
    return `${CACHE_VERSION}:${word.toLowerCase().trim()}`;
  }

  async get(word: string): Promise<CachedDefinition | null> {
    if (!this.isInitialized) await this.init();

    const normalizedWord = this.normalizeWord(word);

    // 1. Check memory cache first (fastest)
    const memoryResult = this.memoryCache.get(normalizedWord);
    if (memoryResult && Date.now() - memoryResult.timestamp < memoryResult.ttl) {
      console.log('⚡ Memory cache hit for:', word);
      return memoryResult;
    }

    // 2. Check IndexedDB cache (persistent)
    try {
      const indexedDBResult = await this.indexedDBCache.get(normalizedWord);
      if (indexedDBResult) {
        // Promote to memory cache for faster future access
        this.memoryCache.set(normalizedWord, indexedDBResult);
        console.log('💾 IndexedDB cache hit for:', word);
        return indexedDBResult;
      }
    } catch (error) {
      console.warn('IndexedDB read error:', error);
    }

    console.log('❌ Cache miss for:', word);
    return null;
  }

  async set(word: string, definition: Omit<CachedDefinition, 'word' | 'timestamp' | 'ttl'>): Promise<void> {
    if (!this.isInitialized) await this.init();

    const normalizedWord = this.normalizeWord(word);
    const cachedDef: CachedDefinition = {
      word: normalizedWord,
      ...definition,
      timestamp: Date.now(),
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days TTL
    };

    // Store in both caches
    this.memoryCache.set(normalizedWord, cachedDef);

    try {
      await this.indexedDBCache.set(cachedDef);
      console.log('💾 Cached definition for:', word);
    } catch (error) {
      console.warn('IndexedDB write error:', error);
    }
  }

  async fetchWithCache(word: string, context?: string): Promise<DictionaryResponse> {
    const startTime = Date.now();

    // Try cache first
    const cached = await this.get(word);
    if (cached) {
      const responseTime = Date.now() - startTime;
      const response = {
        word: cached.word,
        definition: cached.definition,
        example: cached.example,
        partOfSpeech: cached.partOfSpeech,
        phonetic: cached.phonetic,
        cefrLevel: cached.cefrLevel,
        source: `${cached.source} (cached)`,
        cached: true,
        responseTime
      };

      // Track cache hit analytics
      dictionaryAnalytics.trackLookup({
        word,
        responseTime,
        cacheHit: true,
        sourceUsed: this.memoryCache.has(this.normalizeWord(word)) ? 'memory' : 'indexeddb',
        hadRetry: false,
        wasHedged: false,
        cefrLevel: cached.cefrLevel
      });

      return response;
    }

    // Cache miss - fetch from API
    try {
      const url = `/api/dictionary/resolve?word=${encodeURIComponent(word)}${context ? `&context=${encodeURIComponent(context)}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      // Cache the result
      await this.set(word, {
        definition: result.definition,
        example: result.example || '',
        partOfSpeech: result.partOfSpeech || 'unknown',
        phonetic: result.phonetic,
        cefrLevel: result.cefrLevel || 'B1',
        source: result.source
      });

      const responseTime = Date.now() - startTime;
      const dictionaryResponse = {
        ...result,
        cached: false,
        responseTime
      };

      // Track cache miss analytics
      dictionaryAnalytics.trackLookup({
        word,
        responseTime,
        cacheHit: false,
        sourceUsed: result.source.includes('OpenAI') ? 'ai-openai' :
                   result.source.includes('Claude') ? 'ai-claude' : 'fallback',
        hadRetry: result.source.includes('retry') || false,
        wasHedged: result.source.includes('hedged') || true, // Assume hedged for AI calls
        cefrLevel: result.cefrLevel,
        aiProvider: result.source.includes('OpenAI') ? 'openai' :
                   result.source.includes('Claude') ? 'claude' : undefined
      });

      // Track AI cost if it was an AI lookup
      if (result.source.includes('AI Dictionary')) {
        const provider = result.source.includes('OpenAI') ? 'openai' : 'claude';
        dictionaryAnalytics.trackAICost(provider, 0.001); // Estimate $0.001 per lookup
      }

      return dictionaryResponse;

    } catch (error) {
      console.error('Dictionary fetch error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    try {
      await this.indexedDBCache.clear();
      console.log('🧹 Dictionary cache cleared');
    } catch (error) {
      console.warn('IndexedDB clear error:', error);
    }
  }

  getStats(): { memorySize: number; isInitialized: boolean } {
    return {
      memorySize: this.memoryCache.size(),
      isInitialized: this.isInitialized
    };
  }
}

// Analytics integration
import { dictionaryAnalytics } from './DictionaryAnalytics';

// Singleton instance
const dictionaryCache = new DictionaryCache();

export { dictionaryCache, DictionaryCache, dictionaryAnalytics };
export type { CachedDefinition, DictionaryResponse };