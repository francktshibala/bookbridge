import { performanceMonitoringSystem, PerformanceMetrics, PerformanceAlert, SystemHealthScore } from './performance-monitoring-system';
import { cacheHealthMonitoring } from './cache-health-monitoring';
import { UserBehaviorAnalyticsService } from './user-behavior-analytics';
import { voiceUsageTracker } from './voice-usage-tracker';

export interface DashboardMetrics {
  realTimeMetrics: PerformanceMetrics;
  systemHealth: SystemHealthScore;
  alerts: PerformanceAlert[];
  trends: {
    responseTime: number[];
    errorRate: number[];
    cacheHitRate: number[];
    userSessions: number[];
  };
  insights: {
    topErrors: Array<{ type: string; count: number; trend: 'up' | 'down' | 'stable' }>;
    performanceBottlenecks: Array<{ component: string; impact: number; recommendation: string }>;
    userBehaviorPatterns: Array<{ pattern: string; frequency: number; optimization: string }>;
    resourceOptimizations: Array<{ resource: string; currentUsage: number; recommendation: string }>;
  };
}

export interface AnalyticsReport {
  period: string;
  summary: {
    totalSessions: number;
    averageSessionDuration: number;
    bounceRate: number;
    errorRate: number;
    performanceScore: number;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    cacheHitRate: number;
    throughput: number;
  };
  userExperience: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    timeToInteractive: number;
  };
  costs: {
    voiceSynthesis: number;
    caching: number;
    total: number;
  };
  recommendations: string[];
}

export class AnalyticsDashboard {
  private static instance: AnalyticsDashboard;
  private metricsHistory: Array<{ timestamp: Date; metrics: PerformanceMetrics }> = [];
  private userBehaviorAnalytics: UserBehaviorAnalyticsService;
  private updateInterval?: NodeJS.Timeout;

  private constructor() {
    this.userBehaviorAnalytics = UserBehaviorAnalyticsService.getInstance();
  }

  public static getInstance(): AnalyticsDashboard {
    if (!AnalyticsDashboard.instance) {
      AnalyticsDashboard.instance = new AnalyticsDashboard();
    }
    return AnalyticsDashboard.instance;
  }

  public startDataCollection(): void {
    // Collect metrics every 5 minutes for trend analysis
    this.updateInterval = setInterval(() => {
      this.collectMetricsSnapshot();
    }, 300000); // 5 minutes

    console.log('📊 Analytics dashboard data collection started');
  }

  public stopDataCollection(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
    console.log('📊 Analytics dashboard data collection stopped');
  }

  private collectMetricsSnapshot(): void {
    const currentMetrics = performanceMonitoringSystem.getMetrics();
    const snapshot = {
      timestamp: new Date(),
      metrics: { ...currentMetrics }
    };

    this.metricsHistory.push(snapshot);

    // Keep only last 24 hours of 5-minute snapshots (288 data points)
    if (this.metricsHistory.length > 288) {
      this.metricsHistory = this.metricsHistory.slice(-288);
    }
  }

  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    const realTimeMetrics = performanceMonitoringSystem.getMetrics();
    const systemHealth = performanceMonitoringSystem.generateSystemHealthScore();
    const alerts = performanceMonitoringSystem.getAlerts();
    
    const trends = this.calculateTrends();
    const insights = await this.generateInsights();

