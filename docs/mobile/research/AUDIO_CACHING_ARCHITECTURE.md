# Audio Caching Architecture for BookBridge PWA

## Executive Summary
This document outlines a comprehensive audio caching architecture designed to deliver Speechify-level performance (<2s loading) on 2G/3G networks across emerging markets.

## Architecture Overview

### 1. Multi-Tier Cache System

```typescript
interface AudioCacheArchitecture {
  // L1: Memory Cache (5-10MB) - Currently playing + next 2 pages
  memoryCache: {
    maxSize: 10 * 1024 * 1024, // 10MB
    strategy: 'FIFO',
    contents: AudioSegment[]
  };
  
  // L2: IndexedDB Cache (50-500MB) - Current book + favorites
  indexedDBCache: {
    maxSize: number, // Dynamic based on device
    strategy: 'LRU',
    contents: CompressedAudioAsset[]
  };
  
  // L3: Service Worker Cache (100MB-1GB) - Pre-generated popular content
  swCache: {
    maxSize: number, // Based on available storage
    strategy: 'Network-First-With-Fallback',
    contents: CachedResponse[]
  };
  
  // L4: CDN - Full library
  cdn: {
    url: 'https://audio.bookbridge.app',
    fallbacks: string[] // Multiple CDN endpoints
  };
}
```

### 2. Progressive Audio Loading Strategy

```typescript
class ProgressiveAudioLoader {
  // Stage 1: Load first 5 seconds for instant playback
  async loadInitialSegment(bookId: string, page: number): Promise<AudioBuffer> {
    const segment = await this.cache.get(`${bookId}-${page}-intro`);
    if (!segment) {
      const url = this.getSegmentUrl(bookId, page, 0, 5);
      return this.fetchWithTimeout(url, 2000); // 2s timeout
    }
    return segment;
  }
  
  // Stage 2: Stream remaining audio while playing
  async streamRemainingAudio(bookId: string, page: number): AsyncGenerator<AudioBuffer> {
    const segments = this.getSegmentList(bookId, page);
    for (const segment of segments.slice(1)) {
      yield await this.fetchSegment(segment);
    }
  }
  
  // Stage 3: Upgrade quality when on better connection
  async upgradeAudioQuality(bookId: string, page: number): Promise<void> {
    if (this.networkType === 'wifi' || this.networkType === '4g') {
      const highQualityUrl = this.getHighQualityUrl(bookId, page);
      await this.backgroundFetch(highQualityUrl);
    }
  }
}
```

### 3. Network-Adaptive Compression

```typescript
interface CompressionProfile {
  codec: 'opus' | 'aac' | 'mp3';
  bitrate: number;
  sampleRate: number;
  channels: 1 | 2;
  complexity: number; // Opus encoding complexity (0-10)
}

const COMPRESSION_PROFILES = {
  'slow-2g': {
    codec: 'opus',
    bitrate: 24000, // 24kbps
    sampleRate: 16000,
    channels: 1,
    complexity: 5
  },
  '2g': {
    codec: 'opus',
    bitrate: 32000, // 32kbps
    sampleRate: 16000,
    channels: 1,
    complexity: 5
  },
  '3g': {
    codec: 'opus',
    bitrate: 48000, // 48kbps
    sampleRate: 24000,
    channels: 1,
    complexity: 8
  },
  '4g': {
    codec: 'aac',
    bitrate: 64000, // 64kbps
    sampleRate: 44100,
    channels: 1,
    complexity: 10
  },
  'wifi': {
    codec: 'aac',
    bitrate: 96000, // 96kbps
    sampleRate: 44100,
    channels: 2,
    complexity: 10
  }
};
```

### 4. Intelligent Pre-caching Algorithm

```typescript
class IntelligentPreCacher {
  private readingSpeed: number = 300; // words per minute
  private networkBandwidth: number;
  private cacheSize: number;
  
  async preCacheStrategy(currentBook: Book, currentPage: number) {
    // Calculate pages to cache based on reading speed
    const pagesPerMinute = this.readingSpeed / currentBook.wordsPerPage;
    const minutesToCache = this.getMinutesToCache();
    const pagesToCache = Math.ceil(pagesPerMinute * minutesToCache);
    
    // Priority queue for caching
    const cacheQueue: CachePriority[] = [
      { pages: [currentPage + 1, currentPage + 2], priority: 1.0 }, // Next pages
      { pages: this.getChapterStart(currentBook, currentPage), priority: 0.8 }, // Chapter starts
      { pages: this.getBookmarks(currentBook), priority: 0.7 }, // Bookmarked pages
      { pages: this.getPopularPages(currentBook), priority: 0.6 }, // Popular highlights
      { pages: this.getRecentlyRead(currentBook), priority: 0.5 } // Recently read
    ];
    
    // Cache based on available bandwidth and storage
    for (const item of cacheQueue) {
      if (this.canCache(item.pages.length)) {
        await this.cachePages(currentBook, item.pages, item.priority);
      }
    }
  }
  
  private getMinutesToCache(): number {
    // Dynamic based on network speed
    switch (this.networkType) {
      case 'slow-2g': return 5; // Cache 5 minutes ahead
      case '2g': return 10;
      case '3g': return 20;
      case '4g': return 30;
      case 'wifi': return 60;
      default: return 15;
    }
  }
}
```

