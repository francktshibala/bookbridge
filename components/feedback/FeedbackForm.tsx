'use client';

/**
 * FeedbackForm Component
 *
 * 2-step feedback collection form with Neo-Classic styling.
 * Step 1: Email + NPS Score (required)
 * Step 2: Details (optional but encouraged)
 *
 * Features:
 * - Neo-Classic theme integration
 * - Mobile-first responsive design
 * - Accessibility (ARIA labels, keyboard nav)
 * - Analytics tracking
 * - Loading states
 */

import { useState } from 'react';
import { type FeedbackFormData } from '@/lib/services/feedback-service';

interface FeedbackFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function FeedbackForm({ onSuccess, onCancel }: FeedbackFormProps) {
  // === State ===
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [email, setEmail] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [purpose, setPurpose] = useState<string[]>([]);
  const [featuresUsed, setFeaturesUsed] = useState<string[]>([]);
  const [improvement, setImprovement] = useState('');
  const [wantsInterview, setWantsInterview] = useState(false);

  // === Handlers ===

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!npsScore || npsScore < 1 || npsScore > 10) {
      setError('Please select a rating from 1 to 10');
      return;
    }

    setError(null);
    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData: FeedbackFormData = {
        email,
        npsScore: npsScore!,
        name: name || undefined,
        source: source || undefined,
        purpose: purpose.length > 0 ? purpose : undefined,
        featuresUsed: featuresUsed.length > 0 ? featuresUsed : undefined,
        improvement: improvement || undefined,
        wantsInterview,
      };

      // Context data
      const contextData = {
        sessionDuration: Math.floor((Date.now() - (performance.timing?.navigationStart || Date.now())) / 1000),
        pagesViewed: window.history.length,
        path: window.location.pathname,
      };

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, ...contextData }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      // Mark as submitted in localStorage
      localStorage.setItem('feedback_submitted', 'true');

      // Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'feedback_form_submitted', {
          nps_score: npsScore,
          wants_interview: wantsInterview,
          has_improvement: !!improvement,
        });
      }

      onSuccess?.();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
      console.error('[FeedbackForm] Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckboxChange = (value: string, setState: React.Dispatch<React.SetStateAction<string[]>>) => {
    setState(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  // === Render ===

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Step {step} of 2
          </span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            ~2 minutes
          </span>
        </div>
        <div className="w-full h-2 rounded-full" style={{ background: 'var(--border-light)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${step * 50}%`,
              background: 'var(--accent-primary)',
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="mb-6 p-4 rounded-lg border"
          style={{
            background: 'rgba(220, 38, 38, 0.1)',
            borderColor: 'rgba(220, 38, 38, 0.3)',
            color: 'var(--text-primary)',
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Step 1: Email + NPS */}
      {step === 1 && (
        <form onSubmit={handleStep1Next} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent-primary)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-light)';
              }}
            />
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              We'll use this to follow up with you
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              How likely are you to recommend BookBridge? <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setNpsScore(score)}
                  className="flex-1 min-w-[48px] h-12 rounded-lg border font-medium transition-all hover:scale-105"
                  style={{
                    background: npsScore === score ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    borderColor: npsScore === score ? 'var(--accent-primary)' : 'var(--border-light)',
                    color: npsScore === score ? '#FFFFFF' : 'var(--text-primary)',
                  }}
                  aria-label={`Rate ${score} out of 10`}
                >
                  {score}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'var(--accent-primary)',
              color: '#FFFFFF',
            }}
          >
            Next →
          </button>
        </form>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <form onSubmit={handleStep2Submit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Name (optional)
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-lg border"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label htmlFor="source" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              How did you find BookBridge?
            </label>
            <select
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Select one...</option>
              <option value="google">Google Search</option>
              <option value="social">Social Media</option>
              <option value="friend">Friend/Colleague</option>
              <option value="teacher">ESL Teacher</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              What features did you try? (check all that apply)
            </label>
            <div className="space-y-2">
              {[
                { value: 'audio-sync', label: 'Audio-text synchronization' },
                { value: 'cefr-levels', label: 'CEFR level switching' },
                { value: 'dictionary', label: 'AI dictionary' },
                { value: 'ai-tutor', label: 'AI chat tutor' },
                { value: 'position', label: 'Reading position memory' },
              ].map((feature) => (
                <label key={feature.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featuresUsed.includes(feature.value)}
                    onChange={() => handleCheckboxChange(feature.value, setFeaturesUsed)}
                    className="w-5 h-5 rounded"
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>{feature.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="improvement" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              What would you improve?
            </label>
            <textarea
              id="improvement"
              value={improvement}
              onChange={(e) => setImprovement(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border resize-none"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={wantsInterview}
                onChange={(e) => setWantsInterview(e.target.checked)}
                className="w-5 h-5 rounded mt-0.5"
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              <span style={{ color: 'var(--text-primary)' }}>
                I'd like to join a 15-minute feedback interview
              </span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
              className="flex-1 py-4 rounded-lg font-semibold border transition-all"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)',
              }}
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-4 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--accent-primary)',
                color: '#FFFFFF',
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      )}

      {/* Honeypot field (hidden from users, catches bots) */}
      <input
        type="text"
        name="website"
        style={{ position: 'absolute', left: '-9999px' }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
    </div>
  );
}
