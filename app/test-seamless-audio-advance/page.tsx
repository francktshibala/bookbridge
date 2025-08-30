'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

// Test chunks for seamless audio advance testing
const TEST_CHUNKS = [
  {
    id: 0,
    text: "Welcome to the seamless audio test. This is chunk one with some sample text for testing audio transitions.",
    simplified: "This is a simplified A1/A2 version. Welcome to the easy audio test. This is part one with simple words."
  },
  {
    id: 1, 
    text: "This is the second chunk. We are testing how quickly audio continues when moving between chunks automatically.",
    simplified: "This is part two. We test how fast audio plays when moving between parts."
  },
  {
    id: 2,
    text: "Here comes the third chunk. The goal is to eliminate any gaps or delays during auto-advance transitions.",
    simplified: "Here is part three. We want no waiting time when moving to next parts."
  },
  {
    id: 3,
    text: "Final test chunk. If seamless advance works correctly, there should be no perceivable pause between chunks.",
    simplified: "Last part. If it works well, there should be no pause between parts."
  }
];

interface GapMetrics {
  chunkEndTime: number;
  nextChunkStartTime: number;
  gapDuration: number;
  prefetchHitRate: number;
  disclaimerCount: number;
}

export default function TestSeamlessAudioAdvance() {
  const [currentChunk, setCurrentChunk] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<'original' | 'simplified'>('original');
  const [useOptimizedFlow, setUseOptimizedFlow] = useState(false);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [metrics, setMetrics] = useState<GapMetrics[]>([]);
  const [currentGapStart, setCurrentGapStart] = useState<number | null>(null);
  const [prefetchedChunks, setPrefetchedChunks] = useState<Set<number>>(new Set());
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gapTimerRef = useRef<number | null>(null);

  // Simulate current auto-advance with delays
  const handleChunkCompleteWithDelays = useCallback(() => {
    if (!autoAdvanceEnabled || currentChunk >= TEST_CHUNKS.length - 1) {
      setIsPlaying(false);
      return;
    }

    console.log('🕐 CURRENT FLOW: Starting delays...');
    setCurrentGapStart(Date.now());
    
    // Current implementation delays (500ms + 800ms)
    setTimeout(() => {
      console.log('🕐 CURRENT FLOW: Navigating after 500ms delay');
      setCurrentChunk(prev => prev + 1);
      
      setTimeout(() => {
        console.log('🕐 CURRENT FLOW: Resuming after 800ms delay');
        const gapEnd = Date.now();
        if (currentGapStart) {
          const gapDuration = gapEnd - currentGapStart;
          console.log(`🕐 CURRENT FLOW: Total gap measured: ${gapDuration}ms`);
          
          setMetrics(prev => [...prev, {
            chunkEndTime: currentGapStart,
            nextChunkStartTime: gapEnd,
            gapDuration,
            prefetchHitRate: prefetchedChunks.has(currentChunk + 1) ? 100 : 0,
            disclaimerCount: countDisclaimers()
          }]);
        }
        setCurrentGapStart(null);
        setIsPlaying(true);
      }, 800);
    }, 500);
  }, [currentChunk, autoAdvanceEnabled, currentGapStart, prefetchedChunks]);

  // Optimized seamless auto-advance
  const handleChunkCompleteSeamless = useCallback(() => {
    if (!autoAdvanceEnabled || currentChunk >= TEST_CHUNKS.length - 1) {
      setIsPlaying(false);
      return;
    }

    console.log('⚡ OPTIMIZED FLOW: Starting seamless transition...');
    const gapStart = Date.now();
    
    // Check if next chunk is prefetched
    const nextChunkId = currentChunk + 1;
    const isPrefetched = prefetchedChunks.has(nextChunkId);
    
    // Immediate navigation with no delays
    setCurrentChunk(nextChunkId);
    
    // Simulate prefetch hit (instant) vs miss (100ms delay)
    const audioDelay = isPrefetched ? 0 : 100;
    
    setTimeout(() => {
      const gapEnd = Date.now();
      const gapDuration = gapEnd - gapStart;
      console.log(`⚡ OPTIMIZED FLOW: Gap measured: ${gapDuration}ms (prefetch hit: ${isPrefetched})`);
      
      setMetrics(prev => [...prev, {
        chunkEndTime: gapStart,
        nextChunkStartTime: gapEnd,
        gapDuration,
        prefetchHitRate: isPrefetched ? 100 : 0,
        disclaimerCount: countDisclaimers()
      }]);
      
      // Audio continues seamlessly
      setIsPlaying(true);
    }, audioDelay);
  }, [currentChunk, autoAdvanceEnabled, prefetchedChunks]);

  // Simulate prefetching next chunk
  const simulatePrefetch = useCallback(() => {
    if (currentChunk < TEST_CHUNKS.length - 1) {
      const nextChunkId = currentChunk + 1;
      console.log(`📦 PREFETCH: Simulating prefetch for chunk ${nextChunkId}`);
      
      // Simulate 80% prefetch success rate
      const prefetchSuccess = Math.random() > 0.2;
      if (prefetchSuccess) {
        setPrefetchedChunks(prev => new Set([...prev, nextChunkId]));
        console.log(`📦 PREFETCH: Chunk ${nextChunkId} prefetched successfully`);
      } else {
        console.log(`📦 PREFETCH: Chunk ${nextChunkId} prefetch failed`);
      }
    }
  }, [currentChunk]);

  // Count disclaimer occurrences
  const countDisclaimers = useCallback(() => {
    let count = 0;
    for (let i = 0; i <= currentChunk; i++) {
      const text = mode === 'simplified' ? TEST_CHUNKS[i]?.simplified : TEST_CHUNKS[i]?.text;
      if (text?.includes('simplified A1/A2') || text?.includes('This is a simplified')) {
        count++;
      }
    }
    return count;
  }, [currentChunk, mode]);

  // Get current content with disclaimer logic
  const getCurrentContent = () => {
    const chunk = TEST_CHUNKS[currentChunk];
    if (!chunk) return '';
    
    let content = mode === 'simplified' ? chunk.simplified : chunk.text;
    
    // Test disclaimer suppression (show only on first chunk)
    if (mode === 'simplified' && currentChunk > 0) {
      content = content.replace(/This is a simplified A1\/A2.*?\./g, '').trim();
    }
    
    return content;
  };

  // Start playback simulation
  const startPlayback = () => {
    setIsPlaying(true);
    simulatePrefetch();
    
    // Simulate chunk duration (5 seconds for testing)
    setTimeout(() => {
      if (useOptimizedFlow) {
        handleChunkCompleteSeamless();
      } else {
        handleChunkCompleteWithDelays();
      }
    }, 5000);
  };

  // Calculate average gap time
  const averageGap = metrics.length > 0 
    ? metrics.reduce((sum, m) => sum + m.gapDuration, 0) / metrics.length 
    : 0;

  // Calculate prefetch hit rate
  const prefetchHitRate = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.prefetchHitRate, 0) / metrics.length
    : 0;

  // Reset test
  const resetTest = () => {
    setCurrentChunk(0);
    setIsPlaying(false);
    setMetrics([]);
    setPrefetchedChunks(new Set());
    setCurrentGapStart(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          🎧 Seamless Audio Advance Testing
        </h1>

        {/* Test Configuration */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Flow Type</label>
              <button
                onClick={() => setUseOptimizedFlow(!useOptimizedFlow)}
                className={`w-full p-3 rounded-lg font-medium transition-colors ${
                  useOptimizedFlow 
                    ? 'bg-green-600 text-white' 
                    : 'bg-red-600 text-white'
                }`}
              >
                {useOptimizedFlow ? '⚡ Optimized (No Delays)' : '🕐 Current (With Delays)'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Content Mode</label>
              <button
                onClick={() => setMode(mode === 'original' ? 'simplified' : 'original')}
                className={`w-full p-3 rounded-lg font-medium transition-colors ${
                  mode === 'simplified' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 text-white'
                }`}
              >
                {mode === 'simplified' ? '📝 Simplified' : '📖 Original'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Auto-Advance</label>
              <button
                onClick={() => setAutoAdvanceEnabled(!autoAdvanceEnabled)}
                className={`w-full p-3 rounded-lg font-medium transition-colors ${
                  autoAdvanceEnabled 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-600 text-white'
                }`}
              >
                {autoAdvanceEnabled ? '✅ Enabled' : '❌ Disabled'}
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={isPlaying ? () => setIsPlaying(false) : startPlayback}
              disabled={isPlaying}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 p-4 rounded-lg font-medium transition-colors"
            >
              {isPlaying ? '⏸ Playing...' : '▶ Start Test'}
            </button>
            
            <button
              onClick={resetTest}
              className="bg-gray-600 hover:bg-gray-700 px-6 py-4 rounded-lg font-medium transition-colors"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Current Content Display */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Chunk {currentChunk + 1} of {TEST_CHUNKS.length}
            </h2>
            <div className="flex gap-2">
              {prefetchedChunks.has(currentChunk + 1) && (
                <span className="bg-green-600 text-xs px-2 py-1 rounded">
                  📦 Next Prefetched
                </span>
              )}
              {mode === 'simplified' && currentChunk === 0 && (
                <span className="bg-yellow-600 text-xs px-2 py-1 rounded">
                  ⚠️ Disclaimer Shown
                </span>
              )}
            </div>
          </div>
          
          <div className="text-lg leading-relaxed p-4 bg-slate-700 rounded">
            {getCurrentContent()}
          </div>

          {isPlaying && (
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1 bg-slate-700 rounded-full h-2">
                <motion.div
                  className="bg-blue-500 h-2 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                />
              </div>
              <span className="text-sm text-slate-400">5s chunk</span>
            </div>
          )}
        </div>

        {/* Real-time Metrics */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">📊 Real-time Metrics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">
                {averageGap.toFixed(0)}ms
              </div>
              <div className="text-sm text-slate-400">Average Gap</div>
              <div className="text-xs text-slate-500">
                Target: &lt;200ms
              </div>
            </div>

            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">
                {prefetchHitRate.toFixed(0)}%
              </div>
              <div className="text-sm text-slate-400">Prefetch Hit Rate</div>
              <div className="text-xs text-slate-500">
                Target: &gt;80%
              </div>
            </div>

            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">
                {metrics.length}
              </div>
              <div className="text-sm text-slate-400">Transitions</div>
              <div className="text-xs text-slate-500">
                Test runs
              </div>
            </div>

            <div className="bg-slate-700 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {countDisclaimers()}
              </div>
              <div className="text-sm text-slate-400">Disclaimers</div>
              <div className="text-xs text-slate-500">
                Target: 1 (first page only)
              </div>
            </div>
          </div>

          {/* Live Gap Timer */}
          {currentGapStart && (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="text-red-400 font-mono text-xl">
                  {Date.now() - currentGapStart}ms
                </div>
                <div className="text-sm text-red-300">
                  🔴 Gap in progress... (measuring transition time)
                </div>
              </div>
            </div>
          )}

          {/* Success/Failure Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${
              averageGap < 200 ? 'bg-green-900/30 border-green-500' : 'bg-red-900/30 border-red-500'
            } border`}>
              <div className="font-medium">
                {averageGap < 200 ? '✅ Gap Target Met' : '❌ Gap Too High'}
              </div>
              <div className="text-sm opacity-80">
                {averageGap < 200 
                  ? `${averageGap.toFixed(0)}ms is under 200ms target`
                  : `${averageGap.toFixed(0)}ms exceeds 200ms target`
                }
              </div>
            </div>

            <div className={`p-4 rounded-lg ${
              countDisclaimers() <= 1 ? 'bg-green-900/30 border-green-500' : 'bg-red-900/30 border-red-500'
            } border`}>
              <div className="font-medium">
                {countDisclaimers() <= 1 ? '✅ Disclaimer Policy Met' : '❌ Too Many Disclaimers'}
              </div>
              <div className="text-sm opacity-80">
                {countDisclaimers() <= 1
                  ? 'Disclaimer appears only on first page'
                  : `${countDisclaimers()} disclaimers found (should be 1)`
                }
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics History */}
        {metrics.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📈 Transition History</h2>
            
            <div className="space-y-2">
              {metrics.map((metric, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg ${
                    metric.gapDuration < 200 ? 'bg-green-900/20' : 'bg-red-900/20'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      Transition {index + 1}: Chunk {index} → {index + 1}
                    </span>
                    <div className="flex gap-4 text-sm">
                      <span className={`font-mono ${
                        metric.gapDuration < 200 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {metric.gapDuration}ms gap
                      </span>
                      <span className={`${
                        metric.prefetchHitRate > 0 ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        {metric.prefetchHitRate > 0 ? '📦 Prefetched' : '⏳ Generated'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Statistics */}
            <div className="mt-6 pt-4 border-t border-slate-600">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-400">
                    {metrics.length > 0 ? Math.min(...metrics.map(m => m.gapDuration)) : 0}ms
                  </div>
                  <div className="text-xs text-slate-400">Best Gap</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-orange-400">
                    {metrics.length > 0 ? Math.max(...metrics.map(m => m.gapDuration)) : 0}ms
                  </div>
                  <div className="text-xs text-slate-400">Worst Gap</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-400">
                    {averageGap.toFixed(0)}ms
                  </div>
                  <div className="text-xs text-slate-400">Average Gap</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-400">
                    {prefetchHitRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-400">Prefetch Success</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Testing Instructions */}
        <div className="mt-8 bg-blue-900/20 border border-blue-500 rounded-lg p-6">
          <h3 className="font-semibold mb-2">🧪 Testing Instructions</h3>
          <div className="text-sm space-y-2 opacity-90">
            <p><strong>1. Test Current Flow:</strong> Click "Start Test" with "Current (With Delays)" to measure existing gaps</p>
            <p><strong>2. Test Optimized Flow:</strong> Switch to "Optimized (No Delays)" and run again</p>
            <p><strong>3. Compare Results:</strong> Look for gap reduction from ~1300ms to &lt;200ms</p>
            <p><strong>4. Test Disclaimer:</strong> Switch to "Simplified" mode and verify disclaimer only on chunk 1</p>
            <p><strong>5. Validate Metrics:</strong> Ensure prefetch hit rate &gt;80% and gaps &lt;200ms</p>
          </div>
        </div>

        {/* Manual Navigation */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={() => setCurrentChunk(Math.max(0, currentChunk - 1))}
            disabled={currentChunk === 0 || isPlaying}
            className="bg-slate-600 hover:bg-slate-700 disabled:bg-slate-800 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            ⬅ Previous
          </button>
          
          <div className="bg-slate-700 px-6 py-3 rounded-lg flex items-center">
            {currentChunk + 1} / {TEST_CHUNKS.length}
          </div>
          
          <button
            onClick={() => setCurrentChunk(Math.min(TEST_CHUNKS.length - 1, currentChunk + 1))}
            disabled={currentChunk === TEST_CHUNKS.length - 1 || isPlaying}
            className="bg-slate-600 hover:bg-slate-700 disabled:bg-slate-800 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Next ➡
          </button>
        </div>
      </div>
    </div>
  );
}