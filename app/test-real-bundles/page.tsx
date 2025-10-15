'use client';

import { useState, useEffect, useRef } from 'react';
import { BundleAudioManager, type BundleData } from '@/lib/audio/BundleAudioManager';

interface RealBundleApiResponse {
  success: boolean;
  bookId: string;
  title: string;
  author: string;
  level: string;
  bundleCount: number;
  totalSentences: number;
  sentencesPerBundle: number;
  bundles: BundleData[];
  audioType: string;
}

export default function TestRealBundlesPage() {
  const [bundleData, setBundleData] = useState<RealBundleApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentBundle, setCurrentBundle] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  // Resume playback state
  const [bookmarkPosition, setBookmarkPosition] = useState<{
    sentenceIndex: number;
    bundleId: string | null;
    timestamp: number;
  } | null>(null);

  // Audio manager
  const audioManagerRef = useRef<BundleAudioManager | null>(null);
  const handleNextBundleRef = useRef<() => void>(() => {});

  useEffect(() => {
    async function initializeTest() {
      try {
        setLoading(true);

        // Fetch real bundle data
        const response = await fetch('/api/test-book/real-bundles?bookId=test-continuous-bundles-001&level=original');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: RealBundleApiResponse = await response.json();
        setBundleData(data);

        // Load saved bookmark position
        const savedBookmark = localStorage.getItem('test-real-bundles-bookmark');
        if (savedBookmark) {
          try {
            const bookmark = JSON.parse(savedBookmark);
            setBookmarkPosition(bookmark);
            setCurrentSentenceIndex(bookmark.sentenceIndex);
            setCurrentBundle(bookmark.bundleId);
            console.log(`📖 Loaded bookmark: sentence ${bookmark.sentenceIndex}`);
          } catch (error) {
            console.error('Failed to parse saved bookmark:', error);
          }
        }

        // Initialize bundle audio manager
        const audioManager = new BundleAudioManager({
          onSentenceStart: (sentence) => {
            console.log(`🎵 Sentence started: ${sentence.sentenceIndex}`);
            setCurrentSentenceIndex(sentence.sentenceIndex);

            // Auto-scroll to current sentence
            setTimeout(() => {
              const sentenceElement = document.querySelector(`[data-sentence="${sentence.sentenceIndex}"]`);
              console.log(`📍 Looking for element with data-sentence="${sentence.sentenceIndex}":`, sentenceElement);
              if (sentenceElement) {
                console.log(`📍 Scrolling to sentence ${sentence.sentenceIndex}`);
                sentenceElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center'
                });
              } else {
                console.log(`❌ Element not found for sentence ${sentence.sentenceIndex}`);
              }
            }, 100);
          },
          onSentenceEnd: (sentence) => {
            console.log(`✅ Sentence ended: ${sentence.sentenceIndex}`);
          },
          onBundleComplete: (bundleId) => {
            console.log(`📦 Bundle complete: ${bundleId}`);
            handleNextBundleRef.current(); // Use ref to avoid closure
          },
          onProgress: (currentTime, duration) => {
            setPlaybackTime(currentTime);
            setTotalTime(duration);
          }
        });

        audioManagerRef.current = audioManager;

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    initializeTest();

    // Cleanup on unmount
    return () => {
      audioManagerRef.current?.destroy();
    };
  }, []);

  const findBundleForSentence = (sentenceIndex: number): BundleData | null => {
    if (!bundleData) return null;

    return bundleData.bundles.find(bundle =>
      bundle.sentences.some(s => s.sentenceIndex === sentenceIndex)
    ) || null;
  };

  const handlePlaySentence = async (sentenceIndex: number) => {
    if (!audioManagerRef.current || !bundleData) return;

    try {
      const bundle = findBundleForSentence(sentenceIndex);
      if (!bundle) {
        console.error(`Bundle not found for sentence ${sentenceIndex}`);
        return;
      }

      setCurrentBundle(bundle.bundleId);
      setCurrentSentenceIndex(sentenceIndex);
      setIsPlaying(true);

      await audioManagerRef.current.playBundleSentence(bundle, sentenceIndex);

    } catch (error) {
      console.error('Playback failed:', error);
      setIsPlaying(false);
    }
  };

  const handlePlaySequential = async (startSentenceIndex: number) => {
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

      await audioManagerRef.current.playSequentialSentences(bundle, startSentenceIndex);

    } catch (error) {
      console.error('Sequential playback failed:', error);
      setIsPlaying(false);
    }
  };

  const handleNextBundle = async () => {
    if (!bundleData || !currentBundle) return;

    const currentBundleIndex = bundleData.bundles.findIndex(b => b.bundleId === currentBundle);
    const nextBundle = bundleData.bundles[currentBundleIndex + 1];

    if (nextBundle && nextBundle.sentences.length > 0) {
      console.log(`📦 Auto-advancing to next bundle: ${nextBundle.bundleId}`);
      // Automatically continue to next bundle
      const nextSentenceIndex = nextBundle.sentences[0].sentenceIndex;

      // Small delay to ensure clean transition
      setTimeout(() => {
        handlePlaySequential(nextSentenceIndex);
      }, 100);
    } else {
      // No more bundles - all complete!
      console.log('🎉 All bundles complete!');
      setIsPlaying(false);
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

    // Save bookmark position
    const bookmark = {
      sentenceIndex: currentSentenceIndex,
      bundleId: currentBundle,
      timestamp: Date.now()
    };
    setBookmarkPosition(bookmark);
    localStorage.setItem('test-real-bundles-bookmark', JSON.stringify(bookmark));
    console.log(`📖 Saved bookmark: sentence ${currentSentenceIndex}`);
  };

  const handleResume = async () => {
    if (audioManagerRef.current) {
      await audioManagerRef.current.resume();
      setIsPlaying(true);
    }
  };

  const handleResumeFromBookmark = async () => {
    if (!audioManagerRef.current || !bundleData || !bookmarkPosition) return;

    try {
      console.log(`📖 Resuming from bookmark: sentence ${bookmarkPosition.sentenceIndex}`);

      // Find the bundle containing the bookmarked sentence
      const bundle = findBundleForSentence(bookmarkPosition.sentenceIndex);
      if (!bundle) {
        console.error(`Bundle not found for sentence ${bookmarkPosition.sentenceIndex}`);
        return;
      }

      setCurrentBundle(bundle.bundleId);
      setCurrentSentenceIndex(bookmarkPosition.sentenceIndex);
      setIsPlaying(true);

      // Start sequential playback from the bookmarked position
      await audioManagerRef.current.playSequentialSentences(bundle, bookmarkPosition.sentenceIndex);

    } catch (error) {
      console.error('Failed to resume from bookmark:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Real Bundle Audio Test</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Real Bundle Audio Test</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!bundleData) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Real Bundle Audio Test</h1>

        {/* Audio Type Indicator */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">🎵 Real Bundled Audio</h2>
          <p className="text-green-700">
            Playing actual compressed audio bundles with micro-crossfades.
            Each bundle contains 4 sentences with precise timing metadata.
          </p>
        </div>

        {/* Playback Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Playback Controls</h2>

          <div className="flex flex-wrap gap-4 mb-4">
            <button
              onClick={() => handlePlaySequential(0)}
              disabled={isPlaying}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              ▶️ Play All (Sequential)
            </button>

            {bookmarkPosition && (
              <button
                onClick={handleResumeFromBookmark}
                disabled={isPlaying}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
                title={`Resume from sentence ${bookmarkPosition.sentenceIndex + 1}`}
              >
                📖 Resume from Bookmark
              </button>
            )}

            {isPlaying ? (
              <button
                onClick={handlePause}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                ⏸️ Pause
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                ▶️ Resume
              </button>
            )}

            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              ⏹️ Stop
            </button>
          </div>

          {/* Progress Display */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-gray-500">Current Sentence</div>
              <div className="font-medium">{currentSentenceIndex + 1} of {bundleData.totalSentences}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Current Bundle</div>
              <div className="font-medium">{currentBundle || 'None'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Time</div>
              <div className="font-medium">{formatTime(playbackTime)} / {formatTime(totalTime)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium">{isPlaying ? '🎵 Playing' : '⏸️ Paused'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Bookmark</div>
              <div className="font-medium">
                {bookmarkPosition
                  ? `📖 S${bookmarkPosition.sentenceIndex + 1}`
                  : '📍 None'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Bundle Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {bundleData.bundles.map((bundle) => (
            <div
              key={bundle.bundleId}
              className={`border rounded-lg p-4 ${
                currentBundle === bundle.bundleId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">{bundle.bundleId}</h3>
                <span className="text-sm text-gray-500">
                  {bundle.totalDuration.toFixed(1)}s
                </span>
              </div>

              <div className="space-y-2">
                {bundle.sentences.map((sentence) => (
                  <div
                    key={sentence.sentenceId}
                    data-sentence={sentence.sentenceIndex}
                    className={`text-sm p-2 rounded cursor-pointer ${
                      sentence.sentenceIndex === currentSentenceIndex
                        ? 'bg-blue-200 font-semibold'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    onClick={() => handlePlaySentence(sentence.sentenceIndex)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-blue-600">
                        S{sentence.sentenceIndex} ({sentence.startTime.toFixed(1)}-{sentence.endTime.toFixed(1)}s)
                      </span>
                    </div>
                    <p className="text-gray-900">{sentence.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Technical Info */}
        <div className="bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Technical Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Book ID</div>
              <div className="font-medium">{bundleData.bookId}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Audio Type</div>
              <div className="font-medium">{bundleData.audioType}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Bundles</div>
              <div className="font-medium">{bundleData.bundleCount}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Compression</div>
              <div className="font-medium">48kbps AAC-LC</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}