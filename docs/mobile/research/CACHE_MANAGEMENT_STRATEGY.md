# Cache Management Strategy for BookBridge PWA

## Overview
This document outlines a sophisticated cache management system designed to optimize storage usage while maintaining instant audio playback for the most valuable content across 2G/3G networks.

## Cache Size Allocation by Network Type

```typescript
interface NetworkBasedCacheConfig {
  '2g': {
    totalCache: 50 * 1024 * 1024,    // 50MB total
    audioCache: 35 * 1024 * 1024,    // 35MB for audio (70%)
    contentCache: 10 * 1024 * 1024,  // 10MB for text/images (20%)
    systemCache: 5 * 1024 * 1024     // 5MB for app assets (10%)
  },
  '3g': {
    totalCache: 150 * 1024 * 1024,   // 150MB total
    audioCache: 105 * 1024 * 1024,   // 105MB for audio (70%)
    contentCache: 30 * 1024 * 1024,  // 30MB for content (20%)
    systemCache: 15 * 1024 * 1024    // 15MB for app assets (10%)
  },
  '4g': {
    totalCache: 500 * 1024 * 1024,   // 500MB total
    audioCache: 350 * 1024 * 1024,   // 350MB for audio (70%)
    contentCache: 100 * 1024 * 1024, // 100MB for content (20%)
    systemCache: 50 * 1024 * 1024    // 50MB for app assets (10%)
  },
  'wifi': {
    totalCache: 1024 * 1024 * 1024,  // 1GB total
    audioCache: 768 * 1024 * 1024,   // 768MB for audio (75%)
    contentCache: 200 * 1024 * 1024, // 200MB for content (20%)
    systemCache: 56 * 1024 * 1024    // 56MB for app assets (5%)
  }
}
```

## Priority-Based Eviction Algorithm

### Content Priority Matrix

```typescript
interface ContentPriority {
  currentBook: {
    currentChapter: 1.0,    // Always keep
    nextChapter: 0.9,       // High priority
    previousChapter: 0.8,   // Medium priority
    otherChapters: 0.6      // Lower priority
  },
  
  userBehavior: {
    bookmarks: 0.85,        // User explicitly marked
    recentlyRead: 0.75,     // Accessed in last 7 days
    favorites: 0.8,         // User's favorite books
    recommended: 0.5,       // System recommendations
    abandoned: 0.2          // Started but not finished
  },
  
  contentType: {
    audioIntro: 1.0,        // First 10 seconds - never evict
    audioFull: 0.7,         // Full audio segments
    textContent: 0.9,       // Always prioritize text
    wordTimings: 0.8,       // Critical for highlighting
    bookMetadata: 1.0,      // Small but essential
    userProgress: 1.0       // Never evict user data
  }
}
```

### Composite Score Calculation

```typescript
class CacheEvictionScorer {
  calculateEvictionScore(item: CacheItem): number {
    const now = Date.now();
    
    // Time-based factors
    const recency = this.calculateRecencyScore(item.lastAccessed, now);
    const frequency = this.calculateFrequencyScore(item.accessCount, item.createdAt, now);
    
    // Content-based factors
    const contentPriority = this.getContentPriority(item);
    const sizePenalty = this.getSizePenalty(item.size);
    const networkValue = this.getNetworkValue(item);
    
    // Composite score (higher = more valuable, less likely to evict)
    return (
      recency * 0.25 +          // 25% - how recently accessed
      frequency * 0.20 +        // 20% - how often accessed
      contentPriority * 0.35 +  // 35% - content importance
      networkValue * 0.15 +     // 15% - network difficulty to re-fetch
      sizePenalty * 0.05        // 5% - storage efficiency
    );
  }
  
  private calculateRecencyScore(lastAccessed: number, now: number): number {
    const hoursSince = (now - lastAccessed) / (1000 * 60 * 60);
    
    if (hoursSince < 1) return 1.0;      // Within last hour
    if (hoursSince < 24) return 0.8;     // Within last day
    if (hoursSince < 168) return 0.6;    // Within last week
    if (hoursSince < 720) return 0.4;    // Within last month
    return 0.2;                          // Older than month
  }
  
  private calculateFrequencyScore(accessCount: number, createdAt: number, now: number): number {
    const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
    const accessesPerDay = accessCount / Math.max(ageInDays, 1);
    
    if (accessesPerDay >= 2) return 1.0;  // Multiple times per day
    if (accessesPerDay >= 0.5) return 0.8; // Every 2 days
    if (accessesPerDay >= 0.2) return 0.6; // Weekly
    if (accessesPerDay >= 0.1) return 0.4; // Bi-weekly
    return 0.2;                           // Rarely accessed
  }
  
  private getNetworkValue(item: CacheItem): number {
    // Higher value for content that's expensive to re-fetch
    const sizeCategory = this.getSizeCategory(item.size);
    const networkType = this.getCurrentNetworkType();
    
    const networkMultiplier = {
      '2g': 2.0,    // Very expensive to re-fetch
      '3g': 1.5,    // Moderately expensive
      '4g': 1.2,    // Slightly expensive
      'wifi': 1.0   // Cheap to re-fetch
    };
    
    const sizeMultiplier = {
      'small': 1.0,   // <100KB
      'medium': 1.3,  // 100KB-1MB
      'large': 1.8,   // 1MB-5MB
      'xlarge': 2.5   // >5MB
    };
    
    return Math.min(2.0, networkMultiplier[networkType] * sizeMultiplier[sizeCategory]);
  }
}
```

