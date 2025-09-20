'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import { useFeatureFlags } from '@/lib/feature-flags';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Paragraph {
  id: string;
  content: string;
  sentences: Sentence[];
  chunkIndex: number;
  paragraphIndex: number;
}

interface Sentence {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  audioUrl?: string;
  wordTimings?: WordTiming[];
}

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
}

interface VirtualizedReaderProps {
  paragraphs: Paragraph[];
  currentSentenceId?: string;
  highlightedWordIndex?: number;
  onSentenceVisible: (sentenceId: string) => void;
  onWordClick?: (wordIndex: number) => void;
  eslLevel: string;
  className?: string;
}

interface HighlightOverlayProps {
  paragraph: Paragraph;
  currentSentenceId?: string;
  highlightedWordIndex?: number;
  onWordClick?: (wordIndex: number) => void;
}

/**
 * Render-light highlighting overlay
 * Uses positioned spans instead of DOM mutation for performance
 */
const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
  paragraph,
  currentSentenceId,
  highlightedWordIndex,
  onWordClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wordRects, setWordRects] = useState<Map<number, DOMRect>>(new Map());

  // Calculate word positions when paragraph changes
  useEffect(() => {
    if (!containerRef.current) return;

    const textNode = containerRef.current.querySelector('[data-text]');
    if (!textNode) return;

    const range = document.createRange();
    const newWordRects = new Map<number, DOMRect>();

    // Split text into words and measure positions
    const words = paragraph.content.split(/\s+/);
    let charIndex = 0;

    words.forEach((word, wordIndex) => {
      try {
        range.setStart(textNode.firstChild!, charIndex);
        range.setEnd(textNode.firstChild!, charIndex + word.length);
        const rect = range.getBoundingClientRect();
        newWordRects.set(wordIndex, rect);
      } catch (error) {
        // Skip problematic ranges
      }
      charIndex += word.length + 1; // +1 for space
    });

    setWordRects(newWordRects);
  }, [paragraph.content]);

  const currentSentence = paragraph.sentences.find(s => s.id === currentSentenceId);

  return (
    <div ref={containerRef} className="relative">
      {/* Base text */}
      <div
        data-text
        className="select-none pointer-events-none"
        style={{ lineHeight: '1.6' }}
      >
        {paragraph.content}
      </div>

      {/* Highlighting overlay */}
      {currentSentence && (
        <div className="absolute inset-0 pointer-events-none">
          {currentSentence.wordTimings?.map((timing, index) => {
            const isHighlighted = highlightedWordIndex === timing.wordIndex;
            const rect = wordRects.get(timing.wordIndex);

            if (!rect) return null;

            return (
              <motion.div
                key={`${currentSentence.id}-${timing.wordIndex}`}
                className={`absolute rounded-sm pointer-events-auto cursor-pointer ${
                  isHighlighted
                    ? 'bg-yellow-300 text-black'
                    : 'bg-blue-100 text-blue-900'
                }`}
                style={{
                  left: rect.left - containerRef.current!.getBoundingClientRect().left,
                  top: rect.top - containerRef.current!.getBoundingClientRect().top,
                  width: rect.width,
                  height: rect.height,
                  zIndex: isHighlighted ? 20 : 10
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: isHighlighted ? 0.8 : 0.3 }}
                transition={{ duration: 0.15 }}
                onClick={() => onWordClick?.(timing.wordIndex)}
              >
                <span className="invisible">{timing.word}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Individual paragraph renderer with performance optimizations
 */
const ParagraphRenderer = React.memo<{
  paragraph: Paragraph;
  currentSentenceId?: string;
  highlightedWordIndex?: number;
  onWordClick?: (wordIndex: number) => void;
  onVisible: () => void;
}>(({
  paragraph,
  currentSentenceId,
  highlightedWordIndex,
  onWordClick,
  onVisible
}) => {
  const paragraphRef = useRef<HTMLDivElement>(null);

  // Intersection observer for visibility tracking
  useEffect(() => {
    if (!paragraphRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(paragraphRef.current);

    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div
      ref={paragraphRef}
      className="paragraph-container mb-6 px-4"
      data-paragraph-id={paragraph.id}
    >
      <HighlightOverlay
        paragraph={paragraph}
        currentSentenceId={currentSentenceId}
        highlightedWordIndex={highlightedWordIndex}
        onWordClick={onWordClick}
      />
    </div>
  );
});

ParagraphRenderer.displayName = 'ParagraphRenderer';

/**
 * Main virtualized reader component
 */
export const VirtualizedReader: React.FC<VirtualizedReaderProps> = ({
  paragraphs,
  currentSentenceId,
  highlightedWordIndex,
  onSentenceVisible,
  onWordClick,
  eslLevel,
  className
}) => {
  const { isMobile } = useIsMobile();
  const featureFlags = useFeatureFlags({ deviceType: isMobile ? 'mobile' : 'desktop' });
  const parentRef = useRef<HTMLDivElement>(null);

  // Estimate paragraph heights for virtualization
  const estimateSize = useCallback((index: number) => {
    const paragraph = paragraphs[index];
    if (!paragraph) return 120;

    // Rough estimation: 16px line height, ~80 chars per line on mobile
    const charsPerLine = isMobile ? 60 : 100;
    const lines = Math.ceil(paragraph.content.length / charsPerLine);
    return Math.max(60, lines * 24 + 32); // 24px line height + margins
  }, [paragraphs, isMobile]);

  // Virtual scrolling with performance optimization
  const virtualizer = useVirtualizer({
    count: paragraphs.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: isMobile ? 3 : 5, // Fewer items on mobile for memory
    getItemKey: index => paragraphs[index]?.id || index
  });

  // Handle sentence visibility
  const handleParagraphVisible = useCallback((paragraph: Paragraph) => {
    // Find first sentence in visible paragraph
    const firstSentence = paragraph.sentences[0];
    if (firstSentence) {
      onSentenceVisible(firstSentence.id);
    }
  }, [onSentenceVisible]);

  // Auto-scroll to current sentence
  useEffect(() => {
    if (!currentSentenceId || !featureFlags.virtualizedScrolling) return;

    const sentenceParagraphIndex = paragraphs.findIndex(p =>
      p.sentences.some(s => s.id === currentSentenceId)
    );

    if (sentenceParagraphIndex >= 0) {
      virtualizer.scrollToIndex(sentenceParagraphIndex, {
        align: 'center',
        behavior: 'smooth'
      });
    }
  }, [currentSentenceId, paragraphs, virtualizer, featureFlags.virtualizedScrolling]);

  if (!featureFlags.virtualizedScrolling) {
    // Fallback to simple rendering
    return (
      <div className={`simple-reader ${className}`}>
        {paragraphs.map(paragraph => (
          <ParagraphRenderer
            key={paragraph.id}
            paragraph={paragraph}
            currentSentenceId={currentSentenceId}
            highlightedWordIndex={highlightedWordIndex}
            onWordClick={onWordClick}
            onVisible={() => handleParagraphVisible(paragraph)}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`virtualized-reader h-full overflow-auto ${className}`}
      style={{
        height: '100%',
        width: '100%'
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => {
          const paragraph = paragraphs[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`
              }}
            >
              <ParagraphRenderer
                paragraph={paragraph}
                currentSentenceId={currentSentenceId}
                highlightedWordIndex={highlightedWordIndex}
                onWordClick={onWordClick}
                onVisible={() => handleParagraphVisible(paragraph)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedReader;