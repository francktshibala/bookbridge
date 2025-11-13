/**
 * usePauseMomentSurvey Hook
 *
 * Manages micro-feedback survey display logic:
 * - Triggers after 2-3 minutes of reading during pause moments
 * - Enforces cooldown rules (60 days between shows)
 * - Mutual exclusion with full feedback system
 * - Auto-dismisses after 30 seconds
 * - Keeps complexity OUT of featured-books page (Phase 4 pattern)
 *
 * @module hooks/usePauseMomentSurvey
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/SimpleAuthProvider';

// ============================================================================
// TYPES
// ============================================================================

export interface UsePauseMomentSurveyOptions {
  enabled?: boolean; // Feature flag control
  minSessionDuration?: number; // Seconds (default: 120 = 2 min)
  maxSessionDuration?: number; // Seconds (default: 180 = 3 min)
  cooldownDays?: number; // Days between shows (default: 60)
  dismissalCooldownDays?: number; // Days after dismissal (default: 60)
}

export interface UsePauseMomentSurveyResult {
  shouldShow: boolean;
  sessionDuration: number;
  currentBook: { id: string; title: string } | null;
  currentLevel: string | null;
  handleClose: () => void;
  handleSubmit: (data: {
    npsScore?: number;
    sentiment?: 'negative' | 'neutral' | 'positive';
    feedbackText?: string;
    email?: string;
  }) => Promise<void>;
  handleDismiss: () => void;
  // Internal function exposed for manual trigger (optional)
  checkTriggerConditions: (isPlaying: boolean, bookData: any, level: string) => void;
}

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  LAST_SHOWN: 'micro_feedback_last_shown',
  LAST_DISMISSED: 'micro_feedback_last_dismissed',
  LAST_SUBMITTED: 'micro_feedback_last_submitted',
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function usePauseMomentSurvey(
  options: UsePauseMomentSurveyOptions = {}
): UsePauseMomentSurveyResult {
  const {
    enabled = true,
    minSessionDuration = 120, // 2 minutes
    maxSessionDuration = 180, // 3 minutes
    cooldownDays = 60,
    dismissalCooldownDays = 60,
  } = options;

  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [currentBook, setCurrentBook] = useState<{ id: string; title: string } | null>(null);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);

  // Session tracking
  const sessionStartRef = useRef<number>(Date.now());
  const lastPlayStateRef = useRef<boolean>(false);
  const hasInteractedRef = useRef<boolean>(false);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // COOLDOWN LOGIC
  // ============================================================================

  const checkCooldowns = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;

    const now = Date.now();
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    const dismissalCooldownMs = dismissalCooldownDays * 24 * 60 * 60 * 1000;

    // Check last shown
    const lastShown = localStorage.getItem(STORAGE_KEYS.LAST_SHOWN);
    if (lastShown && now - parseInt(lastShown) < cooldownMs) {
      return false;
    }

    // Check last dismissed (higher priority)
    const lastDismissed = localStorage.getItem(STORAGE_KEYS.LAST_DISMISSED);
    if (lastDismissed && now - parseInt(lastDismissed) < dismissalCooldownMs) {
      return false;
    }

    // Check last submitted
    const lastSubmitted = localStorage.getItem(STORAGE_KEYS.LAST_SUBMITTED);
    if (lastSubmitted && now - parseInt(lastSubmitted) < cooldownMs) {
      return false;
    }

    return true;
  }, [cooldownDays, dismissalCooldownDays]);

  // ============================================================================
  // TRIGGER LOGIC (Listen to isPlaying from parent via props)
  // ============================================================================

  const checkTriggerConditions = useCallback((isPlaying: boolean, bookData: any, level: string) => {
    if (!enabled) return;
    if (shouldShow) return; // Already showing
    if (hasInteractedRef.current) return; // User already interacted
    if (!checkCooldowns()) return;

    const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    setSessionDuration(duration);

    // Trigger only when user PAUSES (transition from playing → paused)
    const wasPlaying = lastPlayStateRef.current;
    const nowPaused = !isPlaying;

    if (wasPlaying && nowPaused) {
      // Check if within time window (2-3 minutes)
      if (duration >= minSessionDuration && duration <= maxSessionDuration) {
        console.log('[usePauseMomentSurvey] ✅ Trigger conditions met:', {
          duration,
          minSessionDuration,
          maxSessionDuration,
          book: bookData?.title,
          level,
        });

        // Capture current reading context
        setCurrentBook(bookData ? { id: bookData.id, title: bookData.title } : null);
        setCurrentLevel(level);

        // Show survey
        setShouldShow(true);
        localStorage.setItem(STORAGE_KEYS.LAST_SHOWN, Date.now().toString());

        // Auto-dismiss after 30 seconds
        autoDismissTimerRef.current = setTimeout(() => {
          console.log('[usePauseMomentSurvey] ⏱️ Auto-dismiss timeout reached');
          handleDismiss();
        }, 30000);
      }
    }

    // Update last play state
    lastPlayStateRef.current = isPlaying;
  }, [enabled, shouldShow, checkCooldowns, minSessionDuration, maxSessionDuration]);

  // ============================================================================
  // PUBLIC API (Handlers passed to UI component)
  // ============================================================================

  const handleClose = useCallback(() => {
    console.log('[usePauseMomentSurvey] User closed survey (no submission)');
    setShouldShow(false);
    hasInteractedRef.current = true;

    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  }, []);

  const handleSubmit = useCallback(async (data: {
    npsScore?: number;
    sentiment?: 'negative' | 'neutral' | 'positive';
    feedbackText?: string;
    email?: string;
  }) => {
    console.log('[usePauseMomentSurvey] Submitting feedback:', data);

    try {
      // Get device type
      const deviceType = /mobile/i.test(navigator.userAgent) ? 'mobile' :
                        /tablet/i.test(navigator.userAgent) ? 'tablet' : 'desktop';

      // Call API endpoint
      const response = await fetch('/api/feedback/micro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          sessionDuration,
          deviceType,
          lastBookId: currentBook?.id,
          lastLevel: currentLevel,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('[usePauseMomentSurvey] ✅ Submission successful:', result);

      // Update local storage
      localStorage.setItem(STORAGE_KEYS.LAST_SUBMITTED, Date.now().toString());

      // Mark as interacted
      hasInteractedRef.current = true;
      setShouldShow(false);

      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    } catch (error) {
      console.error('[usePauseMomentSurvey] ❌ Submission failed:', error);
      // Still close the survey to avoid annoying the user
      handleClose();
    }
  }, [sessionDuration, currentBook, currentLevel, handleClose]);

  const handleDismiss = useCallback(() => {
    console.log('[usePauseMomentSurvey] User dismissed survey');

    // Record dismissal in database (async, non-blocking)
    const deviceType = /mobile/i.test(navigator.userAgent) ? 'mobile' :
                      /tablet/i.test(navigator.userAgent) ? 'tablet' : 'desktop';

    fetch('/api/feedback/micro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dismissed: true,
        sessionDuration,
        deviceType,
        lastBookId: currentBook?.id,
        lastLevel: currentLevel,
      }),
    }).catch(err => console.error('[usePauseMomentSurvey] Dismissal tracking failed:', err));

    // Update local storage
    localStorage.setItem(STORAGE_KEYS.LAST_DISMISSED, Date.now().toString());

    // Close survey
    hasInteractedRef.current = true;
    setShouldShow(false);

    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  }, [sessionDuration, currentBook, currentLevel]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, []);

  // ============================================================================
  // RETURN PUBLIC API
  // ============================================================================

  return {
    shouldShow,
    sessionDuration,
    currentBook,
    currentLevel,
    handleClose,
    handleSubmit,
    handleDismiss,
    checkTriggerConditions,
  };
}

// ============================================================================
// HELPER: Integrate with AudioContext
// ============================================================================

/**
 * Helper function to call from featured-books page:
 *
 * ```tsx
 * const audioContext = useAudioContext();
 * const microFeedback = usePauseMomentSurvey({ enabled: true });
 *
 * // In useEffect, pass audioContext state to trigger logic
 * useEffect(() => {
 *   if (audioContext.selectedBook) {
 *     microFeedback.checkTriggerConditions(
 *       audioContext.isPlaying,
 *       audioContext.selectedBook,
 *       audioContext.cefrLevel
 *     );
 *   }
 * }, [audioContext.isPlaying, audioContext.selectedBook, audioContext.cefrLevel]);
 * ```
 *
 * Note: This is pseudo-code. The actual integration will pass
 * the checkTriggerConditions function via the hook's return value.
 */
