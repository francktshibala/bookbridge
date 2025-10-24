'use client';

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
  useMemo
} from 'react';
import { BundleAudioManager, type BundleData, type BundleSentence } from '@/lib/audio/BundleAudioManager';
import { readingPositionService } from '@/lib/services/reading-position';

// ============================================================================
// TYPES
// ============================================================================

interface BookMetadata {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  level: string;
}

interface GlobalAudioState {
  // Audio Manager Instance
  audioManager: BundleAudioManager | null;

  // Current Book & Bundles
  currentBook: BookMetadata | null;
  allBundles: BundleData[];
  currentBundleIndex: number;
  currentSentenceIndex: number;

  // Playback State
  isPlaying: boolean;
  currentTime: number;        // Time in current bundle
  bundleDuration: number;     // Duration of current bundle
  playbackSpeed: number;

  // Total Story Progress (NEW - for progress bar)
  totalStoryDuration: number;  // Total duration of all bundles
  totalStoryProgress: number;  // Current position in entire story

  // UI State
  isMiniPlayerVisible: boolean;
  isMiniPlayerMinimized: boolean;

  // Methods
  loadBook: (book: BookMetadata, bundles: BundleData[], startBundleIndex?: number) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seekToTime: (time: number) => void;
  seekToStoryTime: (totalTime: number) => Promise<void>;
  setSpeed: (speed: number) => void;
  jumpToBundle: (bundleIndex: number, sentenceIndex?: number) => Promise<void>;
  closeMiniPlayer: () => void;
  toggleMinimize: () => void;
  updateCurrentSentence: (sentenceIndex: number) => void;
}

const GlobalAudioContext = createContext<GlobalAudioState | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface GlobalAudioProviderProps {
  children: ReactNode;
}

