/**
 * Real-Time Monitoring Metrics API
 * Enhanced metrics collection for real-time performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProductionConfig } from '@/lib/production-config';
import { getDeploymentEnvironment } from '@/lib/deployment-utils';

interface RealTimeMetricsBatch {
  event: string;
  metrics: Array<{
    timestamp: number;
    sessionId: string;
    userId?: string;
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
    cacheHitRate: number;
    deviceInfo: {
      userAgent: string;
      viewport: { width: number; height: number };
      deviceMemory?: number;
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
  }>;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    const config = getProductionConfig();
    const env = getDeploymentEnvironment();
    
    if (!config.monitoring.enabled && env.isProd) {
      return NextResponse.json(
        { message: 'Real-time monitoring disabled' },
        { status: 200 }
      );
    }
    
    const body: RealTimeMetricsBatch = await request.json();
    
    // Validate the request
    if (!body.metrics || !Array.isArray(body.metrics)) {
      return NextResponse.json(
        { error: 'Invalid metrics batch format' },
        { status: 400 }
      );
    }
    
    // Process the metrics batch
    await processRealTimeMetrics(body);
    
    return NextResponse.json({ 
      success: true,
      processed: body.metrics.length,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Real-time metrics processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process real-time metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process real-time metrics batch
 */
async function processRealTimeMetrics(batch: RealTimeMetricsBatch) {
  const config = getProductionConfig();
  
  // Aggregate metrics for analysis
  const aggregated: AggregatedMetrics = {
    totalMetrics: batch.metrics.length,
    avgResponseTime: 0,
    avgErrorRate: 0,
    avgMemoryUsage: 0,
    avgCacheHitRate: 0,
    uniqueSessions: new Set<string>(),
    uniqueUsers: new Set<string>(),
    emergingMarketMetrics: 0,
    criticalIssues: 0,
    deviceTypes: new Map<string, number>(),
    networkTypes: new Map<string, number>(),
  };
  
  // Process each metric in the batch
  batch.metrics.forEach(metric => {
    // Aggregate basic metrics
    aggregated.avgResponseTime += metric.responseTime;
    aggregated.avgErrorRate += metric.errorRate;
    aggregated.avgMemoryUsage += metric.memoryUsage;
    aggregated.avgCacheHitRate += metric.cacheHitRate;
    
    // Track unique sessions and users
    aggregated.uniqueSessions.add(metric.sessionId);
    if (metric.userId) {
      aggregated.uniqueUsers.add(metric.userId);
    }
    
    // Count emerging market metrics
    if (metric.geolocation?.isEmergingMarket) {
      aggregated.emergingMarketMetrics++;
    }
    
    // Detect critical issues
    if (metric.responseTime > 5000 || metric.errorRate > 0.25 || metric.memoryUsage > 0.95) {
      aggregated.criticalIssues++;
    }
    
    // Track device types
    const deviceType = getDeviceType(metric.deviceInfo.userAgent);
    aggregated.deviceTypes.set(deviceType, (aggregated.deviceTypes.get(deviceType) || 0) + 1);
    
    // Track network types
    if (metric.deviceInfo.connection) {
      const networkType = metric.deviceInfo.connection.effectiveType;
      aggregated.networkTypes.set(networkType, (aggregated.networkTypes.get(networkType) || 0) + 1);
    }
  });
  
  // Calculate averages
  const count = batch.metrics.length;
  if (count > 0) {
    aggregated.avgResponseTime /= count;
    aggregated.avgErrorRate /= count;
    aggregated.avgMemoryUsage /= count;
    aggregated.avgCacheHitRate /= count;
  }
  
  // Log aggregated insights
  logRealTimeInsights(aggregated, batch);
  
  // Store critical metrics for alerting
  if (aggregated.criticalIssues > 0) {
    await handleCriticalIssues(aggregated, batch);
  }
  
  // Update real-time dashboard data
  await updateRealTimeDashboard(aggregated, batch);
}

/**
 * Determine device type from user agent
 */
function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  if (ua.includes('desktop') || ua.includes('windows') || ua.includes('macintosh')) return 'desktop';
  
  return 'unknown';
}

interface AggregatedMetrics {
  totalMetrics: number;
  avgResponseTime: number;
  avgErrorRate: number;
  avgMemoryUsage: number;
  avgCacheHitRate: number;
  uniqueSessions: Set<string>;
  uniqueUsers: Set<string>;
  emergingMarketMetrics: number;
  criticalIssues: number;
  deviceTypes: Map<string, number>;
  networkTypes: Map<string, number>;
}

/**
 * Log real-time insights
 */
