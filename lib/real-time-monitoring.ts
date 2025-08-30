/**
 * Real-Time Performance Monitoring System
 * Enhanced monitoring with WebSocket support, real-time alerts, and production integration
 */

import { performanceMonitoringSystem, PerformanceMetrics, PerformanceAlert, SystemHealthScore } from './performance-monitoring-system';
import { getProductionConfig } from './production-config';
import { trackDeploymentMetric, handleDeploymentError } from './deployment-utils';
import { getFeatureFlags } from '../utils/featureFlags';

interface RealTimeMetrics extends PerformanceMetrics {
  timestamp: number;
  sessionId: string;
  userId?: string;
  deviceInfo: {
    userAgent: string;
    viewport: { width: number; height: number };
    deviceMemory?: number;
    hardwareConcurrency?: number;
    connection?: {
      effectiveType: string;
      downlink: number;
      rtt: number;
    };
  };
  geolocation?: {
    country: string;
    isEmergingMarket: boolean;
  };
  featureFlags: Record<string, boolean>;
}

interface AlertSubscriber {
  id: string;
  callback: (alert: PerformanceAlert) => void;
  types?: PerformanceAlert['type'][];
  severities?: PerformanceAlert['severity'][];
}

interface MonitoringWebSocketMessage {
  type: 'metrics' | 'alert' | 'health_score' | 'system_event';
  timestamp: number;
  data: any;
}

