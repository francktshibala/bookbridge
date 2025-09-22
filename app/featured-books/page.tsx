'use client';

import { useState, useEffect, useRef } from 'react';
import { BundleAudioManager, type BundleData } from '@/lib/audio/BundleAudioManager';

// Reuse the working types from test-real-bundles
interface BundleSentence {
  sentenceId: string;
  sentenceIndex: number;
  text: string;
  startTime: number;
  endTime: number;
  wordTimings: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

interface RealBundleApiResponse {
  success: boolean;
  bookId: string;
  title: string;
  author: string;
  level: string;
  bundleCount: number;
  totalSentences: number;
  bundles: BundleData[];
  audioType: string;
}

export default function FeaturedBooksPage() {
  // UI state
  const [contentMode, setContentMode] = useState<'original' | 'simplified'>('simplified');
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('A2');

  // Data state
  const [bundleData, setBundleData] = useState<RealBundleApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableLevels, setAvailableLevels] = useState<{[key: string]: boolean}>({});

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentBundle, setCurrentBundle] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  // Audio manager
  const audioManagerRef = useRef<BundleAudioManager | null>(null);
  const handleNextBundleRef = useRef<() => void>(() => {});
  const isPlayingRef = useRef<boolean>(false); // Critical fix for React closure issue

  // Get bookId from URL params
  const getBookId = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('bookId') || 'test-continuous-bundles-001';
    }
    return 'test-continuous-bundles-001';
  };

  // Check available levels for the book
  const checkAvailableLevels = async () => {
    const bookId = getBookId();
    const levels = ['original', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const availability: {[key: string]: boolean} = {};

    for (const level of levels) {
      try {
        const response = await fetch(`/api/test-book/real-bundles?bookId=${bookId}&level=${level}`);
        if (response.ok) {
          const data = await response.json();
          availability[level] = data.success === true;
        } else {
          availability[level] = false;
        }
      } catch {
        availability[level] = false;
      }
    }

    setAvailableLevels(availability);
    console.log(`📋 Available levels for ${bookId}:`, availability);
  };

  // Load bundle data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Check available levels first
        await checkAvailableLevels();

        // Check URL for level parameter
        const params = new URLSearchParams(window.location.search);
        const urlLevel = params.get('level');

        // Use URL level if provided, otherwise use state
        let levelParam = contentMode === 'original' ? 'original' : cefrLevel;
        if (urlLevel) {
          levelParam = urlLevel.toUpperCase();
          // Update state to match URL
          if (urlLevel.toLowerCase() === 'original') {
            setContentMode('original');
            levelParam = 'original';
          } else {
            setContentMode('simplified');
            setCefrLevel(urlLevel.toUpperCase() as any);
          }
        }

        // Fetch bundle data
        const bookId = getBookId();
        const response = await fetch(`/api/test-book/real-bundles?bookId=${bookId}&level=${levelParam}`);

        if (response.ok) {
          const data: RealBundleApiResponse = await response.json();
          setBundleData(data);

          // Initialize audio manager
          if (!audioManagerRef.current) {
            const audioManager = new BundleAudioManager({
              onSentenceStart: (sentence) => {
                setCurrentSentenceIndex(sentence.sentenceIndex);

                // Auto-scroll to current sentence - immediate
                const sentenceElement = document.querySelector(`[data-sentence="${sentence.sentenceIndex}"]`);
                if (sentenceElement) {
                  sentenceElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                  });
                }
              },
              onSentenceEnd: (sentence) => {
                console.log(`✅ Sentence ended: ${sentence.sentenceIndex}`);
              },
              onBundleComplete: (bundleId) => {
                console.log(`📦 Bundle complete: ${bundleId}`);
                handleNextBundleRef.current();
              },
              onProgress: (currentTime, duration) => {
                setPlaybackTime(currentTime);
                setTotalTime(duration);
              }
            });
            audioManagerRef.current = audioManager;
          }
        } else {
          setError(`Level ${levelParam} not available for this book`);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load book data');
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Cleanup on unmount
    return () => {
      audioManagerRef.current?.destroy();
    };
  }, [contentMode, cefrLevel]);

  // Audio playback functions
  const findBundleForSentence = (sentenceIndex: number): BundleData | null => {
    if (!bundleData) return null;
    return bundleData.bundles.find(bundle =>
      bundle.sentences.some(s => s.sentenceIndex === sentenceIndex)
    ) || null;
  };

  const handlePlaySequential = async (startSentenceIndex: number = 0) => {
    if (!audioManagerRef.current || !bundleData) return;

    try {
      const bundle = findBundleForSentence(startSentenceIndex);
      if (!bundle) {
        console.error(`Bundle not found for sentence ${startSentenceIndex}`);
        return;
      }

      setCurrentBundle(bundle.bundleId);
      setCurrentSentenceIndex(startSentenceIndex);
      setIsPlaying(true);
      isPlayingRef.current = true;

      await audioManagerRef.current.playSequentialSentences(bundle, startSentenceIndex);

    } catch (error) {
      console.error('Sequential playback failed:', error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const handleNextBundle = async () => {
    console.log('🔄 handleNextBundle called', { bundleData: !!bundleData, currentBundle, isPlaying: isPlayingRef.current });

    if (!bundleData || !currentBundle) {
      console.log('❌ handleNextBundle early return - missing data');
      return;
    }

    // Only continue if still playing
    if (!isPlayingRef.current) {
      console.log('❌ handleNextBundle early return - not playing');
      return;
    }

    const currentBundleIndex = bundleData.bundles.findIndex(b => b.bundleId === currentBundle);
    const nextBundle = bundleData.bundles[currentBundleIndex + 1];

    console.log(`📊 Bundle progress: ${currentBundleIndex + 1}/${bundleData.bundles.length}`);

    if (nextBundle && nextBundle.sentences.length > 0) {
      console.log(`📦 Auto-advancing to next bundle: ${nextBundle.bundleId}`);
      const nextSentenceIndex = nextBundle.sentences[0].sentenceIndex;

      setTimeout(() => {
        if (isPlayingRef.current) { // Check again before advancing
          handlePlaySequential(nextSentenceIndex);
        }
      }, 100);
    } else {
      console.log('🎉 All bundles complete!');
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentBundle(null);
    }
  };

  // Update the ref whenever handleNextBundle changes
  useEffect(() => {
    handleNextBundleRef.current = handleNextBundle;
  });

  const handlePause = () => {
    audioManagerRef.current?.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;
  };

  const handleResume = async () => {
    if (!audioManagerRef.current || !bundleData) return;

    try {
      // If we have a current position, resume from there
      if (currentSentenceIndex >= 0 && currentBundle) {
        const bundle = findBundleForSentence(currentSentenceIndex);
        if (bundle) {
          setIsPlaying(true);
          await audioManagerRef.current.playSequentialSentences(bundle, currentSentenceIndex);
        } else {
          // Fallback to resume if bundle not found
          await audioManagerRef.current.resume();
          setIsPlaying(true);
        }
      } else {
        // Standard resume
        await audioManagerRef.current.resume();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Resume failed:', error);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    audioManagerRef.current?.stop();
    setIsPlaying(false);
    setCurrentBundle(null);
    setCurrentSentenceIndex(0);
    setPlaybackTime(0);
    setTotalTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Step 1: Just basic structure - mobile-first like wireframe */}
      <div className="max-w-4xl mx-auto">

        {/* Header - Speechify Style (from wireframe) */}
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="p-4">

            {/* Row 1: Back, Toggle, Settings */}
            <div className="flex items-center justify-between mb-4">
              <button className="flex items-center text-gray-300 hover:text-white">
                ← {/* Back arrow */}
              </button>

              {/* Original/Simplified Toggle (center) */}
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setContentMode('original')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    contentMode === 'original'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => setContentMode('simplified')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    contentMode === 'simplified'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  Simplified
                </button>
              </div>

              <div className="text-gray-300">⚙️</div> {/* Settings */}
            </div>

            {/* Row 2: CEFR Level Selector */}
            <div className="flex justify-center">
              <div className="flex bg-gray-700 rounded-lg p-1 gap-1">
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((level) => {
                  const isOriginalMode = contentMode === 'original';
                  const isLevelAvailable = availableLevels[level.toLowerCase()];
                  const isDisabled = isOriginalMode || !isLevelAvailable;

                  return (
                    <button
                      key={level}
                      onClick={() => {
                        if (!isDisabled) {
                          setCefrLevel(level);
                          // Ensure we're in simplified mode when selecting CEFR level
                          setContentMode('simplified');
                        }
                      }}
                      disabled={isDisabled}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-w-[44px] ${
                        cefrLevel === level && contentMode === 'simplified'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : isDisabled
                          ? 'text-gray-500 cursor-not-allowed opacity-50'
                          : 'text-gray-300 hover:text-white hover:bg-gray-600'
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
        </div>

        {/* Real Moby Dick Content */}
        <div className="pb-28 px-6">

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading Moby Dick bundles...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="bg-red-900 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-300">{error}</p>
                <p className="text-gray-400 text-sm mt-2">
                  Try switching to Original or available levels
                </p>
              </div>
            </div>
          )}

          {bundleData && (
            <>
              {/* Book Title */}
              <div className="text-center py-6">
                <h1 className="text-4xl font-bold text-white mb-4">
                  {bundleData.title.replace(/\s*\(Bundled\)$/i, '')}
                </h1>
              </div>

              {/* Real Moby Dick Text - Speechify Style */}
              <div className="text-gray-100">
                {bundleData.bundles.flatMap(bundle =>
                  bundle.sentences.map((sentence) => (
                    <span
                      key={sentence.sentenceId}
                      data-sentence={sentence.sentenceIndex}
                      className={`inline cursor-pointer transition-all duration-700 ease-in-out px-2 py-1 rounded-lg ${
                        sentence.sentenceIndex === currentSentenceIndex && isPlaying
                          ? 'bg-gradient-to-r from-blue-500/25 to-purple-600/25 text-white shadow-xl'
                          : 'hover:bg-gray-800/20 text-gray-100'
                      }`}
                      style={{
                        fontSize: 'clamp(100px, 40vw, 500px) !important',
                        lineHeight: '1.1 !important',
                        fontWeight: '500 !important',
                        wordSpacing: '0.1em',
                        letterSpacing: '0.02em',
                        display: 'inline-block !important',
                      }}
                      title={`Sentence ${sentence.sentenceIndex + 1} (${sentence.startTime.toFixed(1)}s - ${sentence.endTime.toFixed(1)}s)`}
                    >
                      {sentence.text}
                      {' '}
                    </span>
                  ))
                )}
              </div>
            </>
          )}

        </div>

        {/* Compact Rounded Control Bar - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm rounded-t-2xl shadow-2xl z-50 border-t border-gray-600">
          <div className="px-4 pt-4 pb-6">

            {/* Compact 5-Button Layout - Icons Only */}
            <div className="flex items-center justify-between mb-3">

              {/* Speed Control - Icon Only */}
              <button className="flex items-center justify-center w-12 h-12 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-all">
                <div className="text-lg font-semibold">1x</div>
              </button>

              {/* Previous - Icon Only */}
              <button className="flex items-center justify-center w-12 h-12 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-all">
                <div className="text-xl">⏮️</div>
              </button>

              {/* Play/Pause - Center & Larger */}
              <button
                onClick={async () => {
                  if (isPlaying) {
                    handlePause();
                  } else {
                    // Always try to resume first if we have a current position
                    if (currentSentenceIndex > 0 && currentBundle) {
                      await handleResume();
                    } else {
                      // Start from beginning if no current position
                      await handlePlaySequential(0);
                    }
                  }
                }}
                className="flex items-center justify-center w-16 h-16 text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-full hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
              >
                <div className="text-2xl">{isPlaying ? '⏸️' : '▶️'}</div>
              </button>

              {/* Next - Icon Only */}
              <button className="flex items-center justify-center w-12 h-12 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-all">
                <div className="text-xl">⏭️</div>
              </button>

              {/* Voice - Icon Only */}
              <button className="flex items-center justify-center w-12 h-12 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-all">
                <div className="text-xl">🎙️</div>
              </button>

            </div>

            {/* Compact Progress Bar */}
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>{formatTime(playbackTime)}</span>
              <span className="text-gray-300 text-xs">
                {bundleData ? bundleData.title.replace(/\s*\(Bundled\)$/i, '') : 'Chapter 1'}
              </span>
              <span>{formatTime(totalTime)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-1 rounded-full transition-all"
                style={{
                  width: totalTime > 0 ? `${(playbackTime / totalTime) * 100}%` : '0%'
                }}
              ></div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}