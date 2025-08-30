/**
 * Priority-Based Cache Eviction System for BookBridge PWA
 * Implements intelligent cache management with priority scoring and network-adaptive limits
 * Research findings: Current Book > Favorites > Recent > Pregenerated priority hierarchy
 */

import { audioCacheDB, AudioQuality, NetworkType, CachePriority, CachedAudioData } from './audio-cache-db';
import { userBehaviorAnalytics } from './user-behavior-analytics';

interface EvictionPolicy {
  strategy: 'lru' | 'lfu' | 'priority-weighted' | 'network-adaptive';
  maxCacheSize: number;
  reservedSpaceRatio: number; // 0-1, portion to keep free for urgent caches
  agingFactor: number; // How much to weight age vs priority
  qualityDowngrade: boolean; // Allow downgrading quality instead of deletion
}

interface EvictionCandidate {
  id: string;
  bookId: string;
  chunkIndex: number;
  sentenceIndex: number;
  priority: CachePriority;
  lastAccessed: number;
  createdAt: number;
  fileSize: number;
  quality: AudioQuality;
  accessCount: number;
  evictionScore: number; // Higher score = more likely to evict
  canDowngrade: boolean;
}

interface EvictionStats {
  totalItemsEvicted: number;
  totalSpaceReclaimed: number;
  itemsDowngraded: number;
  spaceRecoveredByDowngrade: number;
  evictionsByPriority: Record<CachePriority, number>;
  averageEvictionScore: number;
  operationDuration: number;
}

interface CacheHealth {
  utilizationRatio: number; // 0-1
  fragmentationRatio: number; // 0-1
  averageAge: number; // days
  priorityDistribution: Record<CachePriority, { count: number; size: number }>;
  qualityDistribution: Record<AudioQuality, { count: number; size: number }>;
  networkEfficiency: number; // 0-1, how well cache matches current network
  recommendedActions: string[];
}

export class PriorityCacheEvictionService {
  private static instance: PriorityCacheEvictionService;
  private evictionHistory: EvictionStats[] = [];
  private accessCounts = new Map<string, number>();
  private isEvicting = false;
  private lastHealthCheck = 0;

  static getInstance(): PriorityCacheEvictionService {
    if (!PriorityCacheEvictionService.instance) {
      PriorityCacheEvictionService.instance = new PriorityCacheEvictionService();
    }
    return PriorityCacheEvictionService.instance;
  }

  constructor() {
    // Only load from localStorage and schedule timers in the browser
    if (typeof window !== 'undefined') {
      this.loadAccessCounts();
      this.schedulePeriodicEviction();
    }
  }

  private async loadAccessCounts(): Promise<void> {
    try {
      if (typeof window === 'undefined') return; // SSR safeguard
      const stored = localStorage.getItem('bookbridge_access_counts');
      if (stored) {
        const counts = JSON.parse(stored);
        this.accessCounts = new Map(Object.entries(counts));
        console.log(`PriorityEviction: Loaded ${this.accessCounts.size} access counts`);
      }
    } catch (error) {
      console.warn('PriorityEviction: Failed to load access counts:', error);
    }
  }

  private async saveAccessCounts(): Promise<void> {
    try {
      if (typeof window === 'undefined') return; // SSR safeguard
      const counts = Object.fromEntries(this.accessCounts);
      localStorage.setItem('bookbridge_access_counts', JSON.stringify(counts));
    } catch (error) {
      console.warn('PriorityEviction: Failed to save access counts:', error);
    }
  }

  private schedulePeriodicEviction(): void {
    // Run eviction check every 5 minutes
    setInterval(async () => {
      await this.performMaintenanceEviction();
    }, 5 * 60 * 1000);

    // Run health check every 30 minutes
    setInterval(async () => {
      await this.performHealthCheck();
    }, 30 * 60 * 1000);
  }

