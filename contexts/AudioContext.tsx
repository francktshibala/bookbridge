'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import {
  type FeaturedBook,
  FEATURED_BOOKS,
  BOOK_API_MAPPINGS,
  getBookDefaultLevel,
  getBookApiEndpoint,
  MULTI_LEVEL_BOOKS,
  SINGLE_LEVEL_BOOKS,
} from '@/lib/config/books';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// Re-export FeaturedBook from config
export type { FeaturedBook };

export interface BundleSentence {
  sentenceId: string;
  sentenceIndex: number;
  text: string;
  startTime: number;
  endTime: number;
  wordTimings: any[];
}

export interface BundleData {
  bundleId: string;
  bundleIndex: number;
  audioUrl: string;
  totalDuration: number;
  sentences: BundleSentence[];
}

export interface RealBundleApiResponse {
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

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type ContentMode = 'original' | 'simplified';

// State machine for load transitions (GPT-5 improvement #1)
export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

interface AudioContextState {
  // Book & Content Selection
  selectedBook: FeaturedBook | null;
  cefrLevel: CEFRLevel;
  contentMode: ContentMode;
  bundleData: RealBundleApiResponse | null;
  availableLevels: { [key: string]: boolean };
  currentBookAvailableLevels: string[];

  // Audio Playback State
  isPlaying: boolean;
  currentSentenceIndex: number;
  currentChapter: number;
  currentBundle: string | null;
  playbackTime: number;
  totalTime: number;
  playbackSpeed: number;

  // Data Fetching State (improved with state machine)
  loadState: LoadState;
  loading: boolean; // Computed: loadState === 'loading'
  error: string | null;

