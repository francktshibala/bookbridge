/**
 * Feedback Service
 *
 * Pure functions for handling user feedback submission and banner logic.
 * Created as part of Feedback Collection Implementation Plan (Week 1).
 *
 * Architecture:
 * - Pure functions (no state, no side effects beyond database writes)
 * - Type-safe feedback handling
 * - LocalStorage management for banner dismissal
 * - GPT-5 validated pattern
 *
 * @module lib/services/feedback-service
 */

import { prisma } from '@/lib/prisma';

// ===== Types =====

export interface FeedbackFormData {
  // Step 1: Contact & NPS
  email: string;
  npsScore: number; // 1-10

  // Step 2: Details (all optional)
  name?: string;
  source?: string;
  purpose?: string[];
  featuresUsed?: string[];
  improvement?: string;
  wantsInterview?: boolean;
}

export interface FeedbackContextData {
  sessionDuration?: number; // seconds
  userAgent?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  pagesViewed?: number;
  path?: string; // Where feedback was initiated
  userId?: string; // If logged in
}

export interface SubmitFeedbackParams {
  formData: FeedbackFormData;
  contextData?: FeedbackContextData;
  signal?: AbortSignal; // For cancellation
}

export interface FeedbackBannerContext {
  sessionStartTime: number; // timestamp
  currentTime: number; // timestamp
  hasSubmittedFeedback: boolean;
  path: string;
}

// ===== Constants =====

const BANNER_DELAY_MS = 60000; // 60 seconds
const BANNER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const STORAGE_KEY_DISMISSED = 'feedback_banner_dismissed_at';
const STORAGE_KEY_SUBMITTED = 'feedback_submitted';
const STORAGE_KEY_SESSION_START = 'feedback_session_start';

// ===== Pure Functions =====

/**
 * Submit feedback to database
 *
 * Pure function that saves feedback data to Prisma/PostgreSQL.
 * Throws on validation errors or database failures.
 *
 * @param params - Feedback form data + context
 * @returns Feedback ID on success
 */
export async function submitFeedback({
  formData,
  contextData,
  signal
}: SubmitFeedbackParams): Promise<string> {
  // Validation
  if (!formData.email || !formData.email.includes('@')) {
    throw new Error('Valid email is required');
  }

  if (!formData.npsScore || formData.npsScore < 1 || formData.npsScore > 10) {
    throw new Error('NPS score must be between 1 and 10');
  }

  // Check for abort signal
  if (signal?.aborted) {
    throw new Error('Feedback submission aborted');
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        // Contact
        email: formData.email.trim().toLowerCase(),
        name: formData.name?.trim() || null,

        // Discovery
        source: formData.source || 'unknown',
        purpose: formData.purpose || [],
        featuresUsed: formData.featuresUsed || [],

        // Feedback
        improvement: formData.improvement || '',
        npsScore: formData.npsScore,
        wantsInterview: formData.wantsInterview || false,

        // Context
        sessionDuration: contextData?.sessionDuration,
        userAgent: contextData?.userAgent,
        deviceType: contextData?.deviceType,
        pagesViewed: contextData?.pagesViewed,
        path: contextData?.path,
        userId: contextData?.userId || null,
      },
    });

    return feedback.id;
  } catch (error) {
    if (signal?.aborted) {
      throw new Error('Feedback submission aborted');
    }

    console.error('[FeedbackService] Failed to submit feedback:', error);
    throw new Error('Failed to save feedback. Please try again.');
  }
}

/**
 * Check if feedback banner should be shown
 *
 * Pure function that determines banner eligibility based on:
 * - 60+ seconds of engagement
 * - Not dismissed in last 7 days
 * - Not already submitted feedback
 * - Not dismissed in current session
 *
 * @param context - Session timing and state
 * @returns true if banner should show
 */
export function shouldShowBanner(context: FeedbackBannerContext): boolean {
  // Check if user has been active for 60+ seconds
  const sessionDuration = context.currentTime - context.sessionStartTime;
  if (sessionDuration < BANNER_DELAY_MS) {
    return false;
  }

  // Check if already submitted (localStorage)
  if (context.hasSubmittedFeedback) {
    return false;
  }

  // Check if dismissed in last 7 days (localStorage)
  if (typeof window !== 'undefined') {
    const dismissedAt = localStorage.getItem(STORAGE_KEY_DISMISSED);
    if (dismissedAt) {
      const timeSinceDismissal = Date.now() - parseInt(dismissedAt, 10);
      if (timeSinceDismissal < BANNER_COOLDOWN_MS) {
        return false;
      }
    }

    // Check if dismissed in current session (sessionStorage)
    const dismissedThisSession = sessionStorage.getItem('feedback_banner_dismissed_session');
    if (dismissedThisSession) {
      return false;
    }
  }

  return true;
}

/**
 * Mark feedback banner as dismissed
 *
 * Stores dismissal timestamp in localStorage (7-day cooldown)
 * and sessionStorage (current session).
 */
export function markBannerDismissed(): void {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  localStorage.setItem(STORAGE_KEY_DISMISSED, now.toString());
  sessionStorage.setItem('feedback_banner_dismissed_session', 'true');
}

/**
 * Mark feedback as submitted
 *
 * Stores submission flag in localStorage to never show banner again.
 */
export function markFeedbackSubmitted(): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(STORAGE_KEY_SUBMITTED, 'true');
}

/**
 * Check if user has already submitted feedback
 */
export function hasSubmittedFeedback(): boolean {
  if (typeof window === 'undefined') return false;

  return localStorage.getItem(STORAGE_KEY_SUBMITTED) === 'true';
}

/**
 * Get session start time from storage or initialize
 */
export function getSessionStartTime(): number {
  if (typeof window === 'undefined') return Date.now();

  const stored = sessionStorage.getItem(STORAGE_KEY_SESSION_START);
  if (stored) {
    return parseInt(stored, 10);
  }

  const now = Date.now();
  sessionStorage.setItem(STORAGE_KEY_SESSION_START, now.toString());
  return now;
}

/**
 * Get device type from user agent
 */
export function getDeviceType(userAgent: string): 'mobile' | 'desktop' | 'tablet' {
  const ua = userAgent.toLowerCase();

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }

  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}
