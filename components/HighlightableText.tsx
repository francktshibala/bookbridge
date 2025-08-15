'use client';

import React from 'react';
import { WordToken } from '@/lib/text-tokenizer';

export interface HighlightableTextProps {
  tokens: WordToken[];
  currentWordId?: string;
  onWordClick?: (token: WordToken) => void;
  className?: string;
  disabled?: boolean; // For when audio isn't playing
}

export const HighlightableText: React.FC<HighlightableTextProps> = ({
  tokens,
  currentWordId,
  onWordClick,
  className = '',
  disabled = false
}) => {
  const handleWordClick = (token: WordToken, event: React.MouseEvent) => {
    event.preventDefault();
    if (disabled || !onWordClick) return;
    onWordClick(token);
  };

  const getWordStyle = (token: WordToken): React.CSSProperties => {
    const isHighlighted = token.id === currentWordId;
    const isClickable = !disabled && onWordClick;
    
    return {
      display: 'inline',
      padding: '2px 1px',
      margin: '0',
      borderRadius: '3px',
      transition: 'all 0.2s ease',
      cursor: isClickable ? 'pointer' : 'default',
      
      // Highlighting styles
      backgroundColor: isHighlighted 
        ? 'rgba(102, 126, 234, 0.4)' 
        : 'transparent',
      
      // Clickable word styles
      ...(isClickable && !isHighlighted && {
        '&:hover': {
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
        }
      }),
      
      // Punctuation styling
      ...(token.isPunctuation && {
        margin: '0 2px 0 0',
      }),
      
      // Accessibility
      outline: isHighlighted ? '2px solid rgba(102, 126, 234, 0.6)' : 'none',
      outlineOffset: '1px'
    };
  };

  const renderToken = (token: WordToken, index: number) => {
    const isHighlighted = token.id === currentWordId;
    const isClickable = !disabled && onWordClick;
    
    return (
      <React.Fragment key={token.id}>
        <span
          className={`highlightable-word ${isHighlighted ? 'highlighted' : ''} ${isClickable ? 'clickable' : ''}`}
          style={getWordStyle(token)}
          onClick={(e) => handleWordClick(token, e)}
          data-word-id={token.id}
          data-start-time={token.startTime}
          data-end-time={token.endTime}
          title={isClickable ? `Click to jump to "${token.text}" (${token.startTime.toFixed(1)}s)` : undefined}
          role={isClickable ? 'button' : undefined}
          tabIndex={isClickable ? 0 : undefined}
          onKeyDown={(e) => {
            if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onWordClick(token);
            }
          }}
          aria-label={isClickable ? `Jump to word ${token.text}` : undefined}
        >
          {token.text}
        </span>
        
        {/* Add space after word (except before punctuation) */}
        {!token.isPunctuation && 
         index < tokens.length - 1 && 
         !tokens[index + 1]?.isPunctuation && (
          <span className="word-space"> </span>
        )}
      </React.Fragment>
    );
  };

  return (
    <div 
      className={`highlightable-text ${className}`}
      style={{
        lineHeight: '1.8',
        fontSize: '18px',
        color: 'inherit',
        userSelect: disabled ? 'text' : 'none', // Allow text selection when disabled
      }}
    >
      {tokens.map((token, index) => renderToken(token, index))}
      
      {/* Global styles for highlighting animation */}
      <style jsx>{`
        .highlightable-word.clickable:hover {
          background-color: rgba(102, 126, 234, 0.1) !important;
        }
        
        .highlightable-word.highlighted {
          animation: highlight-pulse 1s ease-in-out;
        }
        
        @keyframes highlight-pulse {
          0% { 
            background-color: rgba(102, 126, 234, 0.6);
            transform: scale(1.02);
          }
          50% { 
            background-color: rgba(102, 126, 234, 0.4);
            transform: scale(1.01);
          }
          100% { 
            background-color: rgba(102, 126, 234, 0.4);
            transform: scale(1);
          }
        }
        
        .highlightable-word {
          transition: all 0.15s ease;
        }
        
        .highlightable-word:focus {
          outline: 2px solid rgba(102, 126, 234, 0.8);
          outline-offset: 2px;
          background-color: rgba(102, 126, 234, 0.2);
        }
      `}</style>
    </div>
  );
};

// Utility component for preserving formatting while using highlightable text
export interface FormattedHighlightableTextProps {
  content: string;
  tokens: WordToken[];
  currentWordId?: string;
  onWordClick?: (token: WordToken) => void;
  disabled?: boolean;
}

export const FormattedHighlightableText: React.FC<FormattedHighlightableTextProps> = ({
  content,
  tokens,
  currentWordId,
  onWordClick,
  disabled = false
}) => {
  // Split content into paragraphs to preserve formatting
  const paragraphs = content.split('\n\n');
  
  // Keep track of which tokens belong to which paragraph
  let tokenIndex = 0;
  
  const renderParagraph = (paragraphText: string, paragraphIndex: number) => {
    // Estimate how many tokens this paragraph should have
    const paragraphWords = paragraphText.split(/\s+/).filter(word => word.length > 0);
    const paragraphTokens = tokens.slice(tokenIndex, tokenIndex + paragraphWords.length);
    tokenIndex += paragraphWords.length;
    
    // Handle formatting within paragraph
    let formattedText = paragraphText;
    
    // Highlight quoted text
    formattedText = formattedText.replace(
      /"([^"]+)"/g,
      '<span class="ai-quote">"$1"</span>'
    );
    
    // Highlight citations
    formattedText = formattedText.replace(
      /\(([^)]+)\)/g,
      '<span style="color: #667eea; font-weight: 600; font-size: 13px;">($1)</span>'
    );
    
    // Bold text formatting
    formattedText = formattedText.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong style="color: #e2e8f0; font-weight: 700;">$1</strong>'
    );
    
    return (
      <div
        key={paragraphIndex}
        style={{
          marginBottom: '16px',
          lineHeight: '1.8',
          fontSize: '18px'
        }}
      >
        {/* For now, render as HTML - in future iterations we can make formatting highlightable too */}
        {formattedText.includes('<') ? (
          <div dangerouslySetInnerHTML={{ __html: formattedText }} />
        ) : (
          <HighlightableText
            tokens={paragraphTokens}
            currentWordId={currentWordId}
            onWordClick={onWordClick}
            disabled={disabled}
          />
        )}
      </div>
    );
  };

  return (
    <div className="formatted-highlightable-text">
      {paragraphs.map((paragraph, index) => renderParagraph(paragraph, index))}
    </div>
  );
};

export default HighlightableText;