'use client';

/**
 * useAutoFeedbackPrompt Hook
 *
 * Automatically opens feedback widget after 3-5 minutes of user activity.
 * Tracks session duration and triggers modal open when threshold is reached.
 *
 * Features:
 * - Tracks session duration from page load
 * - Auto-opens feedback widget after 3-5 minutes
 * - Only triggers once per session
 * - Respects cooldown period (localStorage)
 * - Checks if user already submitted feedback
 *
 * Architecture:
 * - Pure hook (no side effects beyond localStorage)
 * - Can be used by FeedbackWidget or parent component
 */

import { useEffect, useRef, useState } from 'react';

interface UseAutoFeedbackPromptOptions {
  /** Minimum session duration in seconds before showing (default: 180 = 3 minutes) */
  minDurationSeconds?: number;
  /** Maximum session duration in seconds to show (default: 300 = 5 minutes) */
  maxDurationSeconds?: number;
  /** Cooldown period in days before showing again (default: 60) */
  cooldownDays?: number;
  /** Callback when auto-prompt should be shown */
  onShouldShow: () => void;
}

const STORAGE_KEY_LAST_SHOWN = 'feedback_widget_auto_shown_at';
const STORAGE_KEY_SUBMITTED = 'feedback_submitted';

export function useAutoFeedbackPrompt({
  minDurationSeconds = 180, // 3 minutes
  maxDurationSeconds = 300, // 5 minutes
  cooldownDays = 60,
  onShouldShow,
}: UseAutoFeedbackPromptOptions) {
  const [hasTriggered, setHasTriggered] = useState(false);
  const sessionStartRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if we should show auto-prompt
    const checkAutoPrompt = () => {
      // Already triggered in this session
      if (hasTriggered) return;

      // Check if user already submitted feedback
      if (typeof window !== 'undefined') {
        const hasSubmitted = localStorage.getItem(STORAGE_KEY_SUBMITTED) === 'true';
        if (hasSubmitted) {
          // User already gave feedback, don't auto-prompt
          return;
        }

        // Check cooldown period
        const lastShown = localStorage.getItem(STORAGE_KEY_LAST_SHOWN);
        if (lastShown) {
          const daysSinceShown = (Date.now() - parseInt(lastShown, 10)) / (1000 * 60 * 60 * 24);
          console.log('[useAutoFeedbackPrompt] Cooldown check:', {
            lastShown: new Date(parseInt(lastShown, 10)).toISOString(),
            daysSinceShown: daysSinceShown.toFixed(2),
            cooldownDays,
            inCooldown: daysSinceShown < cooldownDays,
          });
          if (daysSinceShown < cooldownDays) {
            // Still in cooldown period
            return;
          }
        }
      }

      // Calculate session duration
      const sessionDuration = (Date.now() - sessionStartRef.current) / 1000; // seconds

      // Debug logging
      console.log('[useAutoFeedbackPrompt] Checking:', {
        sessionDuration: Math.floor(sessionDuration),
        minDuration: minDurationSeconds,
        maxDuration: maxDurationSeconds,
        hasTriggered,
        inWindow: sessionDuration >= minDurationSeconds && sessionDuration <= maxDurationSeconds,
      });

      // Check if we're in the trigger window (3-4 minutes)
      // Also trigger if we're past the window but haven't triggered yet (catch late users)
      if ((sessionDuration >= minDurationSeconds && sessionDuration <= maxDurationSeconds) ||
          (sessionDuration > maxDurationSeconds && sessionDuration <= maxDurationSeconds + 60)) {
        // Mark as triggered
        setHasTriggered(true);

        // Store timestamp
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_LAST_SHOWN, Date.now().toString());
        }

        // Trigger the callback to show widget
        onShouldShow();

        // Analytics: Track auto-prompt shown
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'feedback_widget_auto_shown', {
            session_duration: Math.floor(sessionDuration),
            source: 'auto_prompt',
          });
        }
      }
    };

    // Check every 10 seconds if we should show the prompt
    checkIntervalRef.current = setInterval(checkAutoPrompt, 10000); // 10 seconds

    // Also check immediately (in case user has been on page for a while)
    checkAutoPrompt();

    // Cleanup
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [hasTriggered, minDurationSeconds, maxDurationSeconds, cooldownDays, onShouldShow]);

  return {
    hasTriggered,
    sessionDuration: (Date.now() - sessionStartRef.current) / 1000,
  };
}

