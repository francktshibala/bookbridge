'use client';

import React, { useState, useEffect, useRef } from 'react';
import { voiceService } from '@/lib/voice-service';

interface IntegratedAudioControlsProps {
  text: string;
  voiceProvider: 'standard' | 'openai' | 'elevenlabs';
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  onEnd?: () => void;
  bookId?: string; // For precomputed audio lookup
  chunkIndex?: number; // For precomputed audio lookup
}

export function IntegratedAudioControls({
  text,
  voiceProvider,
  isPlaying,
  onPlayStateChange,
  onEnd,
  bookId,
  chunkIndex
}: IntegratedAudioControlsProps) {
  // Debug log to track what text is being passed for audio
  console.log(`🎯 IntegratedAudioControls received text (${text.length} chars): "${text.substring(0, 100)}..."`);
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
    console.log(`🎵 Playing ${voiceProvider} audio for text: "${text.substring(0, 50)}..."`);

    try {
      // Stop any existing audio
      voiceService.stop();

      // Simple, reliable voice service - works with delays but completes reading
      console.log(`🎵 Using voice service for ${voiceProvider}...`);
      const provider = voiceProvider === 'standard' ? 'web-speech' : voiceProvider;

      await voiceService.speak({
        text: text.substring(0, 1500), // Use displayed text
        settings: {
          volume: 0.8,
          rate: 1.0,
          provider: provider as any,
          voice: undefined,
          openAIVoice: voiceProvider === 'openai' ? 'alloy' : undefined,
          elevenLabsVoice: voiceProvider === 'elevenlabs' ? 'pNInz6obpgDQGcFmaJgB' : undefined
        },
        onStart: () => {
          console.log(`🎵 ${voiceProvider} audio started`);
          setIsLoading(false);
        },
        onEnd: () => {
          console.log(`🎵 ${voiceProvider} audio completed - auto-advancing`);
          onPlayStateChange(false);
          onEnd?.(); // Auto-advance to next page
        },
        onError: (error) => {
          console.error(`🎵 ${voiceProvider} audio error:`, error);
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

  return (
    <div style={{ display: 'none' }}>
      {/* Invisible audio controller - reads displayed text exactly */}
      {/* Text length: {text.length} chars */}
      {/* Voice: {voiceProvider} */}
      {/* Chunk: {chunkIndex} */}
    </div>
  );
}