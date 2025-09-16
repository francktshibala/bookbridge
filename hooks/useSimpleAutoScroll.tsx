import { useEffect, useRef } from 'react';

interface SimpleAutoScrollConfig {
  currentWordIndex: number;
  text: string;
  isPlaying: boolean;
  enabled?: boolean;
  audioCompensationMs?: number; // Add timing compensation
}

export function useSimpleAutoScroll({
  currentWordIndex,
  text,
  isPlaying,
  enabled = true,
  audioCompensationMs = 300 // Default 300ms ahead of audio
}: SimpleAutoScrollConfig) {
  const lastWordIndexRef = useRef<number>(-1);
  const lastTextRef = useRef<string>('');
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pageTransitionRef = useRef<boolean>(false);
  const wordsOnPageRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false); // Track if was playing before pause

  useEffect(() => {
    console.log('🚀 SIMPLE AUTO-SCROLL:', {
      enabled,
      isPlaying,
      currentWordIndex,
      textLength: text?.length || 0,
      audioCompensationMs,
      lastWordIndex: lastWordIndexRef.current,
      pageTransition: pageTransitionRef.current,
      text: text?.substring(0, 50) + '...'
    });

    // Track playing state changes
    if (isPlaying && !wasPlayingRef.current) {
      console.log('▶️ AUDIO STARTED: Resuming auto-scroll');
      wasPlayingRef.current = true;
    } else if (!isPlaying && wasPlayingRef.current) {
      console.log('⏸️ AUDIO PAUSED: Was playing, now paused');
      wasPlayingRef.current = false;
    }

    // Allow auto-scroll during brief pauses if we were recently playing (for page transitions)
    const shouldAllowScroll = isPlaying || (wasPlayingRef.current && pageTransitionRef.current);

    if (!enabled || !shouldAllowScroll || currentWordIndex < 0 || !text) {
      console.log('❌ SIMPLE AUTO-SCROLL: Early return', {
        enabled,
        isPlaying,
        shouldAllowScroll,
        pageTransition: pageTransitionRef.current,
        wasPlaying: wasPlayingRef.current,
        currentWordIndex,
        hasText: !!text,
        textLength: text?.length || 0,
        reason: !enabled ? 'disabled' : !shouldAllowScroll ? 'not playing/allowed' : currentWordIndex < 0 ? 'invalid word index' : !text ? 'no text' : 'unknown'
      });
      return;
    }

    // Check for text change (page transition)
    if (text !== lastTextRef.current && lastTextRef.current !== '') {
      console.log('📄 PAGE CHANGE DETECTED - Resetting state');
      lastTextRef.current = text;
      lastWordIndexRef.current = -1;
      pageTransitionRef.current = true;
      wordsOnPageRef.current = text.split(/\s+/).length;

      // Force scroll to top on page change
      setTimeout(() => {
        const contentEl = document.querySelector('[data-content="true"]');
        if (contentEl) {
          const rect = contentEl.getBoundingClientRect();
          const target = rect.top + window.scrollY - 100; // 100px from top

          console.log('🎯 Scrolling to top for new page:', target);
          window.scrollTo({
            top: Math.max(0, target),
            behavior: 'instant'
          });
        }
      }, 100);
      return;
    }

    lastTextRef.current = text;

    // Detect if word index jumped backwards (page transition)
    if (lastWordIndexRef.current > currentWordIndex && lastWordIndexRef.current - currentWordIndex > 10) {
      console.log('🔄 Word index jumped backwards - likely page transition', {
        from: lastWordIndexRef.current,
        to: currentWordIndex
      });
      pageTransitionRef.current = true;
    }

    // Skip if same word
    if (currentWordIndex === lastWordIndexRef.current) {
      console.log('⏭️ SKIPPING: Same word index', currentWordIndex);
      return;
    }

    console.log('✅ PROCEEDING: Word index changed', {
      from: lastWordIndexRef.current,
      to: currentWordIndex,
      change: currentWordIndex - lastWordIndexRef.current
    });

    // Check for suspicious jumps (word index shouldn't jump by more than 5 normally)
    const wordJump = Math.abs(currentWordIndex - lastWordIndexRef.current);
    if (lastWordIndexRef.current !== -1 && wordJump > 5 && !pageTransitionRef.current) {
      console.log('⚠️ Suspicious word jump detected:', {
        from: lastWordIndexRef.current,
        to: currentWordIndex,
        jump: wordJump
      });
      // Treat large jumps as page transitions
      if (wordJump > 20) {
        pageTransitionRef.current = true;
      }
    }

    lastWordIndexRef.current = currentWordIndex;

    // Clear page transition flag after a few words
    if (pageTransitionRef.current && currentWordIndex > 5) {
      pageTransitionRef.current = false;
    }

    // Clear any pending scroll timer
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }

    // Function to perform the actual scroll
    const performScroll = () => {
      console.log('🎯 PERFORM SCROLL: Function called', {
        currentWordIndex,
        pageTransition: pageTransitionRef.current
      });

      // Adjust look-ahead based on whether we just changed pages
      const lookAheadWords = pageTransitionRef.current ? 0 : 2; // No look-ahead on page transitions
      let targetWordIndex = currentWordIndex;
      let wordElement = null;

      // Try to find word element (current or ahead)
      for (let i = 0; i <= lookAheadWords; i++) {
        const idx = currentWordIndex + i;
        const el = document.getElementById(`scroll-word-${idx}`);
        if (el) {
          wordElement = el;
          targetWordIndex = idx;
          break;
        }
      }

      // If we can't find the exact word, try finding the current word without look-ahead
      if (!wordElement) {
        wordElement = document.getElementById(`scroll-word-${currentWordIndex}`);
        targetWordIndex = currentWordIndex;
      }

      if (wordElement) {
        const rect = wordElement.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const currentTop = rect.top;

        // Only scroll if word is not in comfortable viewing area (25-60% of screen)
        const topThreshold = windowHeight * 0.25;
        const bottomThreshold = windowHeight * 0.6;

        console.log('🎯 Word position check:', {
          wordIndex: targetWordIndex,
          currentTop,
          topThreshold,
          bottomThreshold,
          inComfortZone: currentTop >= topThreshold && currentTop <= bottomThreshold
        });

        if (currentTop < topThreshold || currentTop > bottomThreshold) {
          // Calculate target to put word at 35% from top (higher for better visibility)
          const targetPosition = rect.top + window.scrollY - (windowHeight * 0.35);

          console.log('📍 Scrolling to word', targetWordIndex, {
            currentWordIndex,
            lookAhead: targetWordIndex - currentWordIndex,
            currentTop,
            targetPosition,
            timing: 'with ' + audioCompensationMs + 'ms compensation'
          });

          window.scrollTo({
            top: Math.max(0, targetPosition),
            behavior: 'smooth'
          });
        }
      } else {
        // If no word element found, try proportional scrolling as fallback
        const words = text.split(/\s+/);
        // Use a more conservative word index for proportional scrolling
        const effectiveWordIndex = Math.min(currentWordIndex, words.length - 1);
        const progress = effectiveWordIndex / Math.max(1, words.length);
        const contentEl = document.querySelector('[data-content="true"]');

        if (contentEl) {
          const contentHeight = contentEl.scrollHeight;
          const targetScroll = progress * contentHeight - (window.innerHeight * 0.35);

          console.log('📊 Proportional scroll fallback', {
            wordIndex: currentWordIndex,
            effectiveWordIndex,
            totalWords: words.length,
            progress: (progress * 100).toFixed(1) + '%',
            targetScroll,
            isPageTransition: pageTransitionRef.current
          });

          // Only do proportional scroll if it makes sense
          if (progress <= 1.0 && targetScroll >= 0) {
            window.scrollTo({
              top: Math.max(0, targetScroll),
              behavior: 'smooth'
            });
          }
        }
      }
    };

    // Apply timing compensation - scroll slightly ahead of audio
    if (audioCompensationMs > 0) {
      console.log('⏱️ Applying timing compensation:', audioCompensationMs + 'ms', {
        currentWordIndex,
        clearingPrevious: !!scrollTimerRef.current
      });
      scrollTimerRef.current = setTimeout(() => {
        console.log('⚡ TIMEOUT EXECUTING: About to call performScroll');
        performScroll();
      }, audioCompensationMs);
    } else {
      console.log('⚡ NO COMPENSATION: Calling performScroll immediately');
      performScroll();
    }

    // Cleanup
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, [currentWordIndex, text, isPlaying, enabled, audioCompensationMs]);

  return {};
}