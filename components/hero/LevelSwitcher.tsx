'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LevelSwitcherProps {
  currentLevel: 'A1' | 'B1' | 'original';
  onLevelChange: (level: 'A1' | 'B1' | 'original') => void;
}

export function LevelSwitcher({ currentLevel, onLevelChange }: LevelSwitcherProps) {
  const levels = [
    { key: 'A1' as const, label: 'A1', description: 'Beginner' },
    { key: 'B1' as const, label: 'B1', description: 'Intermediate' },
    { key: 'original' as const, label: 'Original', description: 'Advanced' }
  ];

  return (
    <div className="level-switcher" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          fontFamily: 'Source Serif Pro, serif'
        }}
      >
        Level:
      </span>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {levels.map((level) => (
          <motion.button
            key={level.key}
            onClick={() => onLevelChange(level.key)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '0.5rem 1rem',
              border: `2px solid ${currentLevel === level.key ? 'var(--accent-primary)' : 'var(--accent-primary)/30'}`,
              borderRadius: '8px',
              background: currentLevel === level.key ? 'var(--accent-primary)' : 'transparent',
              color: currentLevel === level.key ? 'var(--bg-primary)' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontFamily: 'Source Serif Pro, serif',
              fontWeight: currentLevel === level.key ? '600' : '400',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            title={level.description}
          >
            {level.label}
            {currentLevel === level.key && (
              <motion.div
                layoutId="level-indicator"
                style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-2px',
                  right: '-2px',
                  bottom: '-2px',
                  border: '2px solid var(--accent-primary)',
                  borderRadius: '8px',
                  background: 'var(--accent-primary)/10'
                }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}