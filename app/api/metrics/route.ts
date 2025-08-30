/**
 * Deployment Metrics Collection API
 * Collects and stores PWA performance and usage metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProductionConfig } from '@/lib/production-config';
import { getDeploymentEnvironment } from '@/lib/deployment-utils';

interface MetricData {
  event: string;
  timestamp: number;
  environment: string;
  deploymentId: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  featureFlags?: Record<string, boolean>;
  performance?: {
    loadTime?: number;
    ttfb?: number;
    fcp?: number;
    lcp?: number;
    cls?: number;
    fid?: number;
  };
  network?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
  device?: {
    userAgent?: string;
    viewport?: { width: number; height: number };
    deviceMemory?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const config = getProductionConfig();
    const env = getDeploymentEnvironment();
    
    // Check if metrics collection is enabled
    if (!config.monitoring.enabled && env.isProd) {
      return NextResponse.json(
        { message: 'Metrics collection disabled' },
        { status: 200 }
      );
    }
    
    const body = await request.json();
    const metric: MetricData = {
      ...body,
      timestamp: body.timestamp || Date.now(),
      environment: env.isProd ? 'production' : env.isStaging ? 'staging' : 'development',
      deploymentId: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    };
    
    // Validate required fields
    if (!metric.event) {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      );
    }
    
    // Process the metric based on type
    await processMetric(metric);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Metrics collection error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to collect metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process different types of metrics
 */
async function processMetric(metric: MetricData) {
  switch (metric.event) {
    case 'pwa_install_prompt_shown':
      await processPWAMetric(metric);
      break;
      
    case 'pwa_install_prompt_accepted':
      await processPWAMetric(metric);
      break;
      
    case 'pwa_install_prompt_dismissed':
      await processPWAMetric(metric);
      break;
      
    case 'offline_mode_activated':
      await processOfflineMetric(metric);
      break;
      
    case 'performance_measurement':
      await processPerformanceMetric(metric);
      break;
      
    case 'feature_flag_usage':
      await processFeatureFlagMetric(metric);
      break;
      
    case 'emerging_market_optimization':
      await processEmergingMarketMetric(metric);
      break;
      
    default:
      await processGenericMetric(metric);
  }
}

/**
 * Process PWA-specific metrics
 */
async function processPWAMetric(metric: MetricData) {
  console.log('PWA Metric:', {
    event: metric.event,
    userId: metric.userId,
    timestamp: new Date(metric.timestamp).toISOString(),
    data: metric.data,
  });
  
  // In production, you would send this to your analytics service
  // For now, we'll just log it
  
  if (metric.event === 'pwa_install_prompt_accepted') {
    // Track successful PWA installations
    console.log('🎉 PWA Installation Success:', metric.userId);
  }
}

/**
 * Process offline mode metrics
 */
async function processOfflineMetric(metric: MetricData) {
  console.log('Offline Metric:', {
    event: metric.event,
    userId: metric.userId,
    network: metric.network,
    timestamp: new Date(metric.timestamp).toISOString(),
  });
  
  // Track offline usage patterns
}

/**
 * Process performance metrics
 */
async function processPerformanceMetric(metric: MetricData) {
  if (!metric.performance) return;
  
  console.log('Performance Metric:', {
    event: metric.event,
    performance: metric.performance,
    network: metric.network,
    device: metric.device,
    timestamp: new Date(metric.timestamp).toISOString(),
  });
  
  // Check for performance issues
  const perf = metric.performance;
  const issues: string[] = [];
  
  if (perf.lcp && perf.lcp > 2500) {
    issues.push(`Slow LCP: ${perf.lcp}ms`);
  }
  
  if (perf.fid && perf.fid > 100) {
    issues.push(`High FID: ${perf.fid}ms`);
  }
  
  if (perf.cls && perf.cls > 0.1) {
    issues.push(`High CLS: ${perf.cls}`);
  }
  
  if (issues.length > 0) {
    console.warn('Performance Issues Detected:', issues);
  }
}

/**
 * Process feature flag usage metrics
 */
async function processFeatureFlagMetric(metric: MetricData) {
  console.log('Feature Flag Metric:', {
    event: metric.event,
    flags: metric.featureFlags,
    userId: metric.userId,
    timestamp: new Date(metric.timestamp).toISOString(),
  });
  
  // Track feature flag effectiveness
}

/**
 * Process emerging market optimization metrics
 */
async function processEmergingMarketMetric(metric: MetricData) {
  console.log('Emerging Market Metric:', {
    event: metric.event,
    network: metric.network,
    device: metric.device,
    data: metric.data,
    timestamp: new Date(metric.timestamp).toISOString(),
  });
  
  // Track emerging market specific optimizations
}

/**
 * Process generic metrics
 */
async function processGenericMetric(metric: MetricData) {
  console.log('Generic Metric:', {
    event: metric.event,
    data: metric.data,
    timestamp: new Date(metric.timestamp).toISOString(),
  });
}

/**
 * GET endpoint for metrics summary (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const config = getProductionConfig();
    const env = getDeploymentEnvironment();
    
    // Simple metrics summary
    const summary = {
      enabled: config.monitoring.enabled,
      environment: env.isProd ? 'production' : env.isStaging ? 'staging' : 'development',
      deploymentId: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
      endpoints: {
        health: '/api/deployment/health',
        metrics: '/api/metrics',
        errors: '/api/errors',
      },
      features: {
        performanceTracking: config.features.performance.webVitalsTracking,
        errorReporting: config.features.performance.errorReporting,
        emergingMarkets: config.features.emergingMarkets.enabled,
      },
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(summary);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get metrics summary' },
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