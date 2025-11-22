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

import { useState } from 'react';
import FeedbackWidgetModal from './FeedbackWidgetModal';

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

  // Prevent opening if any other modal is open (one modal at a time rule)
  const canOpen = !isSettingsModalOpen && !isChapterModalOpen && !isAIChatOpen && !isDictionaryOpen;

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
        <div>
          <h2
            id="feedback-widget-title"
            className="text-xl font-semibold mb-4 pr-8"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--text-accent)',
            }}
          >
            Quick Feedback
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Form fields will be added in Phase 2
          </p>
        </div>
      </FeedbackWidgetModal>
    </>
  );
}

