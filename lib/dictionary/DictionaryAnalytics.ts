// Dictionary Analytics & Monitoring System
// Phase 4: Production-ready telemetry and performance tracking

interface DictionaryMetrics {
  // Performance metrics
  responseTime: number;
  cacheHit: boolean;
  sourceUsed: 'memory' | 'indexeddb' | 'ai-openai' | 'ai-claude' | 'fallback';

  // Quality metrics
  aiProvider?: 'openai' | 'claude';
  hadRetry: boolean;
  wasHedged: boolean;

  // User context
  word: string;
  cefrLevel?: string;
  sessionId: string;
  userId?: string;
  timestamp: number;
}

interface DictionarySession {
  sessionId: string;
  startTime: number;
  wordsLookedUp: number;
  cacheHitRate: number;
  avgResponseTime: number;
  totalCost: number;
  userAgent: string;
}

interface DailyStats {
  date: string;
  totalLookups: number;
  uniqueWords: number;
  cacheHitRate: number;
  avgResponseTime: number;
  aiCost: number;
  aiSuccessRate: number;
  topWords: { word: string; count: number }[];
}

class DictionaryAnalytics {
  private sessionId: string;
  private sessionMetrics: DictionaryMetrics[] = [];
  private sessionStart: number;
  private isEnabled: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.isEnabled = typeof window !== 'undefined' &&
                    process.env.NODE_ENV === 'production' ||
                    process.env.NEXT_PUBLIC_ANALYTICS_TRACKING === 'true';

