'use client';

import { useState, useCallback } from 'react';

export interface UseAutoAdvanceOptions {
  isEnhanced: boolean;
  currentChunk: number;
  totalChunks: number;
  onNavigate: (direction: 'prev' | 'next') => void;
  onPlayStateChange: (playing: boolean) => void;
}

export function useAutoAdvance({
  isEnhanced,
  currentChunk,
  totalChunks,
  onNavigate,
  onPlayStateChange
}: UseAutoAdvanceOptions) {
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(false);

  const handleChunkComplete = useCallback(() => {
    console.log('🎵 Chunk completed, auto-advance enabled:', autoAdvanceEnabled);
    
    if (isEnhanced && autoAdvanceEnabled) {
      const canAdvance = currentChunk < totalChunks - 1;
      
      if (canAdvance) {
        console.log(`🎵 Auto-advancing from chunk ${currentChunk} to ${currentChunk + 1}`);
        
        // Brief pause before advancing
        setTimeout(() => {
          onNavigate('next');
          
          // Auto-resume playback after page navigation
          // Small delay to ensure new content is loaded
          setTimeout(() => {
            console.log('🎵 Auto-resuming playback on next chunk');
            onPlayStateChange(true);
          }, 800);
        }, 500);
      } else {
        // Reached end of book
        console.log('🏁 Reached end of book');
        onPlayStateChange(false);
      }
    } else {
      // Auto-advance disabled or not enhanced book
      onPlayStateChange(false);
    }
  }, [isEnhanced, autoAdvanceEnabled, currentChunk, totalChunks, onNavigate, onPlayStateChange]);

  const enableAutoAdvance = useCallback(() => {
    setAutoAdvanceEnabled(true);
    console.log('✅ Auto-advance enabled for continuous reading');
  }, []);

  const disableAutoAdvance = useCallback(() => {
    setAutoAdvanceEnabled(false);
    console.log('❌ Auto-advance disabled');
  }, []);

  const toggleAutoAdvance = useCallback(() => {
    const newState = !autoAdvanceEnabled;
    setAutoAdvanceEnabled(newState);
    console.log(newState ? '✅ Auto-advance enabled' : '❌ Auto-advance disabled');
  }, [autoAdvanceEnabled]);

  return {
    autoAdvanceEnabled,
    setAutoAdvanceEnabled,
    enableAutoAdvance,
    disableAutoAdvance,
    toggleAutoAdvance,
    handleChunkComplete
  };
}