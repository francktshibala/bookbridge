'use client';

/**
 * Test Component for useTextHighlighting Hook - Step 1.3 Validation
 * Tests the hook with simulated audio element and real audio controls
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTextHighlighting } from '@/hooks/useTextHighlighting';
import { HighlightableText } from '@/components/HighlightableText';
import { VoiceProvider } from '@/lib/voice-service';

const sampleText = `The green light in The Great Gatsby represents Gatsby's hope and longing for Daisy. Fitzgerald uses this symbol to explore themes of desire, dreams, and the American Dream itself.

When Gatsby reaches toward the light, he's reaching for something that seems achievable but remains forever out of grasp. This reflects the broader theme of how our dreams can be both inspiring and ultimately elusive.`;

export const TextHighlightingHookTest: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('openai');
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [estimatedDuration] = useState(25); // 25 second sample
  
  // Refs for stable access in intervals
  const isPlayingRef = useRef(false);
  const playbackRateRef = useRef(1.0);
  
  // Simulate audio element
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Update refs when state changes
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  // Create mock audio element for testing
  useEffect(() => {
    // Create a proper mock audio element with writable properties
    const mockAudio = {
      currentTime: 0,
      duration: estimatedDuration,
      paused: true,
      play: () => Promise.resolve(),
      pause: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      src: ''
    } as HTMLAudioElement;
    
    // Override currentTime to be writable
    let _currentTime = 0;
    Object.defineProperty(mockAudio, 'currentTime', {
      get: () => _currentTime,
      set: (value: number) => { _currentTime = value; },
      enumerable: true,
      configurable: true
    });
    
    // Override paused to be writable
    let _paused = true;
    Object.defineProperty(mockAudio, 'paused', {
      get: () => _paused,
      set: (value: boolean) => { _paused = value; },
      enumerable: true,
      configurable: true
    });
    
    audioRef.current = mockAudio;
    setAudioElement(mockAudio);
    
    return () => {
      // Cleanup
    };
  }, [estimatedDuration]);

  // Use the highlighting hook
  const {
    tokens,
    currentWordId,
    currentTime,
    progress,
    onWordClick,
    seekToWord,
    isHighlightingEnabled
  } = useTextHighlighting({
    text: sampleText,
    audioElement,
    isPlaying,
    isPaused,
    voiceProvider,
    playbackRate,
    estimatedDuration
  });

  // Simulate audio playback
  const startPlayback = async () => {
    if (!audioElement) return;
    
    setIsPlaying(true);
    setIsPaused(false);
    
    try {
      // Update mock audio state
      (audioElement as any).paused = false;
      
      console.log('🎬 Starting mock audio playback simulation...');
      
      // Simulate audio progress
      const startTime = Date.now();
      const simulationInterval = setInterval(() => {
        // Check if we should still be playing using ref
        if (!isPlayingRef.current) {
          console.log('🛑 Stopping simulation - isPlaying is false');
          clearInterval(simulationInterval);
          return;
        }
        
        const elapsed = (Date.now() - startTime) / 1000;
        const adjustedTime = elapsed * playbackRateRef.current;
        
        if (audioElement) {
          // Simulate currentTime update
          audioElement.currentTime = adjustedTime;
          
          console.log(`⏰ Mock audio currentTime updated to: ${adjustedTime.toFixed(2)}s`);
          
          // Stop at end
          if (adjustedTime >= estimatedDuration) {
            console.log('🏁 Reached end of audio, stopping simulation');
            setIsPlaying(false);
            (audioElement as any).paused = true;
            clearInterval(simulationInterval);
          }
        }
      }, 100);
      
      // Store interval reference so we can clear it
      (audioElement as any)._simulationInterval = simulationInterval;
      
    } catch (error) {
      console.warn('Simulated audio error:', error);
      setIsPlaying(false);
    }
  };

  const pausePlayback = () => {
    console.log('⏸️ Pausing mock audio playback');
    setIsPaused(true);
    setIsPlaying(false);
    if (audioElement) {
      (audioElement as any).paused = true;
      // Clear simulation interval
      if ((audioElement as any)._simulationInterval) {
        clearInterval((audioElement as any)._simulationInterval);
        (audioElement as any)._simulationInterval = null;
      }
    }
  };

  const stopPlayback = () => {
    console.log('⏹️ Stopping mock audio playback');
    setIsPlaying(false);
    setIsPaused(false);
    if (audioElement) {
      audioElement.currentTime = 0;
      (audioElement as any).paused = true;
      // Clear simulation interval
      if ((audioElement as any)._simulationInterval) {
        clearInterval((audioElement as any)._simulationInterval);
        (audioElement as any)._simulationInterval = null;
      }
    }
  };

  const jumpToTime = (time: number) => {
    if (audioElement) {
      audioElement.currentTime = time;
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '900px', 
      margin: '0 auto',
      backgroundColor: 'rgba(26, 32, 44, 0.9)',
      borderRadius: '12px',
      color: '#e2e8f0'
    }}>
      <h2 style={{ marginBottom: '20px', color: '#667eea' }}>
        useTextHighlighting Hook Test (Step 1.3)
      </h2>
      
      {/* Controls */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        backgroundColor: 'rgba(45, 55, 72, 0.7)',
        borderRadius: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px'
      }}>
        {/* Playback Controls */}
        <div>
          <h4 style={{ marginBottom: '10px', color: '#a5b4fc' }}>Playback</h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={startPlayback}
              disabled={isPlaying}
              style={{
                padding: '8px 12px',
                backgroundColor: isPlaying ? '#6b7280' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isPlaying ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              ▶️ Play
            </button>
            
            <button
              onClick={pausePlayback}
              disabled={!isPlaying}
              style={{
                padding: '8px 12px',
                backgroundColor: !isPlaying ? '#6b7280' : '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: !isPlaying ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              ⏸️ Pause
            </button>
            
            <button
              onClick={stopPlayback}
              style={{
                padding: '8px 12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ⏹️ Stop
            </button>
          </div>
        </div>

        {/* Provider Selection */}
        <div>
          <h4 style={{ marginBottom: '10px', color: '#a5b4fc' }}>Voice Provider</h4>
          <select
            value={voiceProvider}
            onChange={(e) => setVoiceProvider(e.target.value as VoiceProvider)}
            style={{
              padding: '6px 10px',
              backgroundColor: 'rgba(45, 55, 72, 0.8)',
              color: '#e2e8f0',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="web-speech">Web Speech</option>
            <option value="openai">OpenAI TTS</option>
            <option value="elevenlabs">ElevenLabs</option>
          </select>
        </div>

        {/* Speed Control */}
        <div>
          <h4 style={{ marginBottom: '10px', color: '#a5b4fc' }}>Speed: {playbackRate}x</h4>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Status Display */}
      <div style={{ 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '10px',
        fontSize: '13px'
      }}>
        <div><strong>Status:</strong> {isPlaying ? '▶️ Playing' : isPaused ? '⏸️ Paused' : '⏹️ Stopped'}</div>
        <div><strong>Time:</strong> {currentTime.toFixed(1)}s / {estimatedDuration}s</div>
        <div><strong>Progress:</strong> {progress.toFixed(1)}%</div>
        <div><strong>Tokens:</strong> {tokens.length}</div>
        <div><strong>Current Word:</strong> {currentWordId ? tokens.find(t => t.id === currentWordId)?.text : 'None'}</div>
        <div><strong>Highlighting:</strong> {isHighlightingEnabled ? '✅ Enabled' : '❌ Disabled'}</div>
      </div>

      {/* Quick time jumps */}
      <div style={{ 
        marginBottom: '20px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '14px', marginRight: '10px' }}>Quick jumps:</span>
        {[0, 5, 10, 15, 20].map(time => (
          <button
            key={time}
            onClick={() => jumpToTime(time)}
            style={{
              padding: '4px 8px',
              backgroundColor: 'rgba(102, 126, 234, 0.3)',
              color: '#e2e8f0',
              border: '1px solid rgba(102, 126, 234, 0.5)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            {time}s
          </button>
        ))}
      </div>

      {/* Highlightable Text */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px', color: '#a5b4fc' }}>
          Highlighted Text (Click words to seek)
        </h3>
        <div style={{
          padding: '20px',
          backgroundColor: 'rgba(45, 55, 72, 0.4)',
          borderRadius: '8px',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          minHeight: '120px'
        }}>
          <HighlightableText
            tokens={tokens}
            currentWordId={currentWordId}
            onWordClick={onWordClick}
            disabled={false}
          />
        </div>
      </div>

      {/* Validation Results */}
      <div style={{ 
        padding: '15px',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        fontSize: '14px'
      }}>
        <strong style={{ color: '#22c55e' }}>✅ Step 1.3 Validation Checklist:</strong>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>✓ Hook generates tokens from text</li>
          <li>✓ Tracking audio progress updates highlighting</li>
          <li>✓ Word clicking triggers seek functionality</li>
          <li>✓ Different voice providers supported</li>
          <li>✓ Playback rate affects timing</li>
          <li>✓ Hook handles play/pause/stop states</li>
        </ul>
        <strong style={{ color: '#22c55e' }}>Next:</strong> Integrate with AudioPlayer component (Step 1.4)
      </div>
    </div>
  );
};

export default TextHighlightingHookTest;