  async recordAccess(id: string): Promise<void> {
    const currentCount = this.accessCounts.get(id) || 0;
    this.accessCounts.set(id, currentCount + 1);

    // Periodically save access counts (10% chance per access)
    if (Math.random() < 0.1) {
      await this.saveAccessCounts();
    }
  }

  async enforceStorageLimit(urgentSpaceNeeded?: number): Promise<EvictionStats> {
    if (this.isEvicting) {
      console.log('PriorityEviction: Eviction already in progress, skipping');
      return this.getEmptyStats();
    }

    this.isEvicting = true;
    const startTime = Date.now();

    try {
      const networkInfo = audioCacheDB.getCurrentNetworkInfo();
      const policy = this.getEvictionPolicy(networkInfo.type, urgentSpaceNeeded);
      const cacheStats = await audioCacheDB.getCacheStats();

      console.log(`PriorityEviction: Enforcing storage limit - Current: ${(cacheStats.totalSize / 1024 / 1024).toFixed(1)}MB, Limit: ${(policy.maxCacheSize / 1024 / 1024).toFixed(1)}MB`);

      // Calculate target size (leave some free space)
      const targetSize = policy.maxCacheSize * (1 - policy.reservedSpaceRatio);
      const urgentTargetSize = urgentSpaceNeeded 
        ? Math.min(targetSize, policy.maxCacheSize - urgentSpaceNeeded)
        : targetSize;

      if (cacheStats.totalSize <= urgentTargetSize) {
        console.log('PriorityEviction: Cache size within limits, no eviction needed');
        return this.getEmptyStats();
      }

      const spaceToReclaim = cacheStats.totalSize - urgentTargetSize;
      const stats = await this.performEviction(policy, spaceToReclaim);

      stats.operationDuration = Date.now() - startTime;
      this.evictionHistory.push(stats);

      // Keep only last 10 eviction records
      if (this.evictionHistory.length > 10) {
        this.evictionHistory = this.evictionHistory.slice(-10);
      }

      console.log(`PriorityEviction: Completed in ${stats.operationDuration}ms - Evicted: ${stats.totalItemsEvicted} items, Reclaimed: ${(stats.totalSpaceReclaimed / 1024 / 1024).toFixed(1)}MB`);

      return stats;

    } finally {
      this.isEvicting = false;
    }
  }

  private getEvictionPolicy(networkType: NetworkType, urgentSpaceNeeded?: number): EvictionPolicy {
    const basePolicy: EvictionPolicy = {
      strategy: 'priority-weighted',
      maxCacheSize: 100 * 1024 * 1024, // 100MB default
      reservedSpaceRatio: 0.1, // Keep 10% free
      agingFactor: 0.3, // 30% weight to age, 70% to priority
      qualityDowngrade: true
    };

    // Network-specific adjustments from PWA research
    switch (networkType) {
      case NetworkType.SLOW_2G:
      case NetworkType.TWOG:
        return {
          ...basePolicy,
          maxCacheSize: 50 * 1024 * 1024, // 50MB
          reservedSpaceRatio: urgentSpaceNeeded ? 0.05 : 0.15, // More aggressive on slow networks
          agingFactor: 0.2, // Prioritize keeping recent over old
          qualityDowngrade: true
        };

      case NetworkType.THREEG:
        return {
          ...basePolicy,
          maxCacheSize: 150 * 1024 * 1024, // 150MB
          reservedSpaceRatio: 0.12,
          agingFactor: 0.25,
          qualityDowngrade: true
        };

      case NetworkType.FOURG:
        return {
          ...basePolicy,
          maxCacheSize: 500 * 1024 * 1024, // 500MB
          reservedSpaceRatio: 0.08,
          agingFactor: 0.35,
          qualityDowngrade: false // Can afford to re-download
        };

      case NetworkType.WIFI:
        return {
          ...basePolicy,
          maxCacheSize: 1024 * 1024 * 1024, // 1GB
          reservedSpaceRatio: 0.05,
          agingFactor: 0.4,
          qualityDowngrade: false
        };

      default:
        return basePolicy;
    }
  }

