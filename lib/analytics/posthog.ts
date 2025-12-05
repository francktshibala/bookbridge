/**
 * PostHog Analytics Event Tracking Utilities
 * Centralized event tracking for all 4 conversion gates
 */

import posthog from 'posthog-js';

/**
 * Track custom events in PostHog
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  
  try {
    posthog.capture(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
    console.log(`📊 PostHog: Tracked event "${eventName}"`, properties);
  } catch (error) {
    console.error('PostHog tracking error:', error);
  }
}

/**
 * Gate 1: Signup Events
 */
export function trackSignupStarted(source?: string) {
  trackEvent('signup_started', {
    source: source || 'unknown',
    timestamp: new Date().toISOString(),
  });
}

export function trackUserSignedUp(source?: string, method?: string, email?: string) {
  trackEvent('user_signed_up', {
    source: source || 'unknown',
    signup_method: method || 'email',
    email: email ? email.substring(0, 3) + '***' : undefined, // Partial email for privacy
    timestamp: new Date().toISOString(),
  });
}

export function trackEmailVerified(userId: string, email?: string) {
  trackEvent('email_verified', {
    user_id: userId,
    email: email ? email.substring(0, 3) + '***' : undefined,
    timestamp: new Date().toISOString(),
  });
}

export function trackSignupAbandoned(source?: string, step?: string) {
  trackEvent('signup_abandoned', {
    source: source || 'unknown',
    abandoned_at_step: step || 'unknown',
    timestamp: new Date().toISOString(),
  });
}

export function trackPasswordSaved(success: boolean, method?: string) {
  trackEvent(success ? 'signup_password_saved' : 'signup_password_failed', {
    method: method || 'supabase_signup',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Gate 2: First Use Events (placeholder for Increment 3)
 */
export function trackFirstBookOpened(bookId: string, bookTitle: string) {
  trackEvent('first_book_opened', {
    book_id: bookId,
    book_title: bookTitle,
    timestamp: new Date().toISOString(),
  });
}

export function trackFirstChapterStarted(bookId: string, chapterIndex: number) {
  trackEvent('first_chapter_started', {
    book_id: bookId,
    chapter_index: chapterIndex,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Gate 3: Wow Moment Events (placeholder for Increment 4)
 */
export function trackChapterCompleted(bookId: string, chapterIndex: number) {
  trackEvent('chapter_completed', {
    book_id: bookId,
    chapter_index: chapterIndex,
    timestamp: new Date().toISOString(),
  });
}

export function trackAISimplificationUsed(level: string, bookId: string) {
  trackEvent('ai_simplification_used', {
    cefr_level: level,
    book_id: bookId,
    timestamp: new Date().toISOString(),
  });
}

export function trackAudioPlayed(bookId: string, duration: number) {
  trackEvent('audio_played', {
    book_id: bookId,
    duration_seconds: duration,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Gate 4: Retention Events (placeholder for Increment 5)
 */
export function trackReturnVisit(daysSinceSignup: number) {
  trackEvent('user_returned', {
    days_since_signup: daysSinceSignup,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Error Tracking (Phase 4: Improve Error Handling)
 */
export function trackSignupError(errorType: string, errorMessage: string, recoveryAction?: string) {
  trackEvent('signup_error', {
    error_type: errorType,
    error_message: errorMessage,
    recovery_action: recoveryAction,
    timestamp: new Date().toISOString(),
  });
}

export function trackLoginError(errorType: string, errorMessage: string, recoveryAction?: string) {
  trackEvent('login_error', {
    error_type: errorType,
    error_message: errorMessage,
    recovery_action: recoveryAction,
    timestamp: new Date().toISOString(),
  });
}

export function trackEmailError(errorType: string, errorMessage: string) {
  trackEvent('email_error', {
    error_type: errorType,
    error_message: errorMessage,
    timestamp: new Date().toISOString(),
  });
}

