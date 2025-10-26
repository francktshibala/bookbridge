'use client';

import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BundleAudioManager, type BundleData } from '@/lib/audio/BundleAudioManager';
import { readingPositionService } from '@/lib/services/reading-position';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface FeaturedBook {
  id: string;
  title: string;
  author: string;
  description: string;
  sentences: number;
  bundles: number;
  gradient: string;
  abbreviation: string;
}

interface RealBundleApiResponse {
  success: boolean;
  bookId: string;
  title: string;
  author: string;
  level: string;
  bundleCount: number;
  totalSentences: number;
  bundles: BundleData[];
  audioType: string;
}

interface AudioContextState {
  // Book & Content
  selectedBook: FeaturedBook | null;
  bundleData: RealBundleApiResponse | null;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  contentMode: 'original' | 'simplified';

  // Playback State
  isPlaying: boolean;
  currentSentenceIndex: number;
  currentBundle: string | null;
  currentChapter: number;
  playbackTime: number;
  totalTime: number;
  playbackSpeed: number;

  // UI State
  isMiniPlayerVisible: boolean;
  isFullPlayerVisible: boolean;

  // Loading & Error State
  loading: boolean;
  error: string | null;
}

interface AudioContextActions {
  // Book Management
  loadBook: (book: FeaturedBook, level?: string) => Promise<void>;
  unloadBook: () => void;
  switchLevel: (level: string) => Promise<void>;
  setContentMode: (mode: 'original' | 'simplified') => void;

  // Playback Controls
  play: (sentenceIndex?: number) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => void;
  seek: (sentenceIndex: number) => Promise<void>;
  setSpeed: (speed: number) => void;

  // Bundle Navigation
  nextBundle: () => Promise<void>;
  previousBundle: () => Promise<void>;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;

