'use client';

import { useState, useEffect } from 'react';

export default function TestRealBundlesSimplePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // Header control state
  const [contentMode, setContentMode] = useState<'original' | 'simplified'>('simplified');
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('B2');
  const [availableLevels, setAvailableLevels] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Check available levels
        const levels = ['original', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
        const availability: {[key: string]: boolean} = {};

        for (const level of levels) {
          try {
            const response = await fetch(`/api/test-book/real-bundles?bookId=test-continuous-bundles-001&level=${level}`);
            availability[level] = response.ok;
          } catch {
            availability[level] = false;
          }
        }

        setAvailableLevels(availability);

        // Load current level data
        const levelParam = contentMode === 'original' ? 'original' : cefrLevel.toLowerCase();
        const response = await fetch(`/api/test-book/real-bundles?bookId=test-continuous-bundles-001&level=${levelParam}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [contentMode, cefrLevel]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading bundles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto p-4">

          {/* Navigation Row */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center text-gray-300 hover:text-white"
            >
              ← Back
            </button>

            {/* Original/Simplified Toggle */}
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

            <div className="text-gray-300">⚙️</div>
          </div>

          {/* CEFR Level Selector */}
          <div className="flex justify-center">
            <div className="flex bg-gray-700 rounded-lg p-1 gap-1">
              {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((level) => {
                const isAvailable = contentMode === 'original' || availableLevels[level.toLowerCase()];
                const isDisabled = !isAvailable;

                return (
                  <button
                    key={level}
                    onClick={() => !isDisabled && setCefrLevel(level)}
                    disabled={isDisabled}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-w-[44px] ${
                      cefrLevel === level
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : isDisabled
                        ? 'text-gray-500 cursor-not-allowed opacity-50'
                        : 'text-gray-300 hover:text-white hover:bg-gray-600'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {data?.title || 'Test Bundle'} - {contentMode === 'original' ? 'Original' : `Simplified ${cefrLevel}`}
        </h1>

        {/* Bundle Status */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Bundle Status</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Bundles: {data?.bundleCount || 0}</div>
            <div>Sentences: {data?.totalSentences || 0}</div>
            <div>Level: {data?.level || 'N/A'}</div>
            <div>Type: {data?.audioType || 'N/A'}</div>
          </div>
        </div>

        {/* Available Levels */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Available Levels</h2>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(availableLevels).map(([level, available]) => (
              <span
                key={level}
                className={`px-2 py-1 rounded text-xs ${
                  available
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {level.toUpperCase()}: {available ? '✓' : '✗'}
              </span>
            ))}
          </div>
        </div>

        {/* Text Content Preview */}
        {data?.bundles && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Text Preview</h2>
            <div className="text-gray-300 leading-relaxed">
              {data.bundles.slice(0, 3).map((bundle: any, bundleIndex: number) => (
                <div key={bundle.bundleId} className="mb-4">
                  <div className="text-xs text-gray-500 mb-2">Bundle {bundleIndex + 1}:</div>
                  {bundle.sentences.map((sentence: any, sentenceIndex: number) => (
                    <span key={sentence.sentenceId} className="mr-1">
                      {sentence.text}
                    </span>
                  ))}
                </div>
              ))}
              {data.bundles.length > 3 && (
                <div className="text-gray-500 text-sm">
                  ... and {data.bundles.length - 3} more bundles
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}