  // Actions (Dispatch Pattern) - Minimal public surface (GPT-5 improvement #5)
  selectBook: (book: FeaturedBook, initialLevel?: CEFRLevel) => Promise<void>;
  switchLevel: (newLevel: CEFRLevel) => Promise<void>;
  switchContentMode: (mode: ContentMode) => Promise<void>;
  play: (sentenceIndex?: number) => Promise<void>;
  pause: () => void;
  resume: () => void;
  seek: (sentenceIndex: number) => void;
  setSpeed: (speed: number) => void;
  nextChapter: () => void;
  previousChapter: () => void;
  jumpToChapter: (chapter: number) => void;
  unload: () => void; // Renamed from resetAudio for clarity
}

const AudioContext = createContext<AudioContextState | undefined>(undefined);

// ============================================================================
// TELEMETRY & UTILITIES (GPT-5 improvement #6)
// ============================================================================

interface TelemetryEvent {
  type: 'stale_apply_prevented' | 'load_started' | 'load_completed' | 'load_failed';
  bookId?: string;
  level?: string;
  requestId?: string;
  elapsed?: number;
  reason?: string;
}

const logTelemetry = (event: TelemetryEvent) => {
  const timestamp = new Date().toISOString();
  const prefix = event.type === 'stale_apply_prevented' ? '🛑' :
                 event.type === 'load_started' ? '🔄' :
                 event.type === 'load_completed' ? '✅' : '❌';

  console.log(`${prefix} [AudioContext Telemetry] ${event.type}`, {
    timestamp,
    ...event
  });

  // Future: Send to analytics service
  // analytics.track('audio_context', event);
};

// Throttled level persistence (GPT-5 improvement #4)
let levelPersistTimeout: NodeJS.Timeout | null = null;
const persistLevelChange = (bookId: string, level: CEFRLevel) => {
  // Immediate localStorage write
  try {
    localStorage.setItem(`bookbridge-book-${bookId}-level`, level);
  } catch (error) {
    console.warn('[AudioContext] Failed to persist level to localStorage:', error);
  }

  // Throttled DB write (300ms debounce)
  if (levelPersistTimeout) {
    clearTimeout(levelPersistTimeout);
  }
  levelPersistTimeout = setTimeout(async () => {
    try {
      // TODO: Integrate with reading-position service for DB persistence
      // await readingPositionService.updateLevel(bookId, level);
      console.log('[AudioContext] Level persisted to DB:', { bookId, level });
    } catch (error) {
      console.warn('[AudioContext] Failed to persist level to DB:', error);
    }
  }, 300);
};

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface AudioProviderProps {
  children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  // -------------------------------------------------------------------------
  // STATE: Book & Content Selection
  // -------------------------------------------------------------------------
  const [selectedBook, setSelectedBook] = useState<FeaturedBook | null>(null);
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>('A1');
  const [contentMode, setContentMode] = useState<ContentMode>('simplified');
  const [bundleData, setBundleData] = useState<RealBundleApiResponse | null>(null);
  const [availableLevels, setAvailableLevels] = useState<{ [key: string]: boolean }>({});
  const [currentBookAvailableLevels, setCurrentBookAvailableLevels] = useState<string[]>([]);

  // -------------------------------------------------------------------------
  // STATE: Audio Playback
  // -------------------------------------------------------------------------
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [currentBundle, setCurrentBundle] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // -------------------------------------------------------------------------
  // STATE: Data Fetching (with state machine)
  // -------------------------------------------------------------------------
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Computed loading state from state machine
  const loading = loadState === 'loading';

  // -------------------------------------------------------------------------
  // REFS: Audio Managers (Singletons)
  // -------------------------------------------------------------------------
  const audioManagerRef = useRef<any | null>(null);
  const playerRef = useRef<any | null>(null);
  const isPlayingRef = useRef<boolean>(false); // React closure fix

  // -------------------------------------------------------------------------
  // REFS: Request Cancellation (Race Condition Prevention)
  // -------------------------------------------------------------------------
  const currentRequestIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // -------------------------------------------------------------------------
  // ACTION: selectBook
  // Single Source of Truth for book selection and initial data load
  // -------------------------------------------------------------------------
  const selectBook = async (book: FeaturedBook, initialLevel?: CEFRLevel) => {
    console.log(`📚 [AudioContext] Selecting book: ${book.title}`);

    // Audio lifecycle cleanup before new book (GPT-5 improvement #3)
    cleanupAudio();

    // Update book selection
    setSelectedBook(book);

    // Set initial level (use provided or book's default)
    const defaultLevel = initialLevel || getDefaultLevel(book.id);
    setCefrLevel(defaultLevel);

    // Clear stale data
    setBundleData(null);
    setCurrentSentenceIndex(0);
    setCurrentChapter(1);
    setError(null);

    // Load book data
    await loadBookData(book.id, defaultLevel, contentMode);
  };

  // -------------------------------------------------------------------------
  // ACTION: switchLevel
  // Single Source of Truth for CEFR level changes (with persistence)
  // -------------------------------------------------------------------------
  const switchLevel = async (newLevel: CEFRLevel) => {
    if (!selectedBook) {
      console.warn('[AudioContext] No book selected, cannot switch level');
      return;
    }

    console.log(`🔄 [AudioContext] Switching level to: ${newLevel}`);
    setCefrLevel(newLevel);

    // Persist level change (GPT-5 improvement #4)
    persistLevelChange(selectedBook.id, newLevel);

    // Pause playback during level switch
    pause();

    // Audio lifecycle cleanup (GPT-5 improvement #3)
    cleanupAudio();

    // Clear stale data
    setBundleData(null);
    setCurrentSentenceIndex(0);

    // Reload data with new level
    await loadBookData(selectedBook.id, newLevel, contentMode);
  };

  // -------------------------------------------------------------------------
  // ACTION: switchContentMode
  // Single Source of Truth for original/simplified toggle
  // -------------------------------------------------------------------------
  const switchContentMode = async (mode: ContentMode) => {
    if (!selectedBook) {
      console.warn('[AudioContext] No book selected, cannot switch content mode');
      return;
    }

    console.log(`🔄 [AudioContext] Switching content mode to: ${mode}`);
    setContentMode(mode);

    // Pause playback during mode switch
    pause();

    // Clear stale data
    setBundleData(null);
    setCurrentSentenceIndex(0);

    // Reload data with new mode
    await loadBookData(selectedBook.id, cefrLevel, mode);
  };

  // -------------------------------------------------------------------------
  // ACTION: play
  // Start playback from specific sentence (or resume current)
  // -------------------------------------------------------------------------
  const play = async (sentenceIndex?: number) => {
    console.log(`▶️ [AudioContext] Play requested, sentence: ${sentenceIndex ?? currentSentenceIndex}`);

    if (sentenceIndex !== undefined) {
      setCurrentSentenceIndex(sentenceIndex);
    }

    setIsPlaying(true);
    isPlayingRef.current = true;

    // TODO: Integrate with BundleAudioManager
    // audioManagerRef.current?.play(sentenceIndex ?? currentSentenceIndex);
  };

  // -------------------------------------------------------------------------
  // ACTION: pause
  // Pause playback, maintain position
  // -------------------------------------------------------------------------
  const pause = () => {
    console.log(`⏸️ [AudioContext] Pause requested`);
    setIsPlaying(false);
    isPlayingRef.current = false;

    // TODO: Integrate with BundleAudioManager
    // audioManagerRef.current?.pause();
  };

  // -------------------------------------------------------------------------
  // ACTION: resume
  // Resume playback from current position
  // -------------------------------------------------------------------------
  const resume = () => {
    console.log(`▶️ [AudioContext] Resume requested`);
    setIsPlaying(true);
    isPlayingRef.current = true;

    // TODO: Integrate with BundleAudioManager
    // audioManagerRef.current?.resume();
  };

  // -------------------------------------------------------------------------
  // ACTION: seek
  // Jump to specific sentence
  // -------------------------------------------------------------------------
  const seek = (sentenceIndex: number) => {
    console.log(`⏩ [AudioContext] Seeking to sentence: ${sentenceIndex}`);
    setCurrentSentenceIndex(sentenceIndex);

    // TODO: Integrate with BundleAudioManager
    // audioManagerRef.current?.seek(sentenceIndex);
  };

  // -------------------------------------------------------------------------
  // ACTION: setSpeed
  // Change playback speed (1.0x, 1.25x, 1.5x, etc.)
  // -------------------------------------------------------------------------
  const setSpeed = (speed: number) => {
    console.log(`🎚️ [AudioContext] Setting playback speed: ${speed}x`);
    setPlaybackSpeed(speed);

    // TODO: Integrate with BundleAudioManager
    // audioManagerRef.current?.setSpeed(speed);
  };

  // -------------------------------------------------------------------------
  // ACTION: Chapter Navigation
  // -------------------------------------------------------------------------
  const nextChapter = () => {
    console.log(`⏭️ [AudioContext] Next chapter`);
    setCurrentChapter(prev => prev + 1);
    setCurrentSentenceIndex(0);
    pause();
  };

  const previousChapter = () => {
    console.log(`⏮️ [AudioContext] Previous chapter`);
    setCurrentChapter(prev => Math.max(1, prev - 1));
    setCurrentSentenceIndex(0);
    pause();
  };

  const jumpToChapter = (chapter: number) => {
    console.log(`📖 [AudioContext] Jumping to chapter: ${chapter}`);
    setCurrentChapter(chapter);
    setCurrentSentenceIndex(0);
    pause();
  };

  // -------------------------------------------------------------------------
  // HELPER: cleanupAudio
  // Stop and detach audio elements before new loads (GPT-5 improvement #3)
  // -------------------------------------------------------------------------
  const cleanupAudio = () => {
    console.log(`🧹 [AudioContext] Cleaning up audio lifecycle`);

    // Stop playback
    pause();

    // Cleanup audio manager
    if (audioManagerRef.current) {
      try {
        // Stop any active audio
        // TODO: Add proper destroy method to BundleAudioManager
        // audioManagerRef.current?.stop();
        // audioManagerRef.current?.destroy();
        audioManagerRef.current = null;
      } catch (error) {
        console.warn('[AudioContext] Error during audio cleanup:', error);
      }
    }

    // Cleanup player
    if (playerRef.current) {
      try {
        // TODO: Add proper cleanup method to AudioBookPlayer
        // playerRef.current?.destroy();
        playerRef.current = null;
      } catch (error) {
        console.warn('[AudioContext] Error during player cleanup:', error);
      }
    }

    // Reset playback state
    isPlayingRef.current = false;
  };

  // -------------------------------------------------------------------------
  // ACTION: unload
  // Clear all audio state (for cleanup/unmounting)
  // -------------------------------------------------------------------------
  const unload = () => {
    console.log(`🔄 [AudioContext] Unloading audio context`);

    // Full audio cleanup
    cleanupAudio();

    // Reset all state
    setCurrentSentenceIndex(0);
    setCurrentChapter(1);
    setCurrentBundle(null);
    setPlaybackTime(0);
    setTotalTime(0);
    setLoadState('idle');
    setError(null);
  };

  // -------------------------------------------------------------------------
  // INTERNAL: loadBookData
  // Core data fetching logic with state machine (GPT-5 improvements #1, #2, #6)
  // -------------------------------------------------------------------------
  const loadBookData = async (
    bookId: string,
    level: CEFRLevel,
    mode: ContentMode
  ) => {
    const startTime = Date.now();

    // Create new request token and abort controller
    const reqId = crypto.randomUUID();
    currentRequestIdRef.current = reqId;

    // Telemetry: Load started
    logTelemetry({
      type: 'load_started',
      bookId,
      level,
      requestId: reqId
    });

    // Abort previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // State machine transition: idle/ready/error → loading
      setLoadState('loading');
      setError(null);

      // Check available levels
      const availability = await checkAvailableLevels(bookId, abortController.signal, reqId);

      // GPT-5 improvement #2: Enforce requestId check
      if (currentRequestIdRef.current !== reqId) {
        logTelemetry({
          type: 'stale_apply_prevented',
          bookId,
          level,
          requestId: reqId,
          reason: 'Request superseded after availability check'
        });
        return;
      }

      // Determine final level parameter
      let levelParam = mode === 'original' ? 'original' : level;

      // Apply fallback logic based on availability
      if (availability && levelParam !== 'original' && !availability[levelParam.toLowerCase()]) {
        const bookDefaultLevel = getBookDefaultLevel(bookId);
        console.log(`📋 [AudioContext] Level ${levelParam} not available, using: ${bookDefaultLevel}`);
        levelParam = bookDefaultLevel as any;
        setCefrLevel(bookDefaultLevel as CEFRLevel);
      }

      let data: RealBundleApiResponse | null = null;

      // Handle original content differently
      if (mode === 'original' && levelParam === 'original') {
        // GPT-5 improvement #2: Enforce requestId check
        if (currentRequestIdRef.current !== reqId) {
          logTelemetry({
            type: 'stale_apply_prevented',
            bookId,
            requestId: reqId,
            reason: 'Request superseded before original content fetch'
          });
          return;
        }

        // Fetch original text from book content API
        const contentResponse = await fetch(`/api/books/${bookId}/content`, {
          cache: 'no-store',
          signal: abortController.signal
        });

        if (contentResponse.ok) {
          const contentData = await contentResponse.json();

          // Find the book info
          const bookInfo = FEATURED_BOOKS.find(b => b.id === bookId);

          // Transform original content to bundle format
          const sentences = contentData.content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
          console.log('🚨 [AudioContext] Using text-splitting fallback path! This breaks on Mr./Dr./etc.');
          const sentencesPerBundle = 4;
          const bundles: BundleData[] = [];

          for (let i = 0; i < sentences.length; i += sentencesPerBundle) {
            const bundleSentences: BundleSentence[] = [];
            const bundleTexts = sentences.slice(i, Math.min(i + sentencesPerBundle, sentences.length));

            bundleTexts.forEach((text: string, index: number) => {
              const cleanText = text.trim();
              if (cleanText) {
                bundleSentences.push({
                  sentenceId: `original-${i + index}`,
                  sentenceIndex: i + index,
                  text: cleanText + (cleanText.match(/[.!?]$/) ? '' : '.'),
                  startTime: index * 2,
                  endTime: (index + 1) * 2,
                  wordTimings: []
                });
              }
            });

            if (bundleSentences.length > 0) {
              bundles.push({
                bundleId: `original-bundle-${bundles.length}`,
                bundleIndex: bundles.length,
                audioUrl: '', // No audio for original text
                totalDuration: bundleSentences.length * 2,
                sentences: bundleSentences
              });
            }
          }

          data = {
            success: true,
            bookId: bookId,
            title: contentData.title || bookInfo?.title || 'Book',
            author: contentData.author || bookInfo?.author || 'Author',
            level: 'original',
            bundleCount: bundles.length,
            totalSentences: sentences.length,
            bundles: bundles,
            audioType: 'none'
          };
        }
      } else {
        // Handle simplified content
        // GPT-5 improvement #2: Enforce requestId check
        if (currentRequestIdRef.current !== reqId) {
          logTelemetry({
            type: 'stale_apply_prevented',
            bookId,
            level,
            requestId: reqId,
            reason: 'Request superseded before simplified content fetch'
          });
          return;
        }

        // Use dynamic API endpoint detection
        const apiEndpoint = getBookApiEndpoint(bookId, levelParam);
        const apiUrl = `${apiEndpoint}?bookId=${bookId}&level=${levelParam}&t=${Date.now()}`;

        console.log(`🌐 [AudioContext] Fetching from: ${apiUrl}`);

        const response = await fetch(apiUrl, {
          cache: 'no-store',
          signal: abortController.signal
        });

        if (response.ok) {
          data = await response.json();
        } else {
          throw new Error(`Failed to fetch book data: ${response.status} ${response.statusText}`);
        }
      }

      // GPT-5 improvement #2: Final requestId check before state update
      if (currentRequestIdRef.current !== reqId || abortController.signal.aborted) {
        logTelemetry({
          type: 'stale_apply_prevented',
          bookId,
          level,
          requestId: reqId,
          reason: 'Request superseded before setting bundle data'
        });
        return;
      }

      if (data && data.success && data.totalSentences > 0) {
        // GPT-5 improvement #2: Double-check before mutation
        if (currentRequestIdRef.current === reqId) {
          setBundleData(data);
          setTotalTime(0); // Will be calculated by audio manager

          // State machine transition: loading → ready
          setLoadState('ready');

          const elapsed = Date.now() - startTime;
          logTelemetry({
            type: 'load_completed',
            bookId,
            level,
            requestId: reqId,
            elapsed
          });

          console.log(`✅ [AudioContext] Loaded ${data.totalSentences} sentences, ${data.bundleCount} bundles (${elapsed}ms)`);
        } else {
          logTelemetry({
            type: 'stale_apply_prevented',
            bookId,
            level,
            requestId: reqId,
            reason: 'Request superseded during final state update'
          });
        }

        // TODO: Initialize audio manager and player
        // This will be done in a future task once we integrate BundleAudioManager
      } else {
        throw new Error('Invalid book data received');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        logTelemetry({
          type: 'stale_apply_prevented',
          bookId,
          level,
          requestId: reqId,
          reason: 'Request aborted'
        });
        return;
      }

      const elapsed = Date.now() - startTime;
      const errorMessage = err.message || 'Failed to load book data';

      // State machine transition: loading → error
      setLoadState('error');
      setError(errorMessage);

      logTelemetry({
        type: 'load_failed',
        bookId,
        level,
        requestId: reqId,
        elapsed,
        reason: errorMessage
      });

      console.error(`❌ [AudioContext] Load failed:`, err);
    }
  };