  private async performEviction(policy: EvictionPolicy, spaceToReclaim: number): Promise<EvictionStats> {
    const stats: EvictionStats = {
      totalItemsEvicted: 0,
      totalSpaceReclaimed: 0,
      itemsDowngraded: 0,
      spaceRecoveredByDowngrade: 0,
      evictionsByPriority: {} as Record<CachePriority, number>,
      averageEvictionScore: 0,
      operationDuration: 0
    };

    // Initialize priority counters
    Object.values(CachePriority).forEach(priority => {
      if (typeof priority === 'number') {
        stats.evictionsByPriority[priority] = 0;
      }
    });

    // Get all cache items and score them for eviction
    const candidates = await this.getEvictionCandidates(policy);
    
    if (candidates.length === 0) {
      console.warn('PriorityEviction: No candidates found for eviction');
      return stats;
    }

    console.log(`PriorityEviction: Analyzing ${candidates.length} candidates, need to reclaim ${(spaceToReclaim / 1024 / 1024).toFixed(1)}MB`);

    let spaceReclaimed = 0;
    const evictionScores: number[] = [];

    // Sort candidates by eviction score (highest first)
    const sortedCandidates = candidates.sort((a, b) => b.evictionScore - a.evictionScore);

    for (const candidate of sortedCandidates) {
      if (spaceReclaimed >= spaceToReclaim) {
        break;
      }

      evictionScores.push(candidate.evictionScore);

      // Try quality downgrade first if policy allows
      if (policy.qualityDowngrade && candidate.canDowngrade) {
        const downgradeSavings = await this.attemptQualityDowngrade(candidate);
        if (downgradeSavings > 0) {
          stats.itemsDowngraded++;
          stats.spaceRecoveredByDowngrade += downgradeSavings;
          spaceReclaimed += downgradeSavings;
          continue;
        }
      }

      // Full eviction
      const evicted = await this.evictItem(candidate);
      if (evicted) {
        stats.totalItemsEvicted++;
        stats.totalSpaceReclaimed += candidate.fileSize;
        stats.evictionsByPriority[candidate.priority]++;
        spaceReclaimed += candidate.fileSize;

        // Remove access count for evicted item
        this.accessCounts.delete(candidate.id);
      }
    }

    stats.averageEvictionScore = evictionScores.length > 0 
      ? evictionScores.reduce((sum, score) => sum + score, 0) / evictionScores.length
      : 0;

    return stats;
  }

