import { cacheHealthMonitoring } from './cache-health-monitoring';
import { UserBehaviorAnalyticsService } from './user-behavior-analytics';
import { voiceUsageTracker } from './voice-usage-tracker';
import { adaptiveCacheTuner } from './adaptive-cache-tuner';

export interface PerformanceMetrics {
  // Core Performance Indicators
  responseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
  
  // User Experience Metrics
  timeToFirstByte: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  interactionToNextPaint: number;
  
  // Cache Performance
  cacheHitRate: number;
  cacheHealth: number;
  prefetchAccuracy: number;
  evictionEfficiency: number;
  
  // Audio Performance
  audioLatency: number;
  audioBufferingEvents: number;
  audioErrorRate: number;
  speechSynthesisLatency: number;
  
  // Resource Utilization
  memoryUsage: number;
  cpuUsage: number;
  storageQuota: number;
  networkBandwidth: number;
  batteryLevel?: number;
  
  // Business Metrics
  sessionDuration: number;
  userRetention: number;
  featureUsage: Record<string, number>;
  errorCounts: Record<string, number>;
}

export interface PerformanceAlert {
  id: string;
  type: 'performance' | 'error' | 'resource' | 'user_experience';
  severity: 'info' | 'warning' | 'error' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  timestamp: Date;
  context?: any;
}

export interface SystemHealthScore {
  overall: number;
  categories: {
    performance: number;
    reliability: number;
    user_experience: number;
    resource_efficiency: number;
    cache_effectiveness: number;
  };
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: string[];
}

export class PerformanceMonitoringSystem {
  private static instance: PerformanceMonitoringSystem;
  private metrics: PerformanceMetrics;
  private alerts: PerformanceAlert[] = [];
  private observers: PerformanceObserver[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private userBehaviorAnalytics: UserBehaviorAnalyticsService;
  
  // Performance thresholds
  private readonly THRESHOLDS = {
    responseTime: { warning: 1000, critical: 3000 },
    errorRate: { warning: 0.05, critical: 0.1 },
    cacheHitRate: { warning: 0.7, critical: 0.5 },
    memoryUsage: { warning: 0.8, critical: 0.9 },
    firstContentfulPaint: { warning: 2000, critical: 4000 },
    largestContentfulPaint: { warning: 2500, critical: 4500 },
    cumulativeLayoutShift: { warning: 0.1, critical: 0.25 },
    firstInputDelay: { warning: 100, critical: 300 },
    interactionToNextPaint: { warning: 200, critical: 500 }
  };

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.userBehaviorAnalytics = UserBehaviorAnalyticsService.getInstance();
    this.setupPerformanceObservers();
  }

