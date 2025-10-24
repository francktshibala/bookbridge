// Admin endpoint for monitoring dictionary performance and AI costs
// Phase 2: Track cache hits, AI usage, and cost metrics

import { NextRequest, NextResponse } from 'next/server';
import { getAICostStats } from '@/lib/dictionary/AIUniversalLookup';
import { getCacheStats } from '@/lib/dictionary/cache';

interface DictionaryStats {
  cache: {
    size: number;
    hitRate: number;
    oldestEntry: string | null;
    pendingRequests: number;
  };
  ai: {
    enabled: boolean;
    dailyCost: number;
    dailyRequests: number;
    remainingBudget: number;
    maxRequestsPerIP: number;
  };
  system: {
    uptime: string;
    timestamp: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const cacheStats = getCacheStats();
    const aiStats = getAICostStats();

    const stats: DictionaryStats = {
      cache: cacheStats,
      ai: {
        enabled: process.env.AI_DICTIONARY_ENABLED !== 'false',
        dailyCost: aiStats.dailyCost,
        dailyRequests: aiStats.dailyRequests,
        remainingBudget: aiStats.remainingBudget,
        maxRequestsPerIP: parseInt(process.env.AI_DICTIONARY_MAX_REQUESTS_PER_IP || '50')
      },
      system: {
        uptime: process.uptime().toFixed(2) + 's',
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('❌ Dictionary Stats: Error:', error);
    return NextResponse.json(
      { error: 'Failed to get dictionary stats' },
      { status: 500 }
    );
  }
}

// Allow POST to clear stats (admin action)
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'clear-cache') {
      const { clearDefinitionCache } = await import('@/lib/dictionary/cache');
      clearDefinitionCache();
      return NextResponse.json({ message: 'Cache cleared successfully' });
    }

    if (action === 'clear-ai-stats') {
      const { clearDailyStats } = await import('@/lib/dictionary/AIUniversalLookup');
      clearDailyStats();
      return NextResponse.json({ message: 'AI stats cleared successfully' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('❌ Dictionary Stats: Admin action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform admin action' },
      { status: 500 }
    );
  }
}