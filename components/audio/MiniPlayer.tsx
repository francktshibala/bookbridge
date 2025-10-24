'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { useTheme } from '@/contexts/ThemeContext';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MiniPlayer() {
  const pathname = usePathname();
  const router = useRouter();

  // ============================================================================
  // SSR SAFETY
  // ============================================================================

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server
  if (!mounted) {
    return null;
  }

  return <MiniPlayerContent pathname={pathname} router={router} />;
}

function MiniPlayerContent({ pathname, router }: { pathname: string | null; router: any }) {
  const { theme } = useTheme();

  const {
    currentBook,
    isPlaying,
    currentTime,
    bundleDuration,
    playbackSpeed,
    totalStoryDuration,
    totalStoryProgress,
    currentBundleIndex,
    allBundles,
    isMiniPlayerVisible,
    isMiniPlayerMinimized,
    play,
    pause,
    seekToStoryTime,
    setSpeed,
    closeMiniPlayer,
    toggleMinimize,
  } = useGlobalAudio();

  // ============================================================================
  // LOCAL STATE
  // ============================================================================

  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ============================================================================
  // VISIBILITY LOGIC
  // ============================================================================

  // Don't show on auth pages
  const isAuthPage = pathname?.startsWith('/auth');

  // Don't show if no active book
  const shouldShow = isMiniPlayerVisible && currentBook && !isAuthPage;

  if (!shouldShow) return null;

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const progressPercent = totalStoryDuration > 0
    ? (totalStoryProgress / totalStoryDuration) * 100
    : 0;

  const bundleProgress = bundleDuration > 0
    ? (currentTime / bundleDuration) * 100
    : 0;

  const currentChapter = currentBundleIndex + 1;
  const totalChapters = allBundles.length;

  // Minimize logic: minimize when not hovered (desktop only)
  const isMinimized = isMiniPlayerMinimized || (!isHovered && !isMobile);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handlePlayPause = async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (totalStoryDuration <= 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const targetTime = percentage * totalStoryDuration;

    console.log(`🎯 Seeking to ${formatTime(targetTime)} (${(percentage * 100).toFixed(1)}%)`);
    seekToStoryTime(targetTime);
  };

  const handleSpeedChange = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setSpeed(nextSpeed);
  };

  const handleClose = () => {
    closeMiniPlayer();
  };

  const handleTitleClick = () => {
    // Navigate back to the book's reading page
    if (currentBook) {
      router.push(`/featured-books?book=${currentBook.id}`);
    }
  };

  // ============================================================================
  // THEME COLORS
  // ============================================================================

  const bgColor = theme === 'dark'
    ? 'bg-slate-900'
    : theme === 'sepia'
    ? 'bg-amber-50'
    : 'bg-white';

  const textColor = theme === 'dark'
    ? 'text-slate-100'
    : theme === 'sepia'
    ? 'text-amber-900'
    : 'text-slate-900';

  const textSecondary = theme === 'dark'
    ? 'text-slate-400'
    : theme === 'sepia'
    ? 'text-amber-700'
    : 'text-slate-600';

  const borderColor = theme === 'dark'
    ? 'border-slate-700'
    : theme === 'sepia'
    ? 'border-amber-200'
    : 'border-slate-200';

  const accentColor = 'bg-blue-500';

  // ============================================================================
  // MINIMIZED VIEW (Small Circle - Desktop Only)
  // ============================================================================

  if (isMinimized && !isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`fixed bottom-6 right-6 z-40 cursor-pointer`}
        onMouseEnter={() => setIsHovered(true)}
        onClick={toggleMinimize}
        role="button"
        aria-label="Expand mini player"
      >
        <div
          className={`w-16 h-16 rounded-full ${bgColor} ${borderColor} border-2 shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow`}
        >
          <span className="text-2xl">
            {isPlaying ? '⏸️' : '▶️'}
          </span>
        </div>
      </motion.div>
    );
  }

  // ============================================================================
  // EXPANDED VIEW (Full Mini Player)
  // ============================================================================

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`
          fixed z-40
          ${isMobile
            ? 'bottom-0 left-0 right-0 w-full'
            : 'bottom-6 right-6 w-80'
          }
        `}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
      >
        <div
          className={`
            ${bgColor} ${borderColor} ${textColor}
            ${isMobile ? 'rounded-t-xl' : 'rounded-xl'}
            border shadow-2xl overflow-hidden
          `}
        >
          {/* Header */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-start justify-between gap-3">
              {/* Book Info */}
              <div
                className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleTitleClick}
              >
                <h3 className={`font-semibold text-sm ${textColor} line-clamp-1`}>
                  {currentBook.title}
                </h3>
                <p className={`text-xs ${textSecondary} line-clamp-1`}>
                  {currentBook.author}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className={`${textSecondary} hover:${textColor} transition-colors p-1`}
                aria-label="Close mini player"
              >
                <svg
                  className="w-5 h-5"
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
          </div>

          {/* Progress Bar (Total Story) */}
          <div className="px-4 pb-2">
            <div
              className={`w-full h-1.5 ${borderColor} border rounded-full cursor-pointer overflow-hidden`}
              onClick={handleProgressBarClick}
              role="slider"
              aria-label="Story progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPercent)}
            >
              <div
                className={`h-full ${accentColor} transition-all duration-300`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Time & Chapter Info */}
          <div className="px-4 pb-2">
            <div className={`flex justify-between items-center text-xs ${textSecondary}`}>
              <span>{formatTime(totalStoryProgress)}</span>
              <span>
                Chapter {currentChapter} / {totalChapters}
              </span>
              <span>{formatTime(totalStoryDuration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-center gap-4">
              {/* Previous Bundle */}
              <button
                onClick={() => {
                  if (currentBundleIndex > 0) {
                    seekToStoryTime(
                      allBundles
                        .slice(0, currentBundleIndex)
                        .reduce((sum, b) => sum + b.totalDuration, 0)
                    );
                  }
                }}
                disabled={currentBundleIndex === 0}
                className={`p-2 ${textSecondary} hover:${textColor} disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
                aria-label="Previous chapter"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                className={`p-3 ${accentColor} text-white rounded-full hover:opacity-90 transition-opacity shadow-md`}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Next Bundle */}
              <button
                onClick={() => {
                  if (currentBundleIndex < allBundles.length - 1) {
                    seekToStoryTime(
                      allBundles
                        .slice(0, currentBundleIndex + 1)
                        .reduce((sum, b) => sum + b.totalDuration, 0)
                    );
                  }
                }}
                disabled={currentBundleIndex >= allBundles.length - 1}
                className={`p-2 ${textSecondary} hover:${textColor} disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
                aria-label="Next chapter"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M16 18h2V6h-2zm-11-7l8.5-6v12z" />
                </svg>
              </button>

              {/* Playback Speed */}
              <button
                onClick={handleSpeedChange}
                className={`px-2 py-1 text-xs font-medium ${textSecondary} hover:${textColor} transition-colors rounded`}
                aria-label={`Playback speed ${playbackSpeed}x`}
              >
                {playbackSpeed}x
              </button>
            </div>
          </div>

          {/* Bundle Progress (subtle secondary bar) */}
          {!isMobile && (
            <div className="px-4 pb-2">
              <div className={`w-full h-0.5 ${borderColor} border-t`}>
                <div
                  className={`h-full ${textSecondary} opacity-30 transition-all duration-100`}
                  style={{ width: `${bundleProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