    if (this.isEnabled) {
      console.log('📊 Dictionary Analytics initialized, session:', this.sessionId);
      this.setupBeforeUnload();
    }
  }

  private generateSessionId(): string {
    return `dict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupBeforeUnload(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', () => {
      this.flushSession();
    });

    // Also flush every 5 minutes
    setInterval(() => {
      this.flushSession();
    }, 5 * 60 * 1000);
  }

  // Track a dictionary lookup
  trackLookup(metrics: Omit<DictionaryMetrics, 'sessionId' | 'timestamp'>): void {
    if (!this.isEnabled) return;

    const fullMetrics: DictionaryMetrics = {
      ...metrics,
      sessionId: this.sessionId,
      timestamp: Date.now()
    };

    this.sessionMetrics.push(fullMetrics);

    // Log for immediate debugging
    const source = fullMetrics.cacheHit ? '⚡ CACHE' : '🔄 AI';
    console.log(`📊 Dictionary: ${source} lookup for "${fullMetrics.word}" in ${fullMetrics.responseTime}ms`);

    // Send to analytics if we have enough data points
    if (this.sessionMetrics.length >= 10) {
      this.flushSession();
    }
  }

  // Track AI cost and usage
  trackAICost(provider: 'openai' | 'claude', estimatedCost: number, tokensUsed?: number): void {
    if (!this.isEnabled) return;

    // Store in localStorage for persistence
    try {
      const costData = JSON.parse(localStorage.getItem('dictionary_ai_costs') || '{}');
      const today = new Date().toISOString().split('T')[0];

      if (!costData[today]) {
        costData[today] = { totalCost: 0, requests: 0, providers: {} };
      }

      costData[today].totalCost += estimatedCost;
      costData[today].requests += 1;

      if (!costData[today].providers[provider]) {
        costData[today].providers[provider] = { cost: 0, requests: 0, tokens: 0 };
      }

      costData[today].providers[provider].cost += estimatedCost;
      costData[today].providers[provider].requests += 1;
      if (tokensUsed) {
        costData[today].providers[provider].tokens += tokensUsed;
      }

      localStorage.setItem('dictionary_ai_costs', JSON.stringify(costData));

      console.log(`💰 Dictionary: ${provider} cost $${estimatedCost.toFixed(4)}, daily total: $${costData[today].totalCost.toFixed(4)}`);
    } catch (error) {
      console.warn('Failed to track AI costs:', error);
    }
  }

  // Get session summary
  getSessionSummary(): DictionarySession {
    const now = Date.now();
    const sessionDuration = now - this.sessionStart;

    const cacheHits = this.sessionMetrics.filter(m => m.cacheHit).length;
    const totalLookups = this.sessionMetrics.length;

    const avgResponseTime = totalLookups > 0
      ? this.sessionMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalLookups
      : 0;

    return {
      sessionId: this.sessionId,
      startTime: this.sessionStart,
      wordsLookedUp: totalLookups,
      cacheHitRate: totalLookups > 0 ? cacheHits / totalLookups : 0,
      avgResponseTime,
      totalCost: this.estimateSessionCost(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };
  }

  private estimateSessionCost(): number {
    // Estimate cost based on non-cached lookups
    const aiLookups = this.sessionMetrics.filter(m => !m.cacheHit).length;
    return aiLookups * 0.001; // $0.001 per AI lookup estimate
  }

  // Flush session data to analytics endpoint
  private async flushSession(): Promise<void> {
    if (!this.isEnabled || this.sessionMetrics.length === 0) return;

    try {
      const sessionSummary = this.getSessionSummary();

      // Send to analytics endpoint
      await fetch('/api/analytics/dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: sessionSummary,
          metrics: this.sessionMetrics
        })
      });

      console.log(`📊 Dictionary: Flushed ${this.sessionMetrics.length} metrics to analytics`);

      // Clear session data
      this.sessionMetrics = [];

    } catch (error) {
      console.warn('Failed to flush dictionary analytics:', error);
    }
  }

  // Get daily statistics from localStorage
  getDailyStats(date?: string): DailyStats | null {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const costData = JSON.parse(localStorage.getItem('dictionary_ai_costs') || '{}');

      if (!costData[targetDate]) return null;

      // Calculate stats from session metrics
      const todayMetrics = this.sessionMetrics.filter(m => {
        const metricDate = new Date(m.timestamp).toISOString().split('T')[0];
        return metricDate === targetDate;
      });

      const uniqueWords = new Set(todayMetrics.map(m => m.word)).size;
      const cacheHits = todayMetrics.filter(m => m.cacheHit).length;
      const totalLookups = todayMetrics.length;

      const avgResponseTime = totalLookups > 0
        ? todayMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalLookups
        : 0;

      // Count word frequency
      const wordCounts = todayMetrics.reduce((acc, m) => {
        acc[m.word] = (acc[m.word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topWords = Object.entries(wordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

      return {
        date: targetDate,
        totalLookups,
        uniqueWords,
        cacheHitRate: totalLookups > 0 ? cacheHits / totalLookups : 0,
        avgResponseTime,
        aiCost: costData[targetDate].totalCost,
        aiSuccessRate: this.calculateAISuccessRate(todayMetrics),
        topWords
      };

    } catch (error) {
      console.warn('Failed to get daily stats:', error);
      return null;
    }
  }

  private calculateAISuccessRate(metrics: DictionaryMetrics[]): number {
    const aiMetrics = metrics.filter(m => !m.cacheHit);
    if (aiMetrics.length === 0) return 1;

    // Assume success if we got a response (no way to track failures in current architecture)
    return 1; // We'd need to enhance error tracking for this
  }

  // Performance monitoring alerts
  checkPerformanceAlerts(): void {
    if (!this.isEnabled || this.sessionMetrics.length < 5) return;

    const recentMetrics = this.sessionMetrics.slice(-10);
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    const cacheHitRate = recentMetrics.filter(m => m.cacheHit).length / recentMetrics.length;

    // Alert if performance degrades
    if (avgResponseTime > 3000) {
      console.warn('⚠️ Dictionary: High response times detected:', avgResponseTime + 'ms');
    }

    if (cacheHitRate < 0.3 && recentMetrics.length >= 10) {
      console.warn('⚠️ Dictionary: Low cache hit rate:', (cacheHitRate * 100).toFixed(1) + '%');
    }
  }

  // Export data for analysis
  exportSessionData(): string {
    const data = {
      session: this.getSessionSummary(),
      metrics: this.sessionMetrics,
      dailyStats: this.getDailyStats()
    };

    return JSON.stringify(data, null, 2);
  }
}

// Singleton instance
const dictionaryAnalytics = new DictionaryAnalytics();

export { dictionaryAnalytics, DictionaryAnalytics };
export type { DictionaryMetrics, DictionarySession, DailyStats };