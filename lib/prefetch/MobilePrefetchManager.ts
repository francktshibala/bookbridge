/**
 * Mobile-Optimized Predictive Prefetch Manager
 * Adapts prefetch strategy based on device and network conditions
 */

interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
}

interface DeviceTier {
  name: 'low' | 'mid' | 'high';
  ramGB: number;
  maxConcurrentPrefetch: number;
  prefetchDistance: number; // Number of paragraphs/chunks ahead
  cacheSize: number; // MB
}

interface PrefetchItem {
  id: string;
  type: 'audio' | 'text' | 'simplified';
  url: string;
  priority: number;
  size: number; // bytes
  chunkIndex?: number;
  paragraphIndex?: number;
  eslLevel?: string;
}

interface PrefetchStats {
  prefetched: number;
  hits: number;
  misses: number;
  bytesPreloaded: number;
  bytesWasted: number;
}

export class MobilePrefetchManager {
  private deviceTier: DeviceTier;
  private networkInfo: NetworkInfo;
  private prefetchQueue: PrefetchItem[] = [];
  private activeRequests = new Map<string, AbortController>();
  private cache = new Map<string, { data: any; timestamp: number; size: number }>();
  private stats: PrefetchStats = {
    prefetched: 0,
    hits: 0,
    misses: 0,
    bytesPreloaded: 0,
    bytesWasted: 0
  };

  constructor() {
    this.deviceTier = this.detectDeviceTier();
    this.networkInfo = this.getNetworkInfo();
    this.setupNetworkListener();
    this.startPerformanceMonitoring();
  }

  /**
   * Detect device performance tier
   */
  private detectDeviceTier(): DeviceTier {
    const memory = (navigator as any).deviceMemory || 4; // GB, default to 4GB if unknown
    const cores = navigator.hardwareConcurrency || 4;

    if (memory <= 2 || cores <= 2) {
      return {
        name: 'low',
        ramGB: memory,
        maxConcurrentPrefetch: 1,
        prefetchDistance: 2,
        cacheSize: 50 // MB
      };
    } else if (memory <= 4 || cores <= 4) {
      return {
        name: 'mid',
        ramGB: memory,
        maxConcurrentPrefetch: 2,
        prefetchDistance: 4,
        cacheSize: 100 // MB
      };
    } else {
      return {
        name: 'high',
        ramGB: memory,
        maxConcurrentPrefetch: 3,
        prefetchDistance: 6,
        cacheSize: 200 // MB
      };
    }
  }

  /**
   * Get current network information
   */
  private getNetworkInfo(): NetworkInfo {
    const connection = (navigator as any).connection ||
                      (navigator as any).mozConnection ||
                      (navigator as any).webkitConnection;

    if (!connection) {
      // Default to mid-tier assumptions
      return {
        effectiveType: '4g',
        downlink: 5,
        rtt: 100,
        saveData: false
      };
    }

    return {
      effectiveType: connection.effectiveType || '4g',
      downlink: connection.downlink || 5,
      rtt: connection.rtt || 100,
      saveData: connection.saveData || false
    };
  }

