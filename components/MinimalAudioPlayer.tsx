'use client';

import React, { useState } from 'react';

interface MinimalAudioPlayerProps {
  text: string;
  voice?: string;
}

export default function MinimalAudioPlayer({ text, voice = 'alloy' }: MinimalAudioPlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const handlePlay = async () => {
    if (audio && !audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    setStartTime(Date.now());
    console.log('🎵 Starting audio generation...');

    try {
      const response = await fetch('/api/openai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 500), // Limit text to reduce delay
          voice,
          speed: 1.0
        })
      });

      if (!response.ok) throw new Error('TTS failed');

      const blob = await response.blob();
      const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`🎵 Audio loaded in ${loadTime}s`);

      const audioUrl = URL.createObjectURL(blob);
      const newAudio = new Audio(audioUrl);
      
      newAudio.onplay = () => {
        console.log('🎵 Audio started playing');
        setIsPlaying(true);
        setIsLoading(false);
      };

      newAudio.onended = () => {
        console.log('🎵 Audio finished');
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      newAudio.onerror = (e) => {
        console.error('🎵 Audio error:', e);
        setIsLoading(false);
        setIsPlaying(false);
      };

      setAudio(newAudio);
      await newAudio.play();

    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
      <h3>Minimal Audio Player (No Highlighting)</h3>
      <div style={{ marginBottom: '10px' }}>
        <strong>Text:</strong> {text.slice(0, 100)}...
      </div>
      <button 
        onClick={handlePlay}
        disabled={isLoading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          background: isLoading ? '#ccc' : isPlaying ? '#f44336' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Loading...' : isPlaying ? 'Stop' : 'Play'}
      </button>
      {startTime > 0 && (
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          Load time: {((Date.now() - startTime) / 1000).toFixed(1)}s
        </div>
      )}
    </div>
  );
}