/**
 * Hook for managing continuous reading state and transitions
 */

import { useState, useCallback, useEffect } from 'react';
import { useFeatureFlags } from '@/lib/feature-flags';
import { useIsMobile } from '@/hooks/useIsMobile';

interface ContinuousReadingState {
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  currentSentenceId: string | null;
  highlightedWordIndex: number;
}

interface UseContinuousReadingProps {
  bookId: string;
  userId?: string;
  eslLevel: string;
}

export function useContinuousReading({
  bookId,
  userId,
  eslLevel
}: UseContinuousReadingProps) {
  const { isMobile } = useIsMobile();
  const featureFlags = useFeatureFlags({
    deviceType: isMobile ? 'mobile' : 'desktop',
    bookId,
    userId
  });

  const [state, setState] = useState<ContinuousReadingState>({
    isEnabled: featureFlags.continuousReading,
    isLoading: false,
    error: null,
    currentSentenceId: null,
    highlightedWordIndex: -1
  });

  /**
   * Toggle continuous reading mode
   */
  const toggleContinuousReading = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEnabled: !prev.isEnabled,
      error: null
    }));
  }, []);

  /**
   * Enable continuous reading
   */
  const enableContinuousReading = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEnabled: true,
      isLoading: true,
      error: null
    }));
  }, []);

  /**
   * Disable continuous reading (fallback to chunks)
   */
  const disableContinuousReading = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEnabled: false,
      isLoading: false,
      error: null
    }));
  }, []);

  /**
   * Update current sentence
   */
  const setCurrentSentence = useCallback((sentenceId: string) => {
    setState(prev => ({
      ...prev,
      currentSentenceId: sentenceId
    }));
  }, []);

  /**
   * Update highlighted word
   */
  const setHighlightedWord = useCallback((wordIndex: number) => {
    setState(prev => ({
      ...prev,
      highlightedWordIndex: wordIndex
    }));
  }, []);

  /**
   * Handle loading state
   */
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading
    }));
  }, []);

  /**
   * Handle error state
   */
  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
      isLoading: false
    }));
  }, []);

  /**
   * Check if device/network supports continuous reading
   */
  const isSupported = useCallback(() => {
    // Check for required APIs
    const hasWebAudio = 'AudioContext' in window || 'webkitAudioContext' in window;
    const hasIntersectionObserver = 'IntersectionObserver' in window;
    const hasRequestAnimationFrame = 'requestAnimationFrame' in window;

    return hasWebAudio && hasIntersectionObserver && hasRequestAnimationFrame;
  }, []);

  /**
   * Get performance recommendations
   */
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: string[] = [];

    if (isMobile) {
      const memory = (navigator as any).deviceMemory;
      if (memory && memory <= 2) {
        recommendations.push('Consider using chunk-based reading on low-memory devices');
      }

      const connection = (navigator as any).connection;
      if (connection && connection.saveData) {
        recommendations.push('Data saver mode detected - continuous reading may use more data');
      }

      if (connection && (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g')) {
        recommendations.push('Slow network detected - preloading may be limited');
      }
    }

    return recommendations;
  }, [isMobile]);

  // Update state when feature flags change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isEnabled: prev.isEnabled && featureFlags.continuousReading
    }));
  }, [featureFlags.continuousReading]);

  return {
    // State
    isEnabled: state.isEnabled,
    isLoading: state.isLoading,
    error: state.error,
    currentSentenceId: state.currentSentenceId,
    highlightedWordIndex: state.highlightedWordIndex,

    // Actions
    toggleContinuousReading,
    enableContinuousReading,
    disableContinuousReading,
    setCurrentSentence,
    setHighlightedWord,
    setLoading,
    setError,

    // Utils
    isSupported: isSupported(),
    featureFlags,
    recommendations: getPerformanceRecommendations()
  };
}