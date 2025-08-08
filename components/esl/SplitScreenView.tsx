'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClickableText } from './ClickableText';
import { ESLAudioPlayer } from '../ESLAudioPlayer';

interface SplitScreenViewProps {
  originalText: string;
  bookId: string;
  eslLevel: string;
  nativeLanguage?: string;
  onClose?: () => void;
}

export function SplitScreenView({ 
  originalText, 
  bookId, 
  eslLevel,
  nativeLanguage,
  onClose 
}: SplitScreenViewProps) {
  const [simplifiedText, setSimplifiedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'simplified'>('split');
  const [enableVocabulary, setEnableVocabulary] = useState(true);

  useEffect(() => {
    simplifyContent();
  }, [originalText, eslLevel]);

  const simplifyContent = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/esl/books/${bookId.replace('/', '-')}/simplify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText,
          targetLevel: eslLevel,
          nativeLanguage: nativeLanguage
        })
      });

      if (!response.ok) {
        throw new Error('Failed to simplify text');
      }

      const data = await response.json();
      setSimplifiedText(data.simplifiedText || originalText);
    } catch (err) {
      console.error('Simplification error:', err);
      setError('Could not simplify text. Showing original.');
      setSimplifiedText(originalText);
    } finally {
      setIsLoading(false);
    }
  };

  const getScrollSync = (sourceId: string, targetId: string) => {
    const source = document.getElementById(sourceId);
    const target = document.getElementById(targetId);
    
    if (source && target) {
      const scrollPercentage = source.scrollTop / (source.scrollHeight - source.clientHeight);
      target.scrollTop = scrollPercentage * (target.scrollHeight - target.clientHeight);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header Controls */}
      <div style={{
        background: 'rgba(26, 32, 44, 0.98)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(102, 126, 234, 0.3)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#e2e8f0',
            margin: 0
          }}>
            ESL Reading Mode
          </h2>
          
          <div style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(45, 55, 72, 0.6)',
            padding: '4px',
            borderRadius: '10px'
          }}>
            <button
              onClick={() => setViewMode('split')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'split' ? 
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                  'transparent',
                color: '#e2e8f0',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('simplified')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'simplified' ? 
                  'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                  'transparent',
                color: '#e2e8f0',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Simplified Only
            </button>
          </div>

          <div style={{
            padding: '6px 12px',
            background: 'rgba(59, 130, 246, 0.2)',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            color: '#3b82f6',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Level {eslLevel}
          </div>

          <button
            onClick={() => setEnableVocabulary(!enableVocabulary)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: enableVocabulary ? 
                'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' : 
                'rgba(107, 114, 128, 0.3)',
              color: '#e2e8f0',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title={enableVocabulary ? 'Click words for definitions' : 'Enable word lookup'}
          >
            <span>📖</span>
            <span>Vocabulary {enableVocabulary ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            color: '#ef4444',
            fontSize: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
            e.currentTarget.style.borderColor = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
          }}
        >
          ×
        </button>
      </div>

      {/* Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Audio Player Section */}
        <div style={{
          background: 'rgba(26, 32, 44, 0.98)',
          borderBottom: '1px solid rgba(102, 126, 234, 0.2)',
          padding: '16px 24px'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '12px',
            color: '#cbd5e0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🎧 Listen to content (ESL Level: {eslLevel})
          </h3>
          <ESLAudioPlayer 
            text={viewMode === 'simplified' ? (simplifiedText || originalText) : originalText}
            bookId={bookId}
            useExternalText={true}
            onWordHighlight={(wordIndex) => {
              // Highlight word in the active panel
              const activePanel = viewMode === 'simplified' ? 'simplified-text-panel' : 'original-text-panel';
              const textElement = document.getElementById(activePanel);
              if (textElement) {
                const words = textElement.innerText.split(/\s+/);
                // Clear previous highlights and highlight current word
                textElement.innerHTML = words.map((word, idx) => {
                  if (idx === wordIndex) {
                    return `<span style="background-color: #fef3c7; color: #92400e; padding: 2px 4px; border-radius: 4px; font-weight: 600;">${word}</span>`;
                  }
                  return word;
                }).join(' ');
              }
            }}
          />
        </div>

        {/* Text Panels */}
        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {isLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            textAlign: 'center'
          }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '3px solid #e2e8f0',
                borderTop: '3px solid #667eea',
                margin: '0 auto 16px auto'
              }}
            />
            <p style={{ color: '#a0aec0', fontSize: '14px' }}>
              Simplifying content for {eslLevel} level...
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {viewMode === 'split' ? (
            <motion.div
              key="split"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                width: '100%',
                gap: '2px',
                background: 'rgba(102, 126, 234, 0.1)'
              }}
            >
              {/* Original Text Panel */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(26, 32, 44, 0.95)',
                borderRight: '1px solid rgba(102, 126, 234, 0.2)'
              }}>
                <div style={{
                  padding: '12px 20px',
                  background: 'rgba(45, 55, 72, 0.6)',
                  borderBottom: '1px solid rgba(102, 126, 234, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '16px' }}>📖</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#cbd5e0'
                  }}>
                    Original Text
                  </span>
                </div>
                <div
                  id="original-text-panel"
                  onScroll={() => getScrollSync('original-text-panel', 'simplified-text-panel')}
                  style={{
                    flex: 1,
                    padding: '24px',
                    overflow: 'auto',
                    color: '#e2e8f0',
                    fontSize: '16px',
                    lineHeight: '1.8',
                    fontFamily: 'Georgia, serif'
                  }}
                >
                  {enableVocabulary ? (
                    <ClickableText
                      text={originalText}
                      eslEnabled={true}
                      eslLevel={eslLevel}
                      nativeLanguage={nativeLanguage}
                    />
                  ) : (
                    originalText
                  )}
                </div>
              </div>

              {/* Simplified Text Panel */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(26, 32, 44, 0.95)'
              }}>
                <div style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)',
                  borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '16px' }}>📚</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#10b981'
                  }}>
                    Simplified for {eslLevel}
                  </span>
                </div>
                <div
                  id="simplified-text-panel"
                  onScroll={() => getScrollSync('simplified-text-panel', 'original-text-panel')}
                  style={{
                    flex: 1,
                    padding: '24px',
                    overflow: 'auto',
                    color: '#e2e8f0',
                    fontSize: '18px',
                    lineHeight: '1.9',
                    fontFamily: 'system-ui, sans-serif',
                    opacity: isLoading ? 0.5 : 1
                  }}
                >
                  {enableVocabulary ? (
                    <ClickableText
                      text={simplifiedText || originalText}
                      eslEnabled={true}
                      eslLevel={eslLevel}
                      nativeLanguage={nativeLanguage}
                    />
                  ) : (
                    simplifiedText || originalText
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="simplified"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                width: '100%',
                background: 'rgba(26, 32, 44, 0.95)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)',
                borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>📚</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#10b981'
                }}>
                  Simplified Content - Level {eslLevel}
                </span>
              </div>
              <div style={{
                flex: 1,
                maxWidth: '800px',
                margin: '0 auto',
                padding: '32px',
                overflow: 'auto',
                color: '#e2e8f0',
                fontSize: '20px',
                lineHeight: '2',
                fontFamily: 'system-ui, sans-serif',
                opacity: isLoading ? 0.5 : 1
              }}>
                {enableVocabulary ? (
                  <ClickableText
                    text={simplifiedText || originalText}
                    eslEnabled={true}
                    eslLevel={eslLevel}
                    nativeLanguage={nativeLanguage}
                  />
                ) : (
                  simplifiedText || originalText
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {error && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '2px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '12px',
          color: '#ef4444',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}