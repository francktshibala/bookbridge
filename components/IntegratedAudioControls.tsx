'use client';

import React, { useState, useEffect, useRef } from 'react';
import { voiceService } from '@/lib/voice-service';

interface IntegratedAudioControlsProps {
  text: string;
  voiceProvider: 'standard' | 'openai' | 'elevenlabs';
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  onEnd?: () => void;
}

export function IntegratedAudioControls({
  text,
  voiceProvider,
  isPlaying,
  onPlayStateChange,
  onEnd
}: IntegratedAudioControlsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Handle play/pause
  useEffect(() => {
    if (isPlaying && !isLoading) {
      playAudio();
    } else if (!isPlaying) {
      stopAudio();
    }
  }, [isPlaying, text]);

  const playAudio = async () => {
    setIsLoading(true);
    console.log(`🎵 Generating ${voiceProvider} audio for text...`);

    try {
      // Stop any existing audio
      voiceService.stop();

      // Map provider names
      const provider = voiceProvider === 'standard' ? 'web-speech' : voiceProvider;

      await voiceService.speak({
        text: text.substring(0, 2000), // Limit for faster response
        settings: {
          volume: 0.8,
          rate: 1.0,
          provider: provider as any,
          voice: undefined,
          openAIVoice: voiceProvider === 'openai' ? 'alloy' : undefined,
          elevenLabsVoice: voiceProvider === 'elevenlabs' ? 'pNInz6obpgDQGcFmaJgB' : undefined
        },
        onStart: () => {
          console.log('🎵 Audio started');
          setIsLoading(false);
        },
        onEnd: () => {
          console.log('🎵 Audio ended');
          onPlayStateChange(false);
          onEnd?.();
        },
        onError: (error) => {
          console.error('🎵 Audio error:', error);
          setIsLoading(false);
          onPlayStateChange(false);
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsLoading(false);
      onPlayStateChange(false);
    }
  };

  const stopAudio = () => {
    voiceService.stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceService.stop();
    };
  }, []);

  return null; // This is an invisible controller component
}