'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioDebugOverlayProps {
  isVisible: boolean;
  onToggle: () => void;
}

interface TimingData {
  audioCurrentTime: number;
  wallClockTime: number;
  drift: number;
  wordIndex: number;
  expectedWordTime?: number;
  actualWordTime?: number;
  syncOffset?: number;
}

export const AudioDebugOverlay: React.FC<AudioDebugOverlayProps> = ({
  isVisible,
  onToggle
}) => {
  const [timingData, setTimingData] = useState<TimingData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const startAudioTimeRef = useRef<number>(0);

  // Find audio element with retry logic
  const findAudioElement = () => {
    const audio = document.querySelector('audio');
    setAudioElement(audio as HTMLAudioElement);
    
    if (audio) {
      console.log('🎵 DEBUG: Found audio element', {
        src: audio.src,
        currentTime: audio.currentTime,
        duration: audio.duration,
        paused: audio.paused
      });
    } else {
      console.log('⚠️ DEBUG: No audio element found yet');
    }
    return audio;
  };

  // Find audio element on mount and when overlay becomes visible
  useEffect(() => {
    findAudioElement();
  }, []);

  useEffect(() => {
    if (isVisible) {
      findAudioElement();
    }
  }, [isVisible]);

  const startMonitoring = () => {
    const currentAudio = findAudioElement();
    if (!currentAudio) {
      console.log('❌ DEBUG: No audio element found for monitoring');
      return;
    }

    console.log('🧪 DEBUG: Starting timing monitor');
    console.log(`🎤 Audio status: ${currentAudio.paused ? 'PAUSED' : 'PLAYING'}`);
    setIsMonitoring(true);
    setTimingData([]);
    startTimeRef.current = performance.now();
    startAudioTimeRef.current = currentAudio.currentTime;

    intervalRef.current = setInterval(() => {
      const audio = findAudioElement();
      if (!audio) {
        console.log('⚠️ Audio element lost during monitoring');
        return;
      }
      
      const wallClockElapsed = (performance.now() - startTimeRef.current) / 1000;
      const audioElapsed = audio.currentTime - startAudioTimeRef.current;
      const drift = Math.abs(wallClockElapsed - audioElapsed);

      const newData: TimingData = {
        audioCurrentTime: audio.currentTime,
        wallClockTime: wallClockElapsed,
        drift: drift * 1000, // Convert to ms
        wordIndex: -1 // Will be updated if word highlighting is active
      };

      console.log('📊 DEBUG TIMING:', {
        audioTime: `${audio.currentTime.toFixed(3)}s`,
        wallClock: `${wallClockElapsed.toFixed(3)}s`,
        drift: `${(drift * 1000).toFixed(1)}ms`,
        driftStatus: drift < 0.05 ? '✅ Accurate' : '⚠️ Drift detected',
        playing: !audio.paused
      });

      setTimingData(prev => [...prev.slice(-9), newData]); // Keep last 10 readings
    }, 200);
  };

  const stopMonitoring = () => {
    console.log('🛑 DEBUG: Stopping timing monitor');
    setIsMonitoring(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const testAudioAccuracy = () => {
    console.log('🎯 DEBUG: Starting audio accuracy test...');
    
    const currentAudio = findAudioElement();
    if (!currentAudio) {
      console.log('❌ DEBUG: No audio element for accuracy test');
      return;
    }

    if (currentAudio.paused) {
      console.log('⚠️ DEBUG: Audio is paused - test may not be accurate');
    }

    console.log('🎯 DEBUG: Running 5-second audio accuracy test');
    const startTime = performance.now();
    const startAudioTime = currentAudio.currentTime;
    
    console.log(`📊 Test starting at audio time: ${startAudioTime.toFixed(3)}s`);

    setTimeout(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const audioElapsed = currentAudio.currentTime - startAudioTime;
      const drift = Math.abs(elapsed - audioElapsed);

      console.log('⏱️ AUDIO ACCURACY TEST RESULTS:');
      console.log(`Wall clock elapsed: ${elapsed.toFixed(3)}s`);
      console.log(`Audio time elapsed: ${audioElapsed.toFixed(3)}s`);
      console.log(`Timing drift: ${(drift * 1000).toFixed(1)}ms`);
      console.log(`Status: ${drift < 0.05 ? '✅ Accurate' : '⚠️ Significant drift'}`);
      
      if (drift > 0.1) {
        console.log('🚨 WARNING: High audio timing drift detected - this may cause sync issues');
      }
      
      if (currentAudio.paused) {
        console.log('⚠️ Audio was paused during test - results may be inaccurate');
      }
    }, 5000);
  };

  const logCurrentState = () => {
    console.log('🔍 DEBUG: Logging current state...');
    
    // Always try to find audio element first
    const currentAudio = findAudioElement();
    
    if (!currentAudio) {
      console.log('❌ DEBUG: No audio element found in DOM');
      console.log('🔍 Available elements:', {
        allAudio: document.querySelectorAll('audio').length,
        allVideos: document.querySelectorAll('video').length,
        mediaElements: document.querySelectorAll('audio, video').length
      });
      return;
    }

    // Get InstantAudioPlayer state from window if available
    const playerState = (window as any).__audioPlayerDebug || {};

    console.log('📋 CURRENT AUDIO STATE:');
    console.log('Audio Element:', {
      currentTime: currentAudio.currentTime,
      duration: currentAudio.duration,
      paused: currentAudio.paused,
      src: currentAudio.src,
      readyState: currentAudio.readyState,
      networkState: currentAudio.networkState,
      volume: currentAudio.volume,
      muted: currentAudio.muted
    });

    console.log('Player State:', playerState);

    // Log highlighted words if available
    const highlightedElements = document.querySelectorAll('.bg-yellow-200, .bg-blue-200, [data-highlighted="true"], [class*="highlight"]');
    console.log(`Currently highlighted elements: ${highlightedElements.length}`);
    
    if (highlightedElements.length > 0) {
      console.log('Highlighted text:', Array.from(highlightedElements).map(el => el.textContent).join(' '));
    } else {
      console.log('🔍 Checking for any colored text elements...');
      const coloredElements = document.querySelectorAll('[class*="bg-"], [style*="background"]');
      console.log(`Found ${coloredElements.length} colored elements`);
    }
  };

  const testWordTiming = () => {
    console.log('🎯 DEBUG: Testing word timing accuracy');
    console.log('👀 Watch console for word highlighting events');
    console.log('🎵 Listen to audio and note if highlighting matches speech');
    
    const currentAudio = findAudioElement();
    if (!currentAudio) {
      console.log('❌ No audio element found for word timing test');
      return;
    }
    
    console.log(`🎤 Audio status: ${currentAudio.paused ? 'PAUSED' : 'PLAYING'} at ${currentAudio.currentTime.toFixed(3)}s`);
    
    // Monitor word highlighting changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target as Element;
          if (target.classList.contains('bg-yellow-200') || 
              target.classList.contains('bg-blue-200') || 
              target.hasAttribute('data-highlighted')) {
            const wordText = target.textContent?.trim();
            const audioTime = currentAudio.currentTime;
            
            console.log(`🎯 WORD HIGHLIGHTED: "${wordText}" at audio time ${audioTime.toFixed(3)}s`);
          }
        }
      });
    });

    // Watch for highlighting changes in multiple possible containers
    const possibleContainers = [
      '[data-testid="word-highlighter"]',
      '.prose', 
      'main', 
      '[class*="content"]',
      '[class*="text"]'
    ];
    
    let containerFound = false;
    possibleContainers.forEach(selector => {
      const container = document.querySelector(selector);
      if (container) {
        console.log(`📍 Watching container: ${selector}`);
        observer.observe(container, {
          attributes: true,
          attributeFilter: ['class', 'data-highlighted', 'style'],
          subtree: true
        });
        containerFound = true;
      }
    });
    
    if (!containerFound) {
      console.log('⚠️ No suitable container found, watching entire document');
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-highlighted', 'style'],
        subtree: true
      });
    }

    // Stop observing after 30 seconds
    setTimeout(() => {
      observer.disconnect();
      console.log('🛑 Word timing test complete (30 seconds)');
    }, 30000);
    
    console.log('⏰ Word timing test will run for 30 seconds...');
  };

  const adjustSyncOffset = (delta: number) => {
    console.log(`🔧 DEBUG: Attempting to adjust sync offset by ${delta > 0 ? '+' : ''}${(delta * 1000).toFixed(0)}ms`);
    console.log('📝 Note: You need to modify AUDIO_SYNC_OFFSET in InstantAudioPlayer.tsx and reload');
    console.log(`📂 File: /components/audio/InstantAudioPlayer.tsx, line ~70`);
    console.log(`🔧 Change: const AUDIO_SYNC_OFFSET = ${(0.15 + delta).toFixed(2)};`);
    console.log('💡 Current sync offset recommendations:');
    if (delta > 0) {
      console.log('   - Highlighting is AHEAD of voice → Need MORE delay');
      console.log('   - Increase AUDIO_SYNC_OFFSET to slow down highlighting');
    } else {
      console.log('   - Highlighting is BEHIND voice → Need LESS delay');
      console.log('   - Decrease AUDIO_SYNC_OFFSET to speed up highlighting');
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-2 rounded-full shadow-lg hover:bg-red-600 transition-colors z-50"
        title="Open Audio Debug Tools"
      >
        🐛
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 right-4 bg-white border-2 border-red-500 rounded-lg shadow-xl p-4 max-w-sm z-50"
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-red-600">🐛 Audio Debug</h3>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          {/* Audio State */}
          <div className="text-xs bg-gray-50 p-2 rounded">
            <div>Audio: {audioElement ? '✅ Found' : '❌ Not found'}</div>
            {audioElement && (
              <>
                <div>Time: {audioElement.currentTime.toFixed(2)}s</div>
                <div>Status: {audioElement.paused ? '⏸️ Paused' : '▶️ Playing'}</div>
              </>
            )}
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔍 DEBUG: Log State button clicked');
                logCurrentState();
              }}
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
            >
              Log State
            </button>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('✅ DEBUG: Test button works! Component is functional.');
                alert('Debug component is working!');
              }}
              className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
            >
              Test
            </button>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🧪 DEBUG: Test Audio button clicked');
                testAudioAccuracy();
              }}
              className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test Audio
            </button>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🔄 DEBUG: ${isMonitoring ? 'Stop Monitor' : 'Monitor Timing'} button clicked`);
                if (isMonitoring) {
                  stopMonitoring();
                } else {
                  startMonitoring();
                }
              }}
              className={`px-2 py-1 rounded text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                isMonitoring 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              {isMonitoring ? 'Stop Monitor' : 'Monitor Timing'}
            </button>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📝 DEBUG: Test Words button clicked');
                testWordTiming();
              }}
              className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test Words
            </button>
          </div>

          {/* Sync Offset Controls */}
          <div className="border-t pt-2">
            <div className="text-xs text-gray-600 mb-1">Sync Offset Hints:</div>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('➕ DEBUG: +50ms offset button clicked');
                  adjustSyncOffset(0.05);
                }}
                className="bg-orange-400 text-white px-2 py-1 rounded text-xs hover:bg-orange-500"
                title="If highlighting is ahead of voice"
              >
                +50ms
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('➖ DEBUG: -50ms offset button clicked');
                  adjustSyncOffset(-0.05);
                }}
                className="bg-cyan-400 text-white px-2 py-1 rounded text-xs hover:bg-cyan-500"
                title="If highlighting is behind voice"
              >
                -50ms
              </button>
            </div>
          </div>

          {/* Timing Data */}
          {isMonitoring && timingData.length > 0 && (
            <div className="border-t pt-2">
              <div className="text-xs text-gray-600 mb-1">Timing Drift:</div>
              <div className="text-xs max-h-20 overflow-y-auto space-y-1">
                {timingData.slice(-3).map((data, i) => (
                  <div key={i} className={`p-1 rounded ${
                    data.drift < 50 ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {data.drift.toFixed(0)}ms drift
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 border-t pt-1">
            Check browser console for detailed logs
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};