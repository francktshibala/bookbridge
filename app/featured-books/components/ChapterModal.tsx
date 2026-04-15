'use client';

/**
 * ChapterModal Component
 *
 * Modal component for chapter navigation.
 * Extracted from page.tsx (lines 1738-1817) as part of Phase 3 refactor.
 *
 * Features:
 * - Chapter list with titles
 * - Current chapter highlighting
 * - Chapter selection callback
 *
 * @component
 * @example
 * <ChapterModal
 *   isOpen={showChapterModal}
 *   onClose={() => setShowChapterModal(false)}
 *   chapters={chapters}
 *   currentChapter={currentChapter}
 *   onSelectChapter={(chapter) => handleChapterJump(chapter)}
 * />
 */

export interface Chapter {
  chapterNumber: number;
  title: string;
  startSentence: number;
  endSentence: number;
  startBundle: number;
  endBundle: number;
}

interface ChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  currentChapter: number;
  onSelectChapter: (chapter: Chapter) => void;
}

export function ChapterModal({
  isOpen,
  onClose,
  chapters,
  currentChapter,
  onSelectChapter
}: ChapterModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-xl max-w-sm w-full border-2 border-[var(--accent-secondary)]/20">

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-light)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Jump to Chapter
          </h2>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-primary)] text-2xl transition-colors"
            aria-label="Close chapter menu"
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {chapters.map((chapter) => (
              <button
                key={chapter.chapterNumber}
                onClick={() => {
                  onClose();
                  onSelectChapter(chapter);
                }}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  currentChapter === chapter.chapterNumber
                    ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-sm'
                    : 'bg-[var(--bg-primary)] hover:bg-[var(--accent-primary)]/10 border-[var(--border-light)]'
                }`}
              >
                <div className={`font-medium ${
                  currentChapter === chapter.chapterNumber
                    ? 'text-[var(--bg-primary)]'
                    : 'text-[var(--text-primary)]'
                }`}>
                  Chapter {chapter.chapterNumber}
                </div>
                <div className={`text-sm ${
                  currentChapter === chapter.chapterNumber
                    ? 'text-[var(--bg-primary)]/80'
                    : 'text-[var(--text-secondary)]'
                }`}>
                  {chapter.title}
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
