import { useEffect, useRef } from 'react';

interface GentleAutoScrollConfig {
  currentWordIndex: number;
  currentSentenceIndex?: number; // Real sentence data from audio
  text: string;
  isPlaying: boolean;
  enabled?: boolean;
}

/**
 * Gentle auto-scroll with single scroll per page at 50% progress
 * - Only 1 scroll per page when halfway through reading
 * - Most comfortable and predictable scrolling experience
 * - Smooth page-to-top transition on new pages
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
  const hasScrolledRef = useRef<boolean>(false);
  const lastSentenceRef = useRef<number>(-1);
  const sentencesRef = useRef<string[]>([]);

  useEffect(() => {
    console.log('🌟 VOICE-HARMONY AUTO-SCROLL:', {
      enabled,
      isPlaying,
      currentSentenceIndex,
      currentWordIndex,
      textLength: text?.length || 0,
      totalSentences: sentencesRef.current.length,
      hasScrolled: hasScrolledRef.current,
      lastSentence: lastSentenceRef.current,
      textPreview: text?.substring(0, 50) + '...'
    });

    // Allow auto-scroll during brief pauses (page transitions)
    const wasRecentlyPlaying = isPlaying || (currentWordIndex > 0 && currentWordIndex < 1000);

    if (!enabled || currentWordIndex < 0 || !text) {
      console.log('❌ GENTLE AUTO-SCROLL: Early return', {
        enabled,
        isPlaying,
        wasRecentlyPlaying,
        currentWordIndex,
        hasText: !!text,
        reason: !enabled ? 'disabled' : currentWordIndex < 0 ? 'invalid word index' : !text ? 'no text' : 'unknown'
      });
      return;
    }

    if (!isPlaying) {
      console.log('⏸️ AUDIO PAUSED but continuing auto-scroll for harmony', {
        isPlaying,
        currentWordIndex,
        wasRecentlyPlaying,
        reason: 'Maintaining scroll during pause for consistency'
      });
    }

    // Check for text change (page transition)
    if (text !== lastTextRef.current) {
      console.log('📄 PAGE CHANGE: Resetting scroll state for new page', {
        oldText: lastTextRef.current?.substring(0, 50) + '...',
        newText: text?.substring(0, 50) + '...',
        oldTextLength: lastTextRef.current?.length || 0,
        newTextLength: text?.length || 0,
        currentSentenceIndex,
        currentWordIndex,
        isPlaying
      });
      lastTextRef.current = text;
      totalWordsRef.current = text.split(/\s+/).length;
      hasScrolledRef.current = false;
      lastSentenceRef.current = -1;

      // Parse sentences for voice harmony
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      sentencesRef.current = sentences;

      console.log('📚 VOICE-HARMONY PAGE SETUP:', {
        totalWords: totalWordsRef.current,
        totalSentences: sentences.length,
        textLength: text.length,
        firstSentence: sentences[0]?.substring(0, 50) + '...',
        resetScrollLimiter: 'Allow multiple scrolls per page'
      });

      // Scroll to top of new page
      setTimeout(() => {
        const contentEl = document.querySelector('[data-content="true"]');
        if (contentEl) {
          const rect = contentEl.getBoundingClientRect();
          const target = rect.top + window.scrollY - 120; // 120px margin

          console.log('🎯 NEW PAGE: Scrolling to top');
          window.scrollTo({
            top: Math.max(0, target),
            behavior: 'instant'
          });
        }
      }, 100);
      return;
    }

    // Debug current sentence data availability
    console.log('🔍 SENTENCE DATA CHECK:', {
      hasSentenceIndex: currentSentenceIndex !== undefined,
      currentSentenceIndex,
      lastSentenceRef: lastSentenceRef.current,
      sentenceChanged: currentSentenceIndex !== lastSentenceRef.current,
      isPlaying,
      enabled,
      hasText: !!text,
      wordIndex: currentWordIndex
    });

    // Voice-harmony scrolling: Use actual sentence data from audio OR fallback to word-based
    if (currentSentenceIndex !== undefined && currentSentenceIndex !== lastSentenceRef.current) {
      const totalSentences = sentencesRef.current.length;
      const sentenceProgress = currentSentenceIndex / Math.max(1, totalSentences);

      console.log('🎵 VOICE HARMONY: Sentence changed', {
        currentSentence: currentSentenceIndex,
        lastSentence: lastSentenceRef.current,
        totalSentences,
        progress: (sentenceProgress * 100).toFixed(1) + '%',
        hasScrolled: hasScrolledRef.current
      });

      // Scroll every 2 sentences for smooth reading flow
      const sentencesSinceStart = currentSentenceIndex;
      const shouldScrollAtSentence = sentencesSinceStart > 0 && sentencesSinceStart % 2 === 0;

      if (shouldScrollAtSentence) {
        console.log('🎯 SMOOTH 2-SENTENCE SCROLL: Every 2 sentences trigger', {
          currentSentence: currentSentenceIndex,
          triggerSentence: sentencesSinceStart,
          totalSentences,
          scrollCount: Math.floor(sentencesSinceStart / 2)
        });

        performGentleScroll();
      }

      lastSentenceRef.current = currentSentenceIndex;
    } else {
      // FALLBACK: Use word-based scrolling if sentence data not available or not changing
      const totalWords = totalWordsRef.current;
      const progress = currentWordIndex / Math.max(1, totalWords);

      console.log('📊 WORD-BASED FALLBACK ACTIVE:', {
        currentWordIndex,
        totalWords,
        progress: (progress * 100).toFixed(1) + '%',
        reason: 'Sentence data not changing, using word milestones'
      });

      // Multiple scrolls: 15%, 35%, 55%, 75% for more frequent scrolling
      const progressMilestones = [0.15, 0.35, 0.55, 0.75];
      const currentMilestone = progressMilestones.find(milestone =>
        progress >= milestone && progress < milestone + 0.03 // Smaller window
      );

      if (currentMilestone) {
        console.log('🎯 WORD-MILESTONE SCROLL: Triggered', {
          currentWordIndex,
          totalWords,
          progress: (progress * 100).toFixed(1) + '%',
          milestone: (currentMilestone * 100) + '%',
          scrollNumber: progressMilestones.indexOf(currentMilestone) + 1
        });

        performGentleScroll();
      }
    }

    function performGentleScroll() {
      const windowHeight = window.innerHeight;
      const isMobile = window.innerWidth <= 768; // Mobile detection

      // Slow and smooth scroll measurements - smaller distances
      const mobileScrollDistance = windowHeight * 0.25; // Only 25% of screen (slower)
      const desktopScrollDistance = windowHeight * 0.20; // Only 20% of screen (slower)
      const mobileTopMargin = windowHeight * 0.20; // 20% from top for mobile comfort

      // Try to find the current word element for precise scrolling
      const wordElement = document.getElementById(`scroll-word-${currentWordIndex}`);
      let targetScroll;

      if (wordElement && isMobile) {
        // Mobile: Position current word at comfortable reading position (20% from top)
        const rect = wordElement.getBoundingClientRect();
        targetScroll = rect.top + window.scrollY - mobileTopMargin;
        console.log('📱 SLOW SMOOTH SCROLL: Found current word', {
          wordIndex: currentWordIndex,
          wordTop: Math.round(rect.top),
          mobileTopMargin: Math.round(mobileTopMargin),
          targetPosition: Math.round(targetScroll),
          screenHeight: windowHeight
        });
      } else if (isMobile) {
        // Mobile fallback: slow gentle scroll by 25% of screen
        const currentScroll = window.scrollY;
        targetScroll = currentScroll + mobileScrollDistance;
        console.log('📱 SLOW MOBILE SCROLL: Small increment', {
          scrollDistance: Math.round(mobileScrollDistance),
          from: Math.round(currentScroll),
          to: Math.round(targetScroll),
          screenHeight: windowHeight,
          percentOfScreen: '25%'
        });
      } else {
        // Desktop: slow gentle scroll by 20% of screen
        const scrollDistance = desktopScrollDistance;
        const currentScroll = window.scrollY;
        targetScroll = currentScroll + scrollDistance;
        console.log('💻 SLOW DESKTOP SCROLL: Small increment', {
          scrollDistance: Math.round(scrollDistance),
          from: Math.round(currentScroll),
          to: Math.round(targetScroll),
          percentOfScreen: '20%'
        });
      }

      console.log('🐌 SLOW & SMOOTH SCROLL:', {
        trigger: 'every 2 sentences',
        device: isMobile ? 'mobile' : 'desktop',
        targetScroll: Math.round(targetScroll),
        currentWordIndex,
        hasWordElement: !!wordElement,
        scrollType: 'slow and gentle'
      });

      // Slow and smooth scroll with longer duration
      window.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth' // Browser handles smooth scrolling automatically
      });
    }
  }, [currentWordIndex, text, isPlaying, enabled]);

  return {
    hasScrolled: hasScrolledRef.current,
    progress: (currentWordIndex / Math.max(1, totalWordsRef.current)) * 100,
    totalWords: totalWordsRef.current
  };
}