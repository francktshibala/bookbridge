import { useEffect, useRef } from 'react';
import { TextProcessor } from '@/lib/text-processor';

interface SentenceAutoScrollConfig {
  text: string;
  currentSentenceIndex: number;
  isPlaying: boolean;
  enabled?: boolean;
}

// Timing compensation to match audio latency (aligns with word highlighting compensation)
const SENTENCE_AUDIO_COMPENSATION = 300; // milliseconds

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
  enabled = true
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
  const rafIdRef = useRef<number | null>(null);

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
    }
  }, [text]);

  useEffect(() => {
    if (!enabled || !isPlaying || !text) return;

    const contentEl = document.querySelector('[data-content="true"]') as HTMLElement | null;
    if (!contentEl) return;

    const sentences = sentencesRef.current;
    if (sentences.length === 0) return;

    const idx = Math.max(0, Math.min(currentSentenceIndex, sentences.length - 1));

    // Skip if no change
    if (idx === lastSentenceRef.current && !pageJustChangedRef.current) return;

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
      pendingTimerRef.current = window.setTimeout(() => {
        const targetIdx = pendingSentenceIdxRef.current ?? idx;
        pendingSentenceIdxRef.current = null;
        pendingTimerRef.current = null;
        const anchorY2 = computeSentenceAnchorY(contentEl, text, sentences, Math.max(0, Math.min(targetIdx, sentences.length - 1)));
        if (anchorY2 !== null) {
          if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = requestAnimationFrame(() => {
            performScroll(anchorY2, false);
            lastSentenceRef.current = targetIdx;
            lastSentenceScrollAtRef.current = Date.now();
          });
        }
      }, minSentenceInterval - elapsedSinceLast);
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

    // Apply audio compensation delay for harmony with audio timing
    const scrollDelay = pageJustChangedRef.current ? 220 : SENTENCE_AUDIO_COMPENSATION;

    if (pageJustChangedRef.current) {
      // Debounce the very first scroll on a new page to allow layout to settle
      if (initialScrollTimerRef.current) {
        window.clearTimeout(initialScrollTimerRef.current);
        initialScrollTimerRef.current = null;
      }
      initialScrollTimerRef.current = window.setTimeout(() => {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(() => {
          performScroll(anchorY, true);
          lastSentenceRef.current = idx;
          pageJustChangedRef.current = false;
          initialScrollTimerRef.current = null;
        });
      }, scrollDelay);
    } else {
      // Apply 300ms compensation to align sentence scroll with audio timing
      setTimeout(() => {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(() => {
          performScroll(anchorY, false);
          lastSentenceRef.current = idx;
        });
      }, SENTENCE_AUDIO_COMPENSATION);
    }

    function computeSentenceAnchorY(
      rootEl: HTMLElement,
      fullText: string,
      sentenceList: string[],
      sentenceIdx: number
    ): number | null {
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
      const viewportH = window.innerHeight;
      const currentScroll = window.scrollY;

      const topBand = currentScroll + viewportH * 0.15;
      const bottomTrigger = currentScroll + viewportH * 0.85;

      if (!initial) {
        if (anchorY > topBand && anchorY < bottomTrigger) return;
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
      if (Math.abs(finalTarget - currentScroll) > threshold) {
        window.scrollTo({ top: finalTarget, behavior: 'smooth' });
      }
    }
    // Cleanup on effect re-run
    return () => {
      if (pendingTimerRef.current) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
      if (initialScrollTimerRef.current) {
        window.clearTimeout(initialScrollTimerRef.current);
        initialScrollTimerRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [text, currentSentenceIndex, isPlaying, enabled]);

  return {};
}