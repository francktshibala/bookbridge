'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VocabularyTooltipProps {
  word: string;
  position: { x: number; y: number };
  eslLevel?: string;
  nativeLanguage?: string;
  onClose: () => void;
  onLearn?: (word: string) => void;
}

interface WordDefinition {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  synonyms: string[];
  translation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export function VocabularyTooltip({
  word,
  position,
  eslLevel,
  nativeLanguage,
  onClose,
  onLearn
}: VocabularyTooltipProps) {
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDefinition();
  }, [word]);

  useEffect(() => {
    // Close on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const fetchDefinition = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/esl/vocabulary/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: word.toLowerCase().replace(/[.,!?;:]$/, ''), // Clean punctuation
          eslLevel,
          targetLanguage: nativeLanguage
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch definition');
      }

      const data = await response.json();
      setDefinition(data);
    } catch (err) {
      console.error('Vocabulary lookup error:', err);
      // Fallback to basic definition
      setDefinition(getMockDefinition(word));
    } finally {
      setLoading(false);
    }
  };

  const getMockDefinition = (word: string): WordDefinition => {
    // Basic mock definitions for demo
    const mockData: Record<string, WordDefinition> = {
      'however': {
        word: 'however',
        pronunciation: '/haʊˈevər/',
        partOfSpeech: 'adverb',
        definition: 'used to introduce a statement that contrasts with something said before',
        example: 'She was tired; however, she kept working.',
        synonyms: ['but', 'nevertheless', 'yet', 'still'],
        translation: eslLevel ? 'pero, sin embargo' : undefined,
        difficulty: 'medium'
      },
      'therefore': {
        word: 'therefore',
        pronunciation: '/ˈðerfɔːr/',
        partOfSpeech: 'adverb',
        definition: 'for that reason; consequently',
        example: 'He was the best candidate; therefore, he got the job.',
        synonyms: ['so', 'thus', 'hence', 'consequently'],
        translation: eslLevel ? 'por lo tanto' : undefined,
        difficulty: 'medium'
      }
    };

    const cleanWord = word.toLowerCase().replace(/[.,!?;:]$/, '');
    return mockData[cleanWord] || {
      word: cleanWord,
      pronunciation: '/.../',
      partOfSpeech: 'word',
      definition: `Definition of "${cleanWord}"`,
      example: `Example sentence with ${cleanWord}.`,
      synonyms: [],
      translation: eslLevel ? `[Translation of ${cleanWord}]` : undefined,
      difficulty: 'medium'
    };
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#10b981';
      case 'medium': return '#3b82f6';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Calculate tooltip position to stay within viewport
  const getTooltipStyle = () => {
    const tooltip = { top: position.y + 10, left: position.x };
    
    // Adjust if too close to right edge
    if (position.x > window.innerWidth - 320) {
      tooltip.left = position.x - 300;
    }
    
    // Adjust if too close to bottom
    if (position.y > window.innerHeight - 300) {
      tooltip.top = position.y - 250;
    }
    
    return tooltip;
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed',
          ...getTooltipStyle(),
          zIndex: 1000,
          width: '300px',
          background: 'rgba(26, 32, 44, 0.98)',
          backdropFilter: 'blur(20px)',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(45, 55, 72, 0.6)',
          borderBottom: '1px solid rgba(102, 126, 234, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#e2e8f0',
              textTransform: 'capitalize'
            }}>
              {definition?.word || word}
            </span>
            {definition?.pronunciation && (
              <span style={{
                fontSize: '13px',
                color: '#a0aec0',
                fontStyle: 'italic'
              }}>
                {definition.pronunciation}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#a0aec0',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '2px solid #e2e8f0',
                  borderTop: '2px solid #667eea',
                  margin: '0 auto'
                }}
              />
              <p style={{ color: '#a0aec0', fontSize: '12px', marginTop: '8px' }}>
                Looking up...
              </p>
            </div>
          ) : error ? (
            <p style={{ color: '#ef4444', fontSize: '14px' }}>{error}</p>
          ) : definition ? (
            <>
              {/* Part of speech & difficulty */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <span style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '4px',
                  color: '#3b82f6'
                }}>
                  {definition.partOfSpeech}
                </span>
                <span style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  background: `${getDifficultyColor(definition.difficulty)}20`,
                  border: `1px solid ${getDifficultyColor(definition.difficulty)}40`,
                  borderRadius: '4px',
                  color: getDifficultyColor(definition.difficulty)
                }}>
                  {definition.difficulty}
                </span>
              </div>

              {/* Definition */}
              <div style={{ marginBottom: '12px' }}>
                <p style={{
                  fontSize: '14px',
                  color: '#e2e8f0',
                  lineHeight: '1.5'
                }}>
                  {definition.definition}
                </p>
              </div>

              {/* Translation (if ESL mode) */}
              {eslLevel && definition.translation && (
                <div style={{
                  marginBottom: '12px',
                  padding: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px'
                }}>
                  <p style={{
                    fontSize: '13px',
                    color: '#10b981'
                  }}>
                    🌐 {definition.translation}
                  </p>
                </div>
              )}

              {/* Example */}
              {definition.example && (
                <div style={{
                  marginBottom: '12px',
                  padding: '8px',
                  background: 'rgba(45, 55, 72, 0.4)',
                  borderRadius: '6px',
                  borderLeft: '3px solid #667eea'
                }}>
                  <p style={{
                    fontSize: '13px',
                    color: '#cbd5e0',
                    fontStyle: 'italic'
                  }}>
                    "{definition.example}"
                  </p>
                </div>
              )}

              {/* Synonyms */}
              {definition.synonyms.length > 0 && (
                <div>
                  <p style={{
                    fontSize: '12px',
                    color: '#a0aec0',
                    marginBottom: '4px'
                  }}>
                    Similar words:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {definition.synonyms.map((syn, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '12px',
                          padding: '2px 6px',
                          background: 'rgba(102, 126, 234, 0.1)',
                          borderRadius: '4px',
                          color: '#a78bfa'
                        }}
                      >
                        {syn}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {onLearn && (
                <button
                  onClick={() => onLearn(word)}
                  style={{
                    marginTop: '12px',
                    width: '100%',
                    padding: '8px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  📚 Add to Learning List
                </button>
              )}
            </>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}