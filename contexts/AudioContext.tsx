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
import { readingPositionService, type ReadingPosition } from '@/lib/services/reading-position';
import { loadBookBundles } from '@/lib/services/book-loader';
import { checkLevelAvailability } from '@/lib/services/availability';
import { saveLevelToStorage } from '@/lib/services/level-persistence';
import { determineFinalLevel, calculateHoursSinceLastRead } from '@/lib/services/audio-transforms';
import { trackEvent, withCommon, getOrCreateSessionId } from '@/lib/services/analytics-service';

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

// Resume info for UI toast/modal (Commit 5)
export interface ResumeInfo {
  sentenceIndex: number;
  chapter: number;
  totalSentences: number;
  playbackSpeed?: number;
  hoursSinceLastRead: number;
}

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

  // Resume State (Commit 5)
  resumeInfo: ResumeInfo | null;

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
  clearResumeInfo: () => void; // Clear resume toast/modal (Commit 5)
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
  // Phase 4: Use pure localStorage service (extracted for testability)
  saveLevelToStorage(bookId, level);

  // Throttled DB write (300ms debounce per GPT-5 guidance)
  if (levelPersistTimeout) {
    clearTimeout(levelPersistTimeout);
  }
  levelPersistTimeout = setTimeout(async () => {
    try {
      // Phase 2 Task 2.2: Persist level to DB via reading-position service
      const savedPosition = await readingPositionService.loadPosition(bookId);

      if (savedPosition) {
        // Update level in existing position and save
        await readingPositionService.savePosition(bookId, {
          ...savedPosition,
          cefrLevel: level
        });
        console.log('[AudioContext] Level persisted to DB:', { bookId, level });
      }
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
  // STATE: Resume (Commit 5)
  // -------------------------------------------------------------------------
  const [resumeInfo, setResumeInfo] = useState<ResumeInfo | null>(null);

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
  // REFS: Analytics Tracking
  // -------------------------------------------------------------------------
  const sessionIdRef = useRef<string>(getOrCreateSessionId());
  const loadStartTimeRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const bundlesCompletedRef = useRef<number>(0); // TODO: Increment when bundle completes

  // -------------------------------------------------------------------------
  // ACTION: selectBook
  // Single Source of Truth for book selection and initial data load
  // -------------------------------------------------------------------------
  const selectBook = async (book: FeaturedBook, initialLevel?: CEFRLevel) => {
    console.log(`📚 [AudioContext] Selecting book: ${book.title}`);

    // Set initial level (use provided or book's default)
    const defaultLevel = initialLevel || getDefaultLevel(book.id);

    // Analytics: Track book selection (book popularity metric)
    trackEvent('book_selected', withCommon({
      book_id: book.id,
      book_title: book.title,
      level: defaultLevel
    }, {
      sessionId: sessionIdRef.current,
      bookId: book.id,
      bookTitle: book.title,
      level: defaultLevel
    }));

    // Audio lifecycle cleanup before new book (GPT-5 improvement #3)
    cleanupAudio();

    // Update book selection
    setSelectedBook(book);

    // Set level
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

    // Analytics: Track audio playback (validates TTS ROI)
    trackEvent('audio_played', withCommon({
      chapter: currentChapter,
      bundle_index: currentBundle ? parseInt(currentBundle) : undefined,
      sentence_index: sentenceIndex ?? currentSentenceIndex,
      playback_speed: playbackSpeed
    }, {
      sessionId: sessionIdRef.current,
      bookId: selectedBook?.id,
      bookTitle: selectedBook?.title,
      level: cefrLevel
    }));

    // TODO: Integrate with BundleAudioManager
    // audioManagerRef.current?.play(sentenceIndex ?? currentSentenceIndex);

    // TODO: Analytics - Track first_audio_ready when audio manager is integrated
    // Track Time-To-First-Audio (TTFA) when first audio buffer is ready
    // if (loadStartTimeRef.current && /* audio ready condition */) {
    //   trackEvent('first_audio_ready', withCommon({
    //     book_id: selectedBook?.id,
    //     level: cefrLevel,
    //     ms_first_audio: Date.now() - loadStartTimeRef.current
    //   }, { sessionId: sessionIdRef.current }));
    //   loadStartTimeRef.current = null; // Only track once per load
    // }
  };

  // -------------------------------------------------------------------------
  // ACTION: pause
  // Pause playback, maintain position
  // -------------------------------------------------------------------------
  const pause = () => {
    console.log(`⏸️ [AudioContext] Pause requested`);
    setIsPlaying(false);
    isPlayingRef.current = false;

    // Analytics: Track audio pause
    trackEvent('audio_paused', withCommon({
      chapter: currentChapter,
      sentence_index: currentSentenceIndex,
      audio_time: playbackTime // Current playback position
    }, {
      sessionId: sessionIdRef.current,
      bookId: selectedBook?.id,
      bookTitle: selectedBook?.title,
      level: cefrLevel
    }));

    // TODO: Integrate with BundleAudioManager
    // audioManagerRef.current?.pause();
    // TODO: When integrated, use audioManager.getCurrentTime() instead of playbackTime
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
    const newChapter = currentChapter + 1;

    // Analytics: Track chapter navigation
    trackEvent('chapter_started', withCommon({
      chapter: newChapter,
      from_chapter: currentChapter
    }, {
      sessionId: sessionIdRef.current,
      bookId: selectedBook?.id,
      bookTitle: selectedBook?.title,
      level: cefrLevel
    }));

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

    // Analytics: Track chapter jump
    trackEvent('chapter_started', withCommon({
      chapter: chapter,
      from_chapter: currentChapter
    }, {
      sessionId: sessionIdRef.current,
      bookId: selectedBook?.id,
      bookTitle: selectedBook?.title,
      level: cefrLevel
    }));

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
    setResumeInfo(null);
  };

  // -------------------------------------------------------------------------
  // ACTION: clearResumeInfo (Commit 5)
  // Clear resume modal/toast state (user dismissed or acted on it)
  // -------------------------------------------------------------------------
  const clearResumeInfo = () => {
    console.log(`🔄 [AudioContext] Clearing resume info`);

    // TODO: Analytics - Add resume_clicked tracking in UI component when user clicks "Continue Reading"
    // The UI component should call trackEvent('resume_clicked', ...) BEFORE calling clearResumeInfo()
    // Example in ResumeModal.tsx:
    // const handleContinue = () => {
    //   trackEvent('resume_clicked', withCommon({
    //     chapter: resumeInfo.chapter,
    //     sentence_index: resumeInfo.sentenceIndex,
    //     hours_since_last_read: resumeInfo.hoursSinceLastRead
    //   }, { sessionId, bookId, level }));
    //   clearResumeInfo();
    // };

    setResumeInfo(null);
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
    loadStartTimeRef.current = startTime;

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

    // Analytics: Track load start
    trackEvent('load_started', withCommon({
      request_id: reqId,
      book_id: bookId,
      level: level,
      content_mode: mode
    }, {
      sessionId: sessionIdRef.current,
      bookId,
      level
    }));

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

      // Phase 4: Use pure transform to determine final level with fallback logic
      const levelParam = determineFinalLevel(mode, level, availability, bookId);

      // Update state if fallback was applied
      if (levelParam !== 'original' && levelParam !== level) {
        setCefrLevel(levelParam);
      }

      // GPT-5 improvement #2: Enforce requestId check before fetch
      if (currentRequestIdRef.current !== reqId) {
        logTelemetry({
          type: 'stale_apply_prevented',
          bookId,
          level,
          requestId: reqId,
          reason: 'Request superseded before book data fetch'
        });
        return;
      }

      // Phase 4: Use pure data fetching service (extracted business logic)
      console.log(`🌐 [AudioContext] Loading book via service: ${bookId}, level: ${levelParam}, mode: ${mode}`);
      const data = await loadBookBundles(bookId, levelParam, mode, abortController.signal);

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

          // Commit 5: Load saved reading position (atomically with requestId guard)
          try {
            const savedPosition = await readingPositionService.loadPosition(bookId);

            // Guard: Only apply if request is still current
            if (currentRequestIdRef.current === reqId && savedPosition && savedPosition.currentSentenceIndex > 0) {
              console.log(`🔄 [AudioContext] Loading saved position: sentence ${savedPosition.currentSentenceIndex}, chapter ${savedPosition.currentChapter}`);

              // Atomically restore position (requestId-guarded)
              setCurrentSentenceIndex(savedPosition.currentSentenceIndex);
              setCurrentChapter(savedPosition.currentChapter);

              if (savedPosition.playbackSpeed) {
                setPlaybackSpeed(savedPosition.playbackSpeed);
              }

              // Phase 4: Use pure transform to calculate hours since last read
              const hoursSinceLastRead = calculateHoursSinceLastRead(savedPosition.lastAccessed);

              // Set resume info for UI toast/modal
              setResumeInfo({
                sentenceIndex: savedPosition.currentSentenceIndex,
                chapter: savedPosition.currentChapter,
                totalSentences: data.totalSentences,
                playbackSpeed: savedPosition.playbackSpeed,
                hoursSinceLastRead
              });

              console.log(`✅ [AudioContext] Resume info set: ${hoursSinceLastRead.toFixed(1)}h ago`);

              // Analytics: Track resume availability (proves "70% resume within 24h")
              trackEvent('resume_available', withCommon({
                book_id: bookId,
                level: levelParam,
                chapter: savedPosition.currentChapter,
                sentence_index: savedPosition.currentSentenceIndex,
                hours_since_last_read: hoursSinceLastRead,
                within_24_hours: hoursSinceLastRead < 24
              }, {
                sessionId: sessionIdRef.current,
                bookId,
                level: levelParam
              }));
            }
          } catch (error) {
            console.warn('[AudioContext] Failed to load saved position:', error);
            // Non-fatal - continue without resume
          }

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

          // Analytics: Track load completed (post-guard - only after requestId validation)
          trackEvent('load_completed', withCommon({
            request_id: reqId,
            book_id: bookId,
            level: levelParam,
            ms_load: elapsed,
            page_size: data.bundleCount,
            cache_hit: elapsed < 1000 // Heuristic: <1s suggests cache hit
          }, {
            sessionId: sessionIdRef.current,
            bookId,
            level: levelParam
          }));

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
        // TODO: Analytics - When audio manager is integrated, add tracking:
        // 1. audio_completed when bundle audio ends
        // 2. bundle_completed when moving to next bundle
        // audioManager.onAudioEnded = () => {
        //   trackEvent('audio_completed', withCommon({
        //     chapter: currentChapter,
        //     bundle_index: currentBundle
        //   }, { sessionId: sessionIdRef.current, bookId: selectedBook?.id, level: cefrLevel }));
        // };
        // audioManager.onBundleComplete = (bundleIndex) => {
        //   bundlesCompletedRef.current += 1;
        //   trackEvent('bundle_completed', withCommon({
        //     bundle_index: bundleIndex,
        //     bundles_completed_total: bundlesCompletedRef.current
        //   }, { sessionId: sessionIdRef.current, bookId: selectedBook?.id, level: cefrLevel }));
        // };
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

      // Analytics: Track load failure
      trackEvent('load_failed', withCommon({
        request_id: reqId,
        book_id: bookId,
        level: level,
        ms_load: elapsed,
        error_message: errorMessage
      }, {
        sessionId: sessionIdRef.current,
        bookId,
        level
      }));

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
    try {
      // Phase 4: Use pure availability checking service (extracted business logic)
      const result = await checkLevelAvailability(bookId, signal);

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

      // Final check before mutating state
      if (currentRequestIdRef.current === reqId) {
        setAvailableLevels(result.availability);
        setCurrentBookAvailableLevels(result.bookLevels);
      } else {
        logTelemetry({
          type: 'stale_apply_prevented',
          bookId,
          requestId: reqId,
          reason: 'Request superseded before setting availability'
        });
        return;
      }

      console.log(`📋 [AudioContext] Available levels for ${bookId}:`, result.availability);
      console.log(`📋 [AudioContext] CEFR levels for ${bookId}:`, result.bookLevels);

      return result.availability;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`🛑 [AudioContext] Availability check aborted`);
        return;
      }
      throw error;
    }
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
    resumeInfo,

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
    clearResumeInfo,
  };

  // -------------------------------------------------------------------------
  // EFFECT: Session Tracking (mount/unmount)
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Session start
    sessionStartTimeRef.current = Date.now();

    trackEvent('session_start', withCommon({
      session_id: sessionIdRef.current,
      referrer: typeof window !== 'undefined' ? document.referrer : undefined
    }, {
      sessionId: sessionIdRef.current
    }));

    // Session end on unmount
    return () => {
      if (sessionStartTimeRef.current) {
        const durationSeconds = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);

        trackEvent('session_end', withCommon({
          session_duration_seconds: durationSeconds,
          bundles_completed: bundlesCompletedRef.current
        }, {
          sessionId: sessionIdRef.current,
          bookId: selectedBook?.id,
          bookTitle: selectedBook?.title,
          level: cefrLevel
        }));
      }
    };
  }, []); // Empty deps = run once on mount/unmount

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