### 5. Cache Eviction Strategy

```typescript
class CacheEvictionManager {
  private readonly MIN_FREE_SPACE = 50 * 1024 * 1024; // 50MB minimum
  
  async evictCache(): Promise<void> {
    const cacheItems = await this.getAllCacheItems();
    
    // Calculate scores for each item
    const scoredItems = cacheItems.map(item => ({
      ...item,
      score: this.calculateEvictionScore(item)
    }));
    
    // Sort by score (lower = more likely to evict)
    scoredItems.sort((a, b) => a.score - b.score);
    
    // Evict until we have enough space
    let freedSpace = 0;
    for (const item of scoredItems) {
      if (freedSpace >= this.MIN_FREE_SPACE) break;
      
      await this.removeFromCache(item.key);
      freedSpace += item.size;
    }
  }
  
  private calculateEvictionScore(item: CacheItem): number {
    const now = Date.now();
    const age = now - item.lastAccessed;
    const frequency = item.accessCount;
    const size = item.size;
    const priority = item.priority || 0.5;
    
    // LRU + LFU hybrid with priority weighting
    const ageScore = 1 / (1 + age / (24 * 60 * 60 * 1000)); // Decay over days
    const frequencyScore = Math.log(frequency + 1) / 10;
    const sizeScore = 1 / (1 + size / (1024 * 1024)); // Prefer evicting larger items
    
    return (ageScore * 0.3 + frequencyScore * 0.4 + priority * 0.2 + sizeScore * 0.1);
  }
}
```

### 6. Background Sync for Quality Upgrades

```typescript
class BackgroundAudioSync {
  async registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('audio-quality-upgrade');
    }
  }
  
  // In Service Worker
  async handleBackgroundSync(event: SyncEvent) {
    if (event.tag === 'audio-quality-upgrade') {
      event.waitUntil(this.upgradeAudioQuality());
    }
  }
  
  private async upgradeAudioQuality() {
    const lowQualityItems = await this.getLowQualityAudioItems();
    
    for (const item of lowQualityItems) {
      if (await this.isOnWifi()) {
        const highQualityUrl = item.url.replace('32kbps', '96kbps');
        const highQualityAudio = await fetch(highQualityUrl);
        await this.cache.put(item.key, highQualityAudio);
      }
    }
  }
}
```

### 7. Performance Monitoring & Analytics

```typescript
interface AudioPerformanceMetrics {
  timeToFirstByte: number;
  timeToPlayable: number;
  bufferingEvents: number;
  cacheHitRate: number;
  networkType: string;
  audioQuality: string;
  deviceMemory: number;
  storageUsage: number;
}

class AudioPerformanceMonitor {
  async trackAudioLoad(bookId: string, page: number): Promise<void> {
    const startTime = performance.now();
    let firstByteTime: number;
    let playableTime: number;
    
    try {
      const audio = await this.loadAudio(bookId, page);
      firstByteTime = performance.now() - startTime;
      
      await audio.play();
      playableTime = performance.now() - startTime;
      
      const metrics: AudioPerformanceMetrics = {
        timeToFirstByte: firstByteTime,
        timeToPlayable: playableTime,
        bufferingEvents: 0,
        cacheHitRate: await this.getCacheHitRate(),
        networkType: this.getNetworkType(),
        audioQuality: this.getCurrentQuality(),
        deviceMemory: navigator.deviceMemory || 0,
        storageUsage: await this.getStorageUsage()
      };
      
      await this.sendMetrics(metrics);
    } catch (error) {
      await this.trackError(error);
    }
  }
}
```

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Implement Opus codec support
- [ ] Create audio segmentation service
- [ ] Build progressive loader
- [ ] Add network detection

### Phase 2: Caching System (Week 3-4)
- [ ] Implement multi-tier cache
- [ ] Add cache eviction logic
- [ ] Create pre-caching algorithm
- [ ] Build cache analytics

### Phase 3: Network Optimization (Week 5-6)
- [ ] Add adaptive bitrate
- [ ] Implement background sync
- [ ] Create quality upgrade system
- [ ] Add offline fallbacks

### Phase 4: Testing & Optimization (Week 7-8)
- [ ] Test on real 2G/3G networks
- [ ] Optimize cache sizes
- [ ] Fine-tune algorithms
- [ ] Deploy monitoring

## Expected Outcomes

### Performance Targets
- **2G Networks**: <5s to playable audio (first 5 seconds cached)
- **3G Networks**: <2s to playable audio
- **Cache Hit Rate**: >80% for active readers
- **Storage Usage**: <200MB average per user
- **Battery Impact**: <5% additional drain

### User Experience
- Seamless playback even on slow networks
- No buffering during normal reading
- Automatic quality upgrades on WiFi
- Offline reading for cached content
- Transparent network handling

## Conclusion
This architecture provides a robust foundation for delivering high-quality audio experiences on constrained networks while maintaining the premium feel users expect from BookBridge.