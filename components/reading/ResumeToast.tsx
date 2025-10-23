'use client';

/**
 * ResumeToast Component
 * Shows a notification when resuming reading from a saved position
 *
 * Features:
 * - Shows chapter and chunk info
 * - "Start from beginning" option
 * - Auto-dismisses after 5 seconds
 * - Accessible (ARIA labels)
 * - Theme-aware styling
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResumeToastProps {
  show: boolean;
  chapter: number;
  chunkIndex: number;
  totalChunks: number;
  onStartFromBeginning: () => void;
  onDismiss: () => void;
  autoHideDelay?: number; // milliseconds, default 5000
}

export function ResumeToast({
  show,
  chapter,
  chunkIndex,
  totalChunks,
  onStartFromBeginning,
  onDismiss,
  autoHideDelay = 5000
}: ResumeToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);

      // Auto-hide after delay
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [show, autoHideDelay, onDismiss]);

  const handleStartFromBeginning = () => {
    setIsVisible(false);
    onStartFromBeginning();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] max-w-md w-full mx-4"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="bg-[var(--bg-secondary)] border-2 border-[var(--accent-primary)]/30 rounded-lg shadow-2xl p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">📖</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--accent-primary)]">
                    Resuming Your Reading
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Chapter {chapter} • Page {chunkIndex + 1} of {totalChunks}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Dismiss notification"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleStartFromBeginning}
                className="flex-1 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-primary)] hover:bg-[var(--accent-primary)]/10 border border-[var(--border-light)] rounded-md transition-all"
              >
                Start from Beginning
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] rounded-md transition-all shadow-sm"
              >
                Continue Reading
              </button>
            </div>

            {/* Progress indicator */}
            <div className="mt-3 h-1 bg-[var(--bg-primary)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: autoHideDelay / 1000, ease: 'linear' }}
                className="h-full bg-[var(--accent-primary)]/30"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
