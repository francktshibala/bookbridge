import { useEffect, useRef } from 'react';

interface GentleAutoScrollConfig {
  currentWordIndex: number;
  currentSentenceIndex?: number; // Real sentence data from audio
  text: string;
  isPlaying: boolean;
  enabled?: boolean;
}

/**
 * Gentle auto-scroll with audio-driven sentence anchors
 * - Scrolls shortly AFTER the audio crosses a sentence boundary (delay)
 * - Enforces a minimum time between scrolls (throttle)
 * - Falls back to word-based milestones ONLY if sentence data is unavailable
 */
export function useGentleAutoScroll({
  currentWordIndex,
  currentSentenceIndex,
  text,
  isPlaying,
  enabled = true
}: GentleAutoScrollConfig) {
  const lastTextRef = useRef<string>('');
  const totalWordsRef = useRef<number>(0);
  const lastSentenceRef = useRef<number>(-1);
  const sentencesRef = useRef<string[]>([]);

  // New: throttle + delay controls
  const lastScrollAtRef = useRef<number>(0);
  const pendingSentenceTimerRef = useRef<number | null>(null);
  const lastSeenSentenceRef = useRef<number | undefined>(undefined);

  // Tunables for comfort (can be promoted to props if needed)
  const delayAfterSentenceMs = 600;      // Wait a bit after sentence starts to avoid jumping ahead
  const minScrollIntervalMs = 5000;      // Do not scroll more often than every 5 seconds

  useEffect(() => {
    // Page transition reset
    if (text !== lastTextRef.current) {
      lastTextRef.current = text;
      totalWordsRef.current = text.split(/\s+/).length;
      lastSentenceRef.current = -1;
      lastScrollAtRef.current = 0;
      lastSeenSentenceRef.current = undefined;

      // Clear any pending timers
      if (pendingSentenceTimerRef.current) {
        clearTimeout(pendingSentenceTimerRef.current);
        pendingSentenceTimerRef.current = null;
      }

      // Parse sentences for voice harmony
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      sentencesRef.current = sentences;

      // Scroll to top of new page (small offset)
      setTimeout(() => {
        const contentEl = document.querySelector('[data-content="true"]');
        if (contentEl) {
          const rect = (contentEl as HTMLElement).getBoundingClientRect();
          const target = rect.top + window.scrollY - 120;
          window.scrollTo({ top: Math.max(0, target), behavior: 'instant' as ScrollBehavior });
        }
      }, 100);

      return; // Do not continue processing this frame after a reset
    }

    if (!enabled || !text) {
      return;
    }

    // Primary path: sentence-based scrolling when sentence data is available
    if (currentSentenceIndex !== undefined) {
      // Only act on true sentence changes
      if (currentSentenceIndex !== lastSentenceRef.current) {
        lastSeenSentenceRef.current = currentSentenceIndex;

        // Cancel any pending scroll from a previous sentence
        if (pendingSentenceTimerRef.current) {
          clearTimeout(pendingSentenceTimerRef.current);
          pendingSentenceTimerRef.current = null;
        }

        // Throttle: enforce minimum interval between scrolls
        const now = Date.now();
        const timeSinceLast = now - (lastScrollAtRef.current || 0);
        const canScrollByInterval = timeSinceLast >= minScrollIntervalMs;

        // Delay: wait briefly after the sentence changes so audio is clearly into it
        pendingSentenceTimerRef.current = window.setTimeout(() => {
          // Ensure state hasn't changed during the wait
          const sentenceStillCurrent = lastSeenSentenceRef.current === currentSentenceIndex;
          const allowWhilePaused = currentWordIndex > 0 && currentWordIndex < 1000; // small grace
          const canProceed = enabled && (isPlaying || allowWhilePaused) && sentenceStillCurrent;

          if (!canProceed) return;

          // Re-check throttle just before scrolling
          const now2 = Date.now();
          if (now2 - (lastScrollAtRef.current || 0) < minScrollIntervalMs) return;

          performGentleScroll();
          lastScrollAtRef.current = now2;
          lastSentenceRef.current = currentSentenceIndex;
        }, delayAfterSentenceMs);
      }

      return; // When sentence data is present, skip word-based fallback
    }

    // Fallback: word-based milestones (when sentence data is not available)
    const totalWords = totalWordsRef.current || 1;
    const progress = currentWordIndex / totalWords;
    const now = Date.now();

    // Throttle fallback as well
    if (now - (lastScrollAtRef.current || 0) >= minScrollIntervalMs) {
      const milestones = [0.25, 0.5, 0.75];
      const hit = milestones.find(m => progress >= m && progress < m + 0.03);
      if (hit) {
        performGentleScroll();
        lastScrollAtRef.current = now;
      }
    }

    function performGentleScroll() {
      const windowHeight = window.innerHeight;
      const isMobile = window.innerWidth <= 768;

      // Small, smooth movement
      const mobileTopMargin = windowHeight * 0.20;
      const desktopScrollDistance = windowHeight * 0.20;

      const wordElement = document.getElementById(`scroll-word-${currentWordIndex}`);
      let targetScroll: number;

      if (wordElement && isMobile) {
        const rect = wordElement.getBoundingClientRect();
        targetScroll = rect.top + window.scrollY - mobileTopMargin;
      } else if (isMobile) {
        const currentScroll = window.scrollY;
        targetScroll = currentScroll + windowHeight * 0.25; // 25% of screen
      } else {
        const currentScroll = window.scrollY;
        targetScroll = currentScroll + desktopScrollDistance; // 20% of screen
      }

      window.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, [currentWordIndex, currentSentenceIndex, text, isPlaying, enabled]);

  return {
    // Keep API stable for callers
    progress: (currentWordIndex / Math.max(1, totalWordsRef.current)) * 100,
    totalWords: totalWordsRef.current
  };
}