import { useEffect, useRef } from 'react';

interface SentenceRhythmScrollConfig {
  currentWordIndex: number;
  text: string;
  isPlaying: boolean;
  enabled?: boolean;
  sentencesPerScroll?: number;
}

export function useSentenceRhythmScroll({
  currentWordIndex,
  text,
  isPlaying,
  enabled = true,
  sentencesPerScroll = 2
}: SentenceRhythmScrollConfig) {
  const lastTextRef = useRef<string>('');
  const sentencesRef = useRef<string[]>([]);
  const currentSentenceRef = useRef<number>(0);
  const lastScrolledSentenceRef = useRef<number>(-1);
  const pageTransitionRef = useRef<boolean>(false);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef<number>(0);

  // Parse sentences when text changes
  useEffect(() => {
    if (text !== lastTextRef.current) {
      console.log('📚 SENTENCE RHYTHM: Parsing new text');

      // Split text into sentences
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      sentencesRef.current = sentences;
      lastTextRef.current = text;
      currentSentenceRef.current = 0;
      lastScrolledSentenceRef.current = -1;
      pageTransitionRef.current = true;

      console.log('📚 SENTENCE RHYTHM: Parsed', {
        totalSentences: sentences.length,
        firstSentence: sentences[0]?.substring(0, 50) + '...',
        sentencesPerScroll
      });

      // Scroll to top on new page
      setTimeout(() => {
        const contentEl = document.querySelector('[data-content="true"]');
        if (contentEl) {
          const rect = contentEl.getBoundingClientRect();
          const target = rect.top + window.scrollY - 80;

          console.log('📚 PAGE START: Scrolling to top');
          window.scrollTo({
            top: Math.max(0, target),
            behavior: 'instant'
          });
        }
      }, 100);
    }
  }, [text, sentencesPerScroll]);

  // Start/stop 5-second scroll interval based on playing state
  useEffect(() => {
    if (!enabled || !text) {
      return;
    }

    if (isPlaying) {
      console.log('⏰ TIMED SCROLL: Starting 10-second interval');

      // Start the 10-second interval
      scrollIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceLastScroll = now - lastScrollTimeRef.current;

        console.log('⏰ TIMED SCROLL: 10 seconds elapsed, scrolling', {
          timeSinceLastScroll: Math.round(timeSinceLastScroll / 1000) + 's',
          currentWordIndex
        });

        performSentenceScroll();
        lastScrollTimeRef.current = now;
      }, 10000); // 10 seconds

      // Initial scroll after short delay on new audio start
      if (pageTransitionRef.current) {
        setTimeout(() => {
          if (isPlaying) {
            console.log('⏰ TIMED SCROLL: Initial scroll after page transition');
            performSentenceScroll();
            lastScrollTimeRef.current = Date.now();
          }
        }, 3000); // First scroll after 3 seconds
        pageTransitionRef.current = false;
      }

    } else {
      // Stop interval when paused
      if (scrollIntervalRef.current) {
        console.log('⏰ TIMED SCROLL: Stopping interval (paused)');
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }

    // Cleanup
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };

  }, [isPlaying, enabled, text]);

  const performSentenceScroll = () => {
    const windowHeight = window.innerHeight;
    const scrollDistance = windowHeight * 0.25; // Scroll down by 25% of window height (gentler)
    const currentScroll = window.scrollY;
    const targetScroll = currentScroll + scrollDistance;

    console.log('📜 TIMED SMOOTH SCROLL:', {
      interval: '10 seconds',
      scrollDistance: Math.round(scrollDistance),
      from: Math.round(currentScroll),
      to: Math.round(targetScroll),
      direction: 'down'
    });

    window.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
  };

  return {};
}