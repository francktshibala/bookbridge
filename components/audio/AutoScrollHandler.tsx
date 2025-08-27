'use client';

import React, { useEffect, useMemo } from 'react';

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

  // Auto-scroll logic extracted from WordHighlighter
  useEffect(() => {
    if (!enabled || !isPlaying || currentWordIndex < 0) return;
    
    // Add a small delay to ensure DOM is updated
    setTimeout(() => {
      const wordElement = document.getElementById(`scroll-word-${currentWordIndex}`);
      
      if (wordElement) {
        const wordRect = wordElement.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const topThreshold = windowHeight * 0.3;
        const bottomThreshold = windowHeight * 0.7;
        
        // Check if word needs scrolling - same logic as WordHighlighter
        if (wordRect.top < topThreshold || wordRect.bottom > bottomThreshold) {
          const absoluteTop = window.scrollY + wordRect.top;
          const targetScrollPosition = absoluteTop - (windowHeight / 2) + (wordRect.height / 2);
          
          console.log(`📜 AUTO-SCROLL: Word ${currentWordIndex} → ${targetScrollPosition}px`);
          
          window.scrollTo({
            top: targetScrollPosition,
            behavior: 'smooth'
          });
        }
      }
    }, 50); // 50ms delay to match WordHighlighter timing
  }, [currentWordIndex, isPlaying, enabled]);

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