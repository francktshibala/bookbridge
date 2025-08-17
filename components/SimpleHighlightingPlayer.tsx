'use client';

import React, { useState, useEffect, useRef } from 'react';

interface SimpleHighlightingPlayerProps {
  text: string;
  voice?: string;
}

export default function SimpleHighlightingPlayer({ text, voice = 'alloy' }: SimpleHighlightingPlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [words, setWords] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Split text into words
    setWords(text.split(/\s+/).filter(word => word.length > 0));
  }, [text]);

  const handlePlay = async () => {
    // Stop if already playing
    if (audio && !audio.paused) {
      audio.pause();
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setHighlightIndex(-1);
      return;
    }

    setIsLoading(true);
    console.log('🎵 Starting audio generation...');

    try {
      const response = await fetch('/api/openai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 500),
          voice,
          speed: 1.0
        })
      });

      if (!response.ok) throw new Error('TTS failed');

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const newAudio = new Audio(audioUrl);
      
      // Wait for metadata to load
      await new Promise<void>((resolve) => {
        newAudio.addEventListener('loadedmetadata', () => {
          console.log('🎵 Audio duration:', newAudio.duration);
          resolve();
        }, { once: true });
      });

      newAudio.onplay = () => {
        console.log('🎵 Audio started, beginning highlighting');
        setIsPlaying(true);
        setIsLoading(false);
        startHighlighting(newAudio.duration);
      };

      newAudio.onended = () => {
        console.log('🎵 Audio finished');
        setIsPlaying(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setHighlightIndex(-1);
        URL.revokeObjectURL(audioUrl);
      };

      setAudio(newAudio);
      await newAudio.play();

    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsLoading(false);
    }
  };

  const startHighlighting = (duration: number) => {
    const totalWords = words.length;
    const wordsPerSecond = totalWords / duration;
    const msPerWord = 1000 / wordsPerSecond;
    
    console.log(`🎯 Starting highlighting: ${totalWords} words, ${duration.toFixed(1)}s, ${msPerWord.toFixed(0)}ms per word`);
    
    let currentIndex = 0;
    setHighlightIndex(0);
    
    intervalRef.current = setInterval(() => {
      currentIndex++;
      if (currentIndex >= totalWords) {
        clearInterval(intervalRef.current!);
        setHighlightIndex(-1);
      } else {
        setHighlightIndex(currentIndex);
        console.log(`🎯 Highlighting word ${currentIndex}: "${words[currentIndex]}"`);
      }
    }, msPerWord);
  };

  return (
    <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
      <h3>Simple Highlighting Player</h3>
      
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px',
        background: 'white',
        borderRadius: '4px',
        lineHeight: '1.6',
        fontSize: '16px'
      }}>
        {words.map((word, index) => (
          <span
            key={index}
            style={{
              backgroundColor: index === highlightIndex ? '#ffeb3b' : 'transparent',
              padding: '2px 4px',
              margin: '0 2px',
              borderRadius: '3px',
              transition: 'background-color 0.2s ease'
            }}
          >
            {word}
          </span>
        ))}
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

      {highlightIndex >= 0 && (
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          Word {highlightIndex + 1} of {words.length}
        </div>
      )}
    </div>
  );
}