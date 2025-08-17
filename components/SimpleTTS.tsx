'use client';

import { useState, useEffect, useRef } from 'react';

interface SimpleTTSProps {
  content: string;
  isPlaying?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
  onPageComplete?: () => void; // New: Called when page reading is complete
  enableAutoAdvance?: boolean; // New: Enable auto-advance to next page
  speechRate?: number; // New: Speed control from parent
}

export function SimpleTTS({ 
  content, 
  isPlaying = false, 
  onPlayStateChange,
  onPageComplete,
  enableAutoAdvance = true,
  speechRate = 1.0
}: SimpleTTSProps) {
  const [playing, setPlaying] = useState(isPlaying);
  const [supported, setSupported] = useState(false);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(enableAutoAdvance);
  // Remove local speechRate state, use prop instead
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check Web Speech API support
  useEffect(() => {
    console.log('SimpleTTS mounting, checking support...', { content: content?.length, supported });
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      console.log('Web Speech API supported');
      setSupported(true);
    } else {
      console.log('Web Speech API not supported');
    }
  }, []);

  // Handle external play state changes
  useEffect(() => {
    if (isPlaying !== playing) {
      if (isPlaying) {
        handlePlay();
      } else {
        handleStop();
      }
    }
  }, [isPlaying]);

  const handlePlay = () => {
    if (!supported || !content) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.rate = speechRate; // Use current speech rate
    utterance.volume = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setPlaying(true);
      onPlayStateChange?.(true);
    };

    utterance.onend = () => {
      setPlaying(false);
      onPlayStateChange?.(false);
      
      // Auto-advance to next page if enabled
      if (autoAdvanceEnabled && onPageComplete) {
        // Small delay to make transition smooth
        setTimeout(() => {
          onPageComplete();
        }, 100);
      }
    };

    utterance.onerror = () => {
      setPlaying(false);
      onPlayStateChange?.(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePause = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setPlaying(false);
      onPlayStateChange?.(false);
    }
  };

  const handleResume = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPlaying(true);
      onPlayStateChange?.(true);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    onPlayStateChange?.(false);
  };

  const togglePlayback = () => {
    if (!supported) return;

    if (playing) {
      if (window.speechSynthesis.paused) {
        handleResume();
      } else {
        handlePause();
      }
    } else {
      if (window.speechSynthesis.paused) {
        handleResume();
      } else {
        handlePlay();
      }
    }
  };

  if (!supported) {
    return (
      <div className="text-sm text-gray-500 italic">
        TTS not supported
      </div>
    );
  }

  console.log('SimpleTTS rendering button', { supported, content: content?.length, playing });

  return (
    <button
      onClick={(e) => {
        console.log('TTS button clicked!', { playing, content: content?.length });
        togglePlayback();
      }}
      disabled={!content}
      style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        backgroundColor: playing ? '#667eea' : '#475569',
        color: 'white',
        border: playing ? 'none' : '2px solid #64748b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: !content ? 'not-allowed' : 'pointer',
        fontSize: '20px',
        fontWeight: 'bold',
        boxShadow: playing ? '0 6px 16px rgba(102, 126, 234, 0.4)' : '0 4px 8px rgba(0,0,0,0.2)',
        transition: 'all 0.2s ease',
        opacity: !content ? 0.5 : 1
      }}
      onMouseEnter={(e) => {
        if (!playing && content) {
          e.currentTarget.style.backgroundColor = '#d1d5db';
        }
      }}
      onMouseLeave={(e) => {
        if (!playing) {
          e.currentTarget.style.backgroundColor = '#e5e7eb';
        }
      }}
      aria-label={playing ? 'Pause reading' : 'Start reading'}
    >
      {playing ? '⏸️' : '▶️'}
    </button>
  );
}