  // State Setters (for reading page compatibility)
  setCurrentSentenceIndex: (index: number) => void;
  setCurrentBundle: (bundleId: string | null) => void;
  setCurrentChapter: (chapter: number) => void;
  setCefrLevel: (level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2') => void;
  setBundleData: (data: RealBundleApiResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Position Management
  savePosition: () => Promise<void>;
  restorePosition: (bookId: string) => Promise<void>;

  // UI Control
  setMiniPlayerVisible: (visible: boolean) => void;
  setFullPlayerVisible: (visible: boolean) => void;
  navigateToReading: () => void;

  // Helper Methods
  findBundleForSentence: (sentenceIndex: number) => BundleData | null;
  getCurrentBundleIndex: () => number;
  calculateCompletion: () => number;
}

type AudioContextValue = AudioContextState & AudioContextActions;

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const AudioContext = createContext<AudioContextValue | null>(null);

// ============================================================================
// AUDIO PROVIDER COMPONENT
// ============================================================================

export function AudioProvider({ children }: { children: ReactNode }) {
  // ========================================
  // STATE MANAGEMENT
  // ========================================

  // Book & Content State
  const [selectedBook, setSelectedBook] = useState<FeaturedBook | null>(null);
  const [bundleData, setBundleData] = useState<RealBundleApiResponse | null>(null);
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('A1');
  const [contentMode, setContentMode] = useState<'original' | 'simplified'>('simplified');

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentBundle, setCurrentBundle] = useState<string | null>(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // UI State
  const [isMiniPlayerVisible, setMiniPlayerVisible] = useState(false);
  const [isFullPlayerVisible, setFullPlayerVisible] = useState(false);

  // Loading & Error State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========================================
  // REFS
  // ========================================

  const audioManagerRef = useRef<BundleAudioManager | null>(null);
  const isPlayingRef = useRef(false);
  const router = useRouter();

  // ========================================
  // AUDIO MANAGER INITIALIZATION
  // ========================================

  useEffect(() => {
    // Only initialize on client side
    if (typeof window === 'undefined') return;

    console.log('🎵 [AudioContext] Initializing global BundleAudioManager singleton');

    audioManagerRef.current = new BundleAudioManager({
      onSentenceStart: (sentence) => {
        console.log(`🎵 [AudioContext] Sentence start: ${sentence.sentenceIndex}`);
        setCurrentSentenceIndex(sentence.sentenceIndex);
      },
      onSentenceEnd: (sentence) => {
        console.log(`🎵 [AudioContext] Sentence end: ${sentence.sentenceIndex}`);
      },
      onTimeUpdate: (current, total) => {
        setPlaybackTime(current);
        setTotalTime(total);
      },
      onBundleComplete: (bundleId) => {
        console.log(`🎵 [AudioContext] Bundle complete: ${bundleId}`);
        // Auto-advance to next bundle
        nextBundle();
      }
    });

    // Cleanup on app unmount (rare, but important)
    return () => {
      console.log('🎵 [AudioContext] Cleaning up BundleAudioManager');
      audioManagerRef.current?.stop();
      audioManagerRef.current?.destroy();
    };
  }, []);

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  const findBundleForSentence = useCallback((sentenceIndex: number): BundleData | null => {
    if (!bundleData) return null;

    return bundleData.bundles.find(bundle =>
      bundle.sentences.some(s => s.sentenceIndex === sentenceIndex)
    ) || null;
  }, [bundleData]);

  const getCurrentBundleIndex = useCallback((): number => {
    if (!bundleData || !currentBundle) return 0;
    return bundleData.bundles.findIndex(b => b.bundleId === currentBundle);
  }, [bundleData, currentBundle]);

  const calculateCompletion = useCallback((): number => {
    if (!bundleData || bundleData.totalSentences === 0) return 0;
    return Math.min(100, Math.max(0, (currentSentenceIndex / bundleData.totalSentences) * 100));
  }, [bundleData, currentSentenceIndex]);

  // ========================================
  // BOOK MANAGEMENT
  // ========================================

  const loadBook = async (book: FeaturedBook, level?: string) => {
    console.log(`🎵 [AudioContext] Loading book: ${book.title}, level: ${level || 'A1'}`);

    setSelectedBook(book);
    setLoading(true);
    setError(null);

    const targetLevel = level || 'A1';
    setCefrLevel(targetLevel as any);

    try {
      // Get API endpoint for this book/level
      const endpoint = getBookApiEndpoint(book.id, targetLevel);
      const response = await fetch(`${endpoint}?bookId=${book.id}&level=${targetLevel}&t=${Date.now()}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to load book: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log(`🎵 [AudioContext] Book loaded successfully: ${data.bundleCount} bundles`);
        setBundleData(data);
        setMiniPlayerVisible(true);

        // Save book ID to localStorage for persistence
        localStorage.setItem('bookbridge_last_book_id', book.id);

        // Try to restore saved position
        await restorePosition(book.id);
      } else {
        throw new Error('Failed to load book data');
      }
    } catch (err: any) {
      console.error('🎵 [AudioContext] Error loading book:', err);
      setError(err.message || 'Failed to load book');
    } finally {
      setLoading(false);
    }
  };

  const unloadBook = () => {
    console.log('🎵 [AudioContext] Unloading book');
    stop();
    setSelectedBook(null);
    setBundleData(null);
    setCurrentSentenceIndex(0);
    setCurrentBundle(null);
    setCurrentChapter(1);
    setMiniPlayerVisible(false);
  };

  const switchLevel = async (newLevel: string) => {
    if (!selectedBook) {
      console.warn('🎵 [AudioContext] Cannot switch level: no book selected');
      return;
    }

    console.log(`🎵 [AudioContext] Switching level to: ${newLevel}`);

    // Save current position before switching
    const currentPosition = currentSentenceIndex;

    await loadBook(selectedBook, newLevel);

    // Try to resume from same position if possible
    if (currentPosition > 0 && isPlaying) {
      await play(currentPosition);
    }
  };

  // ========================================
  // PLAYBACK CONTROLS
  // ========================================

  const play = async (sentenceIndex?: number) => {
    if (!audioManagerRef.current || !bundleData) {
      console.warn('🎵 [AudioContext] Cannot play: audio manager or bundle data not available');
      return;
    }

    const targetIndex = sentenceIndex ?? currentSentenceIndex;
    const bundle = findBundleForSentence(targetIndex);

    if (!bundle) {
      console.error(`🎵 [AudioContext] Bundle not found for sentence ${targetIndex}`);
      return;
    }

    console.log(`🎵 [AudioContext] Playing from sentence ${targetIndex}`);

    setCurrentBundle(bundle.bundleId);
    setCurrentSentenceIndex(targetIndex);
    setIsPlaying(true);
    isPlayingRef.current = true;

    // Apply current playback speed
    audioManagerRef.current.setPlaybackRate(playbackSpeed);

    try {
      await audioManagerRef.current.playSequentialSentences(bundle, targetIndex);
    } catch (error) {
      console.error('🎵 [AudioContext] Playback error:', error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const pause = () => {
    console.log('🎵 [AudioContext] Pausing playback');
    audioManagerRef.current?.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;

    // Save position when pausing
    savePosition();
  };

  const resume = async () => {
    if (!audioManagerRef.current || !bundleData) {
      console.warn('🎵 [AudioContext] Cannot resume: audio manager or bundle data not available');
      return;
    }

    console.log('🎵 [AudioContext] Resuming playback');

    // If we have a current position, resume from there
    if (currentSentenceIndex >= 0 && currentBundle) {
      const bundle = findBundleForSentence(currentSentenceIndex);
      if (bundle) {
        setIsPlaying(true);
        isPlayingRef.current = true;

        // Apply current playback speed
        audioManagerRef.current.setPlaybackRate(playbackSpeed);

        try {
          await audioManagerRef.current.playSequentialSentences(bundle, currentSentenceIndex);
        } catch (error) {
          console.error('🎵 [AudioContext] Resume error:', error);
          setIsPlaying(false);
          isPlayingRef.current = false;
        }
      } else {
        // Fallback to audio manager resume
        await audioManagerRef.current.resume();
        setIsPlaying(true);
        isPlayingRef.current = true;
      }
    } else {
      // Standard resume
      await audioManagerRef.current.resume();
      setIsPlaying(true);
      isPlayingRef.current = true;
    }
  };

  const stop = () => {
    console.log('🎵 [AudioContext] Stopping playback');
    audioManagerRef.current?.stop();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentSentenceIndex(0);
    setCurrentBundle(null);
  };

  const seek = async (sentenceIndex: number) => {
    console.log(`🎵 [AudioContext] Seeking to sentence ${sentenceIndex}`);
    await play(sentenceIndex);
  };

  const setSpeed = (speed: number) => {
    console.log(`🎵 [AudioContext] Setting playback speed to ${speed}x`);
    setPlaybackSpeed(speed);
    audioManagerRef.current?.setPlaybackRate(speed);
  };

  // ========================================
  // BUNDLE NAVIGATION
  // ========================================

  const nextBundle = async () => {
    if (!bundleData || !currentBundle) {
      console.warn('🎵 [AudioContext] Cannot advance to next bundle: missing data');
      return;
    }

    // Only continue if still playing
    if (!isPlayingRef.current) {
      console.log('🎵 [AudioContext] Not playing, skipping next bundle');
      return;
    }

    const currentBundleIndex = bundleData.bundles.findIndex(b => b.bundleId === currentBundle);
    const nextBundleData = bundleData.bundles[currentBundleIndex + 1];

    if (nextBundleData && nextBundleData.sentences.length > 0) {
      console.log(`🎵 [AudioContext] Auto-advancing to next bundle: ${nextBundleData.bundleId}`);
      const nextSentenceIndex = nextBundleData.sentences[0].sentenceIndex;

      setTimeout(() => {
        if (isPlayingRef.current) {
          play(nextSentenceIndex);
        }
      }, 100);
    } else {
      console.log('🎵 [AudioContext] All bundles complete');
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentBundle(null);
    }
  };

  const previousBundle = async () => {
    if (!bundleData || !currentBundle) return;

    const currentBundleIndex = bundleData.bundles.findIndex(b => b.bundleId === currentBundle);
    const prevBundleData = bundleData.bundles[currentBundleIndex - 1];

    if (prevBundleData && prevBundleData.sentences.length > 0) {
      console.log(`🎵 [AudioContext] Going to previous bundle: ${prevBundleData.bundleId}`);
      await play(prevBundleData.sentences[0].sentenceIndex);
    }
  };

  const skipForward = (seconds: number) => {
    if (!audioManagerRef.current) return;

    const newTime = Math.min(
      audioManagerRef.current.getCurrentTime() + seconds,
      audioManagerRef.current.getTotalTime()
    );
    audioManagerRef.current.seekToTime(newTime);
    console.log(`🎵 [AudioContext] Skipped forward ${seconds}s to ${newTime.toFixed(2)}s`);
  };

  const skipBackward = (seconds: number) => {
    if (!audioManagerRef.current) return;

    const newTime = Math.max(audioManagerRef.current.getCurrentTime() - seconds, 0);
    audioManagerRef.current.seekToTime(newTime);
    console.log(`🎵 [AudioContext] Skipped backward ${seconds}s to ${newTime.toFixed(2)}s`);
  };

  // ========================================
  // POSITION MANAGEMENT
  // ========================================

  const savePosition = async () => {
    if (!selectedBook) return;

    console.log(`🎵 [AudioContext] Saving position for ${selectedBook.title}`);

    try {
      await readingPositionService.savePosition(selectedBook.id, {
        currentSentenceIndex,
        currentBundleIndex: getCurrentBundleIndex(),
        currentChapter,
        playbackTime,
        totalTime,
        cefrLevel,
        playbackSpeed,
        contentMode,
        completionPercentage: calculateCompletion(),
        sentencesRead: currentSentenceIndex
      });
    } catch (error) {
      console.error('🎵 [AudioContext] Error saving position:', error);
    }
  };

  const restorePosition = async (bookId: string) => {
    console.log(`🎵 [AudioContext] Restoring position for book: ${bookId}`);

    try {
      const savedPosition = await readingPositionService.loadPosition(bookId);

      if (savedPosition) {
        console.log(`🎵 [AudioContext] Position restored:`, {
          sentence: savedPosition.currentSentenceIndex,
          chapter: savedPosition.currentChapter,
          completion: savedPosition.completionPercentage
        });

        setCurrentSentenceIndex(savedPosition.currentSentenceIndex);
        setCurrentChapter(savedPosition.currentChapter);
        setCefrLevel(savedPosition.cefrLevel as any);
        setPlaybackSpeed(savedPosition.playbackSpeed);
        setContentMode(savedPosition.contentMode);

        // Find and set the correct bundle
        const bundle = findBundleForSentence(savedPosition.currentSentenceIndex);
        if (bundle) {
          setCurrentBundle(bundle.bundleId);
        }
      }
    } catch (error) {
      console.error('🎵 [AudioContext] Error restoring position:', error);
    }
  };

  // ========================================
  // UI CONTROL
  // ========================================

  const navigateToReading = () => {
    if (!selectedBook) return;
    console.log(`🎵 [AudioContext] Navigating to reading page for ${selectedBook.title}`);
    router.push(`/featured-books?bookId=${selectedBook.id}`);
  };

  // ========================================
  // HELPER: Get API Endpoint for Book
  // ========================================

  function getBookApiEndpoint(bookId: string, level: string): string {
    // Book-specific API mappings
    const BOOK_API_MAPPINGS: { [bookId: string]: { [level: string]: string } } = {
      'gutenberg-43': {
        'A1': '/api/jekyll-hyde/bundles',
        'A2': '/api/jekyll-hyde-a2/bundles'
      },
      'gift-of-the-magi': {
        'A1': '/api/gift-of-the-magi-a1/bundles',
        'A2': '/api/gift-of-the-magi-a2/bundles',
        'B1': '/api/gift-of-the-magi-b1/bundles'
      },
      'the-devoted-friend': {
        'A1': '/api/devoted-friend-a1/bundles',
        'A2': '/api/devoted-friend-a2/bundles',
        'B1': '/api/devoted-friend-b1/bundles'
      },
      'lady-with-dog': {
        'A1': '/api/lady-with-dog-a1/bundles',
        'A2': '/api/lady-with-dog-a2/bundles'
      },
      'the-dead': {
        'A1': '/api/the-dead-a1/bundles',
        'A2': '/api/the-dead-a2/bundles'
      },
      'the-metamorphosis': {
        'A1': '/api/the-metamorphosis-a1/bundles'
      },
      'the-necklace': {
        'A1': '/api/the-necklace-a1/bundles',
        'A2': '/api/the-necklace-a2/bundles',
        'B1': '/api/the-necklace-b1/bundles'
      },
    };

    // Check if book has custom API mapping
    if (BOOK_API_MAPPINGS[bookId] && BOOK_API_MAPPINGS[bookId][level]) {
      return BOOK_API_MAPPINGS[bookId][level];
    }

    // Default fallback
    return '/api/test-book/real-bundles';
  }

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const value: AudioContextValue = {
    // State
    selectedBook,
    bundleData,
    cefrLevel,
    contentMode,
    isPlaying,
    currentSentenceIndex,
    currentBundle,
    currentChapter,
    playbackTime,
    totalTime,
    playbackSpeed,
    isMiniPlayerVisible,
    isFullPlayerVisible,
    loading,
    error,

    // Actions
    loadBook,
    unloadBook,
    switchLevel,
    setContentMode,
    play,
    pause,
    resume,
    stop,
    seek,
    setSpeed,
    nextBundle,
    previousBundle,
    skipForward,
    skipBackward,
    setCurrentSentenceIndex,
    setCurrentBundle,
    setCurrentChapter,
    setCefrLevel,
    setBundleData,
    setLoading,
    setError,
    savePosition,
    restorePosition,
    setMiniPlayerVisible,
    setFullPlayerVisible,
    navigateToReading,
    findBundleForSentence,
    getCurrentBundleIndex,
    calculateCompletion
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export function useAudioContext() {
  const context = useContext(AudioContext);

  if (!context) {
    throw new Error('useAudioContext must be used within AudioProvider');
  }

  return context;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { FeaturedBook, RealBundleApiResponse, AudioContextState, AudioContextActions, AudioContextValue };
