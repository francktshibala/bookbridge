'use client';

/**
 * ReadingHeader Component
 *
 * Pure presentational component that displays the reading interface header.
 * Extracted from page.tsx (lines 1492-1521) as part of Phase 3 refactor.
 *
 * Features:
 * - Back button to return to book selection
 * - Auto-scroll paused indicator
 * - Settings button (opens settings modal)
 *
 * @component
 * @example
 * <ReadingHeader
 *   onBack={() => handleBack()}
 *   onSettings={() => setShowSettingsModal(true)}
 *   autoScrollPaused={autoScrollPaused}
 * />
 */

interface ReadingHeaderProps {
  onBack: () => void;
  onSettings: () => void;
  autoScrollPaused: boolean;
}

export function ReadingHeader({
  onBack,
  onSettings,
  autoScrollPaused
}: ReadingHeaderProps) {
  return (
    <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-light)] mx-4 md:mx-8 rounded-t-lg border-2 border-[var(--accent-secondary)]/20 border-b-[var(--border-light)]">
      <div className="flex justify-between items-center px-6 py-3 relative">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full border-2 border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xl hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 transition-all duration-200 flex items-center justify-center shadow-sm"
        >
          ←
        </button>

        {/* Auto-scroll Status */}
        <div className="flex-1 flex justify-center items-center gap-2 px-2">
          {autoScrollPaused && (
            <div className="text-xs text-[var(--text-secondary)] bg-[var(--accent-primary)]/10 px-2 py-1 rounded animate-pulse border border-[var(--accent-primary)]/20">
              📍 Auto-scroll paused
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button
          onClick={onSettings}
          className="w-10 h-10 rounded-full border-2 border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-base font-medium hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 transition-all duration-200 flex items-center justify-center shadow-sm"
        >
          Aa
        </button>
      </div>
    </div>
  );
}
