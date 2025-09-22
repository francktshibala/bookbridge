'use client';

import { useState, useEffect } from 'react';

interface BundleData {
  success: boolean;
  bookId: string;
  title: string;
  author: string;
  level: string;
  bundleCount: number;
  totalSentences: number;
  sentencesPerBundle: number;
  bundles: Array<{
    bundleId: string;
    bundleIndex: number;
    audioUrl: string;
    totalDuration: number;
    sentences: Array<{
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
    }>;
  }>;
}

export default function TestBundleApiPage() {
  const [bundleData, setBundleData] = useState<BundleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBundles() {
      try {
        setLoading(true);
        const response = await fetch('/api/test-book/bundles?bookId=test-continuous-001&level=original');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setBundleData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchBundles();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Bundle API Test</h1>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Bundle API Test</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!bundleData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Bundle API Test</h1>
          <div className="bg-gray-50 border rounded-lg p-6">
            <p>No data received</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Bundle API Test</h1>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Bundle Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Book</div>
              <div className="font-medium">{bundleData.title}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total Sentences</div>
              <div className="font-medium">{bundleData.totalSentences}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Bundle Count</div>
              <div className="font-medium">{bundleData.bundleCount}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Sentences/Bundle</div>
              <div className="font-medium">{bundleData.sentencesPerBundle}</div>
            </div>
          </div>
        </div>

        {/* Bundle Details */}
        <div className="space-y-4">
          {bundleData.bundles.map((bundle, index) => (
            <div key={bundle.bundleId} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{bundle.bundleId}</h3>
                <span className="text-sm text-gray-500">
                  Duration: {bundle.totalDuration.toFixed(1)}s
                </span>
              </div>

              <div className="space-y-3">
                {bundle.sentences.map((sentence, sentenceIndex) => (
                  <div key={sentence.sentenceId} className="border-l-4 border-blue-200 pl-4">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-blue-600">
                        {sentence.sentenceId} ({sentence.startTime.toFixed(1)}s - {sentence.endTime.toFixed(1)}s)
                      </span>
                    </div>
                    <p className="text-gray-900 mb-2">{sentence.text}</p>

                    {/* Show first few word timings as sample */}
                    {sentenceIndex === 0 && (
                      <div className="text-xs text-gray-500">
                        Word timings (sample): {sentence.wordTimings.slice(0, 3).map(wt =>
                          `${wt.word}(${wt.start.toFixed(1)}-${wt.end.toFixed(1)}s)`
                        ).join(', ')}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Raw JSON for debugging */}
        <div className="bg-gray-100 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold mb-4">Raw API Response</h3>
          <pre className="text-xs overflow-auto bg-white p-4 rounded border">
            {JSON.stringify(bundleData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}