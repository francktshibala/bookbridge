'use client';

/**
 * FeedbackWidgetModal Component
 *
 * Lightweight modal for quick feedback collection.
 * Slides in from bottom-right when FAB is clicked.
 *
 * Features:
 * - Slide-in animation
 * - Backdrop overlay (click to close)
 * - ESC key support
 * - Focus trap
 * - Neo-Classic theme styling
 * - Presentational component (explicit props, no context)
 *
 * Architecture:
 * - Follows Phase 3 pattern: Pure presentational component
 * - All state managed by parent (FeedbackWidget)
 * - Reusable modal component
 */

import { useEffect, useRef } from 'react';

interface FeedbackWidgetModalProps {
  /** Whether modal is visible */
  isVisible: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when backdrop is clicked */
  onBackdropClick?: () => void;
  /** Children to render inside modal */
  children: React.ReactNode;
}

export default function FeedbackWidgetModal({
  isVisible,
  onClose,
  onBackdropClick,
  children,
}: FeedbackWidgetModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap: Store previous focus when modal opens
  useEffect(() => {
    if (isVisible) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus first focusable element in modal
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        firstFocusable?.focus();
      }, 100);
    } else {
      // Restore focus when modal closes
      previousFocusRef.current?.focus();
    }
  }, [isVisible]);

  // ESC key handler
  useEffect(() => {
    if (!isVisible) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isVisible, onClose]);

  // Focus trap: Keep focus within modal
  useEffect(() => {
    if (!isVisible || !modalRef.current) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isVisible]);

  if (!isVisible) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onBackdropClick?.() || onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] transition-opacity duration-200"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div
        ref={modalRef}
        className="fixed bottom-6 right-6 z-[9999] rounded-xl shadow-2xl transition-all duration-300 ease-out"
        style={{
          maxWidth: '90%',
          width: '400px',
          backgroundColor: 'var(--bg-secondary)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--border-light)',
          borderTopWidth: '2px',
          borderTopColor: 'var(--accent-primary)',
          boxShadow: 'var(--shadow-deep)',
          padding: '24px',
          animation: 'slideUp 0.3s ease-out',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-widget-title"
      >
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              transform: translate(-50%, 100px);
              opacity: 0;
            }
            to {
              transform: translate(-50%, 0);
              opacity: 1;
            }
          }
        `}</style>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            minWidth: '32px',
            minHeight: '32px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          aria-label="Close feedback modal"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Modal Content */}
        <div>{children}</div>
      </div>
    </>
  );
}

