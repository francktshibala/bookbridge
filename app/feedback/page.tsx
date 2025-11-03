'use client';

/**
 * Feedback Page
 *
 * Dedicated page for collecting user feedback with Neo-Classic styling.
 * Part of Week 1 feedback collection implementation.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FeedbackForm from '@/components/feedback/FeedbackForm';

export default function FeedbackPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  const handleSuccess = () => {
    setSubmitted(true);

    // Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: '/feedback/success',
      });
    }

    // Auto-redirect after 5 seconds
    setTimeout(() => {
      router.push('/');
    }, 5000);
  };

  return (
    <div
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8"
      style={{
        background: 'var(--bg-primary)',
        fontFamily: 'var(--font-serif)',
      }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1
            className="text-4xl sm:text-5xl font-bold mb-4"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--text-accent)',
            }}
          >
            Help Shape BookBridge
          </h1>
          <p className="text-lg sm:text-xl" style={{ color: 'var(--text-secondary)' }}>
            Your feedback helps us build the best ESL learning experience
          </p>
        </div>

        {/* Content Card */}
        <div
          className="rounded-2xl shadow-lg p-8 sm:p-12"
          style={{
            background: 'var(--bg-secondary)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border-light)',
          }}
        >
          {!submitted ? (
            <>
              {/* Why Your Feedback Matters */}
              <div className="mb-8 pb-8 border-b" style={{ borderColor: 'var(--border-light)' }}>
                <h2
                  className="text-2xl font-semibold mb-4"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Why Your Feedback Matters
                </h2>
                <ul className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex items-start gap-3">
                    <span style={{ color: 'var(--accent-primary)' }}>✓</span>
                    <span>We're in pilot phase with just 25 users — your voice directly shapes our product</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span style={{ color: 'var(--accent-primary)' }}>✓</span>
                    <span>Share what you loved, what confused you, or what you'd improve</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span style={{ color: 'var(--accent-primary)' }}>✓</span>
                    <span>Opt in for a 15-minute interview to dive deeper (optional)</span>
                  </li>
                </ul>
              </div>

              {/* Feedback Form */}
              <FeedbackForm onSuccess={handleSuccess} />
            </>
          ) : (
            /* Success State */
            <div className="text-center py-12">
              <div
                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{
                  background: 'var(--accent-primary)',
                }}
              >
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h2
                className="text-3xl font-bold mb-4"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--text-primary)',
                }}
              >
                Thank You!
              </h2>

              <p className="text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>
                Your feedback has been received.
              </p>
              <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
                We'll review it carefully and reach out within 3 days if you opted in for an interview.
              </p>

              <button
                onClick={() => router.push('/')}
                className="px-8 py-3 rounded-lg font-semibold transition-all hover:scale-105"
                style={{
                  background: 'var(--accent-primary)',
                  color: '#FFFFFF',
                }}
              >
                Return to Home
              </button>

              <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Redirecting automatically in 5 seconds...
              </p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        {!submitted && (
          <div className="mt-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            <p>
              We respect your privacy. Your email will only be used to follow up on your feedback.
            </p>
            <p className="mt-2">
              See our{' '}
              <a
                href="/privacy"
                className="underline hover:no-underline"
                style={{ color: 'var(--text-accent)' }}
              >
                Privacy Policy
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
