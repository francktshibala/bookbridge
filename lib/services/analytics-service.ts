/**
 * Analytics Service
 *
 * Pure functions for tracking user behavior, performance, and engagement.
 * Created as part of Usage Analytics Implementation Plan (v2.1).
 *
 * Architecture:
 * - Pure functions (no state, no side effects beyond console/gtag)
 * - Feature-flagged (NEXT_PUBLIC_ENABLE_ANALYTICS)
 * - Type-safe event tracking
 * - GPT-5 validated pattern
 *
 * @module lib/services/analytics-service
 */

import { type CEFRLevel } from '@/contexts/AudioContext';

export type AnalyticsEvent =
  // Performance & Load Funnel
  | 'load_started'
  | 'load_completed'
  | 'load_failed'
  | 'first_audio_ready'
  // Book & Content
  | 'book_selected'
  | 'chapter_started'
  | 'chapter_completed'
  // CEFR & Level
  | 'level_switched'
  | 'level_switch_started'
  | 'level_switch_ready'
  | 'level_switch_aborted'
  // Audio Playback
  | 'audio_played'
  | 'audio_paused'
  | 'audio_completed'
  | 'audio_stall'
  | 'audio_error'
  | 'audio_retry'
  // Dictionary
  | 'dict_lookup_started'
  | 'dict_success'
  | 'dict_fallback'
  | 'dict_error'
  // Session & Engagement
  | 'bundle_completed'
  | 'session_start'
  | 'session_end'
  | 'resume_available'
  | 'resume_clicked'
  // UX Preferences
  | 'speed_changed'
  | 'theme_changed'
  // AI Tutor
  | 'tutor_opened'
  | 'tutor_message_sent'
  | 'tutor_stream_completed';

export interface AnalyticsEventData {
  // Common fields (always included by withCommon helper)
  timestamp?: number;
  session_id?: string;
  book_id?: string;
  book_title?: string;
  level?: CEFRLevel | 'original';
  content_mode?: 'simplified' | 'original';

  // Performance context
  request_id?: string;
  ms_load?: number;
  ms_first_audio?: number;
  ms_switch?: number;
  cache_hit?: boolean;
  fast_path?: boolean;
  page_size?: number;

  // Position context
  chapter?: number;
  bundle_index?: number;
  sentence_index?: number;

  // Audio context
  is_playing?: boolean;
  playback_speed?: number;
  audio_time?: number;
  network_type?: string;
  device?: string;

  // Dictionary context
  word?: string;
  pos_hint?: string;
  source?: 'ai' | 'wiktionary' | 'free';
  examples_count?: number;
  cached?: boolean;

  // Engagement metrics
  session_duration_seconds?: number;
  bundles_completed?: number;
  hours_since_last_read?: number;
  within_24_hours?: boolean;

  // Level switching
  from_level?: CEFRLevel | 'original';
  to_level?: CEFRLevel | 'original';
  from_speed?: number;
  to_speed?: number;
  from_theme?: string;
  to_theme?: string;
  from_chapter?: number;

  // AI Tutor
  chars_in?: number;
  chars_out?: number;
  ms_stream?: number;
  turns?: number;

  // Error context
  error_message?: string;
  error_code?: string;

  // Custom fields
  [key: string]: any;
}

/**
 * Helper to enrich event data with common fields
 * GPT-5 Recommendation: DRY timestamp/session/book/level context
 */
export function withCommon(
  eventData: AnalyticsEventData,
  context?: {
    sessionId?: string;
    bookId?: string;
    bookTitle?: string;
    level?: CEFRLevel | 'original';
    contentMode?: 'simplified' | 'original';
  }
): AnalyticsEventData {
  return {
    timestamp: Date.now(),
    session_id: context?.sessionId || getOrCreateSessionId(),
    book_id: context?.bookId,
    book_title: context?.bookTitle,
    level: context?.level,
    content_mode: context?.contentMode,
    ...eventData
  };
}

/**
 * Pure function to track analytics event
 *
 * @param eventName - Event identifier (see AnalyticsEvent type)
 * @param eventData - Structured event data
 *
 * @design
 * - Pure function (no state, no side effects beyond console/gtag)
 * - Non-blocking (never throws, never awaits)
 * - Feature-flagged (NEXT_PUBLIC_ENABLE_ANALYTICS)
 * - GPT-5 validated pattern
 *
 * @example
 * trackEvent('book_selected', withCommon({
 *   book_id: 'pride-prejudice',
 *   level: 'A1'
 * }, { sessionId }));
 */
export function trackEvent(
  eventName: AnalyticsEvent,
  eventData: AnalyticsEventData
): void {
  // Feature flag check
  const ENABLE_ANALYTICS =
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

  if (!ENABLE_ANALYTICS) return;

  // Ensure timestamp
  const enrichedData = {
    timestamp: Date.now(),
    ...eventData
  };

  // Console logging (development)
  console.log(`[Analytics] ${eventName}`, enrichedData);

  // Google Analytics (production)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, {
      event_category: 'book_reading',
      ...enrichedData
    });
  }
}

/**
 * Generate session ID for analytics grouping
 * Stored in sessionStorage (persists during tab session)
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server-side';

  const STORAGE_KEY = 'bookbridge_session_id';
  let sessionId = sessionStorage.getItem(STORAGE_KEY);

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(STORAGE_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Calculate session duration (for session_end event)
 */
export function calculateSessionDuration(sessionStartTime: number): number {
  return Math.floor((Date.now() - sessionStartTime) / 1000);
}