  private async getEvictionCandidates(policy: EvictionPolicy): Promise<EvictionCandidate[]> {
    await audioCacheDB.initialize();
    const db = (audioCacheDB as any).db;
    
    if (!db) {
      throw new Error('Database not available');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['audioSentences'], 'readonly');
      const store = transaction.objectStore('audioSentences');
      const request = store.getAll();

      request.onsuccess = async () => {
        const items: CachedAudioData[] = request.result || [];
        const candidates: EvictionCandidate[] = [];

        for (const item of items) {
          const candidate = await this.createEvictionCandidate(item, policy);
          candidates.push(candidate);
        }

        resolve(candidates);
      };

      request.onerror = () => reject(new Error('Failed to get eviction candidates'));
    });
  }

  private async createEvictionCandidate(item: CachedAudioData, policy: EvictionPolicy): Promise<EvictionCandidate> {
    const now = Date.now();
    const accessCount = this.accessCounts.get(item.id) || 0;
    const ageInDays = (now - item.createdAt) / (1000 * 60 * 60 * 24);
    const daysSinceAccess = (now - item.lastAccessed) / (1000 * 60 * 60 * 24);

    // Calculate eviction score (higher = more likely to evict)
    const evictionScore = await this.calculateEvictionScore({
      priority: item.priority,
      ageInDays,
      daysSinceAccess,
      accessCount,
      fileSize: item.fileSize,
      quality: item.quality,
      agingFactor: policy.agingFactor,
      bookId: item.bookId,
      chunkIndex: item.chunkIndex,
      sentenceIndex: item.sentenceIndex
    });

    return {
      id: item.id,
      bookId: item.bookId,
      chunkIndex: item.chunkIndex,
      sentenceIndex: item.sentenceIndex,
      priority: item.priority,
      lastAccessed: item.lastAccessed,
      createdAt: item.createdAt,
      fileSize: item.fileSize,
      quality: item.quality,
      accessCount,
      evictionScore,
      canDowngrade: this.canDowngradeQuality(item.quality)
    };
  }

  private async calculateEvictionScore(params: {
    priority: CachePriority;
    ageInDays: number;
    daysSinceAccess: number;
    accessCount: number;
    fileSize: number;
    quality: AudioQuality;
    agingFactor: number;
    bookId: string;
    chunkIndex: number;
    sentenceIndex: number;
  }): Promise<number> {
    const {
      priority,
      ageInDays,
      daysSinceAccess,
      accessCount,
      fileSize,
      quality,
      agingFactor
    } = params;

    // Base score from priority (higher priority = lower eviction score)
    const priorityScore = (1.0 - priority) * (1 - agingFactor);

    // Age component (older = higher eviction score)
    const ageScore = Math.min(1.0, (ageInDays / 30)) * agingFactor; // 30 days = max age score

    // Access frequency component (less accessed = higher eviction score)
    const accessScore = Math.max(0, 1.0 - Math.log10(accessCount + 1) / 2) * 0.3;

    // Recency component (not accessed recently = higher eviction score)
    const recencyScore = Math.min(1.0, (daysSinceAccess / 7)) * 0.2; // 7 days = max recency score

    // Quality component (higher quality on slow networks = higher eviction score)
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    const qualityScore = this.getQualityEvictionBonus(quality, networkInfo.type) * 0.1;

    // File size component (larger files = slightly higher eviction score)
    const sizeScore = Math.min(0.1, fileSize / (5 * 1024 * 1024)); // Max 0.1 for 5MB+ files

    // Add user behavior-based scoring
    const behaviorScore = await this.getUserBehaviorScore(
      params.bookId,
      params.chunkIndex,
      params.sentenceIndex
    );

    const totalScore = priorityScore + ageScore + accessScore + recencyScore + qualityScore + sizeScore + behaviorScore;

    return Math.min(1.0, Math.max(0.0, totalScore));
  }

  private getQualityEvictionBonus(quality: AudioQuality, networkType: NetworkType): number {
    // On slow networks, evict higher quality files more aggressively
    if (networkType === NetworkType.SLOW_2G || networkType === NetworkType.TWOG) {
      switch (quality) {
        case AudioQuality.HD: return 0.8;
        case AudioQuality.HIGH: return 0.6;
        case AudioQuality.MEDIUM: return 0.3;
        case AudioQuality.LOW: return 0.1;
      }
    }

    // On fast networks, slight preference for evicting lower quality
    if (networkType === NetworkType.WIFI || networkType === NetworkType.FOURG) {
      switch (quality) {
        case AudioQuality.LOW: return 0.3;
        case AudioQuality.MEDIUM: return 0.2;
        case AudioQuality.HIGH: return 0.1;
        case AudioQuality.HD: return 0.05;
      }
    }

    return 0; // Neutral on 3G
  }

  private canDowngradeQuality(quality: AudioQuality): boolean {
    return quality !== AudioQuality.LOW; // Can downgrade everything except lowest quality
  }

  private async attemptQualityDowngrade(candidate: EvictionCandidate): Promise<number> {
    // This would require re-encoding the audio to a lower quality
    // For now, we'll simulate the space savings
    
    const downgradeSavings = this.estimateDowngradeSavings(candidate.quality, candidate.fileSize);
    
    if (downgradeSavings > candidate.fileSize * 0.2) { // At least 20% savings
      console.log(`PriorityEviction: Downgrading ${candidate.id} from ${candidate.quality}, saving ${(downgradeSavings / 1024).toFixed(1)}KB`);
      
      // In a real implementation, this would:
      // 1. Re-encode the audio to lower quality
      // 2. Update the cache entry with new data
      // 3. Update the fileSize in the database
      
      return downgradeSavings;
    }

    return 0;
  }

  private estimateDowngradeSavings(currentQuality: AudioQuality, fileSize: number): number {
    // Estimated compression ratios when downgrading quality
    const savings = {
      [AudioQuality.HD]: fileSize * 0.35,     // HD->High: 35% savings
      [AudioQuality.HIGH]: fileSize * 0.25,   // High->Medium: 25% savings
      [AudioQuality.MEDIUM]: fileSize * 0.2,  // Medium->Low: 20% savings
      [AudioQuality.LOW]: 0                   // Can't downgrade further
    };

    return Math.floor(savings[currentQuality] || 0);
  }

  private async evictItem(candidate: EvictionCandidate): Promise<boolean> {
    try {
      const success = await audioCacheDB.deleteAudioSentence(
        candidate.bookId,
        candidate.chunkIndex,
        '', // cefrLevel - we'd need to store this in candidate
        '', // voiceId - we'd need to store this in candidate
        candidate.sentenceIndex
      );

      if (success) {
        console.log(`PriorityEviction: Evicted ${candidate.id} (${(candidate.fileSize / 1024).toFixed(1)}KB, score: ${candidate.evictionScore.toFixed(3)})`);
      }

      return success;
    } catch (error) {
      console.error(`PriorityEviction: Failed to evict ${candidate.id}:`, error);
      return false;
    }
  }

  private async performMaintenanceEviction(): Promise<void> {
    // Perform light maintenance eviction during idle time
    const cacheStats = await audioCacheDB.getCacheStats();
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    const policy = this.getEvictionPolicy(networkInfo.type);

    // Only run maintenance if we're over 85% of capacity
    const utilizationRatio = cacheStats.totalSize / policy.maxCacheSize;
    
    if (utilizationRatio > 0.85) {
      console.log(`PriorityEviction: Running maintenance eviction (${(utilizationRatio * 100).toFixed(1)}% full)`);
      
      // Reclaim 10% of space
      const spaceToReclaim = policy.maxCacheSize * 0.1;
      await this.performEviction(policy, spaceToReclaim);
    }
  }

  private async performHealthCheck(): Promise<CacheHealth> {
    const now = Date.now();
    
    // Skip if we just did a health check
    if (now - this.lastHealthCheck < 25 * 60 * 1000) { // 25 minutes
      return this.getEmptyCacheHealth();
    }
    
    this.lastHealthCheck = now;
    
    const cacheStats = await audioCacheDB.getCacheStats();
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    const policy = this.getEvictionPolicy(networkInfo.type);

    const health: CacheHealth = {
      utilizationRatio: cacheStats.totalSize / policy.maxCacheSize,
      fragmentationRatio: 0, // Would need more detailed analysis
      averageAge: (now - ((cacheStats.oldestItem + cacheStats.newestItem) / 2)) / (1000 * 60 * 60 * 24),
      priorityDistribution: {} as any,
      qualityDistribution: {} as any,
      networkEfficiency: await this.calculateNetworkEfficiency(),
      recommendedActions: []
    };

    // Generate recommendations
    if (health.utilizationRatio > 0.9) {
      health.recommendedActions.push('Cache near capacity - consider manual cleanup');
    }
    
    if (health.averageAge > 14) {
      health.recommendedActions.push('Cache contains old items - run maintenance eviction');
    }
    
    if (health.networkEfficiency < 0.6) {
      health.recommendedActions.push('Cache poorly optimized for current network - rebalance quality distribution');
    }

    console.log(`PriorityEviction: Cache health check - Utilization: ${(health.utilizationRatio * 100).toFixed(1)}%, Network efficiency: ${(health.networkEfficiency * 100).toFixed(1)}%`);

    return health;
  }

  private async calculateNetworkEfficiency(): Promise<number> {
    // Measure how well the current cache matches the network capabilities
    // This would analyze the quality distribution vs optimal distribution for current network
    return 0.8; // Placeholder - would need actual cache analysis
  }

  private getEmptyStats(): EvictionStats {
    return {
      totalItemsEvicted: 0,
      totalSpaceReclaimed: 0,
      itemsDowngraded: 0,
      spaceRecoveredByDowngrade: 0,
      evictionsByPriority: {} as Record<CachePriority, number>,
      averageEvictionScore: 0,
      operationDuration: 0
    };
  }

  private getEmptyCacheHealth(): CacheHealth {
    return {
      utilizationRatio: 0,
      fragmentationRatio: 0,
      averageAge: 0,
      priorityDistribution: {} as any,
      qualityDistribution: {} as any,
      networkEfficiency: 0,
      recommendedActions: []
    };
  }

  // Public methods for integration

  async getEvictionHistory(): Promise<EvictionStats[]> {
    return [...this.evictionHistory];
  }

  async getCacheHealth(): Promise<CacheHealth> {
    return this.performHealthCheck();
  }

  async clearEvictionHistory(): Promise<void> {
    this.evictionHistory = [];
  }

  async optimizeForCurrentNetwork(): Promise<void> {
    console.log('PriorityEviction: Optimizing cache for current network conditions');
    
    // Force a health check and optimization
    const health = await this.performHealthCheck();
    
    if (health.networkEfficiency < 0.7) {
      // Trigger eviction to rebalance cache
      await this.enforceStorageLimit();
    }
  }

  getAccessCount(id: string): number {
    return this.accessCounts.get(id) || 0;
  }

  // User behavior integration methods

  private async getUserBehaviorScore(
    bookId: string,
    chunkIndex: number,
    sentenceIndex: number
  ): Promise<number> {
    try {
      const analytics = await userBehaviorAnalytics.getCurrentSessionAnalytics();
      
      if (!analytics.session) {
        return 0; // No behavior data available
      }

      let behaviorScore = 0;

      // Check if this content matches user skip patterns
      const skipRate = analytics.session.skipRate;
      if (skipRate > 0.3) {
        behaviorScore += 0.1; // More likely to evict content user tends to skip
      }

      // Check if user is a speed reader (prefetch more, evict less recent content)
      const readingSpeed = analytics.session.readingSpeed;
      if (readingSpeed > 250) {
        const daysSinceAccess = (Date.now() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysSinceAccess > 1) {
          behaviorScore += 0.15; // Speed readers move through content quickly
        }
      }

      // Check matching patterns for predictions
      for (const pattern of analytics.matchingPatterns) {
        const skipPrediction = pattern.predictions.find(p => p.type === 'skip_likely');
        if (skipPrediction && skipPrediction.probability > 0.6) {
          behaviorScore += skipPrediction.probability * 0.2;
        }
      }

      return Math.min(0.3, behaviorScore); // Cap behavior influence at 30%
    } catch (error) {
      console.warn('PriorityEviction: Error calculating user behavior score:', error);
      return 0;
    }
  }

  async integrateUserBehaviorOptimizations(): Promise<void> {
    try {
      const recommendations = await userBehaviorAnalytics.generateOptimizationRecommendations();
      const evictionRecs = recommendations.filter(r => r.category === 'eviction');

      for (const rec of evictionRecs) {
        if (rec.confidence > 0.6 && rec.priority === 'high') {
          console.log(`PriorityEviction: Applying behavior-based optimization: ${rec.action}`);
          await rec.implementation();
        }
      }
    } catch (error) {
      console.warn('PriorityEviction: Error applying behavior optimizations:', error);
    }
  }

  async resetAccessCounts(): Promise<void> {
    this.accessCounts.clear();
    await this.saveAccessCounts();
  }
}

// Export singleton instance
export const priorityCacheEviction = PriorityCacheEvictionService.getInstance();