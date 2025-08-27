'use client';

import { useState, useCallback } from 'react';

export interface UseAutoAdvanceOptions {
  isEnhanced: boolean;
  currentChunk: number;
  totalChunks: number;
  onNavigate: (direction: 'prev' | 'next', autoAdvance?: boolean) => void;
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
    console.log('🎵 AUTO-ADVANCE DEBUG: Chunk completed', {
      autoAdvanceEnabled,
      isEnhanced,
      currentChunk,
      totalChunks,
      canAdvance: currentChunk < totalChunks - 1
    });
    
    if (isEnhanced && autoAdvanceEnabled) {
      const canAdvance = currentChunk < totalChunks - 1;
      
      if (canAdvance) {
        console.log(`🎵 AUTO-ADVANCE: Starting navigation from chunk ${currentChunk} to ${currentChunk + 1}`);
        
        // Brief pause before advancing
        setTimeout(() => {
          console.log('🎵 AUTO-ADVANCE: Calling onNavigate with next, autoAdvance=true');
          onNavigate('next', true); // Pass autoAdvance = true to preserve mode
          
          // Auto-resume playback after page navigation
          // Small delay to ensure new content is loaded
          setTimeout(() => {
            console.log('🎵 AUTO-ADVANCE: Auto-resuming playback on next chunk');
            onPlayStateChange(true);
          }, 800);
        }, 500);
      } else {
        // Reached end of book
        console.log('🏁 AUTO-ADVANCE: Reached end of book, stopping playback');
        onPlayStateChange(false);
      }
    } else {
      // Auto-advance disabled or not enhanced book
      console.log('🛑 AUTO-ADVANCE: Disabled or not enhanced book, stopping playback', {
        isEnhanced,
        autoAdvanceEnabled
      });
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