'use client';

/**
 * FeedbackWidget Component
 *
 * Floating Action Button (FAB) widget for quick feedback collection.
 * Appears in bottom-right corner of Featured Books page.
 *
 * Features:
 * - Always-accessible FAB button
 * - Lightweight modal for quick feedback
 * - Neo-Classic theme integration
 * - Mobile-first responsive design
 * - Accessibility (ARIA labels, keyboard nav)
 * - Modal conflict prevention (checks other modals before opening)
 *
 * Architecture:
 * - Follows Phase 3 pattern: Presentational component with explicit props
 * - No context access (receives modal states as props)
 * - Reusable component (can add to other pages)
 */

import { useState, useEffect } from 'react';
import FeedbackWidgetModal from './FeedbackWidgetModal';
import { useFeedbackWidget } from '@/hooks/useFeedbackWidget';
import { useAutoFeedbackPrompt } from '@/hooks/useAutoFeedbackPrompt';

interface FeedbackWidgetProps {
  /** Whether Settings Modal is open */
  isSettingsModalOpen?: boolean;
  /** Whether Chapter Modal is open */
  isChapterModalOpen?: boolean;
  /** Whether AI Chat Modal is open */
  isAIChatOpen?: boolean;
  /** Whether Dictionary Bottom Sheet is open */
  isDictionaryOpen?: boolean;
}

export default function FeedbackWidget({
  isSettingsModalOpen = false,
  isChapterModalOpen = false,
  isAIChatOpen = false,
  isDictionaryOpen = false,
}: FeedbackWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Use hook for form state and submission
  const {
    rating,
    sentiment,
    feedbackText,
    email,
    setRating,
    setSentiment,
    setFeedbackText,
    setEmail,
    isSubmitting,
    error,
    isSuccess,
    handleSubmit,
    resetForm,
  } = useFeedbackWidget();

  // Prevent opening if any other modal is open (one modal at a time rule)
  const canOpen = !isSettingsModalOpen && !isChapterModalOpen && !isAIChatOpen && !isDictionaryOpen;
  
  // Auto-prompt after 3-4 minutes of activity (optimal engagement window)
  useAutoFeedbackPrompt({
    minDurationSeconds: 180, // 3 minutes minimum
    maxDurationSeconds: 240, // 4 minutes maximum
    cooldownDays: 60, // Once per 60 days
    onShouldShow: () => {
      // Only auto-open if no other modals are open
      if (canOpen && !isModalOpen) {
        setIsModalOpen(true);
        
        // Analytics: Track auto-prompt opened
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'feedback_widget_opened', {
            source: 'auto_prompt',
          });
        }
      }
    },
  });

  const handleFABClick = () => {
    if (!canOpen) {
      // Don't open if other modals are open
      return;
    }
    setIsModalOpen(true);

    // Analytics: Track widget open
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'feedback_widget_opened', {
        source: 'featured_books',
      });
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    // Reset form when closing (with delay to allow success message to show)
    setTimeout(() => {
      resetForm();
    }, 300);
  };

  const handleRatingClick = (value: number) => {
    setRating(value);
    setSentiment(null); // Clear sentiment if rating selected
  };

  const handleSentimentClick = (value: 'negative' | 'neutral' | 'positive') => {
    setSentiment(value);
    setRating(null); // Clear rating if sentiment selected
  };

  const handleFormSubmit = async () => {
    await handleSubmit();
    // Hook handles success state and auto-reset
    // Modal will close via handleClose after user sees success message
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={handleFABClick}
        disabled={!canOpen}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: '#FFFFFF',
          boxShadow: 'var(--shadow-soft)',
          minWidth: '56px',
          minHeight: '56px',
        }}
        onMouseEnter={(e) => {
          if (canOpen) {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'var(--shadow-soft)';
        }}
        onMouseDown={(e) => {
          if (canOpen) {
            e.currentTarget.style.transform = 'scale(0.95)';
          }
        }}
        onMouseUp={(e) => {
          if (canOpen) {
            e.currentTarget.style.transform = 'scale(1.1)';
          }
        }}
        aria-label="Provide feedback"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && canOpen) {
            e.preventDefault();
            handleFABClick();
          }
        }}
      >
        {/* Speech bubble icon */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ color: 'inherit' }}
        >
          <path
            d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z"
            fill="currentColor"
          />
          <path
            d="M7 9H17V11H7V9ZM7 12H14V14H7V12Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* Modal */}
      <FeedbackWidgetModal
        isVisible={isModalOpen}
        onClose={handleClose}
        onBackdropClick={handleClose}
      >
        <div className="space-y-6">
          <h2
            id="feedback-widget-title"
            className="text-xl font-semibold mb-4 pr-8"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--text-accent)',
            }}
          >
            How's BookBridge so far?
          </h2>

          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Rate your experience <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  className="w-12 h-12 rounded-lg border-2 font-bold transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    backgroundColor: rating === star ? 'var(--accent-primary)' : 'var(--bg-primary)',
                    borderColor: rating === star ? 'var(--accent-primary)' : 'var(--border-light)',
                    color: rating === star ? '#FFFFFF' : 'var(--text-primary)',
                    minWidth: '48px',
                    minHeight: '48px',
                  }}
                  aria-label={`Rate ${star} out of 5`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-light)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-light)' }} />
          </div>

          {/* Emoji Sentiment */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Quick reaction
            </label>
            <div className="flex gap-4 justify-center">
              {[
                { value: 'negative' as const, emoji: '😞', label: 'Not great' },
                { value: 'neutral' as const, emoji: '😐', label: 'Okay' },
                { value: 'positive' as const, emoji: '😊', label: 'Great!' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSentimentClick(option.value)}
                  className="flex flex-col items-center p-3 rounded-lg transition-all border-2 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    backgroundColor: sentiment === option.value ? 'var(--accent-primary)' : 'transparent',
                    borderColor: sentiment === option.value ? 'var(--accent-primary)' : 'transparent',
                    minWidth: '80px',
                    minHeight: '80px',
                  }}
                  aria-label={option.label}
                >
                  <span className="text-3xl mb-1">{option.emoji}</span>
                  <span className="text-xs" style={{ color: sentiment === option.value ? '#FFFFFF' : 'var(--text-secondary)' }}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Text Field */}
          <div>
            <label htmlFor="feedback-text" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              One thing to improve? (Optional)
            </label>
            <input
              type="text"
              id="feedback-text"
              value={feedbackText}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 40) {
                  setFeedbackText(value);
                }
              }}
              placeholder="e.g., more modern books"
              maxLength={40}
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)',
                minHeight: '44px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent-primary)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-light)';
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {feedbackText.length}/40 characters
            </p>
          </div>

          {/* Optional Email Field */}
          <div>
            <label htmlFor="feedback-email" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Email (Optional)
            </label>
            <input
              type="email"
              id="feedback-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)',
                minHeight: '44px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent-primary)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-light)';
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              📧 Get 2 personalized book recommendations
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}>
              {error}
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="p-3 rounded-lg text-sm text-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }}>
              ✅ Thank you! Your feedback has been submitted.
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={(!rating && !sentiment) || isSubmitting || isSuccess}
            className="w-full py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              backgroundColor: (rating || sentiment) && !isSuccess ? 'var(--accent-primary)' : 'var(--border-light)',
              color: '#FFFFFF',
              minHeight: '44px',
            }}
          >
            {isSubmitting ? 'Submitting...' : isSuccess ? 'Submitted!' : 'Submit Feedback'}
          </button>
        </div>
      </FeedbackWidgetModal>
    </>
  );
}

