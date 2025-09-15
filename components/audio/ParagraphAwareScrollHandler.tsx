'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

interface ParagraphAwareScrollHandlerProps {
  text: string;
  currentWordIndex: number;
  isPlaying: boolean;
  enabled?: boolean;
}

export const ParagraphAwareScrollHandler: React.FC<ParagraphAwareScrollHandlerProps> = ({
  text,
  currentWordIndex,
  isPlaying,
  enabled = true
}) => {
  // Track viewport height changes for mobile browser UI
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight) : 0
  );

  // Listen for viewport changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => {
      const newHeight = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(newHeight);
    };

    window.visualViewport?.addEventListener('resize', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  // Parse text into paragraphs and track word positions
  const { words, paragraphs } = useMemo(() => {
    const paragraphTexts = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    let globalWordCounter = 0;
    const parsedWords: Array<{
      text: string;
      isWord: boolean;
      wordIndex: number;
      segmentIndex: number;
      paragraphIndex: number;
    }> = [];

    const parsedParagraphs = paragraphTexts.map((paragraphText, paragraphIndex) => {
      const startWordIndex = globalWordCounter;
      const segments = paragraphText.split(/(\s+)/);

      segments.forEach((segment, segmentIndex) => {
        const isWord = /\S/.test(segment);
        parsedWords.push({
          text: segment,
          isWord,
          wordIndex: isWord ? globalWordCounter : -1,
          segmentIndex: parsedWords.length,
          paragraphIndex
        });
        if (isWord) globalWordCounter++;
      });

      const endWordIndex = globalWordCounter - 1;

      return {
        text: paragraphText.trim(),
        startWordIndex,
        endWordIndex,
        wordCount: endWordIndex - startWordIndex + 1,
        index: paragraphIndex
      };
    });

    return { words: parsedWords, paragraphs: parsedParagraphs };
  }, [text]);

  // Enhanced scroll animation with paragraph awareness
  const targetScrollYRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const isAnimatingRef = useRef<boolean>(false);
  const lastIndexRef = useRef<number>(-1);
  const userScrollBlockUntilRef = useRef<number>(0);
  const lastTargetUpdateAtRef = useRef<number>(0);
  const currentParagraphRef = useRef<number>(-1);

  // Pause autoscroll on user interaction
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const blockMs = 800; // Shorter block time for better responsiveness
    const markUserScroll = () => {
      userScrollBlockUntilRef.current = Date.now() + blockMs;
    };

    window.addEventListener('wheel', markUserScroll, { passive: true });
    window.addEventListener('touchstart', markUserScroll, { passive: true });
    window.addEventListener('keydown', markUserScroll);

    return () => {
      window.removeEventListener('wheel', markUserScroll);
      window.removeEventListener('touchstart', markUserScroll);
      window.removeEventListener('keydown', markUserScroll);
    };
  }, []);

  const stopAnimation = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    isAnimatingRef.current = false;
    lastFrameTimeRef.current = 0;
  };

  const animateScroll = () => {
    const now = performance.now();
    const page = document.scrollingElement || document.documentElement;
    if (!page) {
      stopAnimation();
      return;
    }

    const targetY = targetScrollYRef.current;
    const isBlockedByUser = Date.now() < userScrollBlockUntilRef.current;

    if (targetY == null || !enabled || !isPlaying || isBlockedByUser) {
      stopAnimation();
      return;
    }

    const currentY = page.scrollTop;
    const delta = targetY - currentY;

    // Close enough → finish
    if (Math.abs(delta) < 1) {
      page.scrollTop = Math.max(0, Math.round(targetY));
      stopAnimation();
      return;
    }

    // Time-based smooth scrolling with paragraph-aware speed
    const dt = lastFrameTimeRef.current > 0 ? Math.min(0.032, (now - lastFrameTimeRef.current) / 1000) : 0.016;
    lastFrameTimeRef.current = now;

    // Adaptive scrolling speed based on distance and current paragraph
    const distance = Math.abs(delta);
    let maxSpeed = 1200; // Base speed

    // Slower scrolling within paragraphs, faster between paragraphs
    const currentParagraph = paragraphs.find(p =>
      currentWordIndex >= p.startWordIndex && currentWordIndex <= p.endWordIndex
    );

    if (currentParagraph && currentParagraph.index === currentParagraphRef.current) {
      // Within same paragraph - slower, smoother scrolling
      maxSpeed = 800;
    } else {
      // Moving to new paragraph - allow faster scrolling
      maxSpeed = 1600;
    }

    const maxStep = maxSpeed * dt;
    const proportionalStep = distance * 0.15; // Gentle easing
    const step = Math.sign(delta) * Math.min(Math.abs(delta), Math.min(maxStep, proportionalStep));

    page.scrollTop = Math.max(0, Math.round(currentY + step));

    rafIdRef.current = requestAnimationFrame(animateScroll);
    isAnimatingRef.current = true;
  };

  const ensureAnimationRunning = () => {
    if (!isAnimatingRef.current) {
      lastFrameTimeRef.current = 0;
      rafIdRef.current = requestAnimationFrame(animateScroll);
      isAnimatingRef.current = true;
    }
  };

  // Enhanced scrolling logic with paragraph awareness
  useEffect(() => {
    if (!enabled || !isPlaying || currentWordIndex < 0) return;
    if (currentWordIndex === lastIndexRef.current) return;

    const timeoutId = setTimeout(() => {
      const wordElement = document.getElementById(`scroll-word-${currentWordIndex}`);
      if (!wordElement) return;

      // Find current paragraph
      const currentParagraph = paragraphs.find(p =>
        currentWordIndex >= p.startWordIndex && currentWordIndex <= p.endWordIndex
      );

      if (currentParagraph) {
        currentParagraphRef.current = currentParagraph.index;
      }

      const rect = wordElement.getBoundingClientRect();

      // Adaptive viewport thresholds based on paragraph position
      const isNewParagraph = currentParagraph &&
        currentWordIndex === currentParagraph.startWordIndex;

      let topThreshold, bottomThreshold, anchorFactor;

      if (isNewParagraph) {
        // New paragraph - more aggressive scrolling to ensure visibility
        topThreshold = viewportHeight * 0.25;
        bottomThreshold = viewportHeight * 0.75;
        anchorFactor = 0.35; // Position paragraph higher for better reading flow
      } else {
        // Within paragraph - gentler thresholds
        topThreshold = viewportHeight * 0.15;
        bottomThreshold = viewportHeight * 0.85;
        anchorFactor = 0.45;
      }

      const needsScroll = rect.top < topThreshold || rect.bottom > bottomThreshold;

      if (needsScroll) {
        const absoluteTop = window.scrollY + rect.top;
        const desiredY = Math.max(0, absoluteTop - (viewportHeight * anchorFactor));

        // Rate limiting with shorter intervals for better responsiveness
        const nowMs = Date.now();
        const minUpdateInterval = isNewParagraph ? 50 : 100; // Faster updates for paragraph transitions

        if (nowMs - lastTargetUpdateAtRef.current >= minUpdateInterval) {
          targetScrollYRef.current = desiredY;
          ensureAnimationRunning();
          lastTargetUpdateAtRef.current = nowMs;
        }
      }

      lastIndexRef.current = currentWordIndex;
    }, 10); // Minimal delay for DOM updates

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentWordIndex, isPlaying, enabled, viewportHeight, paragraphs]);

  // Stop animation when disabled or paused
  useEffect(() => {
    if (!enabled || !isPlaying) {
      stopAnimation();
    }
  }, [enabled, isPlaying]);

  // Reset on content change
  useEffect(() => {
    targetScrollYRef.current = null;
    lastIndexRef.current = -1;
    lastTargetUpdateAtRef.current = 0;
    currentParagraphRef.current = -1;
    stopAnimation();
  }, [text]);

  // Render invisible word spans for position tracking
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        pointerEvents: 'none',
        zIndex: -1,
        opacity: 0,
        lineHeight: 'inherit',
        fontSize: 'inherit',
        fontFamily: 'inherit',
        whiteSpace: 'pre-wrap'
      }}
      aria-hidden="true"
    >
      {words.map((segment, index) => {
        if (!segment.isWord) {
          return <span key={index}>{segment.text}</span>;
        }

        return (
          <span
            key={index}
            id={`scroll-word-${segment.wordIndex}`}
            style={{
              display: 'inline',
              visibility: 'hidden'
            }}
          >
            {segment.text}
          </span>
        );
      })}
    </div>
  );
};