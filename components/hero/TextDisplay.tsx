'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface Sentence {
  index: number;
  text: string;
  wordCount: number;
}

interface TextDisplayProps {
  sentences: Sentence[];
  currentSentenceIndex: number;
  isPlaying: boolean;
}

export function TextDisplay({ sentences, currentSentenceIndex, isPlaying }: TextDisplayProps) {
  return (
    <div
      className="text-display"
      style={{
        fontFamily: 'Source Serif Pro, serif',
        fontSize: '1.125rem',
        lineHeight: '1.7',
        color: 'var(--text-primary)'
      }}
    >
      {sentences.map((sentence, index) => (
        <motion.span
          key={sentence.index}
          className={`sentence ${index === currentSentenceIndex ? 'current' : ''} ${index < currentSentenceIndex ? 'completed' : ''}`}
          style={{
            display: 'inline',
            padding: '2px 4px',
            borderRadius: '4px',
            background: index === currentSentenceIndex
              ? 'var(--accent-primary)/20'
              : index < currentSentenceIndex
                ? 'var(--accent-secondary)/10'
                : 'transparent',
            transition: 'all 0.3s ease'
          }}
          animate={{
            background: index === currentSentenceIndex && isPlaying
              ? 'var(--accent-primary)/30'
              : index === currentSentenceIndex
                ? 'var(--accent-primary)/20'
                : index < currentSentenceIndex
                  ? 'var(--accent-secondary)/10'
                  : 'transparent'
          }}
        >
          {sentence.text}
          {index < sentences.length - 1 && ' '}
        </motion.span>
      ))}
    </div>
  );
}