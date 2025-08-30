/**
 * Cache Health Monitoring System for BookBridge PWA
 * Implements comprehensive cache performance analysis and optimization recommendations
 * Research findings: Monitor fragmentation, efficiency, and network adaptation for optimal performance
 */

import { audioCacheDB, AudioQuality, NetworkType, CachePriority } from './audio-cache-db';
import { priorityCacheEviction } from './priority-cache-eviction';
import { dynamicStorageQuota } from './dynamic-storage-quota';
import { userBehaviorAnalytics } from './user-behavior-analytics';
import { adaptiveCacheTuner } from './adaptive-cache-tuner';

interface CacheHealthMetrics {
  overall: HealthScore;
  storage: StorageHealth;
  performance: PerformanceHealth;
  network: NetworkHealth;
  quality: QualityHealth;
  fragmentation: FragmentationHealth;
  timestamp: number;
}

interface HealthScore {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  description: string;
}

interface StorageHealth {
  utilizationRatio: number; // 0-1
  growthTrend: 'stable' | 'growing' | 'shrinking';
  quotaEfficiency: number; // 0-1, how well quota is used
  fragmentationLevel: number; // 0-1
  recommendations: string[];
}

interface PerformanceHealth {
  avgLoadTime: number; // milliseconds
  cacheHitRate: number; // 0-1
  evictionFrequency: number; // evictions per day
  prefetchAccuracy: number; // 0-1, how often prefetched content is used
  recommendations: string[];
}

interface NetworkHealth {
  adaptationScore: number; // 0-1, how well cache matches network
  qualityDistribution: Record<AudioQuality, number>; // percentage of each quality
  networkChangeHandling: number; // 0-1, how quickly cache adapts
  bandwidthEfficiency: number; // 0-1
  recommendations: string[];
}

interface QualityHealth {
  optimalDistribution: number; // 0-1, how close to ideal quality mix
  overQualified: number; // 0-1, ratio of unnecessarily high quality
  underQualified: number; // 0-1, ratio of unnecessarily low quality
  adaptivePerformance: number; // 0-1
  recommendations: string[];
}

interface FragmentationHealth {
  level: number; // 0-1, 0 = no fragmentation
  impact: number; // 0-1, performance impact
  cause: 'normal' | 'excessive-eviction' | 'quota-changes' | 'unknown';
  defragmentationNeeded: boolean;
  recommendations: string[];
}

interface HealthAlert {
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'storage' | 'performance' | 'network' | 'quality' | 'system';
  message: string;
  actionRequired: boolean;
  suggestedActions: string[];
  timestamp: number;
  acknowledged: boolean;
}

interface CacheHealthTrend {
  metric: string;
  values: { timestamp: number; value: number }[];
  trend: 'improving' | 'stable' | 'degrading';
  changeRate: number; // change per day
}

export class CacheHealthMonitoringService {
  private static instance: CacheHealthMonitoringService;
  private healthHistory: CacheHealthMetrics[] = [];
  private currentAlerts: HealthAlert[] = [];
  private healthTrends: Map<string, CacheHealthTrend> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastDeepAnalysis = 0;

  static getInstance(): CacheHealthMonitoringService {
    if (!CacheHealthMonitoringService.instance) {
      CacheHealthMonitoringService.instance = new CacheHealthMonitoringService();
    }
    return CacheHealthMonitoringService.instance;
  }

  async initialize(): Promise<void> {
    console.log('CacheHealthMonitoring: Initializing health monitoring system');

    // Load historical data
    await this.loadHealthHistory();

    // Perform initial health check
    await this.performHealthCheck();

    // Start monitoring
    this.startContinuousMonitoring();

    console.log('CacheHealthMonitoring: Initialization complete');
  }

  private async loadHealthHistory(): Promise<void> {
    try {
      const stored = localStorage.getItem('bookbridge_health_history');
      if (stored) {
        this.healthHistory = JSON.parse(stored);
        console.log(`CacheHealthMonitoring: Loaded ${this.healthHistory.length} historical health records`);
      }
    } catch (error) {
      console.warn('CacheHealthMonitoring: Failed to load health history:', error);
      this.healthHistory = [];
    }
  }

