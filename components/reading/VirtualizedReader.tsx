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

  // Calculate word positions when paragraph changes - memory optimized
  useEffect(() => {
    if (!containerRef.current || !currentSentenceId || !highlightedWordIndex) return; // Only calculate when highlighting needed

    const textNode = containerRef.current.querySelector('[data-text]');
    if (!textNode) return;

    const range = document.createRange();
    const newWordRects = new Map<number, DOMRect>();

    // Only calculate positions for words in current sentence to save memory
    const currentSentence = paragraph.sentences.find(s => s.id === currentSentenceId);
    if (!currentSentence?.wordTimings) return;

    const words = paragraph.content.split(/\s+/);
    let charIndex = 0;

    // Only measure words that have timing data
    currentSentence.wordTimings.forEach((timing) => {
      if (timing.wordIndex < words.length) {
        try {
          const wordStartIndex = words.slice(0, timing.wordIndex).join(' ').length + (timing.wordIndex > 0 ? 1 : 0);
          const word = words[timing.wordIndex];
          range.setStart(textNode.firstChild!, wordStartIndex);
          range.setEnd(textNode.firstChild!, wordStartIndex + word.length);
          const rect = range.getBoundingClientRect();
          newWordRects.set(timing.wordIndex, rect);
        } catch (error) {
          // Skip problematic ranges
        }
      }
    });

    setWordRects(newWordRects);
  }, [paragraph.content, currentSentenceId]);

  const currentSentence = paragraph.sentences.find(s => s.id === currentSentenceId);

  return (
    <div ref={containerRef} className="relative">
      {/* Base text */}
      <div
        data-text
        className="select-none pointer-events-none"
        style={{ lineHeight: '1.6' }}
      >
        {/* Render sentences with data attributes for auto-scroll */}
        {paragraph.sentences.map((sentence, index) => {
          const isCurrentSentence = sentence.id === currentSentenceId;
          return (
            <span
              key={sentence.id}
              data-sentence-id={sentence.id}
              className={`sentence ${isCurrentSentence ? 'current-sentence' : ''}`}
              style={{
                backgroundColor: isCurrentSentence ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                borderRadius: isCurrentSentence ? '6px' : '0',
                padding: isCurrentSentence ? '4px 6px' : '0',
                border: isCurrentSentence ? '2px solid rgba(59, 130, 246, 0.4)' : '2px solid transparent',
                fontWeight: isCurrentSentence ? '600' : '400',
                transform: isCurrentSentence ? 'scale(1.01)' : 'scale(1)',
                transition: 'all 0.3s ease'
              }}
            >
              {sentence.text}
              {index < paragraph.sentences.length - 1 ? ' ' : ''}
            </span>
          );
        })}
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
                className={`absolute rounded-md border-2 pointer-events-auto cursor-pointer ${
                  isHighlighted
                    ? 'bg-yellow-200 border-yellow-400 shadow-lg'
                    : 'bg-blue-50 border-blue-200 shadow-sm'
                }`}
                style={{
                  left: rect.left - containerRef.current!.getBoundingClientRect().left,
                  top: rect.top - containerRef.current!.getBoundingClientRect().top,
                  width: rect.width,
                  height: rect.height,
                  zIndex: isHighlighted ? 25 : 15
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: isHighlighted ? 0.95 : 0.5,
                  scale: isHighlighted ? 1.02 : 1,
                  y: isHighlighted ? -1 : 0
                }}
                transition={{
                  duration: 0.2,
                  ease: 'easeOut',
                  type: 'spring',
                  stiffness: 400,
                  damping: 25
                }}
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
 * Individual paragraph renderer with aggressive memory optimizations
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

  // Skip highlighting overlay if not needed to save memory
  const showHighlighting = highlightedWordIndex !== undefined && currentSentenceId;

  return (
    <div
      ref={paragraphRef}
      className="paragraph-container mb-6 px-4"
      data-paragraph-id={paragraph.id}
    >
      {showHighlighting ? (
        <HighlightOverlay
          paragraph={paragraph}
          currentSentenceId={currentSentenceId}
          highlightedWordIndex={highlightedWordIndex}
          onWordClick={onWordClick}
        />
      ) : (
        // Simple text rendering for memory efficiency with sentence highlighting
        <div className="prose max-w-none text-gray-800 leading-relaxed">
          {paragraph.sentences.map((sentence, index) => {
            const isCurrentSentence = sentence.id === currentSentenceId;
            return (
              <span
                key={sentence.id}
                data-sentence-id={sentence.id}
                className={`sentence ${isCurrentSentence ? 'current-sentence' : ''}`}
                style={{
                  backgroundColor: isCurrentSentence ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                  borderRadius: isCurrentSentence ? '6px' : '0',
                  padding: isCurrentSentence ? '4px 6px' : '0',
                  border: isCurrentSentence ? '2px solid rgba(59, 130, 246, 0.5)' : '2px solid transparent',
                  fontWeight: isCurrentSentence ? '600' : '400',
                  transform: isCurrentSentence ? 'scale(1.01)' : 'scale(1)',
                  transition: 'all 0.3s ease'
                }}
              >
                {sentence.text}
                {index < paragraph.sentences.length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </div>
      )}
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

  // Ultra-aggressive memory optimization for mobile
  const virtualizer = useVirtualizer({
    count: paragraphs.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: isMobile ? 0 : 2, // Zero overscan on mobile for maximum memory savings
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

  // Auto-scroll during audio playback
  useEffect(() => {
    console.log(`🔄 Auto-scroll check: sentenceId=${currentSentenceId}, virtualizedScrolling=${featureFlags.virtualizedScrolling}`);

    if (!currentSentenceId || !featureFlags.virtualizedScrolling) {
      console.log(`🔄 Auto-scroll skipped: sentenceId=${!!currentSentenceId}, virtualizedScrolling=${featureFlags.virtualizedScrolling}`);
      return;
    }

    // For continuous reading, scroll to the sentence element directly
    setTimeout(() => {
      const sentenceElement = document.querySelector(`[data-sentence-id="${currentSentenceId}"]`);
      if (sentenceElement) {
        console.log(`🔄 Auto-scrolling to sentence element: ${currentSentenceId}`);
        sentenceElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      } else {
        console.log(`🔄 Sentence element not found: ${currentSentenceId}`);
        // Fallback to paragraph scrolling
        const sentenceParagraphIndex = paragraphs.findIndex(p =>
          p.sentences.some(s => s.id === currentSentenceId)
        );

        if (sentenceParagraphIndex >= 0) {
          console.log(`🔄 Fallback: Auto-scrolling to paragraph ${sentenceParagraphIndex}`);
          virtualizer.scrollToIndex(sentenceParagraphIndex, {
            align: 'center',
            behavior: 'smooth'
          });
        }
      }
    }, 200);
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
            highlightedWordIndex={isMobile ? undefined : highlightedWordIndex}
            onWordClick={isMobile ? undefined : onWordClick}
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
                highlightedWordIndex={isMobile ? undefined : highlightedWordIndex}
                onWordClick={isMobile ? undefined : onWordClick}
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