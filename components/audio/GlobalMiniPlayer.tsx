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
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999] neo-classic-surface-elevated"
          style={{
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 8px var(--shadow-soft)',
            borderBottom: '1px solid var(--border-light)',
          }}
        >
          {/* Progress Bar - Thin line at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--border-light)]">
            <div
              className="h-full bg-[var(--accent-primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Main Content - Slim horizontal layout */}
          <div className="max-w-7xl mx-auto px-3 sm:px-4">
            <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">

              {/* Left: Book Info (clickable to navigate) */}
              <button
                onClick={() => {
                  console.log('🎵 [MiniPlayer] Navigating to reading page');
                  navigateToReading();
                }}
                className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-90 transition-all text-left rounded-lg px-2 py-1 hover:bg-[var(--bg-tertiary)]"
                aria-label={`Return to ${selectedBook?.title}`}
              >
                {/* Return Arrow - Visible chevron */}
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-[var(--accent-primary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>

                {/* Book Cover - Compact */}
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-xs shadow-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-light)]"
                >
                  {selectedBook?.abbreviation || 'BK'}
                </div>

                {/* Book Title - Compact */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--text-primary)] truncate text-sm sm:text-base leading-tight neo-classic-subtitle">
                    {selectedBook?.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] truncate leading-tight hidden sm:block">
                    {selectedBook?.author}
                  </p>
                </div>
              </button>

              {/* Right: Playback Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Play/Pause - Touch-friendly */}
                <button
                  onClick={() => {
                    if (isPlaying) {
                      pause();
                    } else {
                      resume();
                    }
                  }}
                  className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] transition-all flex items-center justify-center shadow-sm hover:shadow-md"
                  style={{ color: 'var(--bg-primary)' }}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* Speed Control - Touch-friendly */}
                <button
                  onClick={cycleSpeed}
                  className="min-w-[44px] min-h-[44px] px-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-[var(--bg-primary)] transition-all text-[var(--text-primary)] text-xs sm:text-sm font-semibold shadow-sm border border-[var(--border-light)]"
                  aria-label={`Playback speed: ${formatSpeed(playbackSpeed)}`}
                >
                  {formatSpeed(playbackSpeed)}
                </button>

                {/* Time Display - Always visible, compact on mobile */}
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-[var(--text-secondary)] font-mono">
                  <span className="hidden sm:inline">{formatTime(playbackTime)}</span>
                  <span className="sm:hidden">{Math.floor(playbackTime / 60)}:{(Math.floor(playbackTime % 60)).toString().padStart(2, '0')}</span>
                  <span className="hidden sm:inline">/</span>
                  <span className="hidden sm:inline">{formatTime(totalTime)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
