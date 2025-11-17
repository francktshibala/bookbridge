/**
 * Telemetry utilities for catalog performance tracking
 * GPT-5 recommendation: Track TTFA, p50/p95, cacheHit, resultCount
 */

interface TelemetryEvent {
  event: string;
  duration?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

// In-memory storage for telemetry (replace with real analytics service)
const telemetryBuffer: TelemetryEvent[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Track catalog search performance
 */
export function trackCatalogSearch(params: {
  query?: string;
  filters?: Record<string, any>;
  resultCount: number;
  duration: number;
  cacheHit: boolean;
}) {
  logTelemetry({
    event: 'catalog_search',
    duration: params.duration,
    metadata: {
      hasQuery: !!params.query,
      filterCount: Object.keys(params.filters || {}).length,
      resultCount: params.resultCount,
      cacheHit: params.cacheHit,
      ttfa: params.duration // Time to first activity (GPT-5)
    },
    timestamp: Date.now()
  });
}

/**
 * Track pagination performance
 */
export function trackPagination(params: {
  cursor: string;
  resultCount: number;
  duration: number;
  cacheHit: boolean;
}) {
  logTelemetry({
    event: 'catalog_pagination',
    duration: params.duration,
    metadata: {
      resultCount: params.resultCount,
      cacheHit: params.cacheHit
    },
    timestamp: Date.now()
  });
}

/**
 * Track "no results" searches (GPT-5: important metric)
 */
export function trackNoResults(params: {
  query?: string;
  filters?: Record<string, any>;
}) {
  logTelemetry({
    event: 'catalog_no_results',
    metadata: {
      query: params.query,
      filterCount: Object.keys(params.filters || {}).length
    },
    timestamp: Date.now()
  });
}

/**
 * Log telemetry event to buffer
 */
function logTelemetry(event: TelemetryEvent) {
  telemetryBuffer.push(event);

  // Evict old events if buffer is full
  if (telemetryBuffer.length > MAX_BUFFER_SIZE) {
    telemetryBuffer.shift();
  }

  // In production, send to analytics service (PostHog, Segment, etc.)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Example: Send to analytics
    // analytics.track(event.event, event.metadata);
    console.debug('[Telemetry]', event);
  }
}

/**
 * Get telemetry summary (for debugging)
 */
export function getTelemetrySummary() {
  const searchEvents = telemetryBuffer.filter(e => e.event === 'catalog_search');
  const durations = searchEvents.map(e => e.duration!).filter(Boolean).sort((a, b) => a - b);

  if (durations.length === 0) {
    return { count: 0, p50: 0, p95: 0, avgResultCount: 0, cacheHitRate: 0 };
  }

  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const cacheHits = searchEvents.filter(e => e.metadata?.cacheHit).length;
  const avgResultCount = searchEvents.reduce((sum, e) => sum + (e.metadata?.resultCount || 0), 0) / searchEvents.length;

  return {
    count: searchEvents.length,
    p50: Math.round(p50),
    p95: Math.round(p95),
    avgResultCount: Math.round(avgResultCount),
    cacheHitRate: Math.round((cacheHits / searchEvents.length) * 100)
  };
}
