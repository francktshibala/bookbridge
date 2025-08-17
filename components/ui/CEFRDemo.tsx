'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CEFRDemoProps {
  bookId?: string;
  chunkIndex?: number;
}

const DEMO_LEVELS = ['B1', 'B2', 'C1', 'C2'] as const;
type CEFRLevel = typeof DEMO_LEVELS[number];

const levelColors: Record<CEFRLevel, string> = {
  B1: '#8b5cf6',
  B2: '#f59e0b',
  C1: '#ef4444',
  C2: '#6b7280'
};

const levelDescriptions: Record<CEFRLevel, string> = {
  B1: 'Intermediate',
  B2: 'Upper Intermediate',
  C1: 'Advanced',
  C2: 'Proficient'
};

export function CEFRDemo({ bookId = 'gutenberg-1342', chunkIndex = 0 }: CEFRDemoProps) {
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('B1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoText, setDemoText] = useState<string>('');
  const [originalText, setOriginalText] = useState<string>('');

  // Load original text on mount
  useEffect(() => {
    loadOriginalText();
  }, [bookId, chunkIndex]);

  // Load simplified text when level changes
  useEffect(() => {
    if (originalText) {
      loadSimplifiedText(selectedLevel);
    }
  }, [selectedLevel, originalText]);

  const loadOriginalText = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/books/${bookId}/content-fast`);
      const data = await response.json();
      
      if (data.chunks && data.chunks[chunkIndex]) {
        const firstParagraph = data.chunks[chunkIndex].content
          .split('\n\n')[0]
          .slice(0, 300) + '...';
        setOriginalText(firstParagraph);
        setDemoText(firstParagraph); // Show original initially
      } else {
        // Fallback demo text
        const fallbackText = "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families...";
        setOriginalText(fallbackText);
        setDemoText(fallbackText);
      }
    } catch (err) {
      // Use fallback text on error
      const fallbackText = "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families...";
      setOriginalText(fallbackText);
      setDemoText(fallbackText);
      console.error('Demo content error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSimplifiedText = async (level: CEFRLevel) => {
    if (!originalText) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Try the simplification API first
      const response = await fetch(`/api/books/${bookId}/simplify?level=${level}&chunk=${chunkIndex}&useAI=true`);
      const data = await response.json();
      
      if (data.content && data.content.trim()) {
        let processedText = data.content.trim();
        
        // Check if response is incomplete (common with C1)
        if (processedText.includes("Here's the refine") || 
            processedText.includes("Here's a refine") ||
            processedText.length < 50) {
          // Use original text for incomplete responses
          setDemoText(originalText);
        } else {
          // Use the simplified text
          const firstParagraph = processedText
            .split('\n\n')[0]
            .slice(0, 300) + '...';
          setDemoText(firstParagraph);
        }
      } else {
        // Fallback to showing original text with level styling
        setDemoText(originalText);
      }
    } catch (err) {
      // On error, show original text
      setDemoText(originalText);
      console.error('Demo API error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cefr-demo-container" style={{ 
      maxWidth: '800px', 
      margin: '0 auto',
      padding: '32px'
    }}>
      {/* Level Selector */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '16px',
        marginBottom: '32px'
      }}>
        {DEMO_LEVELS.map((level) => (
          <motion.button
            key={level}
            onClick={() => setSelectedLevel(level)}
            className={`cefr-level-badge cefr-${level.toLowerCase()}`}
            style={{
              width: '60px',
              height: '60px',
              fontSize: '18px',
              fontWeight: 'bold',
              border: selectedLevel === level ? '3px solid white' : '3px solid transparent',
              opacity: selectedLevel === level ? 1 : 0.7,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {level}
            {selectedLevel === level && (
              <motion.div
                layoutId="activeIndicator"
                style={{
                  position: 'absolute',
                  bottom: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '40px',
                  height: '4px',
                  backgroundColor: 'white',
                  borderRadius: '2px'
                }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Level Description */}
      <motion.div
        key={selectedLevel}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          textAlign: 'center',
          marginBottom: '24px',
          color: levelColors[selectedLevel],
          fontSize: '16px',
          fontWeight: '600'
        }}
      >
        {selectedLevel} - {levelDescriptions[selectedLevel]}
      </motion.div>

      {/* Demo Text Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedLevel + demoText}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '16px',
            padding: '32px',
            border: `2px solid ${levelColors[selectedLevel]}40`,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Loading State */}
          {loading && (
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '24px',
              height: '24px',
              border: '2px solid #475569',
              borderTop: `2px solid ${levelColors[selectedLevel]}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          )}

          {/* Error State */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#ef4444',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Text Content */}
          <div 
            className="book-text-wireframe"
            style={{
              color: levelColors[selectedLevel],
              fontSize: '18px',
              lineHeight: '1.8',
              opacity: loading ? 0.5 : 1,
              transition: 'opacity 0.3s ease'
            }}
          >
            {demoText || 'Loading text...'}
          </div>

          {/* Book Source */}
          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #475569',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '14px',
            color: '#94a3b8'
          }}>
            <span>From: Pride and Prejudice</span>
            <span style={{ color: levelColors[selectedLevel] }}>
              {selectedLevel} Version
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Feature Highlights */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginTop: '32px'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '16px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📚</div>
          <div style={{ fontSize: '14px', color: '#10b981' }}>
            AI-Powered Simplification
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '16px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎯</div>
          <div style={{ fontSize: '14px', color: '#3b82f6' }}>
            CEFR-Aligned Levels
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '16px',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(139, 92, 246, 0.3)'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔄</div>
          <div style={{ fontSize: '14px', color: '#8b5cf6' }}>
            Instant Level Switching
          </div>
        </div>
      </div>
    </div>
  );
}