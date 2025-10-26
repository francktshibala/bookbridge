/**
 * Auto-Resume Analytics Events
 * Tracks user behavior for Netflix-style auto-resume feature
 */

export type AutoResumeSource = 'url' | 'memory' | 'localStorage' | 'api';

export interface AutoResumeStartedEvent {
  source: AutoResumeSource;
  bookId: string;
  timestamp: number;
}

export interface AutoResumeSucceededEvent {
  bookId: string;
  chapter: number;
  sentence: number;
  completion: number;
  source: AutoResumeSource;
  latencyMs: number;
  scrollSuccess: boolean;
  sentenceFound: boolean;
}

export interface AutoResumeCancelledEvent {
  bookId?: string;
  reason: 'user_click' | 'unmount' | 'error' | 'feature_disabled';
  source?: AutoResumeSource;
}

/**
 * Track when auto-resume starts
 */
export function trackAutoResumeStart(event: AutoResumeStartedEvent): void {
  console.log('📊 [Analytics] auto_resume_started:', {
    source: event.source,
    bookId: event.bookId,
    timestamp: new Date(event.timestamp).toISOString()
  });

  // TODO: Connect to actual analytics service (PostHog/Mixpanel)
  // analytics.track('auto_resume_started', event);
}

/**
 * Track when auto-resume succeeds
 */
export function trackAutoResumeSuccess(event: AutoResumeSucceededEvent): void {
  console.log('📊 [Analytics] auto_resume_succeeded:', {
    bookId: event.bookId,
    position: `Chapter ${event.chapter}, Sentence ${event.sentence}`,
    completion: `${event.completion.toFixed(1)}%`,
    source: event.source,
    latency: `${event.latencyMs}ms`,
    scrollSuccess: event.scrollSuccess,
    sentenceFound: event.sentenceFound
  });

  // TODO: Connect to actual analytics service (PostHog/Mixpanel)
  // analytics.track('auto_resume_succeeded', event);
}

/**
 * Track when auto-resume is cancelled
 */
export function trackAutoResumeCancel(event: AutoResumeCancelledEvent): void {
  console.log('📊 [Analytics] auto_resume_cancelled:', {
    bookId: event.bookId || 'unknown',
    reason: event.reason,
    source: event.source || 'unknown'
  });

  // TODO: Connect to actual analytics service (PostHog/Mixpanel)
  // analytics.track('auto_resume_cancelled', event);
}

/**
 * Helper to measure latency
 */
export function createLatencyTracker() {
  const startTime = Date.now();

  return {
    getLatency: () => Date.now() - startTime,
    startTime
  };
}