## Smart Prefetch Queue Management

```typescript
class SmartPrefetchManager {
  private prefetchQueue: PriorityQueue<PrefetchTask> = new PriorityQueue();
  private readonly MAX_CONCURRENT_PREFETCH = 3;
  private readonly PREFETCH_BUDGET_MB = 20; // Max MB to prefetch per session
  
  async planPrefetchSession(user: UserContext): Promise<PrefetchPlan> {
    const readingHistory = await this.getUserReadingHistory(user.id);
    const currentBooks = await this.getCurrentlyReadingBooks(user.id);
    const networkCapacity = this.getNetworkCapacity();
    
    const prefetchPlan: PrefetchTask[] = [];
    
    // 1. Critical path: Current book next chapters
    for (const book of currentBooks) {
      const nextChapters = this.getNextChapters(book, 3);
      for (const chapter of nextChapters) {
        prefetchPlan.push({
          bookId: book.id,
          chapterId: chapter.id,
          priority: 0.9,
          estimatedSize: chapter.audioSize,
          estimatedTime: this.estimateDownloadTime(chapter.audioSize),
          reason: 'current-book-continuation'
        });
      }
    }
    
    // 2. Predictive: Based on reading patterns
    const predictedContent = await this.predictNextContent(readingHistory);
    for (const content of predictedContent) {
      prefetchPlan.push({
        ...content,
        priority: 0.6,
        reason: 'predictive-analytics'
      });
    }
    
    // 3. Popular content in user's genre preferences
    const popularInGenres = await this.getPopularInUserGenres(user.preferences);
    for (const content of popularInGenres.slice(0, 5)) {
      prefetchPlan.push({
        ...content,
        priority: 0.4,
        reason: 'popular-in-genre'
      });
    }
    
    // 4. Apply budget constraints
    return this.optimizePrefetchPlan(prefetchPlan, networkCapacity);
  }
  
  private optimizePrefetchPlan(
    tasks: PrefetchTask[], 
    networkCapacity: NetworkCapacity
  ): PrefetchPlan {
    // Knapsack problem: maximize value within size/time constraints
    tasks.sort((a, b) => (b.priority / b.estimatedSize) - (a.priority / a.estimatedSize));
    
    const optimizedTasks: PrefetchTask[] = [];
    let totalSize = 0;
    let totalTime = 0;
    
    for (const task of tasks) {
      if (
        totalSize + task.estimatedSize <= this.PREFETCH_BUDGET_MB * 1024 * 1024 &&
        totalTime + task.estimatedTime <= networkCapacity.timeWindow
      ) {
        optimizedTasks.push(task);
        totalSize += task.estimatedSize;
        totalTime += task.estimatedTime;
      }
    }
    
    return {
      tasks: optimizedTasks,
      totalSize,
      totalTime,
      estimatedValue: optimizedTasks.reduce((sum, t) => sum + t.priority, 0)
    };
  }
}
```

## Dynamic Storage Quotas

