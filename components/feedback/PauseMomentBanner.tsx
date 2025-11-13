/**
 * PauseMomentBanner Component
 *
 * Lightweight micro-feedback survey banner with Neo-Classic theme styling.
 * Appears as a slide-in banner at the bottom during pause moments (2-3 min reading).
 *
 * Features:
 * - Two-step UI: NPS/Emoji → Optional text + email
 * - Auto-dismiss after 30 seconds
 * - Neo-Classic theme-aware (matches app branding)
 * - Mobile-optimized with touch-friendly targets
 *
 * @module components/feedback/PauseMomentBanner
 */

'use client';

import React, { useState, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface PauseMomentBannerProps {
  isVisible: boolean;
  sessionDuration: number;
  bookTitle?: string;
  onSubmit: (data: {
    npsScore?: number;
    sentiment?: 'negative' | 'neutral' | 'positive';
    feedbackText?: string;
    email?: string;
  }) => Promise<void>;
  onDismiss: () => void;
  onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PauseMomentBanner({
  isVisible,
  sessionDuration,
  bookTitle,
  onSubmit,
  onDismiss,
  onClose,
}: PauseMomentBannerProps) {
  const [step, setStep] = useState<'rating' | 'details'>('rating');
  const [selectedNps, setSelectedNps] = useState<number | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<'negative' | 'neutral' | 'positive' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when banner becomes visible
  useEffect(() => {
    if (isVisible) {
      setStep('rating');
      setSelectedNps(null);
      setSelectedSentiment(null);
      setFeedbackText('');
      setEmail('');
      setIsSubmitting(false);
    }
  }, [isVisible]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleNpsClick = (score: number) => {
    setSelectedNps(score);
    setSelectedSentiment(null); // Mutually exclusive
    setStep('details');
  };

  const handleSentimentClick = (sentiment: 'negative' | 'neutral' | 'positive') => {
    setSelectedSentiment(sentiment);
    setSelectedNps(null); // Mutually exclusive
    setStep('details');
  };

  const handleSkipDetails = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        npsScore: selectedNps || undefined,
        sentiment: selectedSentiment || undefined,
      });
    } catch (error) {
      console.error('[PauseMomentBanner] Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitWithDetails = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        npsScore: selectedNps || undefined,
        sentiment: selectedSentiment || undefined,
        feedbackText: feedbackText.trim() || undefined,
        email: email.trim() || undefined,
      });
    } catch (error) {
      console.error('[PauseMomentBanner] Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep('rating');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop (semi-transparent) */}
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 9998,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Slide-in Banner */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: 'var(--bg-primary)',
          borderTop: '2px solid var(--accent-secondary)',
          boxShadow: '0 -4px 20px var(--shadow-medium)',
          animation: 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          maxWidth: '600px',
          margin: '0 auto',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
        }}
      >
        <div style={{ padding: '20px 24px', maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h3
                className="neo-classic-title"
                style={{
                  fontSize: '18px',
                  margin: 0,
                  color: 'var(--text-accent)',
                  fontFamily: 'Playfair Display, Georgia, serif',
                }}
              >
                Quick thought on BookBridge?
              </h3>
              <p
                className="neo-classic-caption"
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  margin: '4px 0 0 0',
                  fontFamily: 'Source Serif Pro, Georgia, serif',
                }}
              >
                {bookTitle ? `Reading: ${bookTitle}` : `${Math.floor(sessionDuration / 60)}m session`}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0 8px',
                minWidth: '32px',
                minHeight: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Step 1: Rating Selection */}
          {step === 'rating' && (
            <div>
              {/* NPS Score (1-10) */}
              <div style={{ marginBottom: '20px' }}>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    marginBottom: '12px',
                    fontFamily: 'Source Serif Pro, Georgia, serif',
                    fontWeight: 600,
                  }}
                >
                  How likely are you to recommend BookBridge?
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '8px',
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      onClick={() => handleNpsClick(score)}
                      style={{
                        padding: '12px',
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '2px solid var(--border-light)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: 'Source Serif Pro, Georgia, serif',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                        e.currentTarget.style.color = 'var(--bg-primary)';
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.borderColor = 'var(--border-light)';
                      }}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                  <span>Not likely</span>
                  <span>Very likely</span>
                </div>
              </div>

              {/* OR Divider */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: '20px 0',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 600 }}>OR</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-light)' }} />
              </div>

              {/* Emoji Sentiment */}
              <div style={{ marginBottom: '12px' }}>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    marginBottom: '12px',
                    fontFamily: 'Source Serif Pro, Georgia, serif',
                    fontWeight: 600,
                  }}
                >
                  How do you feel about your experience?
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  {[
                    { sentiment: 'negative' as const, emoji: '😞', label: 'Not great' },
                    { sentiment: 'neutral' as const, emoji: '😐', label: 'It\'s okay' },
                    { sentiment: 'positive' as const, emoji: '😊', label: 'Love it!' },
                  ].map(({ sentiment, emoji, label }) => (
                    <button
                      key={sentiment}
                      onClick={() => handleSentimentClick(sentiment)}
                      style={{
                        flex: 1,
                        padding: '16px 12px',
                        fontSize: '32px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '2px solid var(--border-light)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        e.currentTarget.style.borderColor = 'var(--border-light)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <span>{emoji}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Source Serif Pro, Georgia, serif' }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Optional Details */}
          {step === 'details' && (
            <div>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  marginBottom: '16px',
                  fontFamily: 'Source Serif Pro, Georgia, serif',
                }}
              >
                Thank you! Want to add more? (optional)
              </p>

              {/* Feedback Text */}
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Quick thought (optional, 12-40 chars)"
                maxLength={40}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontFamily: 'Source Serif Pro, Georgia, serif',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '2px solid var(--border-light)',
                  borderRadius: '8px',
                  resize: 'none',
                  marginBottom: '12px',
                  minHeight: '60px',
                }}
              />

              {/* Email */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email (optional)"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontFamily: 'Source Serif Pro, Georgia, serif',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '2px solid var(--border-light)',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              />

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleBack}
                  style={{
                    flex: 1,
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: 600,
                    fontFamily: 'Source Serif Pro, Georgia, serif',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'transparent',
                    border: '2px solid var(--border-medium)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleSkipDetails}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: 600,
                    fontFamily: 'Source Serif Pro, Georgia, serif',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'transparent',
                    border: '2px solid var(--border-medium)',
                    borderRadius: '10px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {isSubmitting ? 'Sending...' : 'Skip'}
                </button>
                <button
                  onClick={handleSubmitWithDetails}
                  disabled={isSubmitting}
                  style={{
                    flex: 2,
                    padding: '14px',
                    fontSize: '15px',
                    fontWeight: 600,
                    fontFamily: 'Source Serif Pro, Georgia, serif',
                    color: 'var(--bg-primary)',
                    backgroundColor: 'var(--accent-primary)',
                    border: '2px solid var(--accent-primary)',
                    borderRadius: '10px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = 'var(--accent-secondary)';
                      e.currentTarget.style.borderColor = 'var(--accent-secondary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  }}
                >
                  {isSubmitting ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-up animation */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