  public static getInstance(): PerformanceMonitoringSystem {
    if (!PerformanceMonitoringSystem.instance) {
      PerformanceMonitoringSystem.instance = new PerformanceMonitoringSystem();
    }
    return PerformanceMonitoringSystem.instance;
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      uptime: 0,
      timeToFirstByte: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      firstInputDelay: 0,
      interactionToNextPaint: 0,
      cacheHitRate: 0,
      cacheHealth: 0,
      prefetchAccuracy: 0,
      evictionEfficiency: 0,
      audioLatency: 0,
      audioBufferingEvents: 0,
      audioErrorRate: 0,
      speechSynthesisLatency: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      storageQuota: 0,
      networkBandwidth: 0,
      sessionDuration: 0,
      userRetention: 0,
      featureUsage: {},
      errorCounts: {}
    };
  }

  private setupPerformanceObservers(): void {
    if (typeof window === 'undefined') return;

    // Web Vitals Observer
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.updateMetric('largestContentfulPaint', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.updateMetric('firstInputDelay', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.updateMetric('cumulativeLayoutShift', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);

      // Long Task Observer
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.warn(`Long task detected: ${entry.duration}ms`, entry);
          this.trackError('long_task', `Task took ${entry.duration}ms`);
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);

      // Navigation Timing
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.updateMetric('responseTime', entry.responseEnd - entry.requestStart);
          this.updateMetric('timeToFirstByte', entry.responseStart - entry.requestStart);
        });
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);
    }

    // Paint Observer
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.updateMetric('firstContentfulPaint', entry.startTime);
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);
    }
  }

  public startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.collectCacheMetrics();
      this.collectUserExperienceMetrics();
      this.checkThresholds();
    }, 30000); // Every 30 seconds

    console.log('🔍 Performance monitoring started');
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    console.log('🔍 Performance monitoring stopped');
  }

  private async collectSystemMetrics(): Promise<void> {
    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.updateMetric('memoryUsage', memory.usedJSHeapSize / memory.jsHeapSizeLimit);
    }

    // Storage quota
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 1;
        this.updateMetric('storageQuota', used / quota);
      } catch (error) {
        console.warn('Could not get storage estimate:', error);
      }
    }

    // Network information
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.effectiveType) {
        const bandwidthMap = {
          'slow-2g': 0.05,
          '2g': 0.25,
          '3g': 0.75,
          '4g': 1.0
        };
        this.updateMetric('networkBandwidth', bandwidthMap[connection.effectiveType as keyof typeof bandwidthMap] || 0.5);
      }
    }

    // Battery level (if available)
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.updateMetric('batteryLevel', battery.level);
      } catch (error) {
        // Battery API not available
      }
    }
  }

  private async collectCacheMetrics(): Promise<void> {
    try {
      // Cache health from existing monitoring system
      const healthReport = await cacheHealthMonitoring.getEnhancedHealthReport();
      this.updateMetric('cacheHealth', healthReport.health.overall.score);
      this.updateMetric('cacheHitRate', healthReport.health.performance.cacheHitRate);

      // Use performance health metrics for prefetch accuracy
      this.updateMetric('prefetchAccuracy', healthReport.health.performance.prefetchAccuracy);
      this.updateMetric('evictionEfficiency', 0.8); // Default value, could be calculated from cache metrics

    } catch (error) {
      console.warn('Failed to collect cache metrics:', error);
    }
  }

  private async collectUserExperienceMetrics(): Promise<void> {
    try {
      // User behavior metrics
      const userInsights = await this.userBehaviorAnalytics.getCurrentSessionAnalytics();
      if (userInsights.session) {
        const sessionDuration = (userInsights.session.endTime - userInsights.session.startTime) / 1000;
        this.updateMetric('sessionDuration', sessionDuration);
      }

      // Voice usage tracking
      const voiceStats = await voiceUsageTracker.getUsageStats();
      this.updateFeatureUsage('voice_synthesis', voiceStats.total_characters);

    } catch (error) {
      console.warn('Failed to collect user experience metrics:', error);
    }
  }

  private checkThresholds(): void {
    const currentTime = new Date();
    
    // Check each metric against thresholds
    Object.entries(this.THRESHOLDS).forEach(([metric, thresholds]) => {
      const currentValue = this.metrics[metric as keyof PerformanceMetrics] as number;
      
      if (currentValue >= thresholds.critical) {
        this.createAlert({
          type: 'performance',
          severity: 'critical',
          metric,
          currentValue,
          threshold: thresholds.critical,
          message: `Critical: ${metric} exceeded threshold (${currentValue} >= ${thresholds.critical})`,
          timestamp: currentTime
        });
      } else if (currentValue >= thresholds.warning) {
        this.createAlert({
          type: 'performance',
          severity: 'warning',
          metric,
          currentValue,
          threshold: thresholds.warning,
          message: `Warning: ${metric} approaching threshold (${currentValue} >= ${thresholds.warning})`,
          timestamp: currentTime
        });
      }
    });
  }

  private createAlert(alertData: Omit<PerformanceAlert, 'id'>): void {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...alertData
    };

    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    console.warn(`🚨 Performance Alert [${alert.severity.toUpperCase()}]:`, alert.message);
    
    // Emit custom event for external handling
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performance-alert', { detail: alert }));
    }
  }

  public updateMetric(metric: keyof PerformanceMetrics, value: number): void {
    (this.metrics as any)[metric] = value;
  }

  public trackError(type: string, message: string, context?: any): void {
    this.metrics.errorCounts[type] = (this.metrics.errorCounts[type] || 0) + 1;
    
    const totalErrors = Object.values(this.metrics.errorCounts).reduce((sum, count) => sum + count, 0);
    const totalRequests = Math.max(this.metrics.throughput, 1);
    this.updateMetric('errorRate', totalErrors / totalRequests);

    this.createAlert({
      type: 'error',
      severity: 'warning',
      metric: 'error_rate',
      currentValue: this.metrics.errorRate,
      threshold: this.THRESHOLDS.errorRate.warning,
      message: `Error tracked: ${type} - ${message}`,
      timestamp: new Date(),
      context
    });
  }

  public updateFeatureUsage(feature: string, count: number): void {
    this.metrics.featureUsage[feature] = count;
  }

  public trackUserAction(action: string, duration?: number): void {
    this.updateFeatureUsage(action, (this.metrics.featureUsage[action] || 0) + 1);
    
    if (duration) {
      this.updateMetric('responseTime', Math.max(this.metrics.responseTime, duration));
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    return severity 
      ? this.alerts.filter(alert => alert.severity === severity)
      : [...this.alerts];
  }

  public generateSystemHealthScore(): SystemHealthScore {
    const metrics = this.metrics;
    
    // Performance score (0-100)
    const performanceScore = Math.min(100, Math.max(0, 
      100 - (metrics.responseTime / 50) - (metrics.errorRate * 1000)
    ));
    
    // Reliability score (0-100)
    const reliabilityScore = Math.min(100, 
      100 - (metrics.errorRate * 500) - (metrics.audioErrorRate * 200)
    );
    
    // User experience score (0-100)
    const uxScore = Math.min(100, Math.max(0,
      100 - (metrics.firstContentfulPaint / 40) - (metrics.cumulativeLayoutShift * 400)
    ));
    
    // Resource efficiency score (0-100)
    const resourceScore = Math.min(100, 
      100 - (metrics.memoryUsage * 50) - (metrics.storageQuota * 30)
    );
    
    // Cache effectiveness score (0-100)
    const cacheScore = (metrics.cacheHitRate * 50) + (metrics.cacheHealth * 0.5);
    
    // Overall score
    const overall = Math.round(
      (performanceScore * 0.25) +
      (reliabilityScore * 0.20) +
      (uxScore * 0.25) +
      (resourceScore * 0.15) +
      (cacheScore * 0.15)
    );
    
    // Grade assignment
    let grade: SystemHealthScore['grade'];
    if (overall >= 95) grade = 'A+';
    else if (overall >= 85) grade = 'A';
    else if (overall >= 75) grade = 'B';
    else if (overall >= 65) grade = 'C';
    else if (overall >= 50) grade = 'D';
    else grade = 'F';
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (performanceScore < 70) recommendations.push('Optimize response times and reduce latency');
    if (reliabilityScore < 80) recommendations.push('Investigate and fix recurring errors');
    if (uxScore < 75) recommendations.push('Improve loading performance and layout stability');
    if (resourceScore < 70) recommendations.push('Optimize memory and storage usage');
    if (cacheScore < 80) recommendations.push('Tune cache algorithms for better hit rates');
    
    return {
      overall,
      categories: {
        performance: Math.round(performanceScore),
        reliability: Math.round(reliabilityScore),
        user_experience: Math.round(uxScore),
        resource_efficiency: Math.round(resourceScore),
        cache_effectiveness: Math.round(cacheScore)
      },
      grade,
      recommendations
    };
  }

  public exportMetrics(): string {
    const healthScore = this.generateSystemHealthScore();
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      healthScore,
      alerts: this.alerts,
      summary: {
        totalAlerts: this.alerts.length,
        criticalAlerts: this.alerts.filter(a => a.severity === 'critical').length,
        averageResponseTime: this.metrics.responseTime,
        systemGrade: healthScore.grade
      }
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  public clearAlerts(): void {
    this.alerts = [];
    console.log('🧹 Performance alerts cleared');
  }
}

export const performanceMonitoringSystem = PerformanceMonitoringSystem.getInstance();