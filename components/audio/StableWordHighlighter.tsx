'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface StableWordHighlighterProps {
  text: string;
  currentWordIndex: number;
  isPlaying: boolean;
  className?: string;
  highlightColor?: string;
  showProgress?: boolean;
  currentSentenceIndex?: number;
  showSentenceBackground?: boolean;
  sentenceHighlightColor?: string;
  totalSentences?: number;
  sentenceOnly?: boolean;
  enableAutoScroll?: boolean;
}

export const StableWordHighlighter: React.FC<StableWordHighlighterProps> = ({
  text,
  currentWordIndex,
  isPlaying,
  className = '',
  highlightColor = '#10b981',
  showProgress = true,
  currentSentenceIndex,
  showSentenceBackground = true,
  sentenceHighlightColor = 'rgba(16, 185, 129, 0.18)',
  totalSentences,
  sentenceOnly = true,
  enableAutoScroll = true
}) => {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [highlightPosition, setHighlightPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [sentenceHighlightPosition, setSentenceHighlightPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<Map<number, HTMLSpanElement>>(new Map());
  const lastScrollTime = useRef<number>(0);
  const lastScrolledSentenceRef = useRef<number>(-1);
  const lastTextRef = useRef<string>(text);

  // Parse text into words
  const words = useMemo(() => {
    let wordCounter = 0;
    return text.split(/(\s+)/).map((segment, index) => {
      // Treat as a real word only if, after cleaning punctuation (matching TextProcessor), something remains
      const cleaned = segment.replace(/^[^\w''-]+|[^\w''-]+$/g, '');
      const isWord = cleaned.length > 0;
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

  // Sentence boundaries: simple splitter that preserves all sentences without merging
  const sentenceWordRanges = useMemo(() => {
    const totalWords = words.filter(w => w.isWord).length;
    const ranges: Array<{ start: number; end: number }> = [];

    if (!text || totalWords === 0) return ranges;

    // Split by sentence-ending punctuation or double newlines, keeping it simple and stable
    const rawSentences = text
      .split(/(?<=[.!?])\s+(?=[A-Z"'\d])|\n{2,}/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let cursor = 0;
    for (const s of rawSentences) {
      const count = s
        .split(/\s+/)
        .map(seg => seg.replace(/^[^\w''-]+|[^\w''-]+$/g, ''))
        .filter(seg => seg.length > 0)
        .length;
      if (count <= 0) continue;
      const start = cursor;
      const end = Math.max(start, start + count - 1);
      ranges.push({ start, end });
      cursor += count;
    }

    // Ensure we cover all words; extend the last range if needed
    if (ranges.length > 0) {
      const last = ranges[ranges.length - 1];
      if (last.end < totalWords - 1) {
        last.end = totalWords - 1;
      }
    } else {
      // Single range fallback
      ranges.push({ start: 0, end: totalWords - 1 });
    }

    return ranges;
  }, [text, words]);

  // Update highlighted word overlay (disabled when sentenceOnly=true)
  useEffect(() => {
    if (sentenceOnly) {
      setHighlightPosition(null);
      return;
    }
    if (isPlaying && currentWordIndex >= 0) {
      setHighlightedIndex(currentWordIndex);

      const wordElement = wordsRef.current.get(currentWordIndex);
      if (wordElement && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const wordRect = wordElement.getBoundingClientRect();

        setHighlightPosition({
          top: wordRect.top - containerRect.top,
          left: wordRect.left - containerRect.left,
          width: wordRect.width,
          height: wordRect.height
        });

        const now = Date.now();
        if (now - lastScrollTime.current > 1000) {
          const windowHeight = window.innerHeight;
          const topThreshold = windowHeight * 0.35;
          const bottomThreshold = windowHeight * 0.65;

          if (wordRect.top < topThreshold || wordRect.bottom > bottomThreshold) {
            const absoluteTop = window.scrollY + wordRect.top;
            const targetScrollPosition = absoluteTop - (windowHeight / 2) + (wordRect.height / 2);

            requestAnimationFrame(() => {
              window.scrollTo({
                top: targetScrollPosition,
                behavior: 'smooth'
              });
            });
            lastScrollTime.current = now;
          }
        }
      }
    } else {
      setHighlightedIndex(-1);
      setHighlightPosition(null);
    }
  }, [currentWordIndex, isPlaying, sentenceOnly]);

  // Update highlighted sentence background (uses currentSentenceIndex if provided; falls back to word index mapping)
  useEffect(() => {
    if (!showSentenceBackground || !isPlaying) {
      setSentenceHighlightPosition(null);
      return;
    }

    // Determine effective sentence index
    let effectiveSentenceIndex = -1;
    if (typeof currentSentenceIndex === 'number' && currentSentenceIndex >= 0) {
      effectiveSentenceIndex = Math.min(currentSentenceIndex, Math.max(0, sentenceWordRanges.length - 1));
    } else if (currentWordIndex >= 0 && sentenceWordRanges.length > 0) {
      // Map word index to sentence range
      for (let i = 0; i < sentenceWordRanges.length; i++) {
        const r = sentenceWordRanges[i];
        if (currentWordIndex >= r.start && currentWordIndex <= r.end) {
          effectiveSentenceIndex = i;
          break;
        }
      }
      if (effectiveSentenceIndex === -1) {
        // Fallback: clamp to nearest
        effectiveSentenceIndex = currentWordIndex < sentenceWordRanges[0].start ? 0 : sentenceWordRanges.length - 1;
      }
    }

    if (effectiveSentenceIndex >= 0 && effectiveSentenceIndex < sentenceWordRanges.length) {
      const range = sentenceWordRanges[effectiveSentenceIndex];
      const firstEl = wordsRef.current.get(range.start);
      const lastEl = wordsRef.current.get(range.end);
      if (firstEl && lastEl && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const firstRect = firstEl.getBoundingClientRect();
        const lastRect = lastEl.getBoundingClientRect();
        const left = Math.min(firstRect.left, lastRect.left) - containerRect.left;
        const top = Math.min(firstRect.top, lastRect.top) - containerRect.top;
        const right = Math.max(firstRect.right, lastRect.right) - containerRect.left;
        const bottom = Math.max(firstRect.bottom, lastRect.bottom) - containerRect.top;
        setSentenceHighlightPosition({
          left,
          top,
          width: Math.max(1, right - left),
          height: Math.max(1, bottom - top)
        });

        // Auto-scroll for sentence highlighting when in sentenceOnly mode
        if (sentenceOnly && enableAutoScroll) {
          const now = Date.now();
          if (now - lastScrollTime.current > 1000) { // Same debounce as word highlighting
            console.log(`📜 Attempting sentence auto-scroll for sentence containing word ${currentWordIndex}`);

            const windowHeight = window.innerHeight;
            const topThreshold = windowHeight * 0.35;
            const bottomThreshold = windowHeight * 0.65;

            // Use the center of the sentence for scroll calculation
            const sentenceCenter = (firstRect.top + lastRect.bottom) / 2;

            console.log(`📜 Sentence center: ${sentenceCenter.toFixed(0)}, thresholds: ${topThreshold.toFixed(0)}-${bottomThreshold.toFixed(0)}`);

            if (sentenceCenter < topThreshold || sentenceCenter > bottomThreshold) {
              const absoluteTop = window.scrollY + sentenceCenter;
              const targetScrollPosition = absoluteTop - (windowHeight / 2);

              console.log(`📜 Scrolling to: ${targetScrollPosition.toFixed(0)}`);

              requestAnimationFrame(() => {
                window.scrollTo({
                  top: Math.max(0, targetScrollPosition),
                  behavior: 'smooth'
                });
              });
              lastScrollTime.current = now;
            } else {
              console.log(`📜 Sentence already visible, no scroll needed`);
            }
          }
        }
      } else {
        setSentenceHighlightPosition(null);
      }
    } else {
      setSentenceHighlightPosition(null);
    }
  }, [currentSentenceIndex, currentWordIndex, isPlaying, showSentenceBackground, sentenceWordRanges, sentenceOnly]);

  // Sentence-level auto-scroll synced to sentence index; centers at ~40% viewport
  useEffect(() => {
    console.log(`🔍 Auto-scroll effect: enableAutoScroll=${enableAutoScroll}, isPlaying=${isPlaying}, currentSentenceIndex=${currentSentenceIndex}, ranges=${sentenceWordRanges.length}`);

    if (!enableAutoScroll || !isPlaying) {
      console.log(`❌ Auto-scroll disabled: enableAutoScroll=${enableAutoScroll}, isPlaying=${isPlaying}`);
      return;
    }

    if (
      typeof currentSentenceIndex !== 'number' ||
      currentSentenceIndex < 0 ||
      currentSentenceIndex >= sentenceWordRanges.length
    ) {
      console.log(`❌ Invalid sentence index: ${currentSentenceIndex}, ranges: ${sentenceWordRanges.length}`);
      return;
    }

    if (lastScrolledSentenceRef.current === currentSentenceIndex) {
      console.log(`🔄 Already scrolled to sentence ${currentSentenceIndex}`);
      return;
    }

    const range = sentenceWordRanges[currentSentenceIndex];
    const firstEl = wordsRef.current.get(range.start);
    const lastEl = wordsRef.current.get(range.end);
    if (!firstEl || !lastEl) return;

    // Find nearest scrollable ancestor; fallback to document.scrollingElement/window
    const getScrollableAncestor = (el: HTMLElement | null): HTMLElement | Window => {
      let node: HTMLElement | null = el;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight;
        if (canScroll) return node;
        node = node.parentElement;
      }
      return window;
    };

    const scroller = getScrollableAncestor(firstEl);
    const firstRect = firstEl.getBoundingClientRect();
    const lastRect = lastEl.getBoundingClientRect();
    const positionAt = 0.4;

    requestAnimationFrame(() => {
      if (scroller === window) {
        const sentenceTopAbs = Math.min(firstRect.top, lastRect.top) + window.scrollY;
        const target = sentenceTopAbs - (window.innerHeight * positionAt);
        window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
      } else {
        const container = scroller as HTMLElement;
        const containerRect = container.getBoundingClientRect();
        const relTop = Math.min(firstRect.top, lastRect.top) - containerRect.top;
        const target = container.scrollTop + relTop - (container.clientHeight * positionAt);
        container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
      }
      lastScrolledSentenceRef.current = currentSentenceIndex;
    });
  }, [currentSentenceIndex, isPlaying, enableAutoScroll, sentenceWordRanges]);

  // Reset autoscroll state when the text changes (e.g., page turn)
  useEffect(() => {
    if (lastTextRef.current !== text) {
      lastTextRef.current = text;
      lastScrolledSentenceRef.current = -1;
      lastScrollTime.current = 0;
    }
  }, [text]);

  // Progress bar
  const totalWords = words.filter(w => w.isWord).length;
  const progress = totalWords > 0 ? (highlightedIndex + 1) / totalWords : 0;

  return (
    <div className={`stable-word-highlighter ${className}`}>
      {showProgress && (
        <div style={{
          width: '100%',
          height: '2px',
          background: 'rgba(148, 163, 184, 0.2)',
          borderRadius: '1px',
          overflow: 'hidden',
          marginBottom: '12px'
        }}>
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: highlightColor,
              borderRadius: '1px',
              transition: 'width 0.3s ease-out'
            }}
          />
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          position: 'relative',
          lineHeight: '1.8',
          fontSize: 'inherit',
          fontFamily: 'inherit',
          padding: '8px 0'
        }}
      >
        {/* Sentence highlight overlay - drawn first (behind text and word overlay) */}
        {sentenceHighlightPosition && isPlaying && showSentenceBackground && (
          <div
            style={{
              position: 'absolute',
              top: sentenceHighlightPosition.top,
              left: sentenceHighlightPosition.left,
              width: sentenceHighlightPosition.width,
              height: sentenceHighlightPosition.height,
              background: sentenceHighlightColor,
              borderRadius: '6px',
              pointerEvents: 'none',
              zIndex: 0,
              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        )}

        {/* Static text layer - NEVER changes */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {words.map((segment, index) => {
            if (!segment.isWord) {
              return <span key={index}>{segment.text}</span>;
            }

            return (
              <span
                key={index}
                ref={(el) => {
                  if (el) wordsRef.current.set(segment.wordIndex, el);
                }}
                style={{
                  position: 'relative',
                  padding: '2px 1px',
                  cursor: 'pointer'
                }}
              >
                {segment.text}
              </span>
            );
          })}
        </div>

        {/* Word highlight overlay - optional (disabled when sentenceOnly=true), above sentence background but below text */}
        {highlightPosition && isPlaying && !sentenceOnly && (
          <div
            style={{
              position: 'absolute',
              top: highlightPosition.top,
              left: highlightPosition.left,
              width: highlightPosition.width,
              height: highlightPosition.height,
              background: `linear-gradient(135deg, ${highlightColor}40, ${highlightColor}60)`,
              borderRadius: '3px',
              pointerEvents: 'none',
              zIndex: 1,
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: `0 2px 8px ${highlightColor}30`
            }}
          />
        )}
      </div>

      {showProgress && (
        <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#94a3b8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>
            {highlightedIndex >= 0 ? highlightedIndex + 1 : 0} of {totalWords} words
          </span>
          {isPlaying && (
            <span style={{ color: highlightColor }}>
              Reading...
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Hook for stable word highlighting
export const useStableWordHighlighting = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const lastUpdateTime = useRef<number>(0);
  const minimumDwellTime = 100; // Minimum time between updates

  const handleWordHighlight = (wordIndex: number) => {
    const now = Date.now();
    // Prevent too-rapid updates that cause visual instability
    if (now - lastUpdateTime.current >= minimumDwellTime) {
      setCurrentWordIndex(wordIndex);
      lastUpdateTime.current = now;
    }
  };

  const resetHighlighting = () => {
    setCurrentWordIndex(-1);
    lastUpdateTime.current = 0;
  };

  return {
    currentWordIndex,
    handleWordHighlight,
    resetHighlighting
  };
};