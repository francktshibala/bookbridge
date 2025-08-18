'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
  confidence: number;
}

interface WordHighlighterProps {
  text: string;
  currentWordIndex: number;
  isPlaying: boolean;
  className?: string;
  highlightColor?: string;
  animationType?: 'smooth' | 'instant' | 'speechify';
  showProgress?: boolean;
}

export const WordHighlighter: React.FC<WordHighlighterProps> = ({
  text,
  currentWordIndex,
  isPlaying,
  className = '',
  highlightColor = '#10b981', // Green by default
  animationType = 'speechify',
  showProgress = true
}) => {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const highlightedWordRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse text into words with positions
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

  // Update highlighted word with smooth transitions
  useEffect(() => {
    if (isPlaying && currentWordIndex >= 0) {
      setHighlightedIndex(currentWordIndex);
      console.log('🎯 Setting highlightedIndex to:', currentWordIndex);
      
      // Add a small delay to ensure DOM is updated
      setTimeout(() => {
        // Find highlighted word by ID instead of ref (more reliable)
        const wordElement = document.getElementById(`word-${currentWordIndex}`);
        
        if (wordElement) {
          const wordRect = wordElement.getBoundingClientRect();
          
          
          // Check if word is visible in viewport
          const windowHeight = window.innerHeight;
          const topThreshold = windowHeight * 0.3;
          const bottomThreshold = windowHeight * 0.7;
          
          // Word is too high or too low in viewport
          if (wordRect.top < topThreshold || wordRect.bottom > bottomThreshold) {
            // Calculate the absolute position of the element
            const absoluteTop = window.scrollY + wordRect.top;
            // Center the word in viewport
            const targetScrollPosition = absoluteTop - (windowHeight / 2) + (wordRect.height / 2);
            
            
            window.scrollTo({
              top: targetScrollPosition,
              behavior: 'smooth'
            });
          }
        }
      }, 50); // 50ms delay to ensure DOM update
    } else {
      setHighlightedIndex(-1);
    }
  }, [currentWordIndex, isPlaying]);

  // Get highlight style based on animation type
  const getHighlightStyle = (wordIndex: number, isHighlighted: boolean): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: '2px 1px',
      borderRadius: '3px',
      cursor: 'pointer',
      display: 'inline-block',
      position: 'relative',
      transition: animationType === 'instant' 
        ? 'none' 
        : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    };

    if (!isHighlighted) {
      return {
        ...baseStyle,
        background: 'transparent',
        color: 'inherit',
        transform: 'scale(1)'
      } as React.CSSProperties;
    }

    // Speechify-style highlighting - make it more prominent
    if (animationType === 'speechify') {
      return {
        ...baseStyle,
        background: `linear-gradient(135deg, ${highlightColor}, ${adjustColor(highlightColor, 20)})`,
        color: 'white',
        boxShadow: `0 4px 12px ${highlightColor}80`,
        fontWeight: '600',
        zIndex: 1000
      } as React.CSSProperties;
    }

    // Smooth highlighting
    if (animationType === 'smooth') {
      return {
        ...baseStyle,
        background: `${highlightColor}20`,
        color: highlightColor,
        borderBottom: `2px solid ${highlightColor}`,
        transform: 'scale(1.01)'
      } as React.CSSProperties;
    }

    // Instant highlighting
    return {
      ...baseStyle,
      background: highlightColor,
      color: 'white',
      fontWeight: 'bold'
    } as React.CSSProperties;
  };

  // Handle word click to seek to that position
  const handleWordClick = (wordIndex: number) => {
    // This could trigger seeking in the audio player
    // For now, just a placeholder for future functionality
  };

  // Progress indicator
  const ProgressBar = () => {
    if (!showProgress) return null;
    
    const totalWords = words.filter(w => w.isWord).length;
    const progress = totalWords > 0 ? (highlightedIndex + 1) / totalWords : 0;
    
    return (
      <div style={{
        width: '100%',
        height: '2px',
        background: 'rgba(148, 163, 184, 0.3)',
        borderRadius: '1px',
        overflow: 'hidden',
        marginBottom: '12px'
      }}>
        <motion.div
          style={{
            height: '100%',
            background: highlightColor,
            borderRadius: '1px'
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    );
  };

  return (
    <div className={`word-highlighter ${className}`}>
      <ProgressBar />
      
      <div 
        ref={containerRef}
        style={{
          lineHeight: 'inherit',
          fontSize: 'inherit',
          fontFamily: 'inherit',
          padding: '8px 0'
        }}
      >
        {words.map((segment, index) => {
          if (!segment.isWord) {
            // Whitespace segment
            return <span key={index}>{segment.text}</span>;
          }

          const isHighlighted = segment.wordIndex === highlightedIndex;
          const wordStyle = getHighlightStyle(segment.wordIndex, isHighlighted);
          
          
          return (
            <motion.span
              key={index}
              id={`word-${segment.wordIndex}`}
              ref={isHighlighted ? highlightedWordRef : undefined}
              style={wordStyle}
              onClick={() => handleWordClick(segment.wordIndex)}
              whileHover={{
                opacity: isHighlighted ? 1 : 0.9
              }}
              layout={animationType === 'smooth'}
            >
              {segment.text}
              
              {/* Highlight animation overlay */}
              <AnimatePresence>
                {isHighlighted && animationType === 'speechify' && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.1, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `${highlightColor}10`,
                      borderRadius: '3px',
                      pointerEvents: 'none'
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.span>
          );
        })}
      </div>
      
      {/* Reading statistics */}
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
            {highlightedIndex >= 0 ? highlightedIndex + 1 : 0} of {words.filter(w => w.isWord).length} words
          </span>
          {isPlaying && (
            <span style={{ color: highlightColor }}>
              ⚡ Reading...
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Utility function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const usePound = color[0] === '#';
  const col = usePound ? color.slice(1) : color;
  
  let num = parseInt(col, 16);
  let r = (num >> 16) + amount;
  let g = (num >> 8 & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;
  
  return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

// Hook for integrating word highlighter with audio player
export const useWordHighlighting = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  
  const handleWordHighlight = (wordIndex: number) => {
    setCurrentWordIndex(wordIndex);
  };
  
  const resetHighlighting = () => {
    setCurrentWordIndex(-1);
  };
  
  return {
    currentWordIndex,
    handleWordHighlight,
    resetHighlighting
  };
};