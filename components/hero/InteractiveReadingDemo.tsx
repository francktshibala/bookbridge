'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TextDisplay } from './TextDisplay';
import { AudioControls } from './AudioControls';
import { LevelSwitcher } from './LevelSwitcher';

// Demo content type
interface DemoContent {
  title: string;
  author: string;
  chapter: string;
  levels: {
    [key: string]: {
      text: string;
      sentences: Array<{
        index: number;
        text: string;
        wordCount: number;
      }>;
    };
  };
}

interface InteractiveReadingDemoProps {
  className?: string;
}

export function InteractiveReadingDemo({ className = '' }: InteractiveReadingDemoProps) {
  const [demoContent, setDemoContent] = useState<DemoContent | null>(null);
  const [currentLevel, setCurrentLevel] = useState<'A1' | 'B1' | 'original'>('A1');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);

  // Load demo content
  useEffect(() => {
    const loadDemoContent = async () => {
      try {
        const response = await fetch('/data/demo/pride-prejudice-demo.json');
        const content = await response.json();
        setDemoContent(content);
      } catch (error) {
        console.error('Failed to load demo content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDemoContent();
  }, []);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    // TODO: Implement actual audio playback
  };

  const handleLevelChange = (level: 'A1' | 'B1' | 'original') => {
    setCurrentLevel(level);
    setCurrentSentenceIndex(0);
    setIsPlaying(false);
    // TODO: Implement level switching audio
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    // TODO: Implement speed change
  };

  if (isLoading) {
    return (
      <div className={`hero-demo-loading ${className}`}>
        <div
          className="loading-text"
          style={{
            fontFamily: 'Playfair Display, serif',
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            textAlign: 'center',
            padding: '2rem'
          }}
        >
          Loading interactive demo...
        </div>
      </div>
    );
  }

  if (!demoContent) {
    return (
      <div className={`hero-demo-error ${className}`}>
        <p style={{ color: 'var(--text-primary)' }}>
          Failed to load demo content
        </p>
      </div>
    );
  }

  const currentText = demoContent.levels[currentLevel];

  return (
    <motion.div
      className={`interactive-reading-demo ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        padding: '2rem',
        borderRadius: '12px',
        maxWidth: '800px',
        margin: '0 auto',
        position: 'relative'
      }}
    >
      {/* Background gradient overlay */}
      <div
        className="demo-background"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '12px',
          background: `
            radial-gradient(circle at 20% 50%, var(--accent-primary)/15 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, var(--accent-secondary)/12 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, var(--accent-light)/8 0%, transparent 50%)
          `,
          pointerEvents: 'none'
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="demo-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.75rem',
              color: 'var(--text-accent)',
              marginBottom: '0.5rem'
            }}
          >
            =Ö Hear and see how English becomes easier
          </h2>
          <p
            style={{
              fontFamily: 'Source Serif Pro, serif',
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              margin: 0
            }}
          >
            Tap play  we'll simplify and read it to you
          </p>
        </div>

        {/* Demo Content Area */}
        <div
          className="demo-content"
          style={{
            background: 'var(--bg-secondary)',
            border: '2px solid var(--accent-primary)/20',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1rem'
          }}
        >
          {/* Chapter Title */}
          <h3
            style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: '1.25rem',
              color: 'var(--text-accent)',
              marginBottom: '1rem',
              textAlign: 'center'
            }}
          >
            {demoContent.chapter}
          </h3>

          {/* Text Display */}
          <TextDisplay
            sentences={currentText.sentences}
            currentSentenceIndex={currentSentenceIndex}
            isPlaying={isPlaying}
          />

          {/* Controls */}
          <div
            className="demo-controls"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '1.5rem',
              padding: '1rem',
              background: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '1px solid var(--accent-primary)/10'
            }}
          >
            <AudioControls
              isPlaying={isPlaying}
              onPlayPause={handlePlay}
              speed={playbackSpeed}
              onSpeedChange={handleSpeedChange}
            />

            <div style={{ width: '1px', height: '30px', background: 'var(--accent-primary)/20' }} />

            <LevelSwitcher
              currentLevel={currentLevel}
              onLevelChange={handleLevelChange}
            />
          </div>
        </div>

        {/* Progress Indicator */}
        <div
          className="demo-progress"
          style={{
            height: '4px',
            background: 'var(--accent-primary)/20',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: '1rem'
          }}
        >
          <motion.div
            style={{
              height: '100%',
              background: 'var(--accent-primary)',
              borderRadius: '2px'
            }}
            initial={{ width: 0 }}
            animate={{
              width: `${((currentSentenceIndex + 1) / currentText.sentences.length) * 100}%`
            }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Demo Info */}
        <div
          className="demo-info"
          style={{
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)'
          }}
        >
          <p style={{ margin: 0 }}>
            Experience how AI transforms complex literature into your perfect reading level
          </p>
        </div>
      </div>
    </motion.div>
  );
}