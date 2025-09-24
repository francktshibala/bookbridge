'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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

// Featured books with bundle architecture
interface FeaturedBook {
  id: string;
  title: string;
  author: string;
  description: string;
  sentences: number;
  bundles: number;
  gradient: string;
  abbreviation: string;
}

const FEATURED_BOOKS: FeaturedBook[] = [
  {
    id: 'test-continuous-bundles-001',
    title: 'Test Book',
    author: 'BookBridge Team',
    description: 'Technical validation book with 44 sentences across 11 bundles. Proves bundle architecture works.',
    sentences: 44,
    bundles: 11,
    gradient: 'from-blue-500 to-purple-600',
    abbreviation: 'TB'
  },
  {
    id: 'custom-story-500',
    title: 'Modern Adventure Story',
    author: 'BookBridge Original',
    description: 'B1 modern adventure story with 449 sentences across 113 bundles. Clean contemporary content without Victorian complexity.',
    sentences: 449,
    bundles: 113,
    gradient: 'from-green-500 to-teal-600',
    abbreviation: 'MA'
  },
  {
    id: 'sleepy-hollow-enhanced',
    title: 'The Legend of Sleepy Hollow',
    author: 'Washington Irving',
    description: 'Classic American tale modernized for ESL learners. 325 sentences across 82 bundles with perfect text-audio harmony.',
    sentences: 325,
    bundles: 82,
    gradient: 'from-orange-500 to-red-600',
    abbreviation: 'SH'
  },
  {
    id: 'jane-eyre-scale-test-001',
    title: 'Jane Eyre',
    author: 'Charlotte Brontë',
    description: 'A1 simplified version with 10,338 sentences across 2,585 bundles. Full-scale continuous reading experience.',
    sentences: 10338,
    bundles: 2585,
    gradient: 'from-purple-500 to-pink-600',
    abbreviation: 'JE'
  }
];

export default function FeaturedBooksPage() {
  // Book selection state
  const [selectedBook, setSelectedBook] = useState<FeaturedBook | null>(null);
  const [showBookSelection, setShowBookSelection] = useState(true);

  // UI state
  const [contentMode, setContentMode] = useState<'original' | 'simplified'>('simplified');
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('A1');

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

  // Get bookId from selected book or URL params
  const getBookId = () => {
    if (selectedBook) {
      return selectedBook.id;
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlBookId = params.get('bookId');
      if (urlBookId) {
        // Auto-select book from URL
        const book = FEATURED_BOOKS.find(b => b.id === urlBookId);
        if (book) {
          setSelectedBook(book);
          setShowBookSelection(false);
          return urlBookId;
        }
      }
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
        const response = await fetch(`/api/test-book/real-bundles?bookId=${bookId}&level=${level}&t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (response.ok) {
          const data = await response.json();
          availability[level.toLowerCase()] = data.success === true;
        } else {
          availability[level.toLowerCase()] = false;
        }
      } catch {
        availability[level.toLowerCase()] = false;
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
        const response = await fetch(`/api/test-book/real-bundles?bookId=${bookId}&level=${levelParam}&t=${Date.now()}`, {
          cache: 'no-store'
        });

        if (response.ok) {
          const data: RealBundleApiResponse = await response.json();
          setBundleData(data);

          // Initialize audio manager
          if (!audioManagerRef.current) {
            // Determine highlight lead based on availability of precise timings
            const firstSentence = data?.bundles?.[0]?.sentences?.[0];
            const hasPreciseTimings = Array.isArray(firstSentence?.wordTimings) && firstSentence.wordTimings.length > 0;
            const leadMs = hasPreciseTimings ? 500 : 1400; // larger lead for synthesized timings

            const audioManager = new BundleAudioManager({
              onSentenceStart: (sentence) => {
                // Immediate highlight; predictive lead handled inside BundleAudioManager
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
                console.log(`🔍 isPlayingRef.current before handleNextBundle: ${isPlayingRef.current}`);
                handleNextBundleRef.current();
                console.log(`🔍 isPlayingRef.current after handleNextBundle: ${isPlayingRef.current}`);
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

      // This line executes when playSequentialSentences completes (bundle finished)
      console.log(`📌 playSequentialSentences completed for bundle ${bundle.bundleId}, isPlayingRef.current = ${isPlayingRef.current}`);

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
      console.log(`🎯 Next bundle starts at sentence ${nextSentenceIndex}`);
      console.log(`📝 Bundle ${nextBundle.bundleId} contains:`,
        nextBundle.sentences.map(s => `s${s.sentenceIndex}: "${s.text?.substring(0, 25)}..."`).join(', ')
      );

      setTimeout(() => {
        if (isPlayingRef.current) { // Check again before advancing
          console.log(`✅ Still playing, advancing to sentence ${nextSentenceIndex}`);
          handlePlaySequential(nextSentenceIndex);
        } else {
          console.log(`⛔ Playback was stopped, not advancing to next bundle`);
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
      {/* Book Selection Screen */}
      {showBookSelection && (
        <div className="min-h-screen bg-gray-900 text-white">
          <div className="max-w-6xl mx-auto px-4 py-8">

            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                🎧 Featured Books
              </h1>
              <p className="text-gray-300 text-lg">
                Experience true continuous reading with our bundle architecture
              </p>
              <div className="mt-4 px-4 py-2 bg-green-900/50 rounded-lg border border-green-500/30 inline-block">
                <span className="text-green-300 text-sm font-medium">
                  ✅ Speechify-Level Experience • Zero Audio Gaps • Resume Anywhere
                </span>
              </div>
            </div>

            {/* Featured Books Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {FEATURED_BOOKS.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group cursor-pointer"
                  onClick={() => {
                    setSelectedBook(book);
                    setShowBookSelection(false);
                  }}
                >
                  <div className="bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition-all duration-300 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10">

                    {/* Card Header with Gradient */}
                    <div className={`h-32 bg-gradient-to-br ${book.gradient} relative`}>
                      <div className="absolute inset-0 bg-black/20"></div>
                      <div className="absolute top-4 left-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{book.abbreviation}</span>
                        </div>
                      </div>
                      <div className="absolute bottom-4 right-4 text-white/80 text-sm">
                        {book.sentences} sentences • {book.bundles} bundles
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-blue-300 transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-3">by {book.author}</p>
                      <p className="text-gray-300 text-sm leading-relaxed mb-4">
                        {book.description}
                      </p>

                      {/* Technical Features */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
                          Bundle Architecture
                        </span>
                        <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded text-xs">
                          Continuous Reading
                        </span>
                        <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs">
                          Auto-Resume
                        </span>
                      </div>

                      {/* Read Button */}
                      <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 transform group-hover:scale-[1.02]">
                        🎧 Start Reading
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Info Section */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 text-center">
              <h2 className="text-2xl font-semibold mb-4 text-white">
                Why Featured Books?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl mb-2">🚀</div>
                  <h3 className="font-semibold text-white mb-2">Bundle Architecture</h3>
                  <p className="text-gray-400 text-sm">
                    4 sentences per audio file reduces CDN requests by 75%
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-2">🎵</div>
                  <h3 className="font-semibold text-white mb-2">Zero Audio Gaps</h3>
                  <p className="text-gray-400 text-sm">
                    Seamless sentence-to-sentence playback like Speechify
                  </p>
                </div>
                <div>
                  <div className="text-3xl mb-2">📱</div>
                  <h3 className="font-semibold text-white mb-2">Any Scale</h3>
                  <p className="text-gray-400 text-sm">
                    Memory usage stays constant regardless of book size
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Reading Interface */}
      {!showBookSelection && selectedBook && (
        <div className="max-w-4xl mx-auto">

        {/* Header - Speechify Style (from wireframe) */}
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="p-4">

            {/* Row 1: Back, Toggle, Settings */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  setShowBookSelection(true);
                  setSelectedBook(null);
                  handleStop();
                }}
                className="flex items-center text-gray-300 hover:text-white"
              >
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
              <p className="text-gray-400">Loading {selectedBook?.title} bundles...</p>
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
                      // Start from first available sentence (not necessarily 0)
                      const firstSentence = bundleData?.bundles?.[0]?.sentences?.[0]?.sentenceIndex ?? 0;
                      await handlePlaySequential(firstSentence);
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
      )}
    </div>
  );
}