'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';

interface ParagraphHighlighterProps {
  text: string;
  currentWordIndex: number;
  isPlaying: boolean;
  className?: string;
  highlightColor?: string;
  showProgress?: boolean;
}

export const ParagraphHighlighter: React.FC<ParagraphHighlighterProps> = ({
  text,
  currentWordIndex,
  isPlaying,
  className = '',
  highlightColor = '#10b981',
  showProgress = true
}) => {
  const [highlightedParagraphIndex, setHighlightedParagraphIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse text into paragraphs with word counts
  const paragraphs = useMemo(() => {
    const paragraphTexts = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    let wordCounter = 0;

    return paragraphTexts.map((paragraphText, index) => {
      const words = paragraphText.split(/\s+/).filter(w => w.length > 0);
      const startWordIndex = wordCounter;
      const endWordIndex = wordCounter + words.length - 1;
      wordCounter += words.length;

      return {
        text: paragraphText.trim(),
        startWordIndex,
        endWordIndex,
        wordCount: words.length,
        index
      };
    });
  }, [text]);

  // Update highlighted paragraph based on current word
  useEffect(() => {
    if (isPlaying && currentWordIndex >= 0) {
      const targetParagraph = paragraphs.find(p =>
        currentWordIndex >= p.startWordIndex && currentWordIndex <= p.endWordIndex
      );

      if (targetParagraph && targetParagraph.index !== highlightedParagraphIndex) {
        setHighlightedParagraphIndex(targetParagraph.index);

        // Auto-scroll to highlighted paragraph with robust container detection
        setTimeout(() => {
          const paragraphElement = document.getElementById(`paragraph-${targetParagraph.index}`);
          console.log(`🔍 Attempting scroll for paragraph ${targetParagraph.index}`);

          if (!paragraphElement) {
            console.log(`❌ Element not found: paragraph-${targetParagraph.index}`);
            return;
          }

          // Find nearest scrollable ancestor; fallback to window
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

          const scroller = getScrollableAncestor(paragraphElement);
          const rect = paragraphElement.getBoundingClientRect();
          console.log(`📏 Element position:`, { top: Math.round(rect.top), bottom: Math.round(rect.bottom), scrollY: window.scrollY });

          const positionAt = 0.4; // target 40% from top

          if (scroller === window) {
            const windowHeight = window.innerHeight;
            const topThreshold = windowHeight * 0.25;
            const bottomThreshold = windowHeight * 0.75;

            if (rect.top < topThreshold || rect.bottom > bottomThreshold) {
              const targetScrollPosition = window.scrollY + rect.top - (windowHeight * positionAt);
              console.log(`🎯 Scrolling window to: ${Math.max(0, Math.round(targetScrollPosition))}`);
              requestAnimationFrame(() => {
                window.scrollTo({ top: Math.max(0, targetScrollPosition), behavior: 'smooth' });
              });
            } else {
              console.log(`✅ Window: paragraph ${targetParagraph.index} already within thresholds`);
            }
          } else {
            const container = scroller as HTMLElement;
            const containerRect = container.getBoundingClientRect();
            const relTop = rect.top - containerRect.top; // position relative to container
            const targetTop = container.scrollTop + relTop - (container.clientHeight * positionAt);
            const topThreshold = container.clientHeight * 0.25;
            const bottomThreshold = container.clientHeight * 0.75;

            if (relTop < topThreshold || (relTop + rect.height) > bottomThreshold) {
              console.log(`🎯 Scrolling container to: ${Math.max(0, Math.round(targetTop))}`);
              requestAnimationFrame(() => {
                container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
              });
            } else {
              console.log(`✅ Container: paragraph ${targetParagraph.index} already within thresholds`);
            }
          }

          // Fallback: force into view if thresholds logic fails for any reason
          setTimeout(() => {
            const after = paragraphElement.getBoundingClientRect();
            const stillFar = after.top < (window.innerHeight * 0.1) || after.bottom > (window.innerHeight * 0.9);
            if (stillFar) {
              console.log(`🛟 Fallback scrollIntoView for paragraph ${targetParagraph.index}`);
              paragraphElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 600);
        }, 120); // allow DOM/layout to settle
      }
    } else {
      setHighlightedParagraphIndex(-1);
    }
  }, [currentWordIndex, isPlaying, paragraphs, highlightedParagraphIndex]);

  // Progress indicator
  const ProgressBar = () => {
    if (!showProgress) return null;

    const totalWords = paragraphs.reduce((sum, p) => sum + p.wordCount, 0);
    const progress = totalWords > 0 ? (currentWordIndex + 1) / totalWords : 0;

    return (
      <div style={{
        width: '100%',
        height: '3px',
        background: 'rgba(148, 163, 184, 0.3)',
        borderRadius: '2px',
        overflow: 'hidden',
        marginBottom: '16px'
      }}>
        <motion.div
          style={{
            height: '100%',
            background: highlightColor,
            borderRadius: '2px'
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    );
  };

  return (
    <div className={`paragraph-highlighter ${className}`}>
      <ProgressBar />

      <div ref={containerRef}>
        {paragraphs.map((paragraph, index) => {
          const isHighlighted = index === highlightedParagraphIndex;

          return (
            <motion.div
              key={index}
              id={`paragraph-${index}`}
              style={{
                marginBottom: '20px',
                padding: '16px',
                borderRadius: '8px',
                lineHeight: '1.8',
                fontSize: 'inherit',
                fontFamily: 'inherit',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              animate={{
                backgroundColor: isHighlighted
                  ? `${highlightColor}15`
                  : 'transparent',
                borderLeft: isHighlighted
                  ? `4px solid ${highlightColor}`
                  : '4px solid transparent',
                transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isHighlighted
                  ? `0 4px 12px ${highlightColor}20`
                  : 'none'
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div style={{
                color: isHighlighted ? 'inherit' : 'inherit',
                fontWeight: isHighlighted ? '500' : 'normal'
              }}>
                {paragraph.text}
              </div>

              {/* Subtle reading indicator */}
              {isHighlighted && isPlaying && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: highlightColor,
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: highlightColor,
                      animation: 'pulse 2s infinite'
                    }}
                  />
                  Reading...
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Reading statistics */}
      {showProgress && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: 'rgba(148, 163, 184, 0.1)',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>
            Paragraph {highlightedParagraphIndex + 1} of {paragraphs.length}
          </span>
          {isPlaying && (
            <span style={{ color: highlightColor, fontWeight: '500' }}>
              🎧 Listening
            </span>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

// Hook for paragraph highlighting
export const useParagraphHighlighting = () => {
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(-1);

  const handleParagraphHighlight = (paragraphIndex: number) => {
    setCurrentParagraphIndex(paragraphIndex);
  };

  const resetHighlighting = () => {
    setCurrentParagraphIndex(-1);
  };

  return {
    currentParagraphIndex,
    handleParagraphHighlight,
    resetHighlighting
  };
};