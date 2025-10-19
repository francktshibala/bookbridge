'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface AudioControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export function AudioControls({ isPlaying, onPlayPause, speed, onSpeedChange }: AudioControlsProps) {
  const speedOptions = [0.75, 1.0, 1.25];

  return (
    <div className="audio-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {/* Play/Pause Button */}
      <motion.button
        onClick={onPlayPause}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: 'none',
          background: 'var(--accent-primary)',
          color: 'var(--bg-primary)',
          cursor: 'pointer',
          fontSize: '1.25rem',
          transition: 'all 0.2s ease'
        }}
      >
        {isPlaying ? 'ø' : '¶'}
      </motion.button>

      {/* Speed Control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            fontFamily: 'Source Serif Pro, serif'
          }}
        >
          Speed:
        </span>
        {speedOptions.map((speedOption) => (
          <motion.button
            key={speedOption}
            onClick={() => onSpeedChange(speedOption)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '0.25rem 0.75rem',
              border: `1px solid ${speed === speedOption ? 'var(--accent-primary)' : 'var(--accent-primary)/30'}`,
              borderRadius: '20px',
              background: speed === speedOption ? 'var(--accent-primary)' : 'transparent',
              color: speed === speedOption ? 'var(--bg-primary)' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontFamily: 'Source Serif Pro, serif',
              transition: 'all 0.2s ease'
            }}
          >
            {speedOption}x
          </motion.button>
        ))}
      </div>
    </div>
  );
}