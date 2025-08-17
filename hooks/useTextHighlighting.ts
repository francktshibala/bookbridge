'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WordToken, textTokenizer } from '@/lib/text-tokenizer';
import { VoiceProvider } from '@/lib/voice-service';

export interface UseTextHighlightingProps {
  text: string;
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  isPaused: boolean;
  voiceProvider: VoiceProvider;
  playbackRate: number;
  estimatedDuration: number;
}

export interface UseTextHighlightingReturn {
  tokens: WordToken[];
  currentWordId: string | undefined;
  currentTime: number;
  progress: number;
  onWordClick: (token: WordToken) => void;
  seekToWord: (token: WordToken) => void;
  isHighlightingEnabled: boolean;
}

export const useTextHighlighting = ({
  text,
  audioElement,
  isPlaying,
  isPaused,
  voiceProvider,
  playbackRate,
  estimatedDuration
}: UseTextHighlightingProps): UseTextHighlightingReturn => {
  const [tokens, setTokens] = useState<WordToken[]>([]);
  const [currentWordId, setCurrentWordId] = useState<string | undefined>();
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isHighlightingEnabled, setIsHighlightingEnabled] = useState(true);
  
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const currentWordIdRef = useRef(currentWordId);

  // Update refs when state changes
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentWordIdRef.current = currentWordId;
  }, [currentWordId]);

  // Generate tokens when text or settings change
  useEffect(() => {
    if (!text || !estimatedDuration) {
      setTokens([]);
      return;
    }

    console.log('🔤 Generating tokens for text highlighting...');
    
    // Get provider-optimized settings
    const normalizedProvider = voiceProvider === 'elevenlabs-websocket' ? 'elevenlabs' : voiceProvider as 'web-speech' | 'openai' | 'elevenlabs';
    const providerSettings = textTokenizer.getProviderOptimizedSettings(normalizedProvider, playbackRate);
    
    // Generate tokens with estimated duration
    const newTokens = textTokenizer.tokenizeText(text, estimatedDuration, providerSettings);
    
    console.log(`Generated ${newTokens.length} tokens for ${estimatedDuration}s duration`);
    console.log(`Estimated WPM: ${((newTokens.filter(t => !t.isPunctuation).length / estimatedDuration) * 60).toFixed(0)}`);
    
    setTokens(newTokens);
    setCurrentWordId(undefined);
    setCurrentTime(0);
    setProgress(0);
  }, [text, estimatedDuration, voiceProvider, playbackRate]);

  // Track audio progress and update highlighting - FIXED VERSION
  useEffect(() => {
    // Only start tracking if we're playing and have tokens
    if (!isPlaying || !tokens.length) {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      return;
    }

    // Prevent multiple intervals from being created
    if (updateIntervalRef.current) {
      console.log('⚠️ Interval already exists, skipping...');
      return;
    }

    console.log('▶️ Starting text highlighting tracking...', {
      isPlaying,
      tokensLength: tokens.length,
      hasAudioElement: !!audioElement,
      voiceProvider,
      audioElementPaused: audioElement?.paused,
      audioElementCurrentTime: audioElement?.currentTime
    });

    // For non-web-speech providers, use audio element tracking
    if (voiceProvider !== 'web-speech' && audioElement) {
      console.log('🎵 Using audio element tracking for', voiceProvider, 'element:', audioElement);
      
      updateIntervalRef.current = setInterval(() => {
        // Fixed: Removed audioElement.paused check that was causing Safari/webkit issues
        // The paused property incorrectly returns true even during playback
        if (!audioElement) return;
        
        // Skip only if currentTime is truly invalid (not just 0)
        if (isNaN(audioElement.currentTime)) return;

        const audioCurrentTime = audioElement.currentTime;
        const audioDuration = audioElement.duration || estimatedDuration;
        
        // Log first update to verify interval is running
        if (audioCurrentTime > 0 && audioCurrentTime < 0.5) {
          console.log('🎵 Audio tracking active:', audioCurrentTime);
        }
        
        // Throttle updates to avoid excessive re-renders
        const now = Date.now();
        if (now - lastUpdateTimeRef.current < 100) return; // Max 10 FPS for stability
        lastUpdateTimeRef.current = now;
        
        setCurrentTime(audioCurrentTime);
        setProgress((audioCurrentTime / audioDuration) * 100);
        
        // Find word at current time
        const wordAtTime = textTokenizer.findWordAtTime(tokens, audioCurrentTime);
        if (wordAtTime && wordAtTime.id !== currentWordIdRef.current) {
          setCurrentWordId(wordAtTime.id);
          console.log(`🎯 Audio-synced highlighting: "${wordAtTime.text}" at ${audioCurrentTime.toFixed(1)}s (actual audio position)`);
        }
      }, 100); // Reduced to 10 FPS for stability
    } else {
      // For web-speech or when no audio element, use time-based estimation
      console.log('⏱️ Using time-based estimation tracking');
      
      const startTime = Date.now();
      updateIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000; // seconds
        const adjustedTime = elapsed * playbackRate; // Adjust for playback speed
        
        setCurrentTime(adjustedTime);
        setProgress((adjustedTime / estimatedDuration) * 100);
        
        const wordAtTime = textTokenizer.findWordAtTime(tokens, adjustedTime);
        if (wordAtTime && wordAtTime.id !== currentWordIdRef.current) {
          setCurrentWordId(wordAtTime.id);
          console.log(`🎯 Highlighting: "${wordAtTime.text}" at ${adjustedTime.toFixed(1)}s`);
        }
        
        // Stop when we reach the end
        if (adjustedTime >= estimatedDuration) {
          clearInterval(updateIntervalRef.current!);
          updateIntervalRef.current = null;
        }
      }, 200); // Slower for web speech stability
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [isPlaying, tokens.length, voiceProvider, audioElement]); // Added audioElement dependency


  // Reset when audio stops
  useEffect(() => {
    if (!isPlaying && !isPaused) {
      setCurrentTime(0);
      setProgress(0);
      setCurrentWordId(undefined);
      
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    }
  }, [isPlaying, isPaused]);

  // Seek to specific word
  const seekToWord = useCallback((token: WordToken) => {
    if (!audioElement || !isHighlightingEnabled) return;

    console.log(`🎯 Seeking to word: "${token.text}" at ${token.startTime.toFixed(1)}s`);

    try {
      // For HTMLAudioElement (OpenAI/ElevenLabs)
      if (audioElement.duration && !isNaN(audioElement.duration)) {
        audioElement.currentTime = token.startTime;
        setCurrentTime(token.startTime);
        setCurrentWordId(token.id);
        setProgress((token.startTime / audioElement.duration) * 100);
      } else {
        // Fallback for when duration isn't available yet
        setTimeout(() => {
          if (audioElement.duration && !isNaN(audioElement.duration)) {
            audioElement.currentTime = token.startTime;
            setCurrentTime(token.startTime);
            setCurrentWordId(token.id);
            setProgress((token.startTime / audioElement.duration) * 100);
          }
        }, 100);
      }
    } catch (error) {
      console.warn('Failed to seek audio:', error);
      // Fallback: just highlight the word without seeking
      setCurrentWordId(token.id);
    }
  }, [audioElement, isHighlightingEnabled]);

  // Handle word clicks
  const onWordClick = useCallback((token: WordToken) => {
    if (!isHighlightingEnabled) return;
    
    console.log(`🖱️ Word clicked: "${token.text}"`);
    
    if (voiceProvider === 'web-speech') {
      // Web Speech API doesn't support seeking well
      console.warn('Web Speech API: Seeking not supported, only highlighting word');
      setCurrentWordId(token.id);
      setCurrentTime(token.startTime);
      return;
    }
    
    seekToWord(token);
  }, [seekToWord, voiceProvider, isHighlightingEnabled]);

  // Toggle highlighting (useful for performance or user preference)
  const toggleHighlighting = useCallback(() => {
    setIsHighlightingEnabled(prev => {
      console.log(`🎨 Text highlighting ${!prev ? 'enabled' : 'disabled'}`);
      return !prev;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return {
    tokens,
    currentWordId: isHighlightingEnabled ? currentWordId : undefined,
    currentTime,
    progress,
    onWordClick,
    seekToWord,
    isHighlightingEnabled
  };
};

// Additional utility hook for timing calibration
export const useTimingCalibration = () => {
  const [calibrationData, setCalibrationData] = useState<{
    provider: VoiceProvider;
    actualDuration: number;
    estimatedDuration: number;
    accuracy: number;
  } | null>(null);

  const recordTiming = useCallback((
    provider: VoiceProvider,
    estimatedDuration: number,
    actualDuration: number
  ) => {
    const accuracy = (1 - Math.abs(estimatedDuration - actualDuration) / actualDuration) * 100;
    
    setCalibrationData({
      provider,
      actualDuration,
      estimatedDuration,
      accuracy
    });
    
    console.log(`📊 Timing Calibration - ${provider}:`, {
      estimated: estimatedDuration.toFixed(1) + 's',
      actual: actualDuration.toFixed(1) + 's',
      accuracy: accuracy.toFixed(1) + '%'
    });
  }, []);

  return {
    calibrationData,
    recordTiming
  };
};