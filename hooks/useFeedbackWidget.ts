'use client';

/**
 * useFeedbackWidget Hook
 *
 * Manages feedback widget state and submission logic.
 * Handles form data, loading states, and API integration.
 *
 * Architecture:
 * - Follows Phase 3 pattern: Hook manages state, component is presentational
 * - Uses existing feedback service (no duplication)
 * - Pure state management (no side effects beyond API call)
 */

import { useState } from 'react';

interface UseFeedbackWidgetReturn {
  // Form state
  rating: number | null;
  sentiment: 'negative' | 'neutral' | 'positive' | null;
  feedbackText: string;
  email: string;
  
  // Setters
  setRating: (value: number | null) => void;
  setSentiment: (value: 'negative' | 'neutral' | 'positive' | null) => void;
  setFeedbackText: (value: string) => void;
  setEmail: (value: string) => void;
  
  // Submission state
  isSubmitting: boolean;
  error: string | null;
  isSuccess: boolean;
  
  // Actions
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
}

export function useFeedbackWidget(): UseFeedbackWidgetReturn {
  const [rating, setRating] = useState<number | null>(null);
  const [sentiment, setSentiment] = useState<'negative' | 'neutral' | 'positive' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const resetForm = () => {
    setRating(null);
    setSentiment(null);
    setFeedbackText('');
    setEmail('');
    setError(null);
    setIsSuccess(false);
  };

  const handleSubmit = async () => {
    // Validation: rating OR sentiment required
    if (!rating && !sentiment) {
      setError('Please select a rating or emoji');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Convert rating/sentiment to NPS score (1-10)
      let npsScore: number;
      if (rating) {
        // Convert 1-5 star rating to 2-10 NPS scale
        npsScore = rating * 2;
      } else if (sentiment) {
        // Convert sentiment to NPS score
        // negative = 2-4, neutral = 5-7, positive = 8-10
        npsScore = sentiment === 'negative' ? 3 : sentiment === 'neutral' ? 6 : 9;
      } else {
        throw new Error('Rating or sentiment required');
      }

      // Use placeholder email if not provided (API requires email)
      const submitEmail = email.trim() || `anonymous-${Date.now()}@bookbridge.app`;

      // Prepare request body
      const requestBody = {
        email: submitEmail,
        npsScore,
        source: 'widget', // Track source as widget
        improvement: feedbackText.trim() || undefined,
        sessionDuration: Math.floor((Date.now() - (performance.timing?.navigationStart || Date.now())) / 1000),
        pagesViewed: window.history.length,
        path: window.location.pathname,
      };

      // Submit via API route (handles email notifications)
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      // Success
      setIsSuccess(true);

      // Analytics: Track submission
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'feedback_widget_submitted', {
          rating: rating,
          sentiment: sentiment,
          has_text: !!feedbackText,
          has_email: !!email,
        });
      }

      // Auto-close after 2 seconds
      setTimeout(() => {
        resetForm();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
      console.error('[useFeedbackWidget] Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
}

