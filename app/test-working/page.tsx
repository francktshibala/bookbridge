'use client';

import { useState, useEffect } from 'react';

export default function TestWorkingPage() {
  const [contentMode, setContentMode] = useState<'original' | 'simplified'>('simplified');
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('B2');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const levelParam = contentMode === 'original' ? 'original' : cefrLevel.toLowerCase();
        const response = await fetch(`/api/test-book/real-bundles?bookId=test-continuous-bundles-001&level=${levelParam}`);

        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          setData({ error: `Level ${levelParam} not available` });
        }
      } catch (error) {
        setData({ error: 'Failed to load' });
      }
      setLoading(false);
    }

    loadData();
  }, [contentMode, cefrLevel]);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl mb-8">Test Bundle Interface</h1>

      {/* Controls */}
      <div className="mb-8 space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setContentMode('original')}
            className={`px-4 py-2 rounded ${
              contentMode === 'original' ? 'bg-blue-500' : 'bg-gray-600'
            }`}
          >
            Original
          </button>
          <button
            onClick={() => setContentMode('simplified')}
            className={`px-4 py-2 rounded ${
              contentMode === 'simplified' ? 'bg-blue-500' : 'bg-gray-600'
            }`}
          >
            Simplified
          </button>
        </div>

        {/* CEFR Levels */}
        <div className="flex gap-2">
          {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setCefrLevel(level)}
              className={`px-3 py-2 rounded ${
                cefrLevel === level ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="bg-gray-800 p-4 rounded mb-4">
        <p>Mode: {contentMode}</p>
        <p>Level: {cefrLevel}</p>
        <p>Status: {data?.error ? 'Error' : data?.success ? 'Loaded' : 'Unknown'}</p>
      </div>

      {/* Data */}
      {data?.success && (
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg mb-2">{data.title}</h2>
          <p>Bundles: {data.bundleCount}</p>
          <p>Sentences: {data.totalSentences}</p>
          <p>Level: {data.level}</p>
        </div>
      )}

      {data?.error && (
        <div className="bg-red-900 p-4 rounded">
          <p>Error: {data.error}</p>
        </div>
      )}
    </div>
  );
}