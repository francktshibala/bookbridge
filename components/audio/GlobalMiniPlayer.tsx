'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useAudioContext } from '@/contexts/AudioContext';

/**
 * GlobalMiniPlayer - Persistent audio player that appears at bottom of screen
 *
 * Features:
 * - Always visible when audio is loaded (across all pages)
 * - Play/Pause, Skip, Speed controls
 * - Progress bar with time display
 * - Click to navigate back to reading page
 * - Responsive design (mobile + desktop)
 * - Theme-aware (light/dark/sepia)
 * - Smooth slide-up animation
 */
export function GlobalMiniPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    // State
    selectedBook,
    bundleData,
    isPlaying,
    currentSentenceIndex,
    playbackTime,
    totalTime,
    playbackSpeed,
    isMiniPlayerVisible,

    // Actions
    play,
    pause,
    resume,
    setSpeed,
    nextBundle,
    previousBundle,
    navigateToReading,
  } = useAudioContext();

  // Don't show mini player if:
  // 1. No book loaded
  // 2. On the reading page itself (/featured-books)
  // 3. Context says not to show it
  const isOnReadingPage = pathname === '/featured-books';
  const shouldShow = selectedBook && bundleData && isMiniPlayerVisible && !isOnReadingPage;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progress = totalTime > 0 ? (playbackTime / totalTime) * 100 : 0;

  // Cycle through speed options
  const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const cycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    setSpeed(SPEED_OPTIONS[nextIndex]);
  };

  const formatSpeed = (speed: number) => {
    return speed === 1.0 ? '1x' : `${speed}x`;
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <>
          {/* Bottom padding spacer so content isn't hidden behind mini player */}
          <div className="h-20" />

          {/* Mini Player */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-[var(--border-light)] bg-[var(--bg-secondary)] shadow-2xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
              {/* Progress Bar */}
              <div className="mb-1.5 sm:mb-2">
                <div className="w-full h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Main Content */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Book Info (clickable to navigate) */}
                <button
                  onClick={() => {
                    console.log('🎵 [MiniPlayer] Navigating to reading page');
                    navigateToReading();
                  }}
                  className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
                  aria-label={`Return to ${selectedBook?.title}`}
                >
                  {/* Return Arrow */}
                  <div className="flex-shrink-0 text-[var(--accent-primary)]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>

                  {/* Book Cover Placeholder */}
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded flex-shrink-0 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md"
                    style={{
                      background: selectedBook?.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                  >
                    {selectedBook?.abbreviation || 'BK'}
                  </div>

                  {/* Book Title & Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[var(--text-primary)] truncate text-xs sm:text-sm">
                      {selectedBook?.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] truncate hidden sm:block">
                      {selectedBook?.author} • Sentence {currentSentenceIndex + 1}
                    </p>
                  </div>
                </button>

                {/* Playback Controls */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Previous Bundle - hide on very small screens */}
                  <button
                    onClick={previousBundle}
                    className="hidden sm:block p-2 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    aria-label="Previous bundle"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                    </svg>
                  </button>

                  {/* Play/Pause */}
                  <button
                    onClick={() => {
                      if (isPlaying) {
                        pause();
                      } else {
                        resume();
                      }
                    }}
                    className="p-2 sm:p-3 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] transition-colors text-white shadow-lg"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  {/* Next Bundle - hide on very small screens */}
                  <button
                    onClick={nextBundle}
                    className="hidden sm:block p-2 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    aria-label="Next bundle"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
                    </svg>
                  </button>

                  {/* Speed Control */}
                  <button
                    onClick={cycleSpeed}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--accent-secondary)] hover:text-white transition-colors text-[var(--text-primary)] text-xs font-semibold min-w-[40px] sm:min-w-[48px]"
                    aria-label={`Playback speed: ${formatSpeed(playbackSpeed)}`}
                  >
                    {formatSpeed(playbackSpeed)}
                  </button>

                  {/* Time Display (desktop only) */}
                  <div className="hidden md:block text-xs text-[var(--text-secondary)] font-mono min-w-[80px] text-right">
                    {formatTime(playbackTime)} / {formatTime(totalTime)}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