    return {
      realTimeMetrics,
      systemHealth,
      alerts,
      trends,
      insights
    };
  }

  private calculateTrends(): DashboardMetrics['trends'] {
    const recentHistory = this.metricsHistory.slice(-12); // Last hour (12 * 5min intervals)
    
    return {
      responseTime: recentHistory.map(h => h.metrics.responseTime),
      errorRate: recentHistory.map(h => h.metrics.errorRate),
      cacheHitRate: recentHistory.map(h => h.metrics.cacheHitRate),
      userSessions: recentHistory.map(h => h.metrics.sessionDuration > 0 ? 1 : 0)
    };
  }

  private async generateInsights(): Promise<DashboardMetrics['insights']> {
    const currentMetrics = performanceMonitoringSystem.getMetrics();
    const userInsights = await this.userBehaviorAnalytics.getCurrentSessionAnalytics();
    const cacheReport = await cacheHealthMonitoring.getEnhancedHealthReport();

    // Top errors analysis
    const topErrors = Object.entries(currentMetrics.errorCounts)
      .map(([type, count]) => ({
        type,
        count,
        trend: this.calculateErrorTrend(type) as 'up' | 'down' | 'stable'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Performance bottlenecks
    const performanceBottlenecks = [];
    if (currentMetrics.responseTime > 1000) {
      performanceBottlenecks.push({
        component: 'API Response',
        impact: Math.min(100, currentMetrics.responseTime / 10),
        recommendation: 'Optimize database queries and implement response caching'
      });
    }
    if (currentMetrics.cacheHitRate < 0.8) {
      performanceBottlenecks.push({
        component: 'Cache System',
        impact: (1 - currentMetrics.cacheHitRate) * 100,
        recommendation: 'Tune cache algorithms and increase prefetch distance'
      });
    }
    if (currentMetrics.largestContentfulPaint > 2500) {
      performanceBottlenecks.push({
        component: 'Page Loading',
        impact: Math.min(100, currentMetrics.largestContentfulPaint / 25),
        recommendation: 'Optimize images and implement lazy loading'
      });
    }

    // User behavior patterns
    const userBehaviorPatterns = [];
    if ((userInsights.session?.skipRate || 0) > 0.3) {
      userBehaviorPatterns.push({
        pattern: 'Frequent Content Skipping',
        frequency: userInsights.session?.skipRate || 0,
        optimization: 'Implement intelligent content summarization'
      });
    }
    if ((userInsights.session?.readingSpeed || 0) < 150) {
      userBehaviorPatterns.push({
        pattern: 'Slow Reading Pace',
        frequency: userInsights.session?.readingSpeed || 0,
        optimization: 'Adjust audio speed and add comprehension aids'
      });
    }

    // Resource optimizations
    const resourceOptimizations = [];
    if (currentMetrics.memoryUsage > 0.8) {
      resourceOptimizations.push({
        resource: 'Memory',
        currentUsage: Math.round(currentMetrics.memoryUsage * 100),
        recommendation: 'Implement memory pooling and cleanup unused objects'
      });
    }
    if (currentMetrics.storageQuota > 0.85) {
      resourceOptimizations.push({
        resource: 'Storage',
        currentUsage: Math.round(currentMetrics.storageQuota * 100),
        recommendation: 'Enable cache eviction and compress stored data'
      });
    }
    if (currentMetrics.networkBandwidth < 0.5) {
      resourceOptimizations.push({
        resource: 'Network',
        currentUsage: Math.round((1 - currentMetrics.networkBandwidth) * 100),
        recommendation: 'Optimize for low-bandwidth conditions with smaller chunks'
      });
    }

    return {
      topErrors,
      performanceBottlenecks,
      userBehaviorPatterns,
      resourceOptimizations
    };
  }

  private calculateErrorTrend(errorType: string): string {
    const recentHistory = this.metricsHistory.slice(-6); // Last 30 minutes
    if (recentHistory.length < 3) return 'stable';

    const oldCount = recentHistory.slice(0, 3)
      .reduce((sum, h) => sum + (h.metrics.errorCounts[errorType] || 0), 0);
    const newCount = recentHistory.slice(-3)
      .reduce((sum, h) => sum + (h.metrics.errorCounts[errorType] || 0), 0);

    if (newCount > oldCount * 1.2) return 'up';
    if (newCount < oldCount * 0.8) return 'down';
    return 'stable';
  }

  public async generateReport(period: 'hour' | 'day' | 'week' = 'day'): Promise<AnalyticsReport> {
    const periodHours = period === 'hour' ? 1 : period === 'day' ? 24 : 168;
    const periodData = this.metricsHistory.filter(h => 
      h.timestamp.getTime() > Date.now() - (periodHours * 60 * 60 * 1000)
    );

    const voiceStats = await voiceUsageTracker.getMonthlyUsage();
    const userInsights = await this.userBehaviorAnalytics.getCurrentSessionAnalytics();

    // Calculate averages and percentiles
    const responseTimes = periodData.map(d => d.metrics.responseTime).filter(rt => rt > 0);
    const errorRates = periodData.map(d => d.metrics.errorRate);
    const cacheHitRates = periodData.map(d => d.metrics.cacheHitRate);

    const averageResponseTime = this.average(responseTimes);
    const p95ResponseTime = this.percentile(responseTimes, 95);
    const averageErrorRate = this.average(errorRates);
    const averageCacheHitRate = this.average(cacheHitRates);

    // Performance score calculation
    const performanceScore = Math.round(
      Math.max(0, 100 - (averageResponseTime / 10) - (averageErrorRate * 1000))
    );

    // User experience metrics
    const fcpValues = periodData.map(d => d.metrics.firstContentfulPaint).filter(v => v > 0);
    const lcpValues = periodData.map(d => d.metrics.largestContentfulPaint).filter(v => v > 0);
    const clsValues = periodData.map(d => d.metrics.cumulativeLayoutShift);

    // Generate recommendations
    const recommendations = [];
    if (averageResponseTime > 1000) {
      recommendations.push('Optimize API response times - current average exceeds 1 second');
    }
    if (averageErrorRate > 0.05) {
      recommendations.push('Investigate and fix recurring errors - error rate above 5%');
    }
    if (averageCacheHitRate < 0.8) {
      recommendations.push('Improve cache hit rate through better prefetching strategies');
    }
    if (this.average(lcpValues) > 2500) {
      recommendations.push('Optimize page loading performance - LCP exceeds 2.5 seconds');
    }

    return {
      period: `${period} (${periodData.length} data points)`,
      summary: {
        totalSessions: periodData.filter(d => d.metrics.sessionDuration > 0).length,
        averageSessionDuration: this.average(periodData.map(d => d.metrics.sessionDuration)),
        bounceRate: Math.min(100, (userInsights.session?.skipRate || 0) * 100),
        errorRate: averageErrorRate * 100,
        performanceScore
      },
      performance: {
        averageResponseTime,
        p95ResponseTime,
        cacheHitRate: averageCacheHitRate * 100,
        throughput: this.average(periodData.map(d => d.metrics.throughput))
      },
      userExperience: {
        firstContentfulPaint: this.average(fcpValues),
        largestContentfulPaint: this.average(lcpValues),
        cumulativeLayoutShift: this.average(clsValues),
        timeToInteractive: this.average(periodData.map(d => 
          d.metrics.firstContentfulPaint + d.metrics.firstInputDelay
        ))
      },
      costs: {
        voiceSynthesis: voiceStats.estimated_cost,
        caching: 0, // Would implement cost tracking for cache storage
        total: voiceStats.estimated_cost
      },
      recommendations
    };
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  public getMetricsHistory(): Array<{ timestamp: Date; metrics: PerformanceMetrics }> {
    return [...this.metricsHistory];
  }

  public clearHistory(): void {
    this.metricsHistory = [];
    console.log('🧹 Analytics history cleared');
  }

  public exportData(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      metricsHistory: this.metricsHistory,
      currentHealth: performanceMonitoringSystem.generateSystemHealthScore(),
      summary: {
        totalDataPoints: this.metricsHistory.length,
        timeRange: this.metricsHistory.length > 0 ? {
          start: this.metricsHistory[0].timestamp,
          end: this.metricsHistory[this.metricsHistory.length - 1].timestamp
        } : null
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}

export const analyticsDashboard = AnalyticsDashboard.getInstance();