'use client';

import { useState, useRef, useCallback } from 'react';
import { VocabularyTooltip } from './VocabularyTooltip';

interface ClickableTextProps {
  text: string;
  eslEnabled?: boolean;
  eslLevel?: string;
  nativeLanguage?: string;
  onWordLearned?: (word: string) => void;
  style?: React.CSSProperties;
}

export function ClickableText({
  text,
  eslEnabled = false,
  eslLevel,
  nativeLanguage,
  onWordLearned,
  style = {}
}: ClickableTextProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const textRef = useRef<HTMLDivElement>(null);

  const handleWordClick = useCallback((event: React.MouseEvent<HTMLSpanElement>) => {
    const target = event.target as HTMLSpanElement;
    const word = target.textContent || '';
    
    // Don't show tooltip for very short words or punctuation
    if (word.length <= 2 || /^[.,!?;:\s]+$/.test(word)) {
      return;
    }

    // Get position for tooltip
    const rect = target.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom
    });
    
    setSelectedWord(word);
  }, []);

  const closeTooltip = useCallback(() => {
    setSelectedWord(null);
  }, []);

  const handleWordLearned = useCallback((word: string) => {
    if (onWordLearned) {
      onWordLearned(word);
    }
    // Could add visual feedback here (e.g., highlight learned words)
    closeTooltip();
  }, [onWordLearned, closeTooltip]);

  // Split text into words while preserving spaces and punctuation
  const renderClickableText = () => {
    // Split by word boundaries but keep everything
    const tokens = text.split(/(\s+|[.,!?;:]+)/);
    
    return tokens.map((token, index) => {
      // Check if this is a word (not just whitespace or punctuation)
      const isWord = /\w/.test(token);
      
      if (!isWord) {
        // Return spaces and punctuation as-is
        return <span key={index}>{token}</span>;
      }
      
      // Make words clickable
      return (
        <span
          key={index}
          onClick={handleWordClick}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderRadius: '2px',
            padding: '0 1px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';
            e.currentTarget.style.color = '#a78bfa';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'inherit';
          }}
        >
          {token}
        </span>
      );
    });
  };

  return (
    <>
      <div 
        ref={textRef}
        style={{
          ...style,
          userSelect: 'none', // Prevent text selection to avoid conflicts
        }}
      >
        {renderClickableText()}
      </div>

      {selectedWord && (
        <VocabularyTooltip
          word={selectedWord}
          position={tooltipPosition}
          eslLevel={eslEnabled ? eslLevel : undefined}
          nativeLanguage={eslEnabled ? nativeLanguage : undefined}
          onClose={closeTooltip}
          onLearn={eslEnabled ? handleWordLearned : undefined}
        />
      )}
    </>
  );
}