export function GlobalAudioProvider({ children }: GlobalAudioProviderProps) {
  // ============================================================================
  // STATE
  // ============================================================================

  const [mounted, setMounted] = useState(false);

  // Book & Bundle State
  const [currentBook, setCurrentBook] = useState<BookMetadata | null>(null);
  const [allBundles, setAllBundles] = useState<BundleData[]>([]);
  const [currentBundleIndex, setCurrentBundleIndex] = useState(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);

  // Keep refs in sync with state for closure safety
  useEffect(() => {
    currentBundleIndexRef.current = currentBundleIndex;
  }, [currentBundleIndex]);

  useEffect(() => {
    allBundlesRef.current = allBundles;
  }, [allBundles]);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [bundleDuration, setBundleDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // Total Story Progress
  const [totalStoryDuration, setTotalStoryDuration] = useState(0);
  const [totalStoryProgress, setTotalStoryProgress] = useState(0);

  // UI State
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(false);
  const [isMiniPlayerMinimized, setIsMiniPlayerMinimized] = useState(false);

  // Refs
  const audioManagerRef = useRef<BundleAudioManager | null>(null);
  const isPlayingRef = useRef(false); // For closure safety
  const currentBundleIndexRef = useRef(0); // For closure safety in callbacks
  const allBundlesRef = useRef<BundleData[]>([]); // For closure safety in callbacks

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    setMounted(true);

    // Create single BundleAudioManager instance
    if (!audioManagerRef.current) {
      console.log('🎵 Creating global BundleAudioManager instance');
      audioManagerRef.current = new BundleAudioManager({
        onSentenceStart: (sentence) => {
          console.log(`📖 Sentence ${sentence.sentenceIndex} started`);
          setCurrentSentenceIndex(sentence.sentenceIndex);
        },
        onSentenceEnd: (sentence) => {
          console.log(`✅ Sentence ${sentence.sentenceIndex} ended`);
        },
        onBundleComplete: (bundleId) => {
          console.log(`🏁 Bundle ${bundleId} complete`);
          handleBundleComplete();
        },
        onTimeUpdate: (current, total) => {
          setCurrentTime(current);
          setBundleDuration(total);

          // Calculate total story progress
          updateTotalStoryProgress(current);
        },
      });
    }

    // Cleanup on unmount
    return () => {
      if (audioManagerRef.current) {
        console.log('🧹 Cleaning up global audio manager');
        audioManagerRef.current.destroy();
        audioManagerRef.current = null;
      }
    };
  }, []);

  // ============================================================================
  // TOTAL STORY PROGRESS CALCULATION
  // ============================================================================

  const updateTotalStoryProgress = useCallback((currentTimeInBundle: number) => {
    if (allBundles.length === 0) return;

    // Sum duration of all previous bundles
    const previousBundlesTime = allBundles
      .slice(0, currentBundleIndex)
      .reduce((sum, bundle) => sum + (bundle.totalDuration || 0), 0);

    // Total progress = previous bundles + current position
    const total = previousBundlesTime + currentTimeInBundle;
    setTotalStoryProgress(total);
  }, [allBundles, currentBundleIndex]);

  // Calculate total story duration when bundles change
  useEffect(() => {
    if (allBundles.length > 0) {
      const total = allBundles.reduce((sum, bundle) => {
        return sum + (bundle.totalDuration || 0);
      }, 0);
      setTotalStoryDuration(total);
      console.log(`📊 Total story duration: ${(total / 60).toFixed(1)} minutes`);
    }
  }, [allBundles]);

  // ============================================================================
  // LOAD BOOK
  // ============================================================================

  const loadBook = useCallback(async (
    book: BookMetadata,
    bundles: BundleData[],
    startBundleIndex: number = 0
  ) => {
    console.log(`📚 Loading book: ${book.title} (${bundles.length} bundles)`);

    // Stop any current playback
    if (audioManagerRef.current) {
      audioManagerRef.current.stop();
    }

    // Update state
    setCurrentBook(book);
    setAllBundles(bundles);
    setCurrentBundleIndex(startBundleIndex);
    setCurrentSentenceIndex(0);
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentTime(0);
    setIsMiniPlayerVisible(true);
    setIsMiniPlayerMinimized(false);

    // Load first bundle (or specified bundle)
    if (bundles.length > 0 && audioManagerRef.current) {
      const bundle = bundles[startBundleIndex];
      console.log(`🎵 Loading bundle ${startBundleIndex}: ${bundle.bundleId}`);

      // Don't auto-play, just load
      // User can click play when ready
    }
  }, []);

  // ============================================================================
  // PLAYBACK CONTROLS
  // ============================================================================

  const play = useCallback(async () => {
    if (!audioManagerRef.current || allBundles.length === 0) {
      console.warn('⚠️ Cannot play - no audio manager or bundles');
      return;
    }

    const bundle = allBundles[currentBundleIndex];
    if (!bundle) {
      console.warn('⚠️ Cannot play - no bundle at index', currentBundleIndex);
      return;
    }

    console.log(`▶️ Playing bundle ${currentBundleIndex}, sentence ${currentSentenceIndex}`);

    try {
      await audioManagerRef.current.playSequentialSentences(bundle, currentSentenceIndex);
      setIsPlaying(true);
      isPlayingRef.current = true;
    } catch (error) {
      console.error('Failed to play:', error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, [allBundles, currentBundleIndex, currentSentenceIndex]);

  const pause = useCallback(() => {
    if (!audioManagerRef.current) return;

    console.log('⏸️ Pausing playback');
    audioManagerRef.current.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  const stop = useCallback(() => {
    if (!audioManagerRef.current) return;

    console.log('⏹️ Stopping playback');
    audioManagerRef.current.stop();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentTime(0);
    setCurrentSentenceIndex(0);
  }, []);

  // ============================================================================
  // SEEKING
  // ============================================================================

  const seekToTime = useCallback((time: number) => {
    if (!audioManagerRef.current) return;

    console.log(`⏩ Seeking to ${time.toFixed(2)}s in current bundle`);
    audioManagerRef.current.seekToTime(time);
    setCurrentTime(time);
  }, []);

  const seekToStoryTime = useCallback(async (totalTime: number) => {
    if (allBundles.length === 0) return;

    console.log(`🎯 Seeking to ${totalTime.toFixed(2)}s in total story`);

    // Find which bundle contains this time
    let accumulatedTime = 0;
    let targetBundleIndex = 0;
    let timeInBundle = 0;

    for (let i = 0; i < allBundles.length; i++) {
      const bundleDuration = allBundles[i].totalDuration || 0;

      if (accumulatedTime + bundleDuration >= totalTime) {
        targetBundleIndex = i;
        timeInBundle = totalTime - accumulatedTime;
        break;
      }

      accumulatedTime += bundleDuration;
    }

    console.log(`📍 Target: Bundle ${targetBundleIndex}, time ${timeInBundle.toFixed(2)}s`);

    // If different bundle, jump to it
    if (targetBundleIndex !== currentBundleIndex) {
      await jumpToBundle(targetBundleIndex, 0);
    }

    // Seek to time within bundle
    seekToTime(timeInBundle);
  }, [allBundles, currentBundleIndex]);

  // ============================================================================
  // BUNDLE NAVIGATION
  // ============================================================================

  const jumpToBundle = useCallback(async (
    bundleIndex: number,
    sentenceIndex: number = 0
  ) => {
    if (!audioManagerRef.current || bundleIndex < 0 || bundleIndex >= allBundles.length) {
      console.warn('⚠️ Invalid bundle index:', bundleIndex);
      return;
    }

    const wasPlaying = isPlayingRef.current;

    // Stop current playback
    audioManagerRef.current.stop();
    setIsPlaying(false);
    isPlayingRef.current = false;

    // Update state
    setCurrentBundleIndex(bundleIndex);
    setCurrentSentenceIndex(sentenceIndex);
    setCurrentTime(0);

    console.log(`🔄 Jumped to bundle ${bundleIndex}, sentence ${sentenceIndex}`);

    // Resume playback if was playing
    if (wasPlaying) {
      await play();
    }
  }, [allBundles, play]);

  const handleBundleComplete = useCallback(async () => {
    // Use refs to get latest values (avoids stale closure)
    const currentIndex = currentBundleIndexRef.current;
    const bundles = allBundlesRef.current;
    const nextBundleIndex = currentIndex + 1;

    console.log(`🏁 Bundle complete! Current: ${currentIndex}, Total: ${bundles.length}`);

    if (nextBundleIndex < bundles.length) {
      console.log(`➡️ Auto-advancing to bundle ${nextBundleIndex}`);
      await jumpToBundle(nextBundleIndex, 0);
    } else {
      console.log('🏁 Story complete!');
      setIsPlaying(false);
      isPlayingRef.current = false;

      // Save completion to reading position
      if (currentBook) {
        await readingPositionService.savePosition(currentBook.id, {
          currentBundleIndex: bundles.length - 1,
          currentSentenceIndex: bundles[bundles.length - 1]?.sentences.length - 1 || 0,
          currentChapter: bundles.length, // Use bundle as chapter (completion is last bundle)
          playbackTime: totalStoryProgress,
          totalTime: totalStoryDuration,
          cefrLevel: currentBook.level,
          playbackSpeed,
          contentMode: 'simplified',
          completionPercentage: 100,
          sentencesRead: bundles[bundles.length - 1]?.sentences.length - 1 || 0,
        });
      }
    }
  }, [jumpToBundle, currentBook, totalStoryProgress, totalStoryDuration, playbackSpeed]);

  // ============================================================================
  // OTHER CONTROLS
  // ============================================================================

  const setSpeed = useCallback((speed: number) => {
    if (!audioManagerRef.current) return;

    console.log(`🎵 Setting playback speed to ${speed}x`);
    audioManagerRef.current.setPlaybackRate(speed);
    setPlaybackSpeed(speed);
  }, []);

  const updateCurrentSentence = useCallback((sentenceIndex: number) => {
    setCurrentSentenceIndex(sentenceIndex);
  }, []);

  const closeMiniPlayer = useCallback(async () => {
    console.log('❌ Closing mini player');

    // Save position before closing
    if (currentBook && allBundles.length > 0) {
      await readingPositionService.savePosition(currentBook.id, {
        currentBundleIndex,
        currentSentenceIndex,
        currentChapter: currentBundleIndex + 1, // Use bundle as chapter
        playbackTime: totalStoryProgress,
        totalTime: totalStoryDuration,
        cefrLevel: currentBook.level,
        playbackSpeed,
        contentMode: 'simplified',
        completionPercentage: (totalStoryProgress / totalStoryDuration) * 100,
        sentencesRead: currentSentenceIndex,
      });
    }

    // Stop audio
    stop();

    // Clear state
    setCurrentBook(null);
    setAllBundles([]);
    setIsMiniPlayerVisible(false);
  }, [currentBook, allBundles, currentBundleIndex, currentSentenceIndex, totalStoryProgress, totalStoryDuration, playbackSpeed, stop]);

  const toggleMinimize = useCallback(() => {
    setIsMiniPlayerMinimized(prev => !prev);
  }, []);

  // ============================================================================
  // SAVE POSITION ON NAVIGATION
  // ============================================================================

  useEffect(() => {
    // Auto-save position every 5 seconds while playing
    if (!isPlaying || !currentBook) return;

    const interval = setInterval(async () => {
      await readingPositionService.savePosition(currentBook.id, {
        currentBundleIndex,
        currentSentenceIndex,
        currentChapter: currentBundleIndex + 1, // Use bundle as chapter
        playbackTime: totalStoryProgress,
        totalTime: totalStoryDuration,
        cefrLevel: currentBook.level,
        playbackSpeed,
        contentMode: 'simplified',
        completionPercentage: totalStoryDuration > 0
          ? (totalStoryProgress / totalStoryDuration) * 100
          : 0,
        sentencesRead: currentSentenceIndex,
      });
      console.log('💾 Auto-saved reading position');
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, currentBook, currentBundleIndex, currentSentenceIndex, totalStoryProgress, totalStoryDuration, playbackSpeed]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue: GlobalAudioState = useMemo(() => ({
    audioManager: audioManagerRef.current,
    currentBook,
    allBundles,
    currentBundleIndex,
    currentSentenceIndex,
    isPlaying,
    currentTime,
    bundleDuration,
    playbackSpeed,
    totalStoryDuration,
    totalStoryProgress,
    isMiniPlayerVisible,
    isMiniPlayerMinimized,
    loadBook,
    play,
    pause,
    stop,
    seekToTime,
    seekToStoryTime,
    setSpeed,
    jumpToBundle,
    closeMiniPlayer,
    toggleMinimize,
    updateCurrentSentence,
  }), [
    currentBook,
    allBundles,
    currentBundleIndex,
    currentSentenceIndex,
    isPlaying,
    currentTime,
    bundleDuration,
    playbackSpeed,
    totalStoryDuration,
    totalStoryProgress,
    isMiniPlayerVisible,
    isMiniPlayerMinimized,
    loadBook,
    play,
    pause,
    stop,
    seekToTime,
    seekToStoryTime,
    setSpeed,
    jumpToBundle,
    closeMiniPlayer,
    toggleMinimize,
    updateCurrentSentence,
  ]);

  // ============================================================================
  // SSR SAFETY
  // ============================================================================

  if (!mounted) {
    return (
      <GlobalAudioContext.Provider value={{
        audioManager: null,
        currentBook: null,
        allBundles: [],
        currentBundleIndex: 0,
        currentSentenceIndex: 0,
        isPlaying: false,
        currentTime: 0,
        bundleDuration: 0,
        playbackSpeed: 1.0,
        totalStoryDuration: 0,
        totalStoryProgress: 0,
        isMiniPlayerVisible: false,
        isMiniPlayerMinimized: false,
        loadBook: async () => {},
        play: async () => {},
        pause: () => {},
        stop: () => {},
        seekToTime: () => {},
        seekToStoryTime: async () => {},
        setSpeed: () => {},
        jumpToBundle: async () => {},
        closeMiniPlayer: () => {},
        toggleMinimize: () => {},
        updateCurrentSentence: () => {},
      }}>
        {children}
      </GlobalAudioContext.Provider>
    );
  }

  return (
    <GlobalAudioContext.Provider value={contextValue}>
      {children}
    </GlobalAudioContext.Provider>
  );
}

// ============================================================================
// HOOK (kept in same file for simplicity, but could be separate)
// ============================================================================

export function useGlobalAudio() {
  const context = useContext(GlobalAudioContext);
  if (context === undefined) {
    throw new Error('useGlobalAudio must be used within a GlobalAudioProvider');
  }
  return context;
}
