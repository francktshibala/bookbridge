'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { Play, Pause, X, Maximize2, Minimize2, SkipBack, SkipForward } from 'lucide-react';

export default function MiniPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isPlaying,
    isPaused,
    currentBook,
    currentChapter,
    currentSentence,
    miniPlayerVisible,
    miniPlayerExpanded,
    setMiniPlayerExpanded,
    setMiniPlayerVisible,
    play,
    pause,
    resume,
    stop,
    currentTime,
    duration,
    progress,
    playbackSpeed,
    setPlaybackSpeed,
  } = useGlobalAudio();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine if we should show the mini player on current route
  const shouldShow = () => {
    // Don't show on auth pages
    const authPages = ['/auth/login', '/auth/signup', '/auth'];
    if (authPages.some(page => pathname?.startsWith(page))) {
      return false;
    }

    // Show if visible and has current book
    return miniPlayerVisible && currentBook !== null;
  };

  // Handle navigation to full reader
  const handleNavigateToReader = () => {
    if (!currentBook) return;

    // Navigate to the featured books page which is the main reader
    router.push('/featured-books');
  };

  // Handle play/pause toggle
  const handlePlayPause = async () => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      await resume();
    } else {
      await play();
    }
  };

  // Handle close
  const handleClose = () => {
    stop();
    setMiniPlayerVisible(false);
  };

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle speed change
  const handleSpeedChange = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  // Don't render anything during SSR or if shouldn't show
  if (!mounted || !shouldShow()) {
    return null;
  }

  return (
    <AnimatePresence>
      {miniPlayerVisible && currentBook && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`fixed z-[9999] ${
            miniPlayerExpanded
              ? 'bottom-6 right-6 w-80 max-md:bottom-20 max-md:left-0 max-md:right-0 max-md:w-full max-md:px-4'
              : 'bottom-6 right-6 w-16 h-16'
          }`}
        >
          {/* Expanded Mini Player */}
          {miniPlayerExpanded ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={handleNavigateToReader}
                    className="flex-1 text-left hover:opacity-75 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    aria-label={`Return to ${currentBook.title}`}
                  >
                    <div className="flex items-center gap-2">
                      {currentBook.coverUrl && (
                        <img
                          src={currentBook.coverUrl}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {currentBook.title}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {currentBook.author}
                        </p>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMiniPlayerExpanded(false)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Minimize player"
                    >
                      <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={handleClose}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Close player and stop audio"
                    >
                      <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="px-3 pt-3">
                <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-200"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1 text-xs text-gray-600 dark:text-gray-400">
                  <span>{formatTime(currentTime)}</span>
                  {currentChapter && (
                    <span className="text-center flex-1 truncate px-2">{currentChapter}</span>
                  )}
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="p-3 flex items-center justify-center gap-4">
                <button
                  onClick={handleSpeedChange}
                  className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Playback speed: ${playbackSpeed}x`}
                >
                  {playbackSpeed}x
                </button>

                <button
                  onClick={handlePlayPause}
                  className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>

                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Sentence {currentSentence + 1}
                </div>
              </div>
            </div>
          ) : (
            /* Minimized Mini Player */
            <button
              onClick={() => setMiniPlayerExpanded(true)}
              className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Expand audio player"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