export class RealTimeMonitoringSystem {
  private static instance: RealTimeMonitoringSystem;
  private subscribers: AlertSubscriber[] = [];
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private sessionId: string;
  private metricsBuffer: RealTimeMetrics[] = [];
  private flushInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  
  // Real-time thresholds for immediate alerts
  private readonly REAL_TIME_THRESHOLDS = {
    criticalResponseTime: 5000, // 5 seconds
    emergencyErrorRate: 0.25, // 25% error rate
    memoryLeakThreshold: 0.95, // 95% memory usage
    batteryLowThreshold: 0.15, // 15% battery
    connectionTimeout: 10000, // 10 seconds for network timeout
  };

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.setupEventListeners();
  }

  public static getInstance(): RealTimeMonitoringSystem {
    if (!RealTimeMonitoringSystem.instance) {
      RealTimeMonitoringSystem.instance = new RealTimeMonitoringSystem();
    }
    return RealTimeMonitoringSystem.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen to performance alerts from the base monitoring system
    window.addEventListener('performance-alert', this.handlePerformanceAlert.bind(this) as EventListener);
    
    // Listen to page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Listen to online/offline events
    window.addEventListener('online', () => this.handleConnectionChange(true));
    window.addEventListener('offline', () => this.handleConnectionChange(false));
    
    // Listen to beforeunload for cleanup
    window.addEventListener('beforeunload', this.cleanup.bind(this));
  }

  /**
   * Start real-time monitoring with WebSocket connection
   */
  public async startRealTimeMonitoring(userId?: string): Promise<void> {
    try {
      const config = getProductionConfig();
      const featureFlags = getFeatureFlags();
      
      if (!config.monitoring.enabled) {
        console.log('🔍 Real-time monitoring disabled by configuration');
        return;
      }

      console.log('🚀 Starting real-time performance monitoring...');
      
      // Start base monitoring system
      performanceMonitoringSystem.startMonitoring();
      
      // Initialize WebSocket connection for real-time updates
      await this.initializeWebSocket();
      
      // Start metrics collection and buffering
      this.startMetricsCollection(userId);
      
      // Setup real-time health scoring
      this.startHealthScoreMonitoring();
      
      this.isMonitoring = true;
      
      // Track monitoring start
      trackDeploymentMetric('real_time_monitoring_started', {
        sessionId: this.sessionId,
        userId,
        featureFlags: {
          analyticsTracking: featureFlags.analyticsTracking || false,
          performanceMonitoring: featureFlags.performanceMonitoring || false,
          emergingMarketsOptimizations: featureFlags.emergingMarketsOptimizations || false,
        },
        timestamp: Date.now(),
      });
      
      console.log('✅ Real-time monitoring active');
      
    } catch (error) {
      handleDeploymentError(error as Error, 'real-time monitoring startup');
      throw error;
    }
  }

  /**
   * Stop real-time monitoring and cleanup
   */
  public stopRealTimeMonitoring(): void {
    this.isMonitoring = false;
    
    // Stop base monitoring
    performanceMonitoringSystem.stopMonitoring();
    
    // Cleanup WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    // Stop intervals
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = undefined;
    }
    
    // Flush remaining metrics
    this.flushMetricsBuffer();
    
    console.log('🔍 Real-time monitoring stopped');
  }

  /**
   * Initialize WebSocket connection for real-time updates
   */
  private async initializeWebSocket(): Promise<void> {
    const config = getProductionConfig();
    
    // In development, skip WebSocket for now
    if (config.deployment.environment === 'development') {
      console.log('📡 WebSocket monitoring disabled in development');
      return;
    }
    
    try {
      // Use wss:// for production, ws:// for local development
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/monitoring/ws`;
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('📡 Real-time monitoring WebSocket connected');
        this.reconnectAttempts = 0;
      };
      
      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(JSON.parse(event.data));
      };
      
      this.websocket.onclose = () => {
        console.log('📡 WebSocket connection closed');
        this.attemptReconnect();
      };
      
      this.websocket.onerror = (error) => {
        console.error('📡 WebSocket error:', error);
        handleDeploymentError(new Error('WebSocket connection failed'), 'websocket monitoring');
      };
      
    } catch (error) {
      console.warn('📡 Failed to initialize WebSocket, continuing with polling mode');
    }
  }

  /**
   * Attempt to reconnect WebSocket with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.isMonitoring) {
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`📡 Attempting WebSocket reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.initializeWebSocket();
    }, delay);
  }

  /**
   * Start continuous metrics collection
   */
  private startMetricsCollection(userId?: string): void {
    // Collect metrics every 10 seconds for real-time monitoring
    this.flushInterval = setInterval(() => {
      this.collectAndBufferMetrics(userId);
    }, 10000);
    
    // Flush buffer every 30 seconds
    setInterval(() => {
      this.flushMetricsBuffer();
    }, 30000);
  }

  /**
   * Collect current metrics and add to buffer
   */
  private async collectAndBufferMetrics(userId?: string): Promise<void> {
    try {
      const baseMetrics = performanceMonitoringSystem.getMetrics();
      const featureFlags = getFeatureFlags();
      
      const realTimeMetrics: RealTimeMetrics = {
        ...baseMetrics,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId,
        deviceInfo: await this.getDeviceInfo(),
        geolocation: await this.getGeolocationInfo(),
        featureFlags: {
          analyticsTracking: featureFlags.analyticsTracking || false,
          performanceMonitoring: featureFlags.performanceMonitoring || false,
          emergingMarketsOptimizations: featureFlags.emergingMarketsOptimizations || false,
        },
      };
      
      // Add to buffer
      this.metricsBuffer.push(realTimeMetrics);
      
      // Check for critical issues requiring immediate action
      this.checkCriticalThresholds(realTimeMetrics);
      
      // Send real-time update via WebSocket
      this.sendWebSocketMessage({
        type: 'metrics',
        timestamp: Date.now(),
        data: realTimeMetrics,
      });
      
    } catch (error) {
      console.warn('Failed to collect real-time metrics:', error);
    }
  }

  /**
   * Get device information for metrics context
   */
  private async getDeviceInfo(): Promise<RealTimeMetrics['deviceInfo']> {
    const deviceInfo: RealTimeMetrics['deviceInfo'] = {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
    
    // Add device memory if available
    if ('deviceMemory' in navigator) {
      deviceInfo.deviceMemory = (navigator as any).deviceMemory;
    }
    
    // Add hardware concurrency
    if ('hardwareConcurrency' in navigator) {
      deviceInfo.hardwareConcurrency = navigator.hardwareConcurrency;
    }
    
    // Add network connection info
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      deviceInfo.connection = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      };
    }
    
    return deviceInfo;
  }

  /**
   * Get geolocation information (simplified for privacy)
   */
  private async getGeolocationInfo(): Promise<RealTimeMetrics['geolocation']> {
    try {
      // In a real implementation, you might use IP geolocation
      // For now, return a placeholder
      const config = getProductionConfig();
      const emergingMarkets = config.features.emergingMarkets.targetCountries;
      
      return {
        country: 'US', // Placeholder - would be determined by IP geolocation
        isEmergingMarket: false,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Check metrics against critical thresholds for immediate alerts
   */
  private checkCriticalThresholds(metrics: RealTimeMetrics): void {
    const issues: string[] = [];
    
    // Critical response time
    if (metrics.responseTime > this.REAL_TIME_THRESHOLDS.criticalResponseTime) {
      issues.push(`Critical response time: ${metrics.responseTime}ms`);
    }
    
    // Emergency error rate
    if (metrics.errorRate > this.REAL_TIME_THRESHOLDS.emergencyErrorRate) {
      issues.push(`Emergency error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    }
    
    // Memory leak detection
    if (metrics.memoryUsage > this.REAL_TIME_THRESHOLDS.memoryLeakThreshold) {
      issues.push(`Memory leak detected: ${(metrics.memoryUsage * 100).toFixed(1)}%`);
    }
    
    // Low battery (for mobile users)
    if (metrics.batteryLevel && metrics.batteryLevel < this.REAL_TIME_THRESHOLDS.batteryLowThreshold) {
      issues.push(`Low battery detected: ${(metrics.batteryLevel * 100).toFixed(0)}%`);
    }
    
    // Create critical alerts for immediate issues
    issues.forEach(issue => {
      this.createCriticalAlert({
        type: 'performance',
        severity: 'critical',
        metric: 'real_time_check',
        currentValue: Date.now(),
        threshold: 0,
        message: issue,
        timestamp: new Date(),
        context: {
          sessionId: this.sessionId,
          userId: metrics.userId,
          deviceInfo: metrics.deviceInfo,
        },
      });
    });
  }

  /**
   * Create and broadcast critical alert
   */
  private createCriticalAlert(alertData: Omit<PerformanceAlert, 'id'>): void {
    const alert: PerformanceAlert = {
      id: `critical-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...alertData,
    };
    
    // Broadcast to all subscribers
    this.notifySubscribers(alert);
    
    // Send via WebSocket
    this.sendWebSocketMessage({
      type: 'alert',
      timestamp: Date.now(),
      data: alert,
    });
    
    // Track critical alert
    trackDeploymentMetric('critical_alert_triggered', {
      alertId: alert.id,
      severity: alert.severity,
      metric: alert.metric,
      message: alert.message,
      sessionId: this.sessionId,
    });
    
    console.error('🚨 CRITICAL ALERT:', alert.message);
  }

  /**
   * Start continuous health score monitoring
   */
  private startHealthScoreMonitoring(): void {
    setInterval(() => {
      const healthScore = performanceMonitoringSystem.generateSystemHealthScore();
      
      // Send health score update
      this.sendWebSocketMessage({
        type: 'health_score',
        timestamp: Date.now(),
        data: healthScore,
      });
      
      // Check if health score is critically low
      if (healthScore.overall < 30) {
        this.createCriticalAlert({
          type: 'performance',
          severity: 'critical',
          metric: 'system_health',
          currentValue: healthScore.overall,
          threshold: 30,
          message: `System health critically low: ${healthScore.grade} (${healthScore.overall}/100)`,
          timestamp: new Date(),
          context: { recommendations: healthScore.recommendations },
        });
      }
      
    }, 60000); // Every minute
  }

  /**
   * Flush metrics buffer to API
   */
  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;
    
    try {
      const metrics = [...this.metricsBuffer];
      this.metricsBuffer = [];
      
      // Send batch of metrics to API
      const response = await fetch('/api/monitoring/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'real_time_metrics_batch',
          metrics,
          timestamp: Date.now(),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to flush metrics: ${response.status}`);
      }
      
    } catch (error) {
      console.warn('Failed to flush metrics buffer:', error);
      // On failure, keep metrics for next attempt
    }
  }

  /**
   * Subscribe to performance alerts
   */
  public subscribe(callback: (alert: PerformanceAlert) => void, options?: {
    types?: PerformanceAlert['type'][];
    severities?: PerformanceAlert['severity'][];
  }): string {
    const subscriber: AlertSubscriber = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      callback,
      types: options?.types,
      severities: options?.severities,
    };
    
    this.subscribers.push(subscriber);
    return subscriber.id;
  }

  /**
   * Unsubscribe from performance alerts
   */
  public unsubscribe(subscriptionId: string): void {
    this.subscribers = this.subscribers.filter(sub => sub.id !== subscriptionId);
  }

  /**
   * Notify all subscribers of an alert
   */
  private notifySubscribers(alert: PerformanceAlert): void {
    this.subscribers.forEach(subscriber => {
      // Check type filter
      if (subscriber.types && !subscriber.types.includes(alert.type)) {
        return;
      }
      
      // Check severity filter
      if (subscriber.severities && !subscriber.severities.includes(alert.severity)) {
        return;
      }
      
      try {
        subscriber.callback(alert);
      } catch (error) {
        console.warn('Error in alert subscriber callback:', error);
      }
    });
  }

  /**
   * Handle alerts from base performance monitoring system
   */
  private handlePerformanceAlert(event: CustomEvent<PerformanceAlert>): void {
    this.notifySubscribers(event.detail);
  }

  /**
   * Send message via WebSocket
   */
  private sendWebSocketMessage(message: MonitoringWebSocketMessage): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(message: MonitoringWebSocketMessage): void {
    switch (message.type) {
      case 'system_event':
        console.log('📡 System event received:', message.data);
        break;
      default:
        console.log('📡 WebSocket message:', message.type, message.data);
    }
  }

  /**
   * Handle page visibility changes
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page hidden - reduce monitoring frequency
      console.log('📱 Page hidden, reducing monitoring frequency');
    } else {
      // Page visible - resume normal monitoring
      console.log('📱 Page visible, resuming normal monitoring');
    }
  }

  /**
   * Handle connection changes
   */
  private handleConnectionChange(isOnline: boolean): void {
    const event = isOnline ? 'online' : 'offline';
    
    this.sendWebSocketMessage({
      type: 'system_event',
      timestamp: Date.now(),
      data: { event, sessionId: this.sessionId },
    });
    
    trackDeploymentMetric(`connection_${event}`, {
      sessionId: this.sessionId,
      timestamp: Date.now(),
    });
    
    console.log(`🌐 Connection ${event}`);
  }

  /**
   * Get current monitoring status
   */
  public getMonitoringStatus(): {
    isActive: boolean;
    sessionId: string;
    subscriberCount: number;
    bufferedMetrics: number;
    websocketStatus: 'connected' | 'disconnected' | 'connecting';
  } {
    return {
      isActive: this.isMonitoring,
      sessionId: this.sessionId,
      subscriberCount: this.subscribers.length,
      bufferedMetrics: this.metricsBuffer.length,
      websocketStatus: this.websocket?.readyState === WebSocket.OPEN ? 'connected' :
                       this.websocket?.readyState === WebSocket.CONNECTING ? 'connecting' :
                       'disconnected',
    };
  }

  /**
   * Cleanup on page unload
   */
  private cleanup(): void {
    this.stopRealTimeMonitoring();
  }
}

export const realTimeMonitoring = RealTimeMonitoringSystem.getInstance();