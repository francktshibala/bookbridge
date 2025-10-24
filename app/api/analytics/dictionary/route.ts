// Dictionary analytics endpoint for receiving telemetry data
// Phase 4: Production monitoring and insights

import { NextRequest, NextResponse } from 'next/server';
import type { DictionaryMetrics, DictionarySession } from '@/lib/dictionary/DictionaryAnalytics';

interface AnalyticsPayload {
  session: DictionarySession;
  metrics: DictionaryMetrics[];
}

export async function POST(request: NextRequest) {
  try {
    const payload: AnalyticsPayload = await request.json();
    const { session, metrics } = payload;

    // Basic validation
    if (!session || !metrics || !Array.isArray(metrics)) {
      return NextResponse.json(
        { error: 'Invalid analytics payload' },
        { status: 400 }
      );
    }

    // Log analytics for monitoring (in production, send to proper analytics service)
    console.log('📊 Dictionary Analytics Received:');
    console.log(`  Session: ${session.sessionId}`);
    console.log(`  Duration: ${((Date.now() - session.startTime) / 1000 / 60).toFixed(1)} minutes`);
    console.log(`  Lookups: ${session.wordsLookedUp}`);
    console.log(`  Cache Hit Rate: ${(session.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`  Avg Response Time: ${session.avgResponseTime.toFixed(0)}ms`);
    console.log(`  Estimated Cost: $${session.totalCost.toFixed(4)}`);

    // Process metrics for insights
    const insights = analyzeMetrics(metrics);
    console.log('📈 Session Insights:', insights);

    // In production, you would:
    // 1. Store in analytics database (e.g., ClickHouse, BigQuery)
    // 2. Send to monitoring service (e.g., DataDog, New Relic)
    // 3. Update real-time dashboards
    // 4. Trigger alerts if thresholds exceeded

    // For now, we'll just store basic aggregates in memory/logs
    await storeAnalytics(session, metrics, insights);

    return NextResponse.json({
      success: true,
      insights,
      message: 'Analytics received successfully'
    });

  } catch (error) {
    console.error('❌ Dictionary Analytics Error:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics' },
      { status: 500 }
    );
  }
}

function analyzeMetrics(metrics: DictionaryMetrics[]) {
  if (metrics.length === 0) return {};

  const cacheHits = metrics.filter(m => m.cacheHit).length;
  const aiLookups = metrics.filter(m => !m.cacheHit).length;
  const hedgedCalls = metrics.filter(m => m.wasHedged).length;
  const retries = metrics.filter(m => m.hadRetry).length;

  const responseTimes = metrics.map(m => m.responseTime);
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

  const providers = metrics.reduce((acc, m) => {
    if (m.aiProvider) {
      acc[m.aiProvider] = (acc[m.aiProvider] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const uniqueWords = new Set(metrics.map(m => m.word)).size;
  const wordFrequency = metrics.reduce((acc, m) => {
    acc[m.word] = (acc[m.word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topWords = Object.entries(wordFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  return {
    performance: {
      cacheHitRate: cacheHits / metrics.length,
      avgResponseTime,
      p95ResponseTime,
      totalLookups: metrics.length,
      aiLookups,
      hedgedCallRate: hedgedCalls / Math.max(aiLookups, 1),
      retryRate: retries / Math.max(aiLookups, 1)
    },
    usage: {
      uniqueWords,
      repeatLookupRate: (metrics.length - uniqueWords) / metrics.length,
      topWords
    },
    infrastructure: {
      aiProviders: providers,
      sourceBreakdown: metrics.reduce((acc, m) => {
        acc[m.sourceUsed] = (acc[m.sourceUsed] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    }
  };
}

async function storeAnalytics(
  session: DictionarySession,
  metrics: DictionaryMetrics[],
  insights: any
) {
  // In a real production system, this would:
  // 1. Insert into time-series database
  // 2. Update real-time aggregates
  // 3. Trigger alerts if needed

  // For now, just log key metrics
  const timestamp = new Date().toISOString();

  console.log(`📊 [${timestamp}] Dictionary Session Analytics:`, {
    sessionId: session.sessionId,
    performance: insights.performance,
    cost: session.totalCost,
    userAgent: session.userAgent.substring(0, 50) + '...'
  });

  // Store in application memory for debugging (would be proper DB in production)
  if (typeof global !== 'undefined') {
    if (!global.dictionaryAnalytics) {
      global.dictionaryAnalytics = {
        sessions: [],
        dailyStats: {}
      };
    }

    global.dictionaryAnalytics.sessions.push({
      timestamp,
      session,
      insights
    });

    // Keep only last 100 sessions in memory
    if (global.dictionaryAnalytics.sessions.length > 100) {
      global.dictionaryAnalytics.sessions = global.dictionaryAnalytics.sessions.slice(-100);
    }
  }
}

// GET endpoint for retrieving analytics (for admin dashboard)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';

    if (typeof global === 'undefined' || !global.dictionaryAnalytics) {
      return NextResponse.json({
        message: 'No analytics data available',
        sessions: [],
        summary: null
      });
    }

    const data = global.dictionaryAnalytics;

    if (type === 'sessions') {
      return NextResponse.json({
        sessions: data.sessions.slice(-20), // Last 20 sessions
        total: data.sessions.length
      });
    }

    // Generate summary
    const recentSessions = data.sessions.slice(-50);
    const summary = {
      totalSessions: data.sessions.length,
      avgCacheHitRate: recentSessions.length > 0
        ? recentSessions.reduce((sum, s) => sum + s.session.cacheHitRate, 0) / recentSessions.length
        : 0,
      avgResponseTime: recentSessions.length > 0
        ? recentSessions.reduce((sum, s) => sum + s.session.avgResponseTime, 0) / recentSessions.length
        : 0,
      totalCost: recentSessions.reduce((sum, s) => sum + s.session.totalCost, 0),
      lastUpdated: recentSessions.length > 0 ? recentSessions[recentSessions.length - 1].timestamp : null
    };

    return NextResponse.json({
      summary,
      recentSessions: recentSessions.slice(-10),
      message: 'Analytics summary retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Analytics GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve analytics' },
      { status: 500 }
    );
  }
}

// Declare global type for TypeScript
declare global {
  var dictionaryAnalytics: {
    sessions: Array<{
      timestamp: string;
      session: DictionarySession;
      insights: any;
    }>;
    dailyStats: Record<string, any>;
  } | undefined;
}