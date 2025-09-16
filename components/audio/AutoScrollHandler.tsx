'use client';

import React, { useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react';

interface AutoScrollHandlerProps {
  text: string;
  currentWordIndex: number;
  isPlaying: boolean;
  enabled?: boolean;
}

export interface AutoScrollHandlerRef {
  resetToTop: () => void;
}

export const AutoScrollHandler = forwardRef<AutoScrollHandlerRef, AutoScrollHandlerProps>(({
  text,
  currentWordIndex,
  isPlaying,
  enabled = true
}, ref) => {
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
  const justChangedPageRef = useRef<boolean>(false);

  // Debug: Log component mount and props
  useEffect(() => {
    console.log('🎯 AutoScrollHandler: Component mounted/props changed', {
      enabled,
      isPlaying,
      currentWordIndex,
      textLength: text?.length || 0,
      timestamp: new Date().toISOString()
    });
  }, [enabled, isPlaying, currentWordIndex, text]);

  // Create a function to reset scroll to top
  const resetToTop = () => {
    console.log('🔄 AutoScrollHandler: resetToTop called imperatively');

    // Reset all internal state
    targetScrollYRef.current = null;
    lastIndexRef.current = -1;
    lastTargetUpdateAtRef.current = 0;
    stopAnimation();

    // Enter intro mode
    introModeRef.current = true;
    introStartMsRef.current = Date.now();
    firstAnchorSnapPendingRef.current = true;
    ignoreUserBlockUntilMsRef.current = Date.now() + 800;
    justChangedPageRef.current = true;

    // Multiple attempts to ensure scroll happens
    const scrollToTop = () => {
      const contentEl = document.querySelector('[data-content="true"]') as HTMLElement | null;
      if (contentEl) {
        const rect = contentEl.getBoundingClientRect();
        const topMargin = 50;
        const target = Math.max(0, Math.round(rect.top + window.scrollY - topMargin));

        console.log('🔄 AutoScrollHandler: Scrolling to top', {
          target,
          currentScroll: window.scrollY,
          contentElTop: rect.top,
          timestamp: new Date().toISOString()
        });

        // Try multiple scroll methods for reliability
        const page = document.scrollingElement || document.documentElement;
        if (page) {
          page.scrollTop = target;
        }
        window.scrollTo(0, target);

        // Verify scroll happened
        setTimeout(() => {
          const newScroll = window.scrollY;
          console.log('🔄 AutoScrollHandler: Scroll verification', {
            targetWas: target,
            actualScroll: newScroll,
            success: Math.abs(newScroll - target) < 50
          });
        }, 50);
      }
    };

    // Immediate attempt
    scrollToTop();

    // RAF attempt for after render
    requestAnimationFrame(scrollToTop);

    // Delayed attempt as final backup
    setTimeout(scrollToTop, 150);
  };

  // Expose resetToTop function via ref
  useImperativeHandle(ref, () => ({
    resetToTop
  }), []);

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

    // Allow brief scrolling during intro/page-change even if isPlaying is false
    const allowWhileIntro = introModeRef.current || justChangedPageRef.current || (Date.now() < ignoreUserBlockUntilMsRef.current);
    if (targetY == null || !enabled || (!isPlaying && !allowWhileIntro) || isBlockedByUser) {
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
    console.log('🎯 AutoScrollHandler: Word index effect triggered', {
      currentWordIndex,
      enabled,
      isPlaying,
      lastIndexRef: lastIndexRef.current,
      introMode: introModeRef.current,
      justChangedPage: justChangedPageRef.current,
      ignoreUserBlockUntil: ignoreUserBlockUntilMsRef.current,
      willReturn: !enabled || currentWordIndex < 0 || (!isPlaying && !(introModeRef.current || justChangedPageRef.current || Date.now() < ignoreUserBlockUntilMsRef.current)) || currentWordIndex === lastIndexRef.current
    });

    // Permit updates during intro/page-change windows even if paused
    const canProceedWhilePaused = introModeRef.current || justChangedPageRef.current || (Date.now() < ignoreUserBlockUntilMsRef.current);
    if (!enabled || currentWordIndex < 0) return;
    if (!isPlaying && !canProceedWhilePaused) return;
    if (currentWordIndex === lastIndexRef.current) return;

    // Allow DOM to commit for the current word span
    const timeoutId = setTimeout(() => {
      const wordElement = document.getElementById(`scroll-word-${currentWordIndex}`);

      console.log('🎯 AutoScrollHandler: Looking for word element', {
        wordId: `scroll-word-${currentWordIndex}`,
        found: !!wordElement,
        elementTop: wordElement?.getBoundingClientRect().top,
        elementText: wordElement?.textContent?.substring(0, 20)
      });

      if (!wordElement) {
        console.log('❌ AutoScrollHandler: Word element not found, returning');
        return;
      }

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
      let anchorFromTop = viewportHeight * anchorFactor;

      // Compensate fixed bottom controls if present
      const bottomBar = document.querySelector('.mobile-audio-controls') as HTMLElement | null;
      if (bottomBar && bottomBar.offsetHeight) {
        anchorFromTop -= Math.max(0, bottomBar.offsetHeight * 0.25);
      }

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
          justChangedPageRef.current = false;
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
      const previousText = lastTextRef.current;
      lastTextRef.current = text;

      console.log('📄 AutoScrollHandler: Text change detected!', {
        previousTextLength: previousText?.length || 0,
        newTextLength: text?.length || 0,
        previousTextPreview: previousText?.substring(0, 50) + '...' || 'none',
        newTextPreview: text?.substring(0, 50) + '...' || 'none',
        isPlaying,  // Log playing state
        enabled,    // Log enabled state
        timestamp: new Date().toISOString()
      });


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
      justChangedPageRef.current = true;

      // Force immediate scroll to top on text change
      const forceScrollToTop = () => {
        const contentEl = document.querySelector('[data-content="true"]') as HTMLElement | null;

        console.log('🔍 AutoScrollHandler: DEBUG - Checking scroll environment', {
          contentElExists: !!contentEl,
          documentHeight: document.documentElement.scrollHeight,
          windowHeight: window.innerHeight,
          currentScroll: window.scrollY,
          scrollingElement: document.scrollingElement?.tagName,
          bodyOverflow: window.getComputedStyle(document.body).overflow,
          htmlOverflow: window.getComputedStyle(document.documentElement).overflow
        });

        if (contentEl) {
          const rect = contentEl.getBoundingClientRect();
          const topMargin = 50; // Fixed 50px margin
          const target = Math.max(0, Math.round(rect.top + window.scrollY - topMargin));

          console.log('🔄 AutoScrollHandler: Force scrolling to top on text change', {
            target,
            currentScroll: window.scrollY,
            contentElTop: rect.top,
            contentElHeight: rect.height,
            needsScroll: Math.abs(window.scrollY - target) > 10,
            timestamp: new Date().toISOString()
          });

          // Store initial position for verification
          const beforeScroll = window.scrollY;

          // Use both methods for reliability
          const page = document.scrollingElement || document.documentElement;
          if (page) {
            page.scrollTop = target;
          }
          window.scrollTo(0, target);

          // Check if scroll actually happened
          setTimeout(() => {
            const afterScroll = window.scrollY;
            console.log('🔄 AutoScrollHandler: Scroll verification', {
              beforeScroll,
              afterScroll,
              target,
              scrollChanged: beforeScroll !== afterScroll,
              reachedTarget: Math.abs(afterScroll - target) < 10,
              blocked: beforeScroll === afterScroll && Math.abs(beforeScroll - target) > 10
            });

            if (beforeScroll === afterScroll && Math.abs(beforeScroll - target) > 10) {
              console.log('⚠️ SCROLL BLOCKED - Something is preventing scrolling!');
            }
          }, 10);
        } else {
          console.log('❌ AutoScrollHandler: Content element not found!');
        }
      };

      // Try multiple times to ensure it works
      forceScrollToTop();
      requestAnimationFrame(forceScrollToTop);
      setTimeout(forceScrollToTop, 100);
    }
  }, [text]);

  // Fallback: if page changed and no word events arrive promptly, nudge to top band
  useEffect(() => {
    if (!justChangedPageRef.current) return;

    console.log('⏰ AutoScrollHandler: Setting up 350ms fallback timer for page change');

    const timer = setTimeout(() => {
      if (!justChangedPageRef.current) {
        console.log('⏰ AutoScrollHandler: Fallback timer cancelled - page change flag cleared');
        return;
      }

      console.log('⏰ AutoScrollHandler: Fallback timer executing after 350ms');

      const page = document.scrollingElement || document.documentElement;
      const contentEl = document.querySelector('[data-content="true"]') as HTMLElement | null;
      if (!page || !contentEl) {
        console.log('❌ AutoScrollHandler: Fallback failed - missing page or content element');
        return;
      }

      const rect = contentEl.getBoundingClientRect();
      const topMargin = Math.min(120, (window.visualViewport?.height || window.innerHeight) * 0.15);
      const target = Math.max(0, Math.round(rect.top + window.scrollY - topMargin));

      console.log('⏰ AutoScrollHandler: Fallback scrolling to:', {
        target,
        currentScroll: page.scrollTop,
        topMargin,
        contentTop: rect.top
      });

      page.scrollTop = target;
      justChangedPageRef.current = false;
      stopAnimation();

      console.log('⏰ AutoScrollHandler: Fallback complete, new scroll position:', page.scrollTop);
    }, 350);

    return () => {
      console.log('⏰ AutoScrollHandler: Clearing fallback timer');
      clearTimeout(timer);
    };
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
});