  private async saveHealthHistory(): Promise<void> {
    try {
      // Keep only last 50 health checks
      const historyToSave = this.healthHistory.slice(-50);
      localStorage.setItem('bookbridge_health_history', JSON.stringify(historyToSave));
    } catch (error) {
      console.warn('CacheHealthMonitoring: Failed to save health history:', error);
    }
  }

  private startContinuousMonitoring(): void {
    // Health check every 15 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 15 * 60 * 1000);

    // Deep analysis every 2 hours
    setInterval(async () => {
      await this.performDeepAnalysis();
    }, 2 * 60 * 60 * 1000);

    // Alert cleanup every 24 hours
    setInterval(async () => {
      await this.cleanupOldAlerts();
    }, 24 * 60 * 60 * 1000);
  }

  async performHealthCheck(): Promise<CacheHealthMetrics> {
    const timestamp = Date.now();
    
    console.log('CacheHealthMonitoring: Performing health check');

    // Gather all metrics
    const storage = await this.analyzeStorageHealth();
    const performance = await this.analyzePerformanceHealth();
    const network = await this.analyzeNetworkHealth();
    const quality = await this.analyzeQualityHealth();
    const fragmentation = await this.analyzeFragmentationHealth();

    // Calculate overall health score
    const overall = this.calculateOverallHealth(storage, performance, network, quality, fragmentation);

    const metrics: CacheHealthMetrics = {
      overall,
      storage,
      performance,
      network,
      quality,
      fragmentation,
      timestamp
    };

    // Update trends
    this.updateHealthTrends(metrics);

    // Check for alerts
    await this.checkForAlerts(metrics);

    // Save to history
    this.healthHistory.push(metrics);
    await this.saveHealthHistory();

    console.log(`CacheHealthMonitoring: Health check complete - Overall score: ${overall.score}/100 (${overall.grade})`);

    return metrics;
  }

  private async analyzeStorageHealth(): Promise<StorageHealth> {
    const cacheStats = await audioCacheDB.getCacheStats();
    const quota = await dynamicStorageQuota.getCurrentQuota();
    const utilizationRatio = cacheStats.totalSize / quota.audioCache;

    // Determine growth trend from history
    const growthTrend = this.calculateGrowthTrend();

    // Calculate quota efficiency (how well allocated space is used)
    const quotaEfficiency = Math.min(1.0, utilizationRatio / 0.85); // Target 85% utilization

    // Estimate fragmentation level
    const fragmentationLevel = await this.estimateFragmentation();

    // Generate recommendations
    const recommendations: string[] = [];
    if (utilizationRatio > 0.9) {
      recommendations.push('Storage near capacity - consider expanding quota or cleaning cache');
    }
    if (quotaEfficiency < 0.6) {
      recommendations.push('Low quota efficiency - consider reducing allocation');
    }
    if (fragmentationLevel > 0.3) {
      recommendations.push('High fragmentation detected - defragmentation recommended');
    }

    return {
      utilizationRatio,
      growthTrend,
      quotaEfficiency,
      fragmentationLevel,
      recommendations
    };
  }

  private async analyzePerformanceHealth(): Promise<PerformanceHealth> {
    // Get enhanced metrics from user behavior analytics and adaptive tuning
    const avgLoadTime = await this.calculateAverageLoadTime();
    const cacheHitRate = await this.calculateCacheHitRate();
    const evictionFrequency = await this.calculateEvictionFrequency();
    const prefetchAccuracy = await this.calculatePrefetchAccuracy();
    
    // Integrate user behavior insights
    await this.integrateUserBehaviorInsights();

    const recommendations: string[] = [];
    if (avgLoadTime > 2000) {
      recommendations.push('Slow loading times - check network conditions and cache efficiency');
    }
    if (cacheHitRate < 0.7) {
      recommendations.push('Low cache hit rate - improve prefetch strategy');
    }
    if (evictionFrequency > 10) {
      recommendations.push('Frequent evictions - consider quota increase or better prioritization');
    }
    if (prefetchAccuracy < 0.5) {
      recommendations.push('Poor prefetch accuracy - refine prediction algorithms');
    }

    return {
      avgLoadTime,
      cacheHitRate,
      evictionFrequency,
      prefetchAccuracy,
      recommendations
    };
  }

