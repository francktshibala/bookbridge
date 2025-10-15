'use client';

import { useState, useEffect, useRef } from 'react';
import { GaplessAudioManager, SlidingWindowManager, type BundleData } from '@/lib/audio/GaplessAudioManager';

interface BundleApiResponse {
  success: boolean;
  bookId: string;
  title: string;
  author: string;
  level: string;
  bundleCount: number;
  totalSentences: number;
  sentencesPerBundle: number;
  bundles: BundleData[];
}

export default function TestContinuousBundlesPage() {
  const [bundleData, setBundleData] = useState<BundleApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sliding window state
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [loadedBundles, setLoadedBundles] = useState<string[]>([]);
  const [memoryUsage, setMemoryUsage] = useState({ bundles: 0, estimatedMB: 0 });

  // Audio manager references
  const audioManagerRef = useRef<GaplessAudioManager | null>(null);
  const slidingWindowRef = useRef<SlidingWindowManager | null>(null);

  useEffect(() => {
    async function initializeTest() {
      try {
        setLoading(true);

        // Fetch bundle data
        const response = await fetch('/api/test-book/bundles?bookId=test-continuous-001&level=original');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: BundleApiResponse = await response.json();
        setBundleData(data);

        // Initialize audio manager and sliding window
        const audioManager = new GaplessAudioManager();
        const slidingWindow = audioManager.initializeSlidingWindow({
          ahead: 10,
          behind: 10,
          bundleSize: 4
        });

        audioManagerRef.current = audioManager;
        slidingWindowRef.current = slidingWindow;

        // Initialize sliding window with bundle data
        await slidingWindow.initializeWithBundles(data.bundles);

        // Update UI state
        updateWindowState();

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

  const updateWindowState = () => {
    if (!slidingWindowRef.current) return;

    const loadedIds = slidingWindowRef.current.getLoadedBundleIds();
    const usage = slidingWindowRef.current.getMemoryUsage();

    setLoadedBundles(loadedIds);
    setMemoryUsage(usage);
  };

  const handleSentenceChange = async (newIndex: number) => {
    if (!slidingWindowRef.current || !bundleData) return;

    setCurrentSentenceIndex(newIndex);

    // Update sliding window
    await slidingWindowRef.current.updateWindow(newIndex, bundleData.bundles);

    // Update UI
    updateWindowState();
  };

  const getCurrentSentenceData = () => {
    if (!slidingWindowRef.current) return null;
    return slidingWindowRef.current.getSentenceData(currentSentenceIndex);
  };

  const getCurrentBundle = () => {
    if (!slidingWindowRef.current) return null;
    return slidingWindowRef.current.getBundleForSentence(currentSentenceIndex);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Bundle Sliding Window Test</h1>
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
          <h1 className="text-3xl font-bold mb-8">Bundle Sliding Window Test</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!bundleData) return null;

  const currentSentence = getCurrentSentenceData();
  const currentBundle = getCurrentBundle();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Bundle Sliding Window Test</h1>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Reading Position Control</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Sentence: {currentSentenceIndex + 1} of {bundleData.totalSentences}
            </label>
            <input
              type="range"
              min="0"
              max={bundleData.totalSentences - 1}
              value={currentSentenceIndex}
              onChange={(e) => handleSentenceChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">Current Bundle</div>
              <div className="font-medium">{currentBundle?.bundleId || 'None'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Loaded Bundles</div>
              <div className="font-medium">{memoryUsage.bundles}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Memory Usage</div>
              <div className="font-medium">{memoryUsage.estimatedMB}MB</div>
            </div>
          </div>
        </div>

        {/* Current Sentence Display */}
        {currentSentence && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Current Sentence</h3>
            <p className="text-blue-900 text-lg mb-2">{currentSentence.text}</p>
            <div className="text-sm text-blue-600">
              Position in bundle: {currentSentence.startTime.toFixed(1)}s - {currentSentence.endTime.toFixed(1)}s
            </div>
          </div>
        )}

        {/* Sliding Window Visualization */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Sliding Window Status</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bundleData.bundles.map((bundle, index) => {
              const isLoaded = loadedBundles.includes(bundle.bundleId);
              const isCurrent = currentBundle?.bundleId === bundle.bundleId;

              return (
                <div
                  key={bundle.bundleId}
                  className={`border rounded-lg p-4 ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50'
                      : isLoaded
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{bundle.bundleId}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      isCurrent
                        ? 'bg-blue-200 text-blue-800'
                        : isLoaded
                          ? 'bg-green-200 text-green-800'
                          : 'bg-gray-200 text-gray-600'
                    }`}>
                      {isCurrent ? 'CURRENT' : isLoaded ? 'LOADED' : 'UNLOADED'}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">
                    <div>Sentences: {bundle.sentences.map(s => s.sentenceIndex).join(', ')}</div>
                    <div>Duration: {bundle.totalDuration.toFixed(1)}s</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bundle Details */}
        {currentBundle && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Current Bundle Details: {currentBundle.bundleId}</h2>

            <div className="space-y-3">
              {currentBundle.sentences.map((sentence, index) => (
                <div
                  key={sentence.sentenceId}
                  className={`border-l-4 pl-4 ${
                    sentence.sentenceIndex === currentSentenceIndex
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-blue-600">
                      {sentence.sentenceId} ({sentence.startTime.toFixed(1)}s - {sentence.endTime.toFixed(1)}s)
                    </span>
                    {sentence.sentenceIndex === currentSentenceIndex && (
                      <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">CURRENT</span>
                    )}
                  </div>
                  <p className="text-gray-900">{sentence.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}