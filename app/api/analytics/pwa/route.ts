/**
 * PWA Analytics API
 * Comprehensive analytics endpoint for PWA performance, user behavior, and business metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import type { PWAReport } from '@/lib/pwa-analytics';
import { getProductionConfig } from '@/lib/production-config';
import { getDeploymentEnvironment } from '@/lib/deployment-utils';

export async function GET(request: NextRequest) {
  try {
    const config = getProductionConfig();
    const env = getDeploymentEnvironment();
    
    // Check if analytics tracking is enabled
    if (config.features.rolloutPercentage.analyticsTracking === 0 && env.isProd) {
      return NextResponse.json(
        { message: 'Analytics tracking disabled' },
        { status: 200 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as 'day' | 'week' | 'month' || 'week';
    const format = searchParams.get('format') || 'json';
    
    // Generate PWA analytics report
    const { pwaAnalytics } = await import('@/lib/pwa-analytics');
    const report = await pwaAnalytics.generatePWAReport(period);
    
    if (format === 'csv') {
      const csv = convertReportToCSV(report);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="pwa-analytics-${period}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      period,
      environment: env.isProd ? 'production' : env.isStaging ? 'staging' : 'development',
      report,
    });
    
  } catch (error) {
    console.error('PWA analytics API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PWA analytics report',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for tracking PWA events
 */
export async function POST(request: NextRequest) {
  try {
    const config = getProductionConfig();
    const env = getDeploymentEnvironment();
    
    if (config.features.rolloutPercentage.analyticsTracking === 0 && env.isProd) {
      return NextResponse.json(
        { message: 'Analytics tracking disabled' },
        { status: 200 }
      );
    }
    
    const body = await request.json();
    const { event, data, userId, sessionId } = body;
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      );
    }
    
    // Track the event
    const { pwaAnalytics } = await import('@/lib/pwa-analytics');
    pwaAnalytics.trackEvent(event, data, userId);
    
    // Process specific PWA events
    await processPWAEvent(event, data, userId, sessionId);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('PWA event tracking error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to track PWA event',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Process specific PWA events for real-time analytics
 */
async function processPWAEvent(event: string, data: any, userId?: string, sessionId?: string) {
  const timestamp = Date.now();
  
  switch (event) {
    case 'pwa_install_prompt_shown':
      console.log('📱 PWA Install Prompt Shown:', { userId, sessionId, timestamp });
      break;
      
    case 'pwa_install_prompt_accepted':
      console.log('🎉 PWA Install Accepted:', { userId, sessionId, timestamp });
      // Track successful conversion
      break;
      
    case 'pwa_install_prompt_dismissed':
      console.log('❌ PWA Install Dismissed:', { userId, sessionId, timestamp, reason: data.reason });
      break;
      
    case 'offline_mode_activated':
      console.log('📴 Offline Mode Activated:', { userId, sessionId, timestamp });
      break;
      
    case 'service_worker_update':
      console.log('🔄 Service Worker Updated:', { timestamp, version: data.version });
      break;
      
    case 'audio_playback_started':
      console.log('🔊 Audio Playback Started:', { userId, sessionId, bookId: data.bookId, timestamp });
      break;
      
    case 'subscription_conversion':
      console.log('💰 Subscription Conversion:', { userId, amount: data.amount, plan: data.plan, timestamp });
      break;
      
    case 'emerging_market_user':
      console.log('🌍 Emerging Market User:', { 
        userId, 
        country: data.country, 
        networkType: data.networkType,
        deviceType: data.deviceType,
        timestamp 
      });
      break;
      
    default:
      console.log('📊 PWA Analytics Event:', { event, userId, sessionId, timestamp });
  }
}

/**
 * Convert report to CSV format for export
 */
function convertReportToCSV(report: PWAReport): string {
  const lines = [
    'Metric Category,Metric Name,Value,Unit,Target,Status',
    
    // Business Goals
    `Business Goals,Monthly Users,${report.goals.monthly.actualUsers},users,${report.goals.monthly.targetUsers},${report.goals.progress.users.toFixed(1)}%`,
    `Business Goals,Monthly Revenue,${report.goals.monthly.actualRevenue},USD,${report.goals.monthly.targetRevenue},${report.goals.progress.revenue.toFixed(1)}%`,
    `Business Goals,PWA Installs,${report.goals.monthly.actualInstalls},installs,${report.goals.monthly.installTarget},${report.goals.progress.installs.toFixed(1)}%`,
    
    // PWA Metrics
    `PWA Installation,Conversion Rate,${report.metrics.installation.conversionRate},%,40,${report.metrics.installation.conversionRate >= 40 ? 'On Track' : 'Below Target'}`,
    `PWA Installation,Prompts Shown,${report.metrics.installation.installPromptShown},count,-,Tracking`,
    `PWA Installation,Installs,${report.metrics.installation.installPromptAccepted},count,-,Tracking`,
    
    // Engagement
    `User Engagement,Daily Active Users,${report.metrics.engagement.dailyActiveUsers},users,-,Tracking`,
    `User Engagement,Session Duration,${Math.round(report.metrics.engagement.sessionDuration / 60)},minutes,10,${report.metrics.engagement.sessionDuration >= 600 ? 'On Track' : 'Below Target'}`,
    `User Engagement,Return Rate,${report.metrics.engagement.returnUserRate},%,70,${report.metrics.engagement.returnUserRate >= 70 ? 'On Track' : 'Below Target'}`,
    
    // Performance
    `Performance,LCP,${report.metrics.performance.largestContentfulPaint},ms,2500,${report.metrics.performance.largestContentfulPaint <= 2500 ? 'On Track' : 'Above Target'}`,
    `Performance,FCP,${report.metrics.performance.firstContentfulPaint},ms,1800,${report.metrics.performance.firstContentfulPaint <= 1800 ? 'On Track' : 'Above Target'}`,
    `Performance,TTI,${report.metrics.performance.timeToInteractive},ms,3500,${report.metrics.performance.timeToInteractive <= 3500 ? 'On Track' : 'Above Target'}`,
    
    // Offline
    `Offline,Usage Rate,${report.metrics.offline.offlineUsage},%,30,${report.metrics.offline.offlineUsage >= 30 ? 'On Track' : 'Below Target'}`,
    `Offline,Sync Success,${report.metrics.offline.syncSuccessRate},%,95,${report.metrics.offline.syncSuccessRate >= 95 ? 'On Track' : 'Below Target'}`,
    
    // Emerging Markets (top 5 countries)
    ...Object.entries(report.emergingMarketsBreakdown.userGrowth)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, users]) => 
        `Emerging Markets,${country} Users,${users},users,-,Tracking`
      ),
  ];
  
  return lines.join('\n');
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