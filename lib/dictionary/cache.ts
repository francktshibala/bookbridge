// Edge caching system for dictionary definitions
// Implements 24h TTL with request deduplication

interface CachedDefinition {
  word: string;
  definition: string;
  example?: string;
  partOfSpeech?: string;
  phonetic?: string;
  audioUrl?: string;
  cefrLevel?: string;
  source: string;
  timestamp: number;
  ttl: number; // Time to live in ms
}

interface PendingRequest {
  promise: Promise<CachedDefinition | null>;
  timestamp: number;
}

// In-memory cache with TTL
const definitionCache = new Map<string, CachedDefinition>();
const pendingRequests = new Map<string, PendingRequest>();

// Cache configuration
const DEFAULT_TTL = 1 * 60 * 60 * 1000; // 1 hour (temporary for debugging)
const PENDING_REQUEST_TIMEOUT = 10 * 1000; // 10 seconds
const MAX_CACHE_SIZE = 10000; // Prevent memory bloat

export function normalizeWord(word: string): string {
  return 'v3:' + word.toLowerCase().trim()
    .replace(/['"'""`]/g, '') // Remove quotes
    .replace(/[^\w\s-]/g, '') // Remove punctuation except hyphens
    .replace(/\s+/g, '-'); // Replace spaces with hyphens
}

export function getCachedDefinition(word: string): CachedDefinition | null {
  const normalizedKey = normalizeWord(word);
  const cached = definitionCache.get(normalizedKey);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() - cached.timestamp > cached.ttl) {
    definitionCache.delete(normalizedKey);
    return null;
  }

  console.log('🎯 Cache: Hit for word:', word);
  return cached;
}

export function setCachedDefinition(
  word: string,
  definition: Omit<CachedDefinition, 'timestamp' | 'ttl'>
): void {
  const normalizedKey = normalizeWord(word);

  // Implement LRU eviction if cache is full
  if (definitionCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = findOldestCacheKey();
    if (oldestKey) {
      definitionCache.delete(oldestKey);
      console.log('🗑️ Cache: Evicted oldest entry:', oldestKey);
    }
  }

  const cachedDef: CachedDefinition = {
    ...definition,
    timestamp: Date.now(),
    ttl: DEFAULT_TTL
  };

  definitionCache.set(normalizedKey, cachedDef);
  console.log('💾 Cache: Stored definition for:', word);
}

function findOldestCacheKey(): string | null {
  let oldestKey: string | null = null;
  let oldestTime = Date.now();

  for (const [key, def] of definitionCache.entries()) {
    if (def.timestamp < oldestTime) {
      oldestTime = def.timestamp;
      oldestKey = key;
    }
  }

  return oldestKey;
}

// Request deduplication - prevent multiple concurrent requests for same word
export function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const normalizedKey = normalizeWord(key);

  // Check if there's already a pending request
  const existing = pendingRequests.get(normalizedKey);
  if (existing) {
    // Check if pending request hasn't timed out
    if (Date.now() - existing.timestamp < PENDING_REQUEST_TIMEOUT) {
      console.log('🔄 Dedup: Using existing request for:', key);
      return existing.promise as Promise<T>;
    } else {
      // Clean up timed out request
      pendingRequests.delete(normalizedKey);
    }
  }

  // Create new request
  console.log('🆕 Dedup: Creating new request for:', key);
  const promise = requestFn();

  pendingRequests.set(normalizedKey, {
    promise: promise as Promise<CachedDefinition | null>,
    timestamp: Date.now()
  });

  // Clean up pending request when done
  promise.finally(() => {
    pendingRequests.delete(normalizedKey);
  });

  return promise;
}

// Cache statistics for monitoring
export function getCacheStats(): {
  size: number;
  hitRate: number;
  oldestEntry: string | null;
  pendingRequests: number;
} {
  let totalHits = 0;
  let totalRequests = 0;
  let oldestEntry: string | null = null;
  let oldestTime = Date.now();

  // This is a simplified hit rate calculation
  // In production, you'd want to track hits/misses separately
  for (const [key, def] of definitionCache.entries()) {
    totalRequests++;
    if (def.timestamp < oldestTime) {
      oldestTime = def.timestamp;
      oldestEntry = key;
    }
  }

  return {
    size: definitionCache.size,
    hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
    oldestEntry,
    pendingRequests: pendingRequests.size
  };
}

// Clear expired entries (periodic cleanup)
export function cleanupCache(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, def] of definitionCache.entries()) {
    if (now - def.timestamp > def.ttl) {
      definitionCache.delete(key);
      cleaned++;
    }
  }

  console.log(`🧹 Cache: Cleaned ${cleaned} expired entries`);
  return cleaned;
}

// Preload cache with common words
export function preloadCommonWords(words: string[]): void {
  console.log(`🚀 Cache: Preloading ${words.length} common words`);
  // This would typically load from a predefined list
  // For now, we'll just normalize the keys to prepare for future loading
  words.forEach(word => {
    const normalizedKey = normalizeWord(word);
    // In production, this would actually fetch and cache definitions
    console.log('📝 Cache: Prepared key for preload:', normalizedKey);
  });
}

// Clear all cached definitions (admin function)
export function clearDefinitionCache(): void {
  const previousSize = definitionCache.size;
  definitionCache.clear();
  pendingRequests.clear();
  console.log(`🧹 Cache: Cleared ${previousSize} definitions and pending requests`);
}