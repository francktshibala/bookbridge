'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { BundleAudioManager, type BundleData, type BundleSentence } from '@/lib/audio/BundleAudioManager';

interface BookMetadata {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
}

interface GlobalAudioState {
  // Current playback state
  isPlaying: boolean;
  isPaused: boolean;
  currentBook: BookMetadata | null;
  currentChapter: string;
  currentSentence: number;
  currentBundle: number;

  // Audio manager instance
  audioManager: BundleAudioManager | null;

  // Playback controls
  play: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seekToSentence: (sentenceIndex: number) => void;
  setPlaybackSpeed: (speed: number) => void;

  // State setters (for page-level integration)
  setCurrentBook: (book: BookMetadata | null) => void;
  setAudioManager: (manager: BundleAudioManager | null) => void;
  updatePlaybackState: (playing: boolean, paused: boolean) => void;
  updateCurrentSentence: (sentenceIndex: number, bundleIndex: number) => void;
  setCurrentChapter: (chapter: string) => void;

  // UI state
  miniPlayerVisible: boolean;
  miniPlayerExpanded: boolean;
  setMiniPlayerVisible: (visible: boolean) => void;
  setMiniPlayerExpanded: (expanded: boolean) => void;

  // Progress
  currentTime: number;
  duration: number;
  progress: number; // 0-1
  playbackSpeed: number;
}

const GlobalAudioContext = createContext<GlobalAudioState | undefined>(undefined);

interface GlobalAudioProviderProps {
  children: ReactNode;
}

export function GlobalAudioProvider({ children }: GlobalAudioProviderProps) {
  const [mounted, setMounted] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentBook, setCurrentBook] = useState<BookMetadata | null>(null);
  const [currentChapter, setCurrentChapter] = useState('');
  const [currentSentence, setCurrentSentence] = useState(0);
  const [currentBundle, setCurrentBundle] = useState(0);

  // Audio manager (stored in ref to persist across re-renders)
  const audioManagerRef = useRef<BundleAudioManager | null>(null);

  // Progress state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);

  // UI state
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const [miniPlayerExpanded, setMiniPlayerExpanded] = useState(true);

  // Progress calculation
  const progress = duration > 0 ? currentTime / duration : 0;

  // Initialize mounted state
  useEffect(() => {
    setMounted(true);

    // Cleanup on unmount
    return () => {
      if (audioManagerRef.current) {
        audioManagerRef.current.stop();
        audioManagerRef.current.destroy();
      }
    };
  }, []);

  // Update progress from audio manager
  useEffect(() => {
    if (!audioManagerRef.current) return;

    const handleTimeUpdate = (current: number, total: number) => {
      setCurrentTime(current);
      setDuration(total);
    };

    // Set the callback
    audioManagerRef.current.onTimeUpdate = handleTimeUpdate;

    return () => {
      if (audioManagerRef.current) {
        audioManagerRef.current.onTimeUpdate = undefined;
      }
    };
  }, [audioManagerRef.current]);

  // Playback controls
  const play = useCallback(async () => {
    if (!audioManagerRef.current) {
      console.warn('No audio manager available to play');
      return;
    }

    try {
      await audioManagerRef.current.resume();
      setIsPlaying(true);
      setIsPaused(false);
      setMiniPlayerVisible(true);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }, []);

  const pause = useCallback(() => {
    if (!audioManagerRef.current) return;

    audioManagerRef.current.pause();
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  const resume = useCallback(async () => {
    if (!audioManagerRef.current) return;

    try {
      await audioManagerRef.current.resume();
      setIsPlaying(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to resume audio:', error);
    }
  }, []);

  const stop = useCallback(() => {
    if (!audioManagerRef.current) return;

    audioManagerRef.current.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
    setMiniPlayerVisible(false);
  }, []);

  const seekToSentence = useCallback((sentenceIndex: number) => {
    if (!audioManagerRef.current) return;

    // This will be handled by the page component that has bundle context
    console.log('Seek to sentence:', sentenceIndex);
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    if (!audioManagerRef.current) return;

    audioManagerRef.current.setPlaybackRate(speed);
    setPlaybackSpeedState(speed);
  }, []);

  // State setters
  const setAudioManager = useCallback((manager: BundleAudioManager | null) => {
    audioManagerRef.current = manager;

    if (manager) {
      // Get current playback speed
      const speed = manager.getPlaybackSpeed();
      setPlaybackSpeedState(speed);
    }
  }, []);

  const updatePlaybackState = useCallback((playing: boolean, paused: boolean) => {
    setIsPlaying(playing);
    setIsPaused(paused);

    // Show mini player when playing
    if (playing) {
      setMiniPlayerVisible(true);
    }
  }, []);

  const updateCurrentSentence = useCallback((sentenceIndex: number, bundleIndex: number) => {
    setCurrentSentence(sentenceIndex);
    setCurrentBundle(bundleIndex);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    // Return a minimal provider during SSR
    return (
      <GlobalAudioContext.Provider value={{
        isPlaying: false,
        isPaused: false,
        currentBook: null,
        currentChapter: '',
        currentSentence: 0,
        currentBundle: 0,
        audioManager: null,
        play: async () => {},
        pause: () => {},
        resume: () => {},
        stop: () => {},
        seekToSentence: () => {},
        setPlaybackSpeed: () => {},
        setCurrentBook: () => {},
        setAudioManager: () => {},
        updatePlaybackState: () => {},
        updateCurrentSentence: () => {},
        setCurrentChapter: () => {},
        miniPlayerVisible: false,
        miniPlayerExpanded: true,
        setMiniPlayerVisible: () => {},
        setMiniPlayerExpanded: () => {},
        currentTime: 0,
        duration: 0,
        progress: 0,
        playbackSpeed: 1.0,
      }}>
        {children}
      </GlobalAudioContext.Provider>
    );
  }

  return (
    <GlobalAudioContext.Provider value={{
      isPlaying,
      isPaused,
      currentBook,
      currentChapter,
      currentSentence,
      currentBundle,
      audioManager: audioManagerRef.current,
      play,
      pause,
      resume,
      stop,
      seekToSentence,
      setPlaybackSpeed,
      setCurrentBook,
      setAudioManager,
      updatePlaybackState,
      updateCurrentSentence,
      setCurrentChapter,
      miniPlayerVisible,
      miniPlayerExpanded,
      setMiniPlayerVisible,
      setMiniPlayerExpanded,
      currentTime,
      duration,
      progress,
      playbackSpeed,
    }}>
      {children}
    </GlobalAudioContext.Provider>
  );
}

export function useGlobalAudio() {
  const context = useContext(GlobalAudioContext);
  if (context === undefined) {
    // During SSR or when provider is not available
    if (typeof window === 'undefined') {
      return {
        isPlaying: false,
        isPaused: false,
        currentBook: null,
        currentChapter: '',
        currentSentence: 0,
        currentBundle: 0,
        audioManager: null,
        play: async () => {},
        pause: () => {},
        resume: () => {},
        stop: () => {},
        seekToSentence: () => {},
        setPlaybackSpeed: () => {},
        setCurrentBook: () => {},
        setAudioManager: () => {},
        updatePlaybackState: () => {},
        updateCurrentSentence: () => {},
        setCurrentChapter: () => {},
        miniPlayerVisible: false,
        miniPlayerExpanded: true,
        setMiniPlayerVisible: () => {},
        setMiniPlayerExpanded: () => {},
        currentTime: 0,
        duration: 0,
        progress: 0,
        playbackSpeed: 1.0,
      };
    }
    throw new Error('useGlobalAudio must be used within a GlobalAudioProvider');
  }
  return context;
}