function logRealTimeInsights(aggregated: AggregatedMetrics, batch: RealTimeMetricsBatch) {
  console.log('📊 Real-Time Metrics Batch Processed:', {
    timestamp: new Date(batch.timestamp).toISOString(),
    totalMetrics: aggregated.totalMetrics,
    uniqueSessions: aggregated.uniqueSessions.size,
    uniqueUsers: aggregated.uniqueUsers.size,
    avgResponseTime: `${Math.round(aggregated.avgResponseTime)}ms`,
    avgErrorRate: `${(aggregated.avgErrorRate * 100).toFixed(2)}%`,
    avgMemoryUsage: `${(aggregated.avgMemoryUsage * 100).toFixed(1)}%`,
    avgCacheHitRate: `${(aggregated.avgCacheHitRate * 100).toFixed(1)}%`,
    emergingMarketUsers: aggregated.emergingMarketMetrics,
    criticalIssues: aggregated.criticalIssues,
    topDeviceType: aggregated.deviceTypes.size > 0 
      ? Array.from(aggregated.deviceTypes.entries()).sort((a, b) => b[1] - a[1])[0][0] 
      : 'unknown',
    topNetworkType: aggregated.networkTypes.size > 0 
      ? Array.from(aggregated.networkTypes.entries()).sort((a, b) => b[1] - a[1])[0][0] 
      : 'unknown',
  });
}

/**
 * Handle critical issues detected in real-time
 */
async function handleCriticalIssues(aggregated: AggregatedMetrics, batch: RealTimeMetricsBatch) {
  const criticalData = {
    timestamp: batch.timestamp,
    totalIssues: aggregated.criticalIssues,
    affectedSessions: aggregated.uniqueSessions.size,
    avgResponseTime: aggregated.avgResponseTime,
    avgErrorRate: aggregated.avgErrorRate,
    avgMemoryUsage: aggregated.avgMemoryUsage,
  };
  
  console.error('🚨 CRITICAL ISSUES DETECTED:', criticalData);
  
  // In production, you would:
  // 1. Send alerts to monitoring service (e.g., Sentry, DataDog)
  // 2. Notify development team via Slack/email
  // 3. Trigger auto-scaling if needed
  // 4. Create incident ticket
  
  // For now, log the critical issues
  try {
    const response = await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Critical performance issues detected: ${criticalData.totalIssues} issues affecting ${criticalData.affectedSessions} sessions`,
        context: 'real-time monitoring',
        severity: 'critical',
        category: 'performance',
        additionalData: criticalData,
        timestamp: Date.now(),
      }),
    });
    
    if (!response.ok) {
      console.warn('Failed to report critical issues to error tracking');
    }
    
  } catch (error) {
    console.warn('Error reporting critical issues:', error);
  }
}

/**
 * Update real-time dashboard data
 */
async function updateRealTimeDashboard(aggregated: AggregatedMetrics, batch: RealTimeMetricsBatch) {
  // Store latest metrics in memory for dashboard API
  // In production, you'd use Redis or another fast storage
  
  const dashboardData = {
    lastUpdate: batch.timestamp,
    activeSessions: aggregated.uniqueSessions.size,
    activeUsers: aggregated.uniqueUsers.size,
    currentMetrics: {
      responseTime: Math.round(aggregated.avgResponseTime),
      errorRate: parseFloat((aggregated.avgErrorRate * 100).toFixed(2)),
      memoryUsage: parseFloat((aggregated.avgMemoryUsage * 100).toFixed(1)),
      cacheHitRate: parseFloat((aggregated.avgCacheHitRate * 100).toFixed(1)),
    },
    emergingMarketStats: {
      totalUsers: aggregated.emergingMarketMetrics,
      percentage: parseFloat(((aggregated.emergingMarketMetrics / aggregated.totalMetrics) * 100).toFixed(1)),
    },
    criticalIssues: aggregated.criticalIssues,
    deviceBreakdown: Object.fromEntries(aggregated.deviceTypes),
    networkBreakdown: Object.fromEntries(aggregated.networkTypes),
  };
  
  // In a real implementation, store this in Redis or database
  console.log('📊 Dashboard data updated:', dashboardData.currentMetrics);
}

/**
 * GET endpoint for retrieving current real-time status
 */
export async function GET(request: NextRequest) {
  try {
    const config = getProductionConfig();
    
    // Return current real-time monitoring status
    const status = {
      enabled: config.monitoring.enabled,
      environment: config.deployment.environment,
      features: {
        webSocketMonitoring: config.monitoring.enabled,
        realTimeAlerts: config.features.performance.errorReporting,
        performanceTracking: config.features.performance.webVitalsTracking,
      },
      endpoints: {
        metrics: '/api/monitoring/metrics',
        websocket: '/api/monitoring/ws',
        health: '/api/deployment/health',
      },
      thresholds: {
        criticalResponseTime: 5000,
        emergencyErrorRate: 0.25,
        memoryLeakThreshold: 0.95,
      },
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(status);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get monitoring status' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}