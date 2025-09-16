import { useEffect, useRef } from 'react';
import { TextProcessor } from '@/lib/text-processor';
import { TimingCalibrator } from '@/lib/audio/TimingCalibrator';

interface SentenceAutoScrollConfig {
  text: string;
  currentSentenceIndex: number;
  isPlaying: boolean;
  enabled?: boolean;
  bookId?: string;
}

/**
 * Sentence-anchored auto-scroll driven directly by audio's current sentence index.
 * - Robust to missing word highlighting
 * - Uses DOM Range to find sentence position; falls back to proportional mapping
 * - Initial page jump allowed; otherwise forward-only with hysteresis
 */
export function useSentenceAnchoredAutoScroll({
  text,
  currentSentenceIndex,
  isPlaying,
  enabled = true,
  bookId
}: SentenceAutoScrollConfig) {
  const lastTextRef = useRef<string>('');
  const sentencesRef = useRef<string[]>([]);
  const lastScrollTimeRef = useRef<number>(0);
  const lastSentenceRef = useRef<number>(-1);
  const pageJustChangedRef = useRef<boolean>(false);
  const initialScrollTimerRef = useRef<number | null>(null);
  const lastSentenceScrollAtRef = useRef<number>(0);
  const pendingSentenceIdxRef = useRef<number | null>(null);
  const pendingTimerRef = useRef<number | null>(null);
  const calibratorRef = useRef<TimingCalibrator>(new TimingCalibrator());

  // Parse sentences on text change
  useEffect(() => {
    if (!text) {
      sentencesRef.current = [];
      lastTextRef.current = '';
      lastSentenceRef.current = -1;
      pageJustChangedRef.current = false;
      return;
    }

    if (text !== lastTextRef.current) {
      // Use TextProcessor for sophisticated sentence splitting (matches audio generation)
      const processedSentences = TextProcessor.splitIntoSentences(text);
      const sentences = processedSentences.map(s => s.text);
      sentencesRef.current = sentences;
      lastTextRef.current = text;
      lastSentenceRef.current = -1;
      pageJustChangedRef.current = true;

      // Clear any pending timers on page change
      if (pendingTimerRef.current) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      if (initialScrollTimerRef.current) {
        window.clearTimeout(initialScrollTimerRef.current);
        initialScrollTimerRef.current = null;
      }

      console.log('📄 New page detected - resetting scroll state');
    }
  }, [text]);

  useEffect(() => {
    console.log('🔍 SENTENCE AUTO-SCROLL: Effect triggered', {
      enabled,
      isPlaying,
      hasText: !!text,
      textLength: text?.length || 0,
      currentSentenceIndex,
      lastSentenceRef: lastSentenceRef.current,
      pageJustChanged: pageJustChangedRef.current,
      sentenceCount: sentencesRef.current.length
    });

    if (!enabled || !isPlaying || !text) {
      console.log('❌ SENTENCE AUTO-SCROLL: Early return', { enabled, isPlaying, hasText: !!text });
      return;
    }

    const contentEl = document.querySelector('[data-content="true"]') as HTMLElement | null;
    if (!contentEl) {
      console.log('❌ SENTENCE AUTO-SCROLL: No content element found');
      return;
    }

    const sentences = sentencesRef.current;
    if (sentences.length === 0) {
      console.log('❌ SENTENCE AUTO-SCROLL: No sentences parsed');
      return;
    }

    const idx = Math.max(0, Math.min(currentSentenceIndex, sentences.length - 1));

    console.log('🔍 SENTENCE AUTO-SCROLL: Processing sentence', {
      idx,
      lastSentenceRef: lastSentenceRef.current,
      willSkip: idx === lastSentenceRef.current && !pageJustChangedRef.current && idx !== 0
    });

    // Skip if no change (but always proceed on page change or when going to sentence 0)
    if (idx === lastSentenceRef.current && !pageJustChangedRef.current && idx !== 0) {
      console.log('⏭️ SENTENCE AUTO-SCROLL: Skipping - no change');
      return;
    }

    // Force immediate scroll to first sentence on page change
    if (pageJustChangedRef.current) {
      console.log('🔄 Page changed - forcing immediate scroll to top');

      // Immediate, aggressive scroll to top of content
      setTimeout(() => {
        const contentRect = contentEl.getBoundingClientRect();
        const targetY = contentRect.top + window.scrollY - 120; // 120px top margin for first sentence visibility

        // Force immediate scroll without smooth behavior
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'instant' });

        console.log('📍 Scrolled to top:', { targetY, currentScroll: window.scrollY });
      }, 50); // Small delay to ensure DOM is ready

      // Reset state for the new page
      lastSentenceRef.current = -1;
      lastSentenceScrollAtRef.current = Date.now();
      pageJustChangedRef.current = false;

      // If we're at sentence 0, we're done. Otherwise, let normal flow handle the current sentence
      if (idx === 0) {
        lastSentenceRef.current = 0;
        return;
      }
    }

    const now = Date.now();
    const minSentenceInterval = 650; // ms between sentence-based scrolls (governor)
    const elapsedSinceLast = now - lastSentenceScrollAtRef.current;

    // If we're within the interval (and not a fresh page), defer to the latest idx
    if (!pageJustChangedRef.current && elapsedSinceLast < minSentenceInterval) {
      pendingSentenceIdxRef.current = idx;
      if (pendingTimerRef.current) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      // Apply conservative timing calibration to debounced scroll (with error handling)
      let calibratedOffset = 0;
      try {
        calibratedOffset = calibratorRef.current.getOptimalOffset(bookId) * 1000;
      } catch (error) {
        console.warn('Calibrator error, using default timing:', error);
        calibratedOffset = 0;
      }
      const baseDelay = minSentenceInterval - elapsedSinceLast;
      // Use calibration but with conservative bounds (min 500ms, max 800ms)
      const calibratedDelay = Math.max(500, Math.min(800, baseDelay + calibratedOffset * 0.3));

      pendingTimerRef.current = window.setTimeout(() => {
        const targetIdx = pendingSentenceIdxRef.current ?? idx;
        pendingSentenceIdxRef.current = null;
        pendingTimerRef.current = null;
        const anchorY2 = computeSentenceAnchorY(contentEl, text, sentences, Math.max(0, Math.min(targetIdx, sentences.length - 1)));
        if (anchorY2 !== null) {
          performScroll(anchorY2, false);
          lastSentenceRef.current = targetIdx;
          lastSentenceScrollAtRef.current = Date.now();

          // Record timing sample for gradual calibration (with error handling)
          try {
            calibratorRef.current.recordSample(Date.now() - calibratedDelay, Date.now());
          } catch (error) {
            console.warn('Calibrator recording error:', error);
          }
        }
      }, calibratedDelay);
      return;
    }
    lastSentenceScrollAtRef.current = now;

    // Compute absolute Y of sentence start
    const anchorY = computeSentenceAnchorY(contentEl, text, sentences, idx);
    if (anchorY === null) {
      lastSentenceRef.current = idx;
      pageJustChangedRef.current = false;
      return;
    }

    // Debounce the very first scroll on a new page to allow layout to settle
    if (pageJustChangedRef.current) {
      if (initialScrollTimerRef.current) {
        window.clearTimeout(initialScrollTimerRef.current);
        initialScrollTimerRef.current = null;
      }
      // Apply conservative calibration to initial page scroll (with error handling)
      let initialCalibrated = 0;
      try {
        initialCalibrated = calibratorRef.current.getOptimalOffset(bookId) * 1000;
      } catch (error) {
        console.warn('Initial calibrator error, using default:', error);
        initialCalibrated = 0;
      }
      const initialDelay = Math.max(200, Math.min(400, 220 + initialCalibrated * 0.2));

      initialScrollTimerRef.current = window.setTimeout(() => {
        performScroll(anchorY, true);
        lastSentenceRef.current = idx;
        pageJustChangedRef.current = false;
        initialScrollTimerRef.current = null;

        // Record timing sample for initial scroll calibration (with error handling)
        try {
          calibratorRef.current.recordSample(Date.now() - initialDelay, Date.now());
          console.log('📊 Conservative calibration active:', {
            delay: `${initialDelay.toFixed(0)}ms`,
            confidence: calibratorRef.current.getConfidence().toFixed(2),
            bookId: bookId || 'general'
          });
        } catch (error) {
          console.warn('Initial calibrator recording error:', error);
          console.log('📊 Calibration disabled, using fixed timing:', {
            delay: `${initialDelay.toFixed(0)}ms`,
            bookId: bookId || 'general'
          });
        }
      }, initialDelay);
    } else {
      performScroll(anchorY, false);
      lastSentenceRef.current = idx;
    }

    function computeSentenceAnchorY(
      rootEl: HTMLElement,
      fullText: string,
      sentenceList: string[],
      sentenceIdx: number
    ): number | null {
      console.log('🔍 COMPUTE SENTENCE ANCHOR:', {
        sentenceIdx,
        totalSentences: sentenceList.length,
        rootElExists: !!rootEl,
        fullTextLength: fullText.length,
        targetSentence: sentenceList[sentenceIdx]?.substring(0, 50) + '...'
      });

      // Compute char offset to start of sentenceIdx
      let startOffset = 0;
      for (let i = 0; i < sentenceIdx; i++) startOffset += sentenceList[i].length;

      const findTextNodeAtOffset = (root: Node, globalOffset: number): { node: Text; localOffset: number } | null => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let remaining = globalOffset;
        let current: Node | null = walker.nextNode();
        while (current) {
          const textNode = current as Text;
          const len = textNode.nodeValue ? textNode.nodeValue.length : 0;
          if (remaining <= len) {
            return { node: textNode, localOffset: Math.max(0, Math.min(remaining, len)) };
          }
          remaining -= len;
          current = walker.nextNode();
        }
        const last = walker.lastChild() as Text | null;
        if (last) return { node: last, localOffset: last.nodeValue ? last.nodeValue.length : 0 };
        return null;
      };

      const info = findTextNodeAtOffset(rootEl, startOffset);
      if (!info) {
        // Proportional fallback
        const proportion = startOffset / Math.max(1, fullText.length);
        return rootEl.getBoundingClientRect().top + window.scrollY + rootEl.scrollHeight * proportion;
      }

      const range = document.createRange();
      try {
        range.setStart(info.node, info.localOffset);
        range.setEnd(info.node, Math.min((info.node.nodeValue?.length || 0), info.localOffset + 1));
      } catch {
        const proportion = startOffset / Math.max(1, fullText.length);
        return rootEl.getBoundingClientRect().top + window.scrollY + rootEl.scrollHeight * proportion;
      }
      const rect = range.getBoundingClientRect();
      if (!rect || rect.height === 0) {
        const proportion = startOffset / Math.max(1, fullText.length);
        return rootEl.getBoundingClientRect().top + window.scrollY + rootEl.scrollHeight * proportion;
      }
      return rect.top + window.scrollY;
    }

    function performScroll(anchorY: number, initial: boolean) {
      console.log('🎯 PERFORM SCROLL:', {
        anchorY,
        initial,
        currentScroll: window.scrollY,
        windowHeight: window.innerHeight
      });

      const viewportH = window.innerHeight;
      const currentScroll = window.scrollY;

      const topBand = currentScroll + viewportH * 0.15;
      const bottomTrigger = currentScroll + viewportH * 0.85;

      if (!initial) {
        if (anchorY > topBand && anchorY < bottomTrigger) {
          console.log('⏭️ PERFORM SCROLL: Skipping - within viewport bands');
          return;
        }
      }

      // Place anchor lower on screen to keep previous 1–2 sentences visible
      const targetPercent = initial ? 0.40 : (anchorY <= topBand ? 0.55 : 0.50);
      let desired = anchorY - viewportH * targetPercent;

      // Compensate fixed bottom controls if present
      const bottomBar = document.querySelector('.mobile-audio-controls') as HTMLElement | null;
      if (bottomBar && bottomBar.offsetHeight) desired -= Math.max(0, bottomBar.offsetHeight * 0.25);

      const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewportH);
      const clamped = Math.max(0, Math.min(desired, maxScroll));
      const forwardOnly = initial ? clamped : Math.max(currentScroll, clamped);

      // Cap per-event scroll to avoid sudden large jumps
      const maxDelta = initial ? viewportH * 0.5 : viewportH * 0.35; // up to half screen initially, ~1/3 later
      const finalTarget = currentScroll + Math.max(-maxDelta, Math.min(maxDelta, forwardOnly - currentScroll));

      const threshold = initial ? 24 : 40;
      const scrollDistance = Math.abs(finalTarget - currentScroll);

      console.log('🎯 PERFORM SCROLL: Final calculation', {
        desired,
        clamped,
        forwardOnly,
        finalTarget,
        currentScroll,
        scrollDistance,
        threshold,
        willScroll: scrollDistance > threshold
      });

      if (scrollDistance > threshold) {
        console.log('✅ EXECUTING SCROLL to:', finalTarget);
        window.scrollTo({ top: finalTarget, behavior: 'smooth' });
      } else {
        console.log('⏭️ SCROLL SKIPPED: Distance too small');
      }
    }
  }, [text, currentSentenceIndex, isPlaying, enabled]);

  return {};
}