interface CachedChunk {
  audioAssets: any[];
  simplifiedText?: string;
  timestamp: number;
}

export class ChunkMemoryCache {
  private cache = new Map<string, CachedChunk>();
  private maxCacheSize = 5; // Keep 5 chunks in memory

  getCacheKey(bookId: string, chunk: number, level: string): string {
    return `${bookId}-${level}-chunk_${chunk}`;
  }

  set(key: string, data: { audioAssets: any[]; simplifiedText?: string }): void {
    // Evict oldest if cache full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
      console.log(`🗑️ Evicted oldest chunk from cache: ${oldestKey}`);
    }

    this.cache.set(key, {
      ...data,
      timestamp: Date.now()
    });
    console.log(`💾 Cached chunk: ${key} (${this.cache.size}/${this.maxCacheSize} slots used)`);
  }

  get(key: string): { audioAssets: any[]; simplifiedText?: string } | null {
    const cached = this.cache.get(key);
    if (cached) {
      console.log(`⚡ Cache hit for: ${key}`);
      return {
        audioAssets: cached.audioAssets,
        simplifiedText: cached.simplifiedText
      };
    }
    console.log(`❌ Cache miss for: ${key}`);
    return null;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    console.log('🧹 Cleared chunk cache');
  }

  getStats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
export const chunkCache = new ChunkMemoryCache();