```typescript
class DynamicStorageManager {
  async requestOptimalQuota(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const availableSpace = estimate.quota - estimate.usage;
      
      // Request reasonable percentage based on available space
      const deviceCategory = this.categorizeDevice(estimate.quota);
      const requestedQuota = this.calculateOptimalQuota(availableSpace, deviceCategory);
      
      // Try to request persistent storage for critical content
      if ('persist' in navigator.storage) {
        const persistent = await navigator.storage.persist();
        if (persistent) {
          return requestedQuota * 1.5; // Can be more aggressive with persistent storage
        }
      }
      
      return requestedQuota;
    }
    
    // Fallback for older browsers
    return this.getFallbackQuota();
  }
  
  private categorizeDevice(totalQuota: number): DeviceCategory {
    const quotaGB = totalQuota / (1024 * 1024 * 1024);
    
    if (quotaGB >= 50) return 'high-end';      // >50GB available
    if (quotaGB >= 20) return 'mid-range';     // 20-50GB
    if (quotaGB >= 5) return 'budget';         // 5-20GB
    return 'low-end';                          // <5GB
  }
  
  private calculateOptimalQuota(available: number, category: DeviceCategory): number {
    const percentages = {
      'high-end': 0.05,    // 5% of available space
      'mid-range': 0.08,   // 8% of available space
      'budget': 0.15,      // 15% of available space
      'low-end': 0.25      // 25% of available space (more aggressive on limited devices)
    };
    
    return Math.min(
      available * percentages[category],
      1024 * 1024 * 1024 // Never request more than 1GB
    );
  }
}
```

## Cache Health Monitoring

```typescript
class CacheHealthMonitor {
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  startMonitoring(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }
  
  private async performHealthCheck(): Promise<CacheHealthReport> {
    const cacheStats = await this.getCacheStatistics();
    const storageUsage = await this.getStorageUsage();
    const hitRates = await this.getHitRates();
    
    const health: CacheHealthReport = {
      timestamp: Date.now(),
      storageUsage: {
        used: storageUsage.used,
        quota: storageUsage.quota,
        percentage: (storageUsage.used / storageUsage.quota) * 100
      },
      hitRates: {
        overall: hitRates.overall,
        audio: hitRates.audio,
        text: hitRates.text
      },
      evictionRate: cacheStats.evictionsLastHour / cacheStats.accessesLastHour,
      fragmentationRatio: this.calculateFragmentation(cacheStats),
      recommendations: []
    };
    
    // Generate recommendations based on health metrics
    if (health.storageUsage.percentage > 90) {
      health.recommendations.push('Increase eviction aggressiveness');
    }
    
    if (health.hitRates.overall < 0.7) {
      health.recommendations.push('Adjust prefetch strategy');
    }
    
    if (health.evictionRate > 0.3) {
      health.recommendations.push('Increase cache size allocation');
    }
    
    // Log health report for analytics
    await this.logHealthReport(health);
    
    return health;
  }
  
  private calculateFragmentation(stats: CacheStatistics): number {
    // Measure how efficiently cache space is being used
    const theoreticalOptimal = stats.totalItems * stats.averageItemSize;
    const actualUsage = stats.totalSizeUsed;
    
    return actualUsage / theoreticalOptimal;
  }
}
```

## Implementation Schedule

### Week 1: Foundation
- [ ] Implement basic cache size allocation
- [ ] Create eviction scoring algorithm
- [ ] Add cache health monitoring

### Week 2: Intelligence
- [ ] Build smart prefetch manager
- [ ] Implement dynamic storage quotas
- [ ] Add predictive analytics

### Week 3: Optimization
- [ ] Fine-tune eviction parameters
- [ ] Optimize prefetch algorithms
- [ ] Add cache defragmentation

### Week 4: Monitoring & Analytics
- [ ] Deploy health monitoring
- [ ] Add performance metrics
- [ ] Create cache analytics dashboard

## Success Metrics

### Cache Performance KPIs
- **Hit Rate**: >80% for active content
- **Storage Efficiency**: >70% of allocated space used effectively
- **Eviction Accuracy**: <10% of evicted content re-requested within 24h
- **Prefetch Accuracy**: >60% of prefetched content consumed within 7 days

### User Experience Metrics
- **Time to Audio**: <2s for cached content
- **Storage Usage**: Never exceed user-configured limits
- **Battery Impact**: <3% additional drain from cache management
- **Network Savings**: >50% reduction in repeated downloads

This comprehensive cache management strategy ensures optimal storage utilization while maintaining the premium audio experience users expect from BookBridge, even on constrained networks and devices.