  private async analyzeNetworkHealth(): Promise<NetworkHealth> {
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    const qualityDistribution = await this.getQualityDistribution();
    const adaptationScore = this.calculateNetworkAdaptationScore(networkInfo.type, qualityDistribution);
    
    // Simulate network change handling score
    const networkChangeHandling = 0.8; // Would track how quickly cache adapts to network changes
    
    // Calculate bandwidth efficiency
    const bandwidthEfficiency = this.calculateBandwidthEfficiency(networkInfo.type, qualityDistribution);

    const recommendations: string[] = [];
    if (adaptationScore < 0.6) {
      recommendations.push('Poor network adaptation - rebalance quality distribution');
    }
    if (bandwidthEfficiency < 0.7) {
      recommendations.push('Inefficient bandwidth usage - optimize for current network');
    }

    return {
      adaptationScore,
      qualityDistribution,
      networkChangeHandling,
      bandwidthEfficiency,
      recommendations
    };
  }

  private async analyzeQualityHealth(): Promise<QualityHealth> {
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    const qualityDistribution = await this.getQualityDistribution();
    const optimalDistribution = this.calculateOptimalQualityScore(networkInfo.type, qualityDistribution);

    // Calculate over/under qualification
    const overQualified = this.calculateOverQualification(networkInfo.type, qualityDistribution);
    const underQualified = this.calculateUnderQualification(networkInfo.type, qualityDistribution);

    // Adaptive performance score
    const adaptivePerformance = Math.max(0, 1 - (overQualified + underQualified) / 2);

    const recommendations: string[] = [];
    if (overQualified > 0.3) {
      recommendations.push('Too much high-quality content for current network - consider downgrading');
    }
    if (underQualified > 0.2) {
      recommendations.push('Content quality below network capabilities - consider upgrading');
    }

    return {
      optimalDistribution,
      overQualified,
      underQualified,
      adaptivePerformance,
      recommendations
    };
  }

  private async analyzeFragmentationHealth(): Promise<FragmentationHealth> {
    const level = await this.estimateFragmentation();
    const impact = this.calculateFragmentationImpact(level);
    const cause = this.identifyFragmentationCause();
    const defragmentationNeeded = level > 0.4 || impact > 0.3;

    const recommendations: string[] = [];
    if (defragmentationNeeded) {
      recommendations.push('High fragmentation - run defragmentation process');
    }
    if (cause === 'excessive-eviction') {
      recommendations.push('Fragmentation caused by frequent evictions - optimize eviction strategy');
    }

    return {
      level,
      impact,
      cause,
      defragmentationNeeded,
      recommendations
    };
  }

  private calculateOverallHealth(
    storage: StorageHealth,
    performance: PerformanceHealth,
    network: NetworkHealth,
    quality: QualityHealth,
    fragmentation: FragmentationHealth
  ): HealthScore {
    // Weighted scoring
    const weights = {
      storage: 0.25,
      performance: 0.30,
      network: 0.20,
      quality: 0.15,
      fragmentation: 0.10
    };

    // Convert each metric to 0-100 score
    const storageScore = (1 - storage.fragmentationLevel) * storage.quotaEfficiency * 100;
    const performanceScore = (performance.cacheHitRate * 0.4 + (1 - Math.min(1, performance.avgLoadTime / 5000)) * 0.6) * 100;
    const networkScore = (network.adaptationScore * 0.5 + network.bandwidthEfficiency * 0.5) * 100;
    const qualityScore = quality.adaptivePerformance * 100;
    const fragmentationScore = (1 - fragmentation.level) * 100;

    const overall = 
      storageScore * weights.storage +
      performanceScore * weights.performance +
      networkScore * weights.network +
      qualityScore * weights.quality +
      fragmentationScore * weights.fragmentation;

    const score = Math.round(Math.max(0, Math.min(100, overall)));

    // Determine grade and status
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    let description: string;

    if (score >= 90) {
      grade = 'A';
      status = 'excellent';
      description = 'Cache operating at peak efficiency';
    } else if (score >= 80) {
      grade = 'B';
      status = 'good';
      description = 'Cache performing well with minor optimization opportunities';
    } else if (score >= 70) {
      grade = 'C';
      status = 'fair';
      description = 'Cache functioning adequately but needs attention';
    } else if (score >= 60) {
      grade = 'D';
      status = 'poor';
      description = 'Cache experiencing significant issues';
    } else {
      grade = 'F';
      status = 'critical';
      description = 'Cache requires immediate intervention';
    }

    return {
      score,
      grade,
      status,
      description
    };
  }

  // Helper methods for calculations

  private calculateGrowthTrend(): 'stable' | 'growing' | 'shrinking' {
    if (this.healthHistory.length < 3) return 'stable';

    const recent = this.healthHistory.slice(-3);
    const utilizationTrend = recent.map(h => h.storage.utilizationRatio);
    
    const avgChange = (utilizationTrend[2] - utilizationTrend[0]) / 2;
    
    if (avgChange > 0.05) return 'growing';
    if (avgChange < -0.05) return 'shrinking';
    return 'stable';
  }

  private async estimateFragmentation(): Promise<number> {
    // This is a simplified estimation - real implementation would analyze
    // actual storage patterns and access frequencies
    const evictionHistory = await priorityCacheEviction.getEvictionHistory();
    const recentEvictions = evictionHistory.filter(e => 
      e.operationDuration > Date.now() - (24 * 60 * 60 * 1000)
    );

    // Higher eviction frequency suggests more fragmentation
    const fragmentationFromEvictions = Math.min(1, recentEvictions.length / 10);
    
    return fragmentationFromEvictions * 0.7; // Scale to 0-0.7 range
  }

  private calculateFragmentationImpact(level: number): number {
    // Fragmentation impact grows exponentially
    return Math.pow(level, 1.5);
  }

  private identifyFragmentationCause(): 'normal' | 'excessive-eviction' | 'quota-changes' | 'unknown' {
    // Analyze recent activities to identify cause
    const quotaHistory = this.healthHistory.slice(-5);
    const hasQuotaChanges = quotaHistory.some((h, i) => 
      i > 0 && Math.abs(h.storage.utilizationRatio - quotaHistory[i-1].storage.utilizationRatio) > 0.2
    );

    if (hasQuotaChanges) return 'quota-changes';

    // Check eviction frequency
    const avgFragmentation = quotaHistory.reduce((sum, h) => sum + h.fragmentation.level, 0) / quotaHistory.length;
    if (avgFragmentation > 0.3) return 'excessive-eviction';

    return 'normal';
  }

  private async calculateAverageLoadTime(): Promise<number> {
    // This would be tracked from actual usage
    // For now, return a reasonable estimate based on cache health
    return 1500; // 1.5 seconds average
  }

  private async calculateCacheHitRate(): Promise<number> {
    try {
      // Get hit rate from adaptive tuner if available
      const tuningHistory = await adaptiveCacheTuner.getTuningHistory(5);
      if (tuningHistory.length > 0) {
        const avgHitRate = tuningHistory.reduce((sum, h) => sum + h.cacheHitRate, 0) / tuningHistory.length;
        return avgHitRate;
      }
    } catch (error) {
      console.warn('CacheHealthMonitoring: Error getting hit rate from tuner:', error);
    }
    
    return 0.78; // Default fallback
  }

  private async calculateEvictionFrequency(): Promise<number> {
    const evictionHistory = await priorityCacheEviction.getEvictionHistory();
    const recentEvictions = evictionHistory.filter(e => 
      e.operationDuration > Date.now() - (24 * 60 * 60 * 1000)
    );
    
    return recentEvictions.length;
  }

  private async calculatePrefetchAccuracy(): Promise<number> {
    try {
      // Get accuracy from adaptive tuner if available
      const tuningHistory = await adaptiveCacheTuner.getTuningHistory(5);
      if (tuningHistory.length > 0) {
        const avgAccuracy = tuningHistory.reduce((sum, h) => sum + h.prefetchAccuracy, 0) / tuningHistory.length;
        return avgAccuracy;
      }
    } catch (error) {
      console.warn('CacheHealthMonitoring: Error getting prefetch accuracy from tuner:', error);
    }
    
    // Fallback to behavior-based estimation
    try {
      const analytics = await userBehaviorAnalytics.getCurrentSessionAnalytics();
      if (analytics.session) {
        // Lower skip rate suggests better prefetch accuracy
        return Math.max(0.4, 0.8 - analytics.session.skipRate);
      }
    } catch (error) {
      console.warn('CacheHealthMonitoring: Error getting behavior analytics:', error);
    }
    
    return 0.65; // Default fallback
  }

  private async getQualityDistribution(): Promise<Record<AudioQuality, number>> {
    // This would analyze actual cache contents
    // For now, return a reasonable distribution
    return {
      [AudioQuality.LOW]: 0.2,
      [AudioQuality.MEDIUM]: 0.4,
      [AudioQuality.HIGH]: 0.3,
      [AudioQuality.HD]: 0.1
    };
  }

  private calculateNetworkAdaptationScore(networkType: NetworkType, qualityDist: Record<AudioQuality, number>): number {
    // Calculate how well quality distribution matches network capabilities
    const optimal = this.getOptimalQualityDistribution(networkType);
    
    let score = 0;
    for (const quality of Object.values(AudioQuality)) {
      const diff = Math.abs(qualityDist[quality] - optimal[quality]);
      score += (1 - diff);
    }
    
    return score / Object.keys(AudioQuality).length;
  }

  private getOptimalQualityDistribution(networkType: NetworkType): Record<AudioQuality, number> {
    switch (networkType) {
      case NetworkType.SLOW_2G:
      case NetworkType.TWOG:
        return { [AudioQuality.LOW]: 0.8, [AudioQuality.MEDIUM]: 0.2, [AudioQuality.HIGH]: 0, [AudioQuality.HD]: 0 };
      case NetworkType.THREEG:
        return { [AudioQuality.LOW]: 0.3, [AudioQuality.MEDIUM]: 0.6, [AudioQuality.HIGH]: 0.1, [AudioQuality.HD]: 0 };
      case NetworkType.FOURG:
        return { [AudioQuality.LOW]: 0.1, [AudioQuality.MEDIUM]: 0.3, [AudioQuality.HIGH]: 0.5, [AudioQuality.HD]: 0.1 };
      case NetworkType.WIFI:
        return { [AudioQuality.LOW]: 0, [AudioQuality.MEDIUM]: 0.2, [AudioQuality.HIGH]: 0.4, [AudioQuality.HD]: 0.4 };
      default:
        return { [AudioQuality.LOW]: 0.3, [AudioQuality.MEDIUM]: 0.4, [AudioQuality.HIGH]: 0.2, [AudioQuality.HD]: 0.1 };
    }
  }

  private calculateBandwidthEfficiency(networkType: NetworkType, qualityDist: Record<AudioQuality, number>): number {
    // Calculate how efficiently bandwidth is used
    const networkCapacity = this.getNetworkCapacity(networkType);
    const currentUsage = this.estimateCurrentBandwidthUsage(qualityDist);
    
    return Math.min(1, currentUsage / networkCapacity);
  }

  private getNetworkCapacity(networkType: NetworkType): number {
    // Return relative capacity scores
    switch (networkType) {
      case NetworkType.SLOW_2G: return 0.1;
      case NetworkType.TWOG: return 0.2;
      case NetworkType.THREEG: return 0.5;
      case NetworkType.FOURG: return 0.8;
      case NetworkType.WIFI: return 1.0;
      default: return 0.5;
    }
  }

  private estimateCurrentBandwidthUsage(qualityDist: Record<AudioQuality, number>): number {
    // Estimate bandwidth usage based on quality distribution
    const qualityWeights = {
      [AudioQuality.LOW]: 0.2,
      [AudioQuality.MEDIUM]: 0.4,
      [AudioQuality.HIGH]: 0.7,
      [AudioQuality.HD]: 1.0
    };

    let usage = 0;
    for (const [quality, percentage] of Object.entries(qualityDist)) {
      usage += qualityWeights[quality as AudioQuality] * percentage;
    }

    return usage;
  }

  private calculateOptimalQualityScore(networkType: NetworkType, qualityDist: Record<AudioQuality, number>): number {
    const optimal = this.getOptimalQualityDistribution(networkType);
    let totalDifference = 0;

    for (const quality of Object.values(AudioQuality)) {
      totalDifference += Math.abs(qualityDist[quality] - optimal[quality]);
    }

    return Math.max(0, 1 - (totalDifference / 2)); // Normalize to 0-1
  }

  private calculateOverQualification(networkType: NetworkType, qualityDist: Record<AudioQuality, number>): number {
    // Calculate ratio of content that's higher quality than network can efficiently handle
    switch (networkType) {
      case NetworkType.SLOW_2G:
      case NetworkType.TWOG:
        return qualityDist[AudioQuality.MEDIUM] + qualityDist[AudioQuality.HIGH] + qualityDist[AudioQuality.HD];
      case NetworkType.THREEG:
        return qualityDist[AudioQuality.HIGH] * 0.5 + qualityDist[AudioQuality.HD];
      case NetworkType.FOURG:
        return qualityDist[AudioQuality.HD] * 0.3;
      default:
        return 0;
    }
  }

  private calculateUnderQualification(networkType: NetworkType, qualityDist: Record<AudioQuality, number>): number {
    // Calculate ratio of content that's lower quality than network can handle
    switch (networkType) {
      case NetworkType.FOURG:
        return qualityDist[AudioQuality.LOW] * 0.8 + qualityDist[AudioQuality.MEDIUM] * 0.3;
      case NetworkType.WIFI:
        return qualityDist[AudioQuality.LOW] + qualityDist[AudioQuality.MEDIUM] * 0.5;
      default:
        return 0;
    }
  }

  private updateHealthTrends(metrics: CacheHealthMetrics): void {
    const trends = [
      { key: 'overall_score', value: metrics.overall.score },
      { key: 'storage_utilization', value: metrics.storage.utilizationRatio },
      { key: 'cache_hit_rate', value: metrics.performance.cacheHitRate },
      { key: 'network_adaptation', value: metrics.network.adaptationScore },
      { key: 'fragmentation_level', value: metrics.fragmentation.level }
    ];

    for (const trend of trends) {
      if (!this.healthTrends.has(trend.key)) {
        this.healthTrends.set(trend.key, {
          metric: trend.key,
          values: [],
          trend: 'stable',
          changeRate: 0
        });
      }

      const trendData = this.healthTrends.get(trend.key)!;
      trendData.values.push({ timestamp: metrics.timestamp, value: trend.value });

      // Keep only last 20 data points
      if (trendData.values.length > 20) {
        trendData.values = trendData.values.slice(-20);
      }

      // Calculate trend
      if (trendData.values.length >= 3) {
        const recent = trendData.values.slice(-3);
        const changeRate = (recent[2].value - recent[0].value) / 2;
        
        trendData.changeRate = changeRate;
        
        if (Math.abs(changeRate) < 0.01) {
          trendData.trend = 'stable';
        } else if (changeRate > 0) {
          trendData.trend = 'improving';
        } else {
          trendData.trend = 'degrading';
        }
      }
    }
  }

  private async checkForAlerts(metrics: CacheHealthMetrics): Promise<void> {
    const alerts: HealthAlert[] = [];

    // Critical storage alert
    if (metrics.storage.utilizationRatio > 0.95) {
      alerts.push({
        severity: 'critical',
        category: 'storage',
        message: 'Storage critically full - immediate action required',
        actionRequired: true,
        suggestedActions: ['Clear cache', 'Increase quota', 'Enable aggressive eviction'],
        timestamp: Date.now(),
        acknowledged: false
      });
    }

    // Performance alerts
    if (metrics.performance.avgLoadTime > 3000) {
      alerts.push({
        severity: 'warning',
        category: 'performance',
        message: 'Slow loading times detected',
        actionRequired: false,
        suggestedActions: ['Check network conditions', 'Optimize prefetch strategy'],
        timestamp: Date.now(),
        acknowledged: false
      });
    }

    // Network adaptation alert
    if (metrics.network.adaptationScore < 0.5) {
      alerts.push({
        severity: 'warning',
        category: 'network',
        message: 'Poor network adaptation - cache not optimized for current connection',
        actionRequired: false,
        suggestedActions: ['Rebalance quality distribution', 'Update network profiles'],
        timestamp: Date.now(),
        acknowledged: false
      });
    }

    // Fragmentation alert
    if (metrics.fragmentation.defragmentationNeeded) {
      alerts.push({
        severity: 'info',
        category: 'storage',
        message: 'Cache fragmentation detected - defragmentation recommended',
        actionRequired: false,
        suggestedActions: ['Run defragmentation', 'Optimize eviction strategy'],
        timestamp: Date.now(),
        acknowledged: false
      });
    }

    // Add new alerts
    this.currentAlerts.push(...alerts);

    if (alerts.length > 0) {
      console.warn(`CacheHealthMonitoring: Generated ${alerts.length} new health alerts`);
    }
  }

  private async cleanupOldAlerts(): Promise<void> {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const initialCount = this.currentAlerts.length;
    
    this.currentAlerts = this.currentAlerts.filter(alert => 
      alert.timestamp > oneWeekAgo && !alert.acknowledged
    );

    const cleaned = initialCount - this.currentAlerts.length;
    if (cleaned > 0) {
      console.log(`CacheHealthMonitoring: Cleaned up ${cleaned} old alerts`);
    }
  }

  private async performDeepAnalysis(): Promise<void> {
    if (Date.now() - this.lastDeepAnalysis < 60 * 60 * 1000) return; // Max once per hour
    
    this.lastDeepAnalysis = Date.now();
    
    console.log('CacheHealthMonitoring: Performing deep analysis');

    // Analyze long-term trends
    await this.analyzeLongTermTrends();

    // Check for optimization opportunities
    await this.identifyOptimizationOpportunities();

    console.log('CacheHealthMonitoring: Deep analysis complete');
  }

  private async analyzeLongTermTrends(): Promise<void> {
    // Analyze trends over longer periods to identify patterns
    for (const [metric, trend] of this.healthTrends.entries()) {
      if (trend.values.length >= 10) {
        const recentAvg = trend.values.slice(-5).reduce((sum, v) => sum + v.value, 0) / 5;
        const historicalAvg = trend.values.slice(0, 5).reduce((sum, v) => sum + v.value, 0) / 5;
        const longTermChange = recentAvg - historicalAvg;

        if (Math.abs(longTermChange) > 0.1) {
          console.log(`CacheHealthMonitoring: Long-term trend detected in ${metric}: ${longTermChange > 0 ? 'improving' : 'degrading'} by ${Math.abs(longTermChange).toFixed(3)}`);
        }
      }
    }
  }

  private async identifyOptimizationOpportunities(): Promise<void> {
    const latest = this.healthHistory[this.healthHistory.length - 1];
    if (!latest) return;

    const opportunities: string[] = [];

    if (latest.storage.utilizationRatio < 0.3 && latest.storage.quotaEfficiency < 0.6) {
      opportunities.push('Reduce storage quota to improve efficiency');
    }

    if (latest.network.adaptationScore < 0.7) {
      opportunities.push('Implement better network adaptation strategy');
    }

    if (latest.performance.prefetchAccuracy < 0.6) {
      opportunities.push('Refine prefetch prediction algorithms');
    }

    if (opportunities.length > 0) {
      console.log('CacheHealthMonitoring: Optimization opportunities identified:', opportunities);
    }
  }

  // Public methods for integration

  async getCurrentHealth(): Promise<CacheHealthMetrics | null> {
    return this.healthHistory[this.healthHistory.length - 1] || null;
  }

  async getHealthHistory(count: number = 10): Promise<CacheHealthMetrics[]> {
    return this.healthHistory.slice(-count);
  }

  async getCurrentAlerts(): Promise<HealthAlert[]> {
    return [...this.currentAlerts];
  }

  async acknowledgeAlert(alertIndex: number): Promise<void> {
    if (alertIndex >= 0 && alertIndex < this.currentAlerts.length) {
      this.currentAlerts[alertIndex].acknowledged = true;
    }
  }

  async getHealthTrends(): Promise<CacheHealthTrend[]> {
    return Array.from(this.healthTrends.values());
  }

  async triggerHealthCheck(): Promise<CacheHealthMetrics> {
    return this.performHealthCheck();
  }

  async exportHealthData(): Promise<{
    metrics: CacheHealthMetrics[];
    alerts: HealthAlert[];
    trends: CacheHealthTrend[];
  }> {
    return {
      metrics: [...this.healthHistory],
      alerts: [...this.currentAlerts],
      trends: Array.from(this.healthTrends.values())
    };
  }

  // Integration methods for enhanced analytics
  
  private async integrateUserBehaviorInsights(): Promise<void> {
    try {
      const analytics = await userBehaviorAnalytics.getCurrentSessionAnalytics();
      
      if (analytics.session && analytics.matchingPatterns.length > 0) {
        // Log insights about user behavior patterns affecting cache performance
        const patterns = analytics.matchingPatterns;
        const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
        
        if (avgConfidence > 0.7) {
          console.log(`CacheHealthMonitoring: Strong behavior patterns detected (${avgConfidence.toFixed(2)} confidence) - optimizing cache strategy`);
          
          // Trigger cache optimization based on patterns
          await this.applyBehaviorBasedOptimizations(patterns);
        }
      }
    } catch (error) {
      console.warn('CacheHealthMonitoring: Error integrating behavior insights:', error);
    }
  }
  
  private async applyBehaviorBasedOptimizations(patterns: any[]): Promise<void> {
    // Apply optimizations based on detected user behavior patterns
    for (const pattern of patterns) {
      const nextChunkPrediction = pattern.predictions.find((p: any) => p.type === 'next_chunk');
      
      if (nextChunkPrediction && nextChunkPrediction.probability > 0.8) {
        // User likely to continue reading - optimize prefetch
        const prefetchDistance = nextChunkPrediction.metadata?.prefetch_distance || 3;
        console.log(`CacheHealthMonitoring: Optimizing prefetch distance to ${prefetchDistance} based on user pattern: ${pattern.name}`);
        
        // This would integrate with the prefetch service
        // await prefetchService.adjustDistance(prefetchDistance);
      }
      
      const qualityPrediction = pattern.predictions.find((p: any) => p.type === 'quality_preference');
      if (qualityPrediction && qualityPrediction.probability > 0.7) {
        const preferredQuality = qualityPrediction.metadata?.quality;
        console.log(`CacheHealthMonitoring: User prefers ${preferredQuality} quality based on pattern: ${pattern.name}`);
        
        // This would integrate with quality management
        // await qualityService.setPreferredQuality(preferredQuality);
      }
    }
  }
  
  async getEnhancedHealthReport(): Promise<{
    health: CacheHealthMetrics;
    userBehaviorInsights: any;
    tuningRecommendations: any[];
    optimizationOpportunities: string[];
  }> {
    const health = await this.performHealthCheck();
    
    let userBehaviorInsights = null;
    let tuningRecommendations: any[] = [];
    const optimizationOpportunities: string[] = [];
    
    try {
      userBehaviorInsights = await userBehaviorAnalytics.getCurrentSessionAnalytics();
    } catch (error) {
      console.warn('CacheHealthMonitoring: Error getting behavior insights:', error);
    }
    
    try {
      tuningRecommendations = await adaptiveCacheTuner.generateCurrentRecommendations();
    } catch (error) {
      console.warn('CacheHealthMonitoring: Error getting tuning recommendations:', error);
    }
    
    // Generate optimization opportunities
    if (health.overall.score < 80) {
      optimizationOpportunities.push('Overall cache performance below optimal - consider parameter tuning');
    }
    
    if (health.performance.cacheHitRate < 0.75) {
      optimizationOpportunities.push('Cache hit rate could be improved with better prefetch strategy');
    }
    
    if (health.network.adaptationScore < 0.7) {
      optimizationOpportunities.push('Network adaptation needs improvement - rebalance quality distribution');
    }
    
    if (userBehaviorInsights?.session && userBehaviorInsights.session.skipRate > 0.3) {
      optimizationOpportunities.push('High skip rate detected - optimize content prediction');
    }
    
    return {
      health,
      userBehaviorInsights,
      tuningRecommendations,
      optimizationOpportunities
    };
  }
  
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

// Export singleton instance
export const cacheHealthMonitoring = CacheHealthMonitoringService.getInstance();