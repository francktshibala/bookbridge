'use client';

import { useEffect, useState } from 'react';

interface AudioStats {
  totalSimplifiedChunks: number;
  chunksWithAudio: number;
  chunksWithoutAudio: number;
  booksWithAudio: number;
  audioPercentage: number;
}

export function AudioManagement() {
  const [stats, setStats] = useState<AudioStats | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/audio/stats?ts=${Date.now()}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load audio stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const generateMissingAudio = async () => {
    setIsGenerating(true);
    setProgress(null);

    try {
      const response = await fetch('/api/admin/audio/backfill', {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        setProgress(result);
        await loadStats(); // Refresh stats
      } else {
        console.error('Audio generation failed');
      }
    } catch (error) {
      console.error('Audio generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error / Loading State */}
      {loading && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-300">
          Loading audio stats...
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-sm">Failed to load stats: {error}</p>
        </div>
      )}

      {/* Audio Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">
            {stats?.totalSimplifiedChunks ?? 0}
          </div>
          <div className="text-sm text-slate-400">Total Simplified Chunks</div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {stats?.chunksWithAudio ?? 0}
          </div>
          <div className="text-sm text-slate-400">Chunks with Audio</div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {stats?.chunksWithoutAudio ?? 0}
          </div>
          <div className="text-sm text-slate-400">Missing Audio</div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            {stats?.audioPercentage ?? 0}%
          </div>
          <div className="text-sm text-slate-400">Audio Coverage</div>
        </div>
      </div>

      {/* Audio Controls */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Audio Generation Controls</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Generate Missing Audio Files</h4>
              <p className="text-sm text-slate-400">
                Create audio files for all simplified text chunks that don't have them yet
              </p>
            </div>
            
            <button
              onClick={generateMissingAudio}
              disabled={isGenerating || (stats?.chunksWithoutAudio === 0)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {isGenerating ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </span>
              ) : (
                <span className="flex items-center">
                  🎵 Generate Missing Audio
                </span>
              )}
            </button>
          </div>

          {stats?.chunksWithoutAudio === 0 && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-green-400 text-sm">
                ✅ All simplified chunks have audio files! No generation needed.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Display */}
      {progress && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Last Generation Results</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">{progress.processed}</div>
              <div className="text-sm text-slate-400">Processed</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{progress.succeeded}</div>
              <div className="text-sm text-slate-400">Succeeded</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-400">{progress.failed}</div>
              <div className="text-sm text-slate-400">Failed</div>
            </div>
          </div>

          {progress.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-red-400 font-medium">Errors:</h4>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 max-h-40 overflow-y-auto">
                {progress.errors.map((error, index) => (
                  <p key={index} className="text-red-400 text-xs font-mono">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audio Files Overview */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Audio Files Overview</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-300">Books with Audio Files</span>
            <span className="text-white font-mono">{stats?.booksWithAudio ?? 0}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-slate-300">Audio Coverage Progress</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats?.audioPercentage ?? 0}%` }}
                ></div>
              </div>
              <span className="text-white font-mono text-sm">{stats?.audioPercentage ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Stats */}
      <div className="flex justify-end">
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
        >
          🔄 Refresh Stats
        </button>
      </div>
    </div>
  );
}