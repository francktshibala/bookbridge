'use client';

/**
 * SettingsModal Component
 *
 * Modal component for reading settings (content mode and CEFR level selection).
 * Extracted from page.tsx (lines 1726-1830) as part of Phase 3 refactor.
 *
 * Features:
 * - Content mode toggle (Simplified/Original)
 * - CEFR level selector (A1-C2)
 * - Level availability checking
 * - Apply button
 *
 * @component
 * @example
 * <SettingsModal
 *   isOpen={showSettingsModal}
 *   onClose={() => setShowSettingsModal(false)}
 *   currentLevel={cefrLevel}
 *   onLevelChange={(level) => contextSwitchLevel(level)}
 *   currentContentMode={contentMode}
 *   onContentModeChange={(mode) => contextSwitchContentMode(mode)}
 *   availableLevels={contextAvailableLevels}
 * />
 */

type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
type ContentMode = 'simplified' | 'original';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: string;
  onLevelChange: (level: CEFRLevel) => Promise<void>;
  currentContentMode: ContentMode;
  onContentModeChange: (mode: ContentMode) => Promise<void>;
  availableLevels: Record<string, boolean>;
}

export function SettingsModal({
  isOpen,
  onClose,
  currentLevel,
  onLevelChange,
  currentContentMode,
  onContentModeChange,
  availableLevels
}: SettingsModalProps) {
  if (!isOpen) return null;

  const cefrLevels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-xl max-w-sm w-full border-2 border-[var(--accent-secondary)]/20">

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-light)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Reading Settings
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] text-xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">

          {/* Content Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Text Version</label>
            <div className="flex bg-[var(--bg-primary)] rounded-lg p-1 border border-[var(--border-light)]">
              <button
                onClick={() => onContentModeChange('simplified')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  currentContentMode === 'simplified'
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Simplified
              </button>
              <button
                onClick={() => onContentModeChange('original')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  currentContentMode === 'original'
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Original
              </button>
            </div>
          </div>

          {/* CEFR Level Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">CEFR Level</label>
            <div className="grid grid-cols-3 gap-2">
              {cefrLevels.map((level) => {
                const isOriginalMode = currentContentMode === 'original';
                const isLevelAvailable = availableLevels[level.toLowerCase()] === true;
                const isDisabled = isOriginalMode || !isLevelAvailable;

                return (
                  <button
                    key={level}
                    onClick={() => {
                      if (!isDisabled) {
                        onLevelChange(level);
                      }
                    }}
                    disabled={isDisabled}
                    className={`py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      currentLevel === level && currentContentMode === 'simplified'
                        ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                        : isDisabled
                        ? 'bg-[var(--bg-primary)] text-[var(--text-secondary)]/50 cursor-not-allowed opacity-50'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 border border-[var(--border-light)]'
                    }`}
                    title={
                      isOriginalMode
                        ? 'Switch to Simplified mode to use CEFR levels'
                        : !isLevelAvailable
                        ? `${level} not available for this book`
                        : `Switch to ${level} level`
                    }
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-light)]">
          <button
            onClick={onClose}
            className="w-full bg-[var(--accent-primary)] text-white py-2 px-4 rounded-md font-medium hover:bg-[var(--accent-secondary)] transition-all shadow-md"
          >
            Apply Settings
          </button>
        </div>

      </div>
    </div>
  );
}
