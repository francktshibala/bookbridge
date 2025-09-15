import { useEffect, useRef } from 'react';

interface WordAnchorConfig {
  text: string;
  currentWordIndex: number;
  isPlaying: boolean;
  enabled?: boolean;
}

/**
 * Word-anchored auto-scroll that follows the narrated word using DOM Range.
 * - No dependency on paragraph heuristics
 * - Avoids initial jump on play/page change
 * - Scrolls forward-only, rate-limited, with comfortable target zone
 */
export function useWordAnchoredAutoScroll({
  text,
  currentWordIndex,
  isPlaying,
  enabled = true
}: WordAnchorConfig) {
  const lastTextRef = useRef<string>('');
  const wordStartOffsetsRef = useRef<number[]>([]);
  const wordLengthsRef = useRef<number[]>([]);
  const lastScrollTimeRef = useRef<number>(0);
  const scrollCooldownRef = useRef<number>(0);
  const initializedRef = useRef<boolean>(false);
  const lastAnchoredWordRef = useRef<number>(-1);
  const pageJustChangedRef = useRef<boolean>(false);

  // Build an index of word start character offsets within the raw text
  useEffect(() => {
    if (!text) {
      wordStartOffsetsRef.current = [];
      wordLengthsRef.current = [];
      lastTextRef.current = '';
      initializedRef.current = false;
      lastAnchoredWordRef.current = -1;
      return;
    }

    if (text !== lastTextRef.current) {
      // Rebuild offsets using regex over the original text (robust to punctuation)
      const starts: number[] = [];
      const lengths: number[] = [];
      const re = /\S+/g; // sequences of non-whitespace
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        starts.push(m.index);
        lengths.push(m[0].length);
      }
      wordStartOffsetsRef.current = starts;
      wordLengthsRef.current = lengths;
      lastTextRef.current = text;
      initializedRef.current = false; // avoid jump on new content
      lastAnchoredWordRef.current = -1;
      pageJustChangedRef.current = true; // mark page transition
    }
  }, [text]);

  useEffect(() => {
    if (!enabled || !isPlaying || !text) return;

    const contentElement = document.querySelector('[data-content="true"]') as HTMLElement | null;
    if (!contentElement) return;

    const wordStarts = wordStartOffsetsRef.current;
    const wordLens = wordLengthsRef.current;
    if (wordStarts.length === 0) return;

    const clampedIndex = Math.max(0, Math.min(currentWordIndex, wordStarts.length - 1));

    // On page change, ensure first visible sentence is positioned comfortably
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastAnchoredWordRef.current = clampedIndex;

      if (pageJustChangedRef.current) {
        pageJustChangedRef.current = false;

        // Try to position the first/current word immediately
        const anchorY = computeAnchorYForWord(contentElement, text, wordStarts, wordLens, clampedIndex);
        if (anchorY !== null) {
          performScroll(anchorY, /*initial*/ true);
        }
      }
      return;
    }

    // Only react when the anchored word changes
    if (clampedIndex === lastAnchoredWordRef.current) return;
    lastAnchoredWordRef.current = clampedIndex;

    // Rate-limit to prevent over-scrolling and add cooldown after page change
    const now = Date.now();
    const minInterval = pageJustChangedRef.current ? 220 : 150;
    if (now - lastScrollTimeRef.current < minInterval) return;
    lastScrollTimeRef.current = now;

    const anchorY = computeAnchorYForWord(contentElement, text, wordStarts, wordLens, clampedIndex);
    if (anchorY !== null) {
      performScroll(anchorY);
    }

    function performScroll(anchorY: number, initial: boolean = false) {
      const viewportH = window.innerHeight;
      const currentScroll = window.scrollY;

      // Stronger hysteresis: only scroll if anchor is near bottom 88% or below top 10%
      const topBand = currentScroll + viewportH * 0.10;
      const bottomTrigger = currentScroll + viewportH * 0.88;

      if (!initial) {
        if (anchorY > topBand && anchorY < bottomTrigger) {
          // Already in a good zone; do nothing
          return;
        }
      }

      // Keep more prior context: place anchor around middle or below
      const targetPercent = initial ? 0.40 : (anchorY <= topBand ? 0.55 : 0.50);
      let desired = anchorY - viewportH * targetPercent;

      // Account for fixed bottom controls on mobile (avoid occlusion)
      const bottomBar = document.querySelector('.mobile-audio-controls') as HTMLElement | null;
      if (bottomBar && bottomBar.offsetHeight) {
        desired = desired - Math.max(0, bottomBar.offsetHeight * 0.25);
      }
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewportH);
      const clamped = Math.max(0, Math.min(desired, maxScroll));
      const finalTarget = initial ? clamped : Math.max(currentScroll, clamped); // allow backward only on initial

      // Larger threshold to avoid micro-jitters
      if (initial ? Math.abs(finalTarget - currentScroll) > 30 : finalTarget > currentScroll + 50) {
        window.scrollTo({ top: finalTarget, behavior: 'smooth' });
      }
    }

    function computeAnchorYForWord(
      rootEl: HTMLElement,
      fullText: string,
      starts: number[],
      lens: number[],
      wordIdx: number
    ): number | null {
      if (starts.length === 0) return null;
      const globalStart = starts[Math.max(0, Math.min(wordIdx, starts.length - 1))];
      const length = Math.max(1, lens[Math.max(0, Math.min(wordIdx, lens.length - 1))] || 1);

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

      const anchorInfo = findTextNodeAtOffset(rootEl, globalStart);
      if (!anchorInfo) return null;

      const range = document.createRange();
      try {
        range.setStart(anchorInfo.node, anchorInfo.localOffset);
        const endInfo = findTextNodeAtOffset(rootEl, globalStart + Math.min(2, length));
        if (endInfo) {
          range.setEnd(endInfo.node, Math.min((endInfo.node.nodeValue?.length || 0), endInfo.localOffset));
        } else {
          range.setEnd(anchorInfo.node, Math.min((anchorInfo.node.nodeValue?.length || 0), anchorInfo.localOffset + 1));
        }
      } catch {
        const proportion = globalStart / Math.max(1, fullText.length);
        return rootEl.getBoundingClientRect().top + window.scrollY + rootEl.scrollHeight * proportion;
      }

      const rect = range.getBoundingClientRect();
      if (!rect || rect.height === 0) {
        const proportion = globalStart / Math.max(1, fullText.length);
        return rootEl.getBoundingClientRect().top + window.scrollY + rootEl.scrollHeight * proportion;
      }
      return rect.top + window.scrollY;
    }
  }, [text, currentWordIndex, isPlaying, enabled]);

  return {};
}


