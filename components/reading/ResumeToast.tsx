/**
 * ResumeToast Component
 * Accessible toast notification for Netflix-style auto-resume
 * Phase 2, Task 2.5
 */

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ResumeToastProps {
  isOpen: boolean;
  position: {
    chapter: number;
    sentence: number;
    completion: number;
  };
  bookTitle?: string;
  onDismiss: () => void;
  onStartOver?: () => void;
}

export function ResumeToast({
  isOpen,
  position,
  bookTitle,
  onDismiss,
  onStartOver
}: ResumeToastProps) {
  // ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className="bg-[var(--bg-secondary)] border-2 border-[var(--accent-primary)]/30 rounded-lg shadow-xl p-4"
            style={{ fontFamily: 'Source Serif Pro, serif' }}
          >
            {/* Toast Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-[var(--text-accent)] font-semibold text-sm mb-1">
                  Welcome back{bookTitle ? ` to ${bookTitle}` : ''}!
                </h3>
                <p className="text-[var(--text-secondary)] text-xs">
                  Chapter {position.chapter} • Sentence {position.sentence} • {position.completion.toFixed(0)}% complete
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={onDismiss}
                className="text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors ml-2 p-1"
                aria-label="Dismiss notification"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Actions */}
            {onStartOver && (
              <div className="mt-3 pt-3 border-t border-[var(--border-light)]">
                <button
                  onClick={onStartOver}
                  className="text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] text-xs font-medium transition-colors"
                >
                  Start from Beginning
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