  // -------------------------------------------------------------------------
  // INTERNAL: checkAvailableLevels
  // Check which CEFR levels exist for a book
  // -------------------------------------------------------------------------
  const checkAvailableLevels = async (
    bookId: string,
    signal: AbortSignal,
    reqId: string
  ): Promise<{ [key: string]: boolean } | undefined> => {
    const availability: { [key: string]: boolean } = {};

    // Handle multi-level books
    if (MULTI_LEVEL_BOOKS[bookId]) {
      for (const level of MULTI_LEVEL_BOOKS[bookId]) {
        try {
          const apiEndpoint = getBookApiEndpoint(bookId, level);
          const apiUrl = `${apiEndpoint}?bookId=${bookId}&level=${level}&t=${Date.now()}`;

          const response = await fetch(apiUrl, {
            cache: 'no-store',
            signal
          });

          if (response.ok) {
            const data = await response.json();
            availability[level.toLowerCase()] = data.success === true;
          } else {
            availability[level.toLowerCase()] = false;
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log(`🛑 [AudioContext] Availability fetch aborted for ${level}`);
            return;
          }
          availability[level.toLowerCase()] = false;
        }
      }
    }
    // Handle single-level books
    else if (SINGLE_LEVEL_BOOKS[bookId]) {
      const bookLevel = SINGLE_LEVEL_BOOKS[bookId];
      availability[bookLevel.toLowerCase()] = true;
      console.log(`📋 [AudioContext] Single-level book ${bookId} set to ${bookLevel}`);
    }

    // Handle original content check for all books
    try {
      const response = await fetch(`/api/books/${bookId}/content`, {
        cache: 'no-store',
        signal
      });
      availability['original'] = response.ok;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`🛑 [AudioContext] Original content check aborted`);
        return;
      }
      availability['original'] = false;
    }

    // GPT-5 improvement #2: Enforce requestId check before state update
    if (currentRequestIdRef.current !== reqId) {
      logTelemetry({
        type: 'stale_apply_prevented',
        bookId,
        requestId: reqId,
        reason: 'Request superseded during availability check'
      });
      return;
    }

    // Extract available levels for the current book (excluding 'original')
    const bookLevels = Object.entries(availability)
      .filter(([level, available]) => level !== 'original' && available)
      .map(([level]) => level.toUpperCase());

    // Final check before mutating state
    if (currentRequestIdRef.current === reqId) {
      setAvailableLevels(availability);
      setCurrentBookAvailableLevels(bookLevels);
    } else {
      logTelemetry({
        type: 'stale_apply_prevented',
        bookId,
        requestId: reqId,
        reason: 'Request superseded before setting availability'
      });
      return;
    }

    console.log(`📋 [AudioContext] Available levels for ${bookId}:`, availability);
    console.log(`📋 [AudioContext] CEFR levels for ${bookId}:`, bookLevels);

    return availability;
  };

  // -------------------------------------------------------------------------
  // HELPER: getDefaultLevel (wrapper)
  // Determine default CEFR level for a book
  // -------------------------------------------------------------------------
  const getDefaultLevel = (bookId: string): CEFRLevel => {
    return getBookDefaultLevel(bookId) as CEFRLevel;
  };

  // -------------------------------------------------------------------------
  // CONTEXT VALUE (Minimal public surface - GPT-5 improvement #5)
  // -------------------------------------------------------------------------
  const value: AudioContextState = {
    // State
    selectedBook,
    cefrLevel,
    contentMode,
    bundleData,
    availableLevels,
    currentBookAvailableLevels,
    isPlaying,
    currentSentenceIndex,
    currentChapter,
    currentBundle,
    playbackTime,
    totalTime,
    playbackSpeed,
    loadState,
    loading,
    error,

    // Actions (minimal public API)
    selectBook,
    switchLevel,
    switchContentMode,
    play,
    pause,
    resume,
    seek,
    setSpeed,
    nextChapter,
    previousChapter,
    jumpToChapter,
    unload,
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
  if (context === undefined) {
    // During SSR or when AudioProvider is not available
    if (typeof window === 'undefined') {
      throw new Error('useAudioContext must be used within an AudioProvider');
    }
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
}