  /**
   * Listen for network changes
   */
  private setupNetworkListener() {
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        this.networkInfo = this.getNetworkInfo();
        this.adjustPrefetchStrategy();
      });
    }
  }

  /**
   * Adjust prefetch strategy based on current conditions
   */
  private adjustPrefetchStrategy() {
    // If user has data saver on, reduce prefetching
    if (this.networkInfo.saveData) {
      this.deviceTier.maxConcurrentPrefetch = 1;
      this.deviceTier.prefetchDistance = 1;
      return;
    }

    // Adjust based on network quality
    switch (this.networkInfo.effectiveType) {
      case 'slow-2g':
      case '2g':
        this.deviceTier.maxConcurrentPrefetch = 1;
        this.deviceTier.prefetchDistance = 1;
        break;
      case '3g':
        this.deviceTier.maxConcurrentPrefetch = Math.min(2, this.deviceTier.maxConcurrentPrefetch);
        this.deviceTier.prefetchDistance = Math.min(3, this.deviceTier.prefetchDistance);
        break;
      case '4g':
        // Use full device capability
        break;
    }
  }

  /**
   * Schedule prefetch for upcoming content
   */
  async schedulePrefetch(
    currentPosition: {
      chunkIndex: number;
      paragraphIndex: number;
      eslLevel: string;
    },
    bookId: string
  ): Promise<void> {
    // Clear old prefetch queue
    this.clearExpiredItems();

    const prefetchItems: PrefetchItem[] = [];

    // Prefetch upcoming audio and text
    for (let i = 1; i <= this.deviceTier.prefetchDistance; i++) {
      const futureChunk = currentPosition.chunkIndex + i;
      const futureParagraph = currentPosition.paragraphIndex + i;

      // Audio prefetch (highest priority)
      prefetchItems.push({
        id: `audio-${bookId}-${futureChunk}-${currentPosition.eslLevel}`,
        type: 'audio',
        url: `/api/books/${bookId}/audio?chunk=${futureChunk}&level=${currentPosition.eslLevel}`,
        priority: 10 - i, // Higher number = higher priority
        size: 50000, // Estimate 50KB per chunk
        chunkIndex: futureChunk,
        eslLevel: currentPosition.eslLevel
      });

      // Simplified text prefetch (lower priority)
      if (currentPosition.eslLevel !== 'original') {
        prefetchItems.push({
          id: `text-${bookId}-${futureChunk}-${currentPosition.eslLevel}`,
          type: 'simplified',
          url: `/api/books/${bookId}/cached-simplification?chunk=${futureChunk}&level=${currentPosition.eslLevel}`,
          priority: 5 - i,
          size: 5000, // Estimate 5KB per chunk
          chunkIndex: futureChunk,
          eslLevel: currentPosition.eslLevel
        });
      }
    }

    // Sort by priority and add to queue
    prefetchItems.sort((a, b) => b.priority - a.priority);
    this.prefetchQueue.push(...prefetchItems);

    // Start prefetching
    this.processPrefetchQueue();
  }

  /**
   * Process prefetch queue with concurrency limits
   */
  private async processPrefetchQueue() {
    // Respect concurrency limits
    while (
      this.activeRequests.size < this.deviceTier.maxConcurrentPrefetch &&
      this.prefetchQueue.length > 0
    ) {
      const item = this.prefetchQueue.shift()!;
      this.prefetchItem(item);
    }
  }

  /**
   * Prefetch individual item
   */
  private async prefetchItem(item: PrefetchItem) {
    // Check if already cached
    if (this.cache.has(item.id)) {
      return;
    }

    // Check cache size limits
    if (this.getCurrentCacheSize() + item.size > this.deviceTier.cacheSize * 1024 * 1024) {
      this.evictOldestItems(item.size);
    }

    const abortController = new AbortController();
    this.activeRequests.set(item.id, abortController);

    try {
      const startTime = performance.now();
      const response = await fetch(item.url, {
        signal: abortController.signal,
        headers: {
          'Priority': item.priority > 7 ? 'high' : 'low'
        }
      });

      if (!response.ok) {
        throw new Error(`Prefetch failed: ${response.status}`);
      }

      const data = await response.blob();
      const loadTime = performance.now() - startTime;

      // Store in cache
      this.cache.set(item.id, {
        data,
        timestamp: Date.now(),
        size: data.size
      });

      // Update stats
      this.stats.prefetched++;
      this.stats.bytesPreloaded += data.size;

      console.log(`📥 Prefetched ${item.type}: ${item.id} (${data.size} bytes, ${loadTime.toFixed(0)}ms)`);

    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.warn(`Prefetch failed for ${item.id}:`, error);
      }
    } finally {
      this.activeRequests.delete(item.id);
      // Continue processing queue
      this.processPrefetchQueue();
    }
  }

  /**
   * Get prefetched content
   */
  getCachedItem(id: string): any | null {
    const cached = this.cache.get(id);
    if (cached) {
      this.stats.hits++;
      return cached.data;
    } else {
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Check if item is prefetched
   */
  isPrefetched(id: string): boolean {
    return this.cache.has(id);
  }

  /**
   * Get current cache size in bytes
   */
  private getCurrentCacheSize(): number {
    return Array.from(this.cache.values()).reduce((total, item) => total + item.size, 0);
  }

  /**
   * Evict oldest items to make space
   */
  private evictOldestItems(spaceNeeded: number) {
    const items = Array.from(this.cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);

    let freedSpace = 0;
    for (const [id, item] of items) {
      this.cache.delete(id);
      freedSpace += item.size;
      this.stats.bytesWasted += item.size;

      if (freedSpace >= spaceNeeded) {
        break;
      }
    }
  }

  /**
   * Clear expired items (older than 5 minutes)
   */
  private clearExpiredItems() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [id, item] of this.cache.entries()) {
      if (now - item.timestamp > maxAge) {
        this.cache.delete(id);
        this.stats.bytesWasted += item.size;
      }
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring() {
    // Log stats every minute
    setInterval(() => {
      if (this.stats.prefetched > 0) {
        const hitRate = (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100;
        const wasteRate = (this.stats.bytesWasted / this.stats.bytesPreloaded) * 100;

        console.log('📊 Prefetch Stats:', {
          hitRate: `${hitRate.toFixed(1)}%`,
          wasteRate: `${wasteRate.toFixed(1)}%`,
          cacheSize: `${(this.getCurrentCacheSize() / 1024 / 1024).toFixed(1)}MB`,
          deviceTier: this.deviceTier.name,
          network: this.networkInfo.effectiveType
        });
      }
    }, 60000);
  }

  /**
   * Cancel all active prefetch requests
   */
  cancelAll() {
    for (const controller of this.activeRequests.values()) {
      controller.abort();
    }
    this.activeRequests.clear();
    this.prefetchQueue.length = 0;
  }

  /**
   * Get performance stats
   */
  getStats(): PrefetchStats & { hitRate: number; wasteRate: number; cacheSize: number } {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;
    const wasteRate = this.stats.bytesPreloaded > 0
      ? (this.stats.bytesWasted / this.stats.bytesPreloaded) * 100
      : 0;

    return {
      ...this.stats,
      hitRate,
      wasteRate,
      cacheSize: this.getCurrentCacheSize()
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.cancelAll();
    this.cache.clear();
  }
}