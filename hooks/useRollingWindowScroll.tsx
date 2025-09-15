import { useEffect, useRef } from 'react';

export function useRollingWindowScroll({
  text,
  currentWordIndex,
  isPlaying,
  enabled = true
}: {
  text: string;
  currentWordIndex: number;
  isPlaying: boolean;
  enabled?: boolean;
}) {
  const lastParagraphIndexRef = useRef<number>(-1);
  const lastTextRef = useRef<string>('');
  const lastScrollTimeRef = useRef<number>(0);
  const windowStartIndexRef = useRef<number>(0);
  const didInitialPlayRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled || !isPlaying || !text) return;

    // Detect page/chunk changes and reset state
    if (text !== lastTextRef.current) {
      lastTextRef.current = text;
      lastParagraphIndexRef.current = -1;
      windowStartIndexRef.current = 0;
      didInitialPlayRef.current = false; // avoid jump on first play after transition
    }

    // Build paragraphs robustly
    let paragraphs = text.split(/\n\n+|\r\n\r\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length <= 1) {
      paragraphs = text.split(/\n|\r\n/).filter(p => p.trim().length > 80);
    }
    if (paragraphs.length <= 1) {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
      const synthetic: string[] = [];
      for (let i = 0; i < sentences.length; i += 3) {
        const group = sentences.slice(i, i + 3).join(' ');
        if (group.trim().length > 0) synthetic.push(group);
      }
      paragraphs = synthetic.length > 0 ? synthetic : [text];
    }
    if (paragraphs.length === 0) return;

    // Map currentWordIndex to paragraph index
    let runningWords = 0;
    let currentParagraphIndex = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      const wordsInPara = paragraphs[i].trim().split(/\s+/).filter(Boolean).length;
      const start = runningWords;
      const end = runningWords + Math.max(1, wordsInPara) - 1;
      if (currentWordIndex >= start && currentWordIndex <= end) {
        currentParagraphIndex = i;
        break;
      }
      runningWords += Math.max(1, wordsInPara);
    }

    // On first detection after play/page change, don't jump; just set window
    if (!didInitialPlayRef.current) {
      windowStartIndexRef.current = Math.max(0, currentParagraphIndex - 2);
      didInitialPlayRef.current = true;
      lastParagraphIndexRef.current = currentParagraphIndex;
      return;
    }

    // Only react to paragraph change events
    if (currentParagraphIndex === lastParagraphIndexRef.current) return;
    const previousPara = lastParagraphIndexRef.current;
    lastParagraphIndexRef.current = currentParagraphIndex;

    // Maintain a rolling window of ~3 paragraphs visible.
    // When current paragraph moves beyond window end, advance windowStart by 1.
    const windowSize = 3;
    const windowEndIndex = windowStartIndexRef.current + windowSize - 1;
    if (currentParagraphIndex > windowEndIndex) {
      windowStartIndexRef.current = Math.min(currentParagraphIndex - (windowSize - 1), paragraphs.length - windowSize);
      windowStartIndexRef.current = Math.max(0, windowStartIndexRef.current);
    } else if (currentParagraphIndex < windowStartIndexRef.current) {
      // If user jumped back somehow, do not scroll backwards; just realign window start
      windowStartIndexRef.current = Math.max(0, currentParagraphIndex);
    } else {
      // Within window; no scroll
      return;
    }

    // Rate-limit scrolling
    const now = Date.now();
    if (now - lastScrollTimeRef.current < 700) return;
    lastScrollTimeRef.current = now;

    const contentElement = document.querySelector('[data-content="true"]') as HTMLElement | null;
    if (!contentElement) return;

    // Compute target position for windowStart paragraph using proportional mapping
    const textBeforeTarget = paragraphs.slice(0, windowStartIndexRef.current).join('\n\n');
    const targetProgress = Math.min(1, Math.max(0, textBeforeTarget.length / Math.max(1, text.length)));
    const elementTop = contentElement.getBoundingClientRect().top + window.scrollY;
    const targetWithinElement = contentElement.scrollHeight * targetProgress;
    const absoluteTarget = elementTop + targetWithinElement;

    // Place target paragraph comfortably ~20% from top
    const viewportHeight = window.innerHeight;
    const desired = absoluteTarget - viewportHeight * 0.2;

    const currentScroll = window.scrollY;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
    const finalScroll = Math.max(currentScroll, Math.min(desired, maxScroll)); // never scroll backwards

    if (finalScroll > currentScroll + 40) {
      window.scrollTo({ top: finalScroll, behavior: 'smooth' });
    }
  }, [text, currentWordIndex, isPlaying, enabled]);

  return {};
}