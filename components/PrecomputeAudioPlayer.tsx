'use client';

import React, { useState, useRef, useEffect } from 'react';

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface PrecomputeAudioPlayerProps {
  bookId: string;
  cefrLevel: string;
  chunkIndex: number;
  voiceId?: string;
  onWordHighlight?: (wordIndex: number) => void;
  onChunkComplete?: () => void;
  className?: string;
}

export function PrecomputeAudioPlayer({
  bookId,
  cefrLevel,
  chunkIndex,
  voiceId = 'alloy',
  onWordHighlight,
  onChunkComplete,
  className = ''
}: PrecomputeAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [wordTimings, setWordTimings] = useState<WordTiming[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load audio for current chunk
  const loadAudio = async () => {
    if (!audioRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/precompute/tts?bookId=${bookId}&cefrLevel=${cefrLevel}&chunkIndex=${chunkIndex}&voiceId=${voiceId}`
      );

      if (!response.ok) {
        // Fallback: audio not precomputed yet - this is expected
        console.log(`🎵 No precomputed audio for ${bookId} chunk ${chunkIndex}, falling back to live TTS`);
        setError(null); // Clear error, we'll handle this gracefully
        setLoading(false);
        return;
      }

      // Get word timings from headers
      const timingsHeader = response.headers.get('X-Word-Timings');
      if (timingsHeader) {
        setWordTimings(JSON.parse(timingsHeader));
      }

      const durationHeader = response.headers.get('X-Duration');
      if (durationHeader) {
        setDuration(parseFloat(durationHeader));
      }

      // Create audio URL from blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      audioRef.current.src = audioUrl;
      audioRef.current.load();

    } catch (error) {
      console.error('Failed to load audio:', error);
      setError(error instanceof Error ? error.message : 'Failed to load audio');
    } finally {
      setLoading(false);
    }
  };

  // Update current word based on playback time
  const updateCurrentWord = () => {
    if (!audioRef.current || wordTimings.length === 0) return;

    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    // Find current word
    const wordIndex = wordTimings.findIndex((timing, index) => {
      return time >= timing.start && time <= timing.end;
    });

    if (wordIndex !== -1 && wordIndex !== currentWordIndex) {
      setCurrentWordIndex(wordIndex);
      onWordHighlight?.(wordIndex);
    }
  };

  // Start playback tracking
  const startTracking = () => {
    intervalRef.current = setInterval(updateCurrentWord, 100); // Update every 100ms
  };

  // Stop playback tracking
  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  };

  // Handle play/pause
  const togglePlayback = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopTracking();
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        startTracking();
      } catch (error) {
        console.error('Playback failed:', error);
        setError('Playback failed');
      }
    }
  };

  // Seek to specific time
  const seekTo = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Handle audio events
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentWordIndex(-1);
    stopTracking();
    onChunkComplete?.();
  };

  const handleAudioError = () => {
    setError('Audio playback error');
    setIsPlaying(false);
    stopTracking();
  };

  // Load audio when component mounts or props change
  useEffect(() => {
    loadAudio();
  }, [bookId, cefrLevel, chunkIndex, voiceId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
      if (audioRef.current?.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  return (
    <div className={`audio-player ${className}`}>
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        preload="metadata"
        style={{ display: 'none' }}
      />

      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayback}
          disabled={loading || error !== null}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            loading 
              ? 'bg-gray-300 cursor-not-allowed' 
              : error
              ? 'bg-red-100 cursor-not-allowed'
              : isPlaying 
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          ) : error ? (
            <span className="text-red-500 text-xs">!</span>
          ) : isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Progress Bar */}
        <div className="flex-1">
          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full cursor-pointer"
                 onClick={(e) => {
                   const rect = e.currentTarget.getBoundingClientRect();
                   const pos = (e.clientX - rect.left) / rect.width;
                   seekTo(pos * duration);
                 }}>
              <div 
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>

          {/* Time Display */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed Control */}
        <select 
          className="text-sm border rounded px-2 py-1"
          defaultValue="1"
          onChange={(e) => {
            if (audioRef.current) {
              audioRef.current.playbackRate = parseFloat(e.target.value);
            }
          }}
        >
          <option value="0.75">0.75x</option>
          <option value="1">1x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
        </select>
      </div>

      {/* Status Display */}
      {error && (
        <div className={`mt-2 p-2 border rounded text-sm ${
          error.includes('generated live') 
            ? 'bg-blue-50 border-blue-200 text-blue-600' 
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {error}
          {!error.includes('generated live') && (
            <button 
              onClick={loadAudio}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-400">
          Chunk {chunkIndex} | Words: {wordTimings.length} | Current: {currentWordIndex}
        </div>
      )}
    </div>
  );
}

// Helper function to format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}