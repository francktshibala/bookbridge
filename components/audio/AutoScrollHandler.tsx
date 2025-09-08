'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

interface AutoScrollHandlerProps {
  text: string;
  currentWordIndex: number;
  isPlaying: boolean;
  enabled?: boolean;
}

export const AutoScrollHandler: React.FC<AutoScrollHandlerProps> = ({
  text,
  currentWordIndex,
  isPlaying,
  enabled = true
}) => {
  // Track viewport height changes for mobile browser UI
  const [viewportHeight, setViewportHeight] = useState(() => 
    typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight) : 0
  );

  // Listen for viewport changes (mobile browser UI changes)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateViewport = () => {
      const newHeight = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(newHeight);
    };

    // Listen to both visualViewport and resize events
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);
  // Parse text into words to generate invisible word spans for scroll tracking
  const words = useMemo(() => {
    let wordCounter = 0;
    return text.split(/(\s+)/).map((segment, index) => {
      const isWord = /\S/.test(segment);
      const result = {
        text: segment,
        isWord,
        wordIndex: isWord ? wordCounter : -1,
        segmentIndex: index
      };
      if (isWord) wordCounter++;
      return result;
    });
  }, [text]);

  // Smooth, velocity-limited scrolling engine (rAF-driven)
  const targetScrollYRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const isAnimatingRef = useRef<boolean>(false);
  const lastIndexRef = useRef<number>(-1);
  const userScrollBlockUntilRef = useRef<number>(0);
  const lastTargetUpdateAtRef = useRef<number>(0);
  const lastTextRef = useRef<string>(text);
  const introModeRef = useRef<boolean>(true);
  const introStartMsRef = useRef<number>(Date.now());
  const firstAnchorSnapPendingRef = useRef<boolean>(false);
  const ignoreUserBlockUntilMsRef = useRef<number>(0);

  // Pause autoscroll briefly on user interaction
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const blockMs = 1200;
    const markUserScroll = () => {
      userScrollBlockUntilRef.current = Date.now() + blockMs;
    };

    window.addEventListener('wheel', markUserScroll, { passive: true } as AddEventListenerOptions);
    window.addEventListener('touchstart', markUserScroll, { passive: true } as AddEventListenerOptions);
    window.addEventListener('keydown', markUserScroll);

    return () => {
      window.removeEventListener('wheel', markUserScroll as EventListener);
      window.removeEventListener('touchstart', markUserScroll as EventListener);
      window.removeEventListener('keydown', markUserScroll as EventListener);
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
    const isBlockedByUser = (Date.now() < userScrollBlockUntilRef.current) && !(introModeRef.current || Date.now() < ignoreUserBlockUntilMsRef.current);

    if (targetY == null || !enabled || !isPlaying || isBlockedByUser) {
      stopAnimation();
      return;
    }

    const currentY = page.scrollTop;
    const delta = targetY - currentY;

    // Close enough → finish
    if (Math.abs(delta) < 0.5) {
      page.scrollTop = Math.max(0, Math.round(targetY));
      stopAnimation();
      return;
    }

    // Time delta in seconds (clamped)
    const dt = lastFrameTimeRef.current > 0 ? Math.min(0.032, (now - lastFrameTimeRef.current) / 1000) : 0.016;
    lastFrameTimeRef.current = now;

    // Velocity-limited approach with ease-out curve and batching feel
    // Reduce max speed a bit and increase proportional damping for gentler feel
    const maxPixelsPerSecond = 1800; // gentler cap
    const maxStep = maxPixelsPerSecond * dt;
    const proportionalStep = Math.abs(delta) * 0.18; // softer easing
    // Minimum step ensures progress without jitter, but keep it small
    const baseStep = Math.max(20, Math.min(maxStep, proportionalStep));
    const step = Math.sign(delta) * Math.min(Math.abs(delta), baseStep);

    page.scrollTop = Math.max(0, Math.round(currentY + step));

    // Continue animating
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

  // Update target on word changes with hysteresis, predictive thresholds, and rate limiting
  useEffect(() => {
    if (!enabled || !isPlaying || currentWordIndex < 0) return;
    if (currentWordIndex === lastIndexRef.current) return;

    // Allow DOM to commit for the current word span
    const timeoutId = setTimeout(() => {
      const wordElement = document.getElementById(`scroll-word-${currentWordIndex}`);
      if (!wordElement) return;

      // Transition out of intro mode after a short time or several words
      if (introModeRef.current) {
        const elapsed = Date.now() - introStartMsRef.current;
        if (currentWordIndex >= 12 || elapsed >= 3500) {
          introModeRef.current = false;
        }
      }

      const rect = wordElement.getBoundingClientRect();
      // Keep the word near the middle during steady play; slightly higher during intro
      const topThreshold = Math.min(200, viewportHeight * 0.33);
      const bottomThreshold = viewportHeight - Math.min(200, viewportHeight * 0.20);
      const anchorFactor = introModeRef.current ? 0.42 : 0.50;
      const anchorFromTop = viewportHeight * anchorFactor;

      // Only move if the word is approaching screen edges, or if we're far from anchor
      const needsScroll = rect.top < topThreshold || rect.bottom > bottomThreshold;

      const absoluteTop = window.scrollY + rect.top;
      const desiredY = Math.max(0, absoluteTop - anchorFromTop);

      const currentTarget = targetScrollYRef.current;
      const targetDelta = currentTarget == null ? Infinity : Math.abs(desiredY - currentTarget);
      const anchorDelta = Math.abs((window.scrollY ?? 0) - desiredY);

      const anchorDeadbandPx = 40; // stronger hysteresis to avoid motion sickness

      // Rate limit target updates to ~12 Hz to prevent micro-changes
      const nowMs = Date.now();
      const minUpdateIntervalMs = 80; // ~12.5 Hz
      if (nowMs - lastTargetUpdateAtRef.current < minUpdateIntervalMs) {
        return; // skip this update; batching effect
      }

      // On the very first highlight after a chunk change, snap to anchor immediately
      if (firstAnchorSnapPendingRef.current) {
        const page = document.scrollingElement || document.documentElement;
        if (page) {
          page.scrollTop = Math.max(0, Math.round(desiredY));
          stopAnimation();
          firstAnchorSnapPendingRef.current = false;
          lastIndexRef.current = currentWordIndex;
          lastTargetUpdateAtRef.current = nowMs;
          return;
        }
      }

      if (needsScroll || anchorDelta > anchorDeadbandPx || targetDelta > anchorDeadbandPx) {
        targetScrollYRef.current = desiredY;
        ensureAnimationRunning();
        lastIndexRef.current = currentWordIndex;
        lastTargetUpdateAtRef.current = nowMs;
      }
    }, 16); // ~1 frame delay to ensure layout is up-to-date

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentWordIndex, isPlaying, enabled, viewportHeight]);

  // Stop animation when disabled or paused
  useEffect(() => {
    if (!enabled || !isPlaying) {
      stopAnimation();
    }
  }, [enabled, isPlaying]);

  // Reset / recalibrate on content change to handle chunk transitions cleanly
  useEffect(() => {
    if (lastTextRef.current !== text) {
      lastTextRef.current = text;

      // Assume new chunk loads near top; reset targets and internal indices
      targetScrollYRef.current = null;
      lastIndexRef.current = -1;
      lastTargetUpdateAtRef.current = 0;
      stopAnimation();

      // Enter intro mode for the beginning of the new chunk
      introModeRef.current = true;
      introStartMsRef.current = Date.now();
      firstAnchorSnapPendingRef.current = true;
      ignoreUserBlockUntilMsRef.current = Date.now() + 800;

      // If we're at top and the first word enters view, do nothing; else gently snap near anchor for word 0 soon after
      // Defer to next word index update to avoid double movement
    }
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
          // Whitespace segment
          return <span key={index}>{segment.text}</span>;
        }

        return (
          <span
            key={index}
            id={`scroll-word-${segment.wordIndex}`}
            style={{
              display: 'inline',
              visibility: 'hidden' // Hidden but takes up space for positioning
            }}
          >
            {segment.text}
          </span>
        );
      })}
    </div>
  );
};