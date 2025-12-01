/**
 * BundleReadingInterface Component
 * 
 * Extracted reading interface for bundle-architecture books (FeaturedBooks)
 * This component handles the full reading experience with audio playback,
 * text display, dictionary, and all controls.
 * 
 * Phase 2: Component Extraction from /app/featured-books/page.tsx
 * 
 * Props:
 * - bookSlug: The book identifier (e.g., 'always-a-family', 'the-necklace')
 * - defaultLevel: Optional CEFR level (defaults to book's default level)
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BundleAudioManager, type BundleData } from '@/lib/audio/BundleAudioManager';
import AudioBookPlayer from '@/lib/audio/AudioBookPlayer';
import { readingPositionService, type ReadingPosition } from '@/lib/services/reading-position';
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import { useMediaSession } from '@/lib/hooks/useMediaSession';
import { useDictionaryInteraction } from '@/hooks/useDictionaryInteraction';
import { DefinitionBottomSheet } from '@/components/dictionary/DefinitionBottomSheet';
import { dictionaryCache, dictionaryAnalytics } from '@/lib/dictionary/DictionaryCache';
import { AIBookChatModal } from '@/lib/dynamic-imports';
import type { ExternalBook } from '@/types/book-sources';
import { useAudioContext } from '@/contexts/AudioContext';
import { ReadingHeader } from '@/app/featured-books/components/ReadingHeader';
import { SettingsModal } from '@/app/featured-books/components/SettingsModal';
import { ChapterModal, type Chapter } from '@/app/featured-books/components/ChapterModal';
import FeedbackWidget from '@/components/feedback/FeedbackWidget';

// Import book data from shared config
import { ALL_FEATURED_BOOKS, type FeaturedBook } from '@/lib/config/books';

// Import chapter structures
import {
  SLEEPY_HOLLOW_CHAPTERS,
  THE_NECKLACE_CHAPTERS,
  THE_DEAD_CHAPTERS,
  THE_LADY_WITH_DOG_CHAPTERS,
  YELLOW_WALLPAPER_CHAPTERS,
  GIFT_OF_THE_MAGI_CHAPTERS,
  JEKYLL_HYDE_CHAPTERS,
  GREAT_GATSBY_CHAPTERS,
  type Chapter
} from '@/lib/config/chapters';

// Preview Audio Player Component
function PreviewAudioPlayer({ audioUrl, duration }: { audioUrl: string; duration: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayDuration = duration > 0 ? duration : audioRef.current?.duration || 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)] mb-4">
      <button
        onClick={togglePlay}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-secondary)] transition-all shadow-md hover:shadow-lg"
        aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
      >
        {isPlaying ? '⏸️' : '▶️'}
      </button>
      
      <div className="flex-1">
        <div className="w-full h-1.5 bg-[var(--border-light)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-100"
            style={{ width: `${displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(displayDuration)}</span>
        </div>
      </div>
    </div>
  );
}

interface BundleReadingInterfaceProps {
  bookSlug: string;
  defaultLevel?: string;
}

export function BundleReadingInterface({ bookSlug, defaultLevel }: BundleReadingInterfaceProps) {
  const router = useRouter();
  
  // AudioContext - Single Source of Truth
  const {
    selectedBook,
    cefrLevel,
    contentMode,
    bundleData,
    availableLevels: contextAvailableLevels,
    isPlaying: contextIsPlaying,
    currentSentenceIndex: contextCurrentSentenceIndex,
    currentChapter: contextCurrentChapter,
    currentBundle: contextCurrentBundle,
    playbackTime: contextPlaybackTime,
    totalTime: contextTotalTime,
    playbackSpeed: contextPlaybackSpeed,
    loadState,
    loading,
    error,
    resumeInfo,
    selectBook: contextSelectBook,
    switchLevel: contextSwitchLevel,
    switchContentMode: contextSwitchContentMode,
    play: contextPlay,
    pause: contextPause,
    resume: contextResume,
    seek: contextSeek,
    setSpeed: contextSetSpeed,
    nextChapter: contextNextChapter,
    previousChapter: contextPreviousChapter,
    jumpToChapter: contextJumpToChapter,
    unload: contextUnload,
    clearResumeInfo: contextClearResumeInfo,
  } = useAudioContext();

  // Local UI state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [selectedAIBook, setSelectedAIBook] = useState<ExternalBook | null>(null);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [currentDefinition, setCurrentDefinition] = useState<any>(null);
  const [definitionLoading, setDefinitionLoading] = useState(false);
  
  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [currentBundle, setCurrentBundle] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);

  // Audio manager refs
  const audioManagerRef = useRef<BundleAudioManager | null>(null);
  const playerRef = useRef<AudioBookPlayer | null>(null);
  const handleNextBundleRef = useRef<() => void>(() => {});
  const isPlayingRef = useRef<boolean>(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollEnabledRef = useRef(true);

  // Dictionary interaction
  const {
    selectedWord,
    selectedElement,
    handleMouseDown,
    handleMouseUp,
    handleTouchStart,
    handleTouchEnd,
    clearSelection
  } = useDictionaryInteraction();

  // Load book from slug on mount
  useEffect(() => {
    console.log('🔍 [BundleReadingInterface] Loading book:', bookSlug);
    const book = ALL_FEATURED_BOOKS.find(b => b.id === bookSlug);
    
    if (!book) {
      console.error('❌ [BundleReadingInterface] Book not found:', bookSlug);
      return;
    }
    
    console.log('✅ [BundleReadingInterface] Book found:', book.title);
    
    // Always select the book if slug doesn't match (handles navigation between books)
    if (!selectedBook || selectedBook.id !== bookSlug) {
      console.log('📚 [BundleReadingInterface] Selecting book:', book.title);
      const level = (defaultLevel as any) || undefined; // Let AudioContext use book's default
      void contextSelectBook(book, level);
    } else {
      console.log('⏭️ [BundleReadingInterface] Book already selected:', selectedBook.title);
    }
  }, [bookSlug, defaultLevel, selectedBook, contextSelectBook]);

  // Back button handler - routes to catalog
  const handleBack = () => {
    contextUnload();
    handleStop();
    router.push('/catalog');
  };

  // Stop handler
  const handleStop = () => {
    audioManagerRef.current?.stop();
    setIsPlaying(false);
    setCurrentBundle(null);
    setCurrentSentenceIndex(0);
    setPlaybackTime(0);
    setTotalTime(0);
  };

  // Helper functions
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const cycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const newSpeed = SPEED_OPTIONS[nextIndex];
    setPlaybackSpeed(newSpeed);

    // Apply speed to current audio if playing
    if (audioManagerRef.current && isPlaying) {
      audioManagerRef.current.setPlaybackRate(newSpeed);
    }
  };

  const formatSpeed = (speed: number) => {
    return speed === 1.0 ? '1x' : `${speed}x`;
  };

  // Get chapters for the current book
  const getBookChapters = (): Chapter[] => {
    if (!selectedBook) return [];

    if (selectedBook.id === 'sleepy-hollow-enhanced') {
      return SLEEPY_HOLLOW_CHAPTERS;
    } else if (selectedBook.id === 'great-gatsby-a2') {
      return GREAT_GATSBY_CHAPTERS;
    } else if (selectedBook.id === 'gutenberg-1952-A1') {
      return YELLOW_WALLPAPER_CHAPTERS;
    } else if (selectedBook.id === 'gutenberg-43') {
      return JEKYLL_HYDE_CHAPTERS;
    } else if (selectedBook.id === 'gift-of-the-magi') {
      return GIFT_OF_THE_MAGI_CHAPTERS;
    } else if (selectedBook.id === 'the-necklace') {
      return THE_NECKLACE_CHAPTERS;
    } else if (selectedBook.id === 'the-dead') {
      return THE_DEAD_CHAPTERS;
    } else if (selectedBook.id === 'lady-with-dog') {
      return THE_LADY_WITH_DOG_CHAPTERS;
    }
    return [];
  };

  // Get current chapter info
  const getCurrentChapter = () => {
    if (!selectedBook) {
      return { current: 1, total: 1, title: '', totalSentences: 0 };
    }

    const chapters = getBookChapters();
    if (chapters.length === 0) {
      return { current: 1, total: 1, title: '', totalSentences: selectedBook.sentences };
    }

    // Find current chapter based on sentence index
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      if (currentSentenceIndex >= chapter.startSentence && currentSentenceIndex <= chapter.endSentence) {
        return {
          current: chapter.chapterNumber,
          total: chapters.length,
          title: chapter.title,
          totalSentences: selectedBook.sentences
        };
      }
    }

    // Default to first chapter
    return {
      current: 1,
      total: chapters.length,
      title: chapters[0]?.title || '',
      totalSentences: selectedBook.sentences
    };
  };

  const getCurrentBookChapters = (): Chapter[] => {
    return getBookChapters();
  };

  // Audio playback functions
  const findBundleForSentence = (sentenceIndex: number): BundleData | null => {
    if (!bundleData) return null;

    const totalSentences = bundleData.totalSentences;
    if (sentenceIndex < 0 || sentenceIndex >= totalSentences) {
      console.warn(`Sentence index ${sentenceIndex} is out of bounds (0-${totalSentences - 1})`);
      return null;
    }

    return bundleData.bundles.find(bundle =>
      bundle.sentences.some(s => s.sentenceIndex === sentenceIndex)
    ) || null;
  };

  const handlePlaySequential = async (startSentenceIndex: number = 0) => {
    if (!audioManagerRef.current || !bundleData) return;

    try {
      const bundle = findBundleForSentence(startSentenceIndex);
      if (!bundle) {
        console.error(`Bundle not found for sentence ${startSentenceIndex}`);
        return;
      }

      setCurrentBundle(bundle.bundleId);
      setCurrentSentenceIndex(startSentenceIndex);
      setIsPlaying(true);
      isPlayingRef.current = true;

      audioManagerRef.current.setPlaybackRate(playbackSpeed);
      await audioManagerRef.current.playSequentialSentences(bundle, startSentenceIndex);

      console.log(`📌 playSequentialSentences completed for bundle ${bundle.bundleId}, isPlayingRef.current = ${isPlayingRef.current}`);

    } catch (error) {
      console.error('Sequential playback failed:', error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const handleNextBundle = async () => {
    if (!bundleData || !currentBundle) return;
    if (!isPlayingRef.current) return;

    const currentBundleIndex = bundleData.bundles.findIndex(b => b.bundleId === currentBundle);
    const nextBundle = bundleData.bundles[currentBundleIndex + 1];

    if (nextBundle && nextBundle.sentences.length > 0) {
      const nextSentenceIndex = nextBundle.sentences[0].sentenceIndex;
      if (isPlayingRef.current) {
        handlePlaySequential(nextSentenceIndex);
      }
    } else {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentBundle(null);
    }
  };

  useEffect(() => {
    handleNextBundleRef.current = handleNextBundle;
  });

  const handlePause = async () => {
    audioManagerRef.current?.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;

    if (playerRef.current) {
      await playerRef.current.forceSavePosition();
    }
  };

  const handleResume = async () => {
    if (!audioManagerRef.current || !bundleData) return;

    try {
      if (currentSentenceIndex >= 0 && currentBundle) {
        const bundle = findBundleForSentence(currentSentenceIndex);
        if (bundle) {
          setIsPlaying(true);
          isPlayingRef.current = true;
          audioManagerRef.current.setPlaybackRate(playbackSpeed);
          await audioManagerRef.current.playSequentialSentences(bundle, currentSentenceIndex);
          if (isPlayingRef.current) {
            handleNextBundle();
          }
        } else {
          await audioManagerRef.current.resume();
          setIsPlaying(true);
          isPlayingRef.current = true;
        }
      } else {
        await audioManagerRef.current.resume();
        setIsPlaying(true);
        isPlayingRef.current = true;
      }
    } catch (error) {
      console.error('Resume failed:', error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const jumpToSentence = async (targetIndex: number) => {
    if (!bundleData) return;
    const maxSentenceIndex = bundleData.totalSentences - 1;
    const clampedIndex = Math.max(0, Math.min(targetIndex, maxSentenceIndex));
    await handlePlaySequential(clampedIndex);
  };

  const handleChapterSelect = async (chapter: Chapter) => {
    handleStop();
    setCurrentSentenceIndex(chapter.startSentence);
    autoScrollEnabledRef.current = true;
    setAutoScrollPaused(false);
    jumpToSentence(chapter.startSentence).then(() => {
      requestAnimationFrame(() => {
        const sentenceElement = document.querySelector(`[data-sentence="${chapter.startSentence}"]`);
        if (sentenceElement) {
          sentenceElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      });
    });
  };

  // AI Chat handlers
  const handleCloseAIChat = () => {
    setIsAIChatOpen(false);
    setSelectedAIBook(null);
  };

  const handleSendAIMessage = async (message: string): Promise<string> => {
    if (!selectedAIBook) {
      return 'No book selected for AI chat.';
    }

    const bookContext = `Title: ${selectedAIBook.title}, Author: ${selectedAIBook.author}${
      selectedAIBook.description ? `, Description: ${selectedAIBook.description}` : ''
    }${
      selectedAIBook.subjects?.length ? `, Subjects: ${selectedAIBook.subjects.join(', ')}` : ''
    }`;

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          bookContext,
          bookId: selectedAIBook.id,
          conversationId: null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookId: selectedAIBook.id,
          message,
          response: data.response,
        }),
      });

      return data.response;
    } catch (error) {
      console.error('Error sending AI message:', error);
      return 'Sorry, I encountered an error processing your request.';
    }
  };

  // Audio initialization effect
  useEffect(() => {
    if (!selectedBook || loadState !== 'ready' || !bundleData) return;

    async function initializePageSideEffects() {
      try {
        const currentBookId = selectedBook.id;
        
        if (!audioManagerRef.current && bundleData.audioType !== 'none') {
          const firstSentence = bundleData.bundles?.[0]?.sentences?.[0];
          const hasPreciseTimings = Array.isArray(firstSentence?.wordTimings) && firstSentence.wordTimings.length > 0;
          const audioProvider = bundleData.audioType || 'elevenlabs';
          const isTTS = audioProvider === 'elevenlabs' || audioProvider === 'openai' || currentBookId === 'great-gatsby-a2';
          const leadMs = isTTS ? -500 : (hasPreciseTimings ? 500 : 1400);

          const audioManager = new BundleAudioManager({
            highlightLeadMs: leadMs,
            onSentenceStart: (sentence) => {
              setCurrentSentenceIndex(sentence.sentenceIndex);
              if (autoScrollEnabledRef.current) {
                const sentenceElement = document.querySelector(`[data-sentence="${sentence.sentenceIndex}"]`);
                if (sentenceElement) {
                  sentenceElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                  });
                }
              }
            },
            onSentenceEnd: () => {},
            onBundleComplete: () => {
              handleNextBundleRef.current();
            },
            onProgress: (currentTime, duration) => {
              setPlaybackTime(currentTime);
              setTotalTime(duration);
            }
          });
          audioManagerRef.current = audioManager;

          playerRef.current = new AudioBookPlayer(bundleData.bundles, {
            highlightLeadMs: leadMs,
            preloadRadius: 1,
            debug: false,
            bookId: currentBookId,
            onPositionUpdate: (position: ReadingPosition) => {
              setCurrentSentenceIndex(position.currentSentenceIndex);
              setCurrentChapter(position.currentChapter);
            }
          });
        }
      } catch (error) {
        console.error('Error initializing page side effects:', error);
      }
    }

    initializePageSideEffects();

    return () => {
      if (playerRef.current) {
        playerRef.current.forceSavePosition().catch(console.error);
      }
      audioManagerRef.current?.destroy();
    };
  }, [selectedBook, bundleData, loadState]);

  // Scroll to saved position
  const didAutoScrollRef = useRef<string | null>(null);
  useEffect(() => {
    const scrollKey = `${selectedBook?.id}-${cefrLevel}-${contextCurrentSentenceIndex}`;

    if (
      loadState === 'ready' &&
      bundleData &&
      contextCurrentSentenceIndex > 0 &&
      resumeInfo &&
      didAutoScrollRef.current !== scrollKey
    ) {
      requestAnimationFrame(() => {
        const sentenceElement = document.querySelector(`[data-sentence="${contextCurrentSentenceIndex}"]`);
        if (sentenceElement) {
          sentenceElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          didAutoScrollRef.current = scrollKey;
        }
      });
    }
  }, [loadState, bundleData, contextCurrentSentenceIndex, resumeInfo, selectedBook?.id, cefrLevel]);

  // Dictionary effect
  useEffect(() => {
    if (selectedWord) {
      setIsDictionaryOpen(true);
      setDefinitionLoading(true);

      const fetchDefinition = async () => {
        try {
          const result = await dictionaryCache.fetchWithCache(selectedWord);
          setCurrentDefinition({
            word: result.word,
            definition: result.definition,
            example: result.example,
            partOfSpeech: result.partOfSpeech,
            phonetic: result.phonetic,
            audioUrl: result.audioUrl,
            cefrLevel: result.cefrLevel,
            source: result.source
          });
        } catch (error) {
          console.error('❌ Dictionary lookup error:', error);
          setCurrentDefinition({
            word: selectedWord,
            phonetic: 'error',
            definition: `There was an error looking up "${selectedWord}". Please check your internet connection and try again.`,
            example: `Network issues can prevent dictionary lookups.`,
            partOfSpeech: 'error',
            cefrLevel: 'Error',
            source: 'Error'
          });
        } finally {
          setDefinitionLoading(false);
        }
      };

      fetchDefinition();
    }
  }, [selectedWord]);

  // Performance monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const interval = setInterval(() => {
      dictionaryAnalytics.checkPerformanceAlerts();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update AudioBookPlayer when settings change
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.updateSettings(cefrLevel, playbackSpeed, contentMode);
    }
  }, [cefrLevel, playbackSpeed, contentMode]);

  // Wake lock and media session
  useWakeLock(isPlaying);

  useMediaSession(isPlaying, {
    title: selectedBook?.title || 'BookBridge Audiobook',
    artist: selectedBook?.author || 'Unknown Author',
    album: `Level ${cefrLevel}`,
    onPlay: () => {
      if (audioManagerRef.current && !isPlaying) {
        handleResume();
      }
    },
    onPause: () => {
      if (audioManagerRef.current && isPlaying) {
        handlePause();
      }
    },
    onSeekBackward: () => {
      const prevIndex = Math.max(0, currentSentenceIndex - 1);
      if (bundleData) {
        const prevBundle = findBundleForSentence(prevIndex);
        if (prevBundle && audioManagerRef.current) {
          audioManagerRef.current.stop();
          setCurrentBundle(prevBundle.bundleId);
          handlePlaySequential(prevIndex);
        }
      }
    },
    onSeekForward: () => {
      const nextIndex = currentSentenceIndex + 1;
      if (bundleData && nextIndex < bundleData.totalSentences) {
        const nextBundle = findBundleForSentence(nextIndex);
        if (nextBundle && audioManagerRef.current) {
          audioManagerRef.current.stop();
          setCurrentBundle(nextBundle.bundleId);
          handlePlaySequential(nextIndex);
        }
      }
    },
    onPreviousTrack: () => {
      if (currentBundle && bundleData) {
        const currentBundleObj = bundleData.bundles.find(b => b.bundleId === currentBundle);
        if (currentBundleObj && currentBundleObj.bundleIndex > 0) {
          const prevBundle = bundleData.bundles[currentBundleObj.bundleIndex - 1];
          if (prevBundle && audioManagerRef.current) {
            audioManagerRef.current.stop();
            setCurrentBundle(prevBundle.bundleId);
            handlePlaySequential(prevBundle.sentences[0].sentenceIndex);
          }
        }
      }
    },
    onNextTrack: () => {
      handleNextBundle();
    }
  });

  // Show loading state while book is being selected or data is loading
  if (!selectedBook || loadState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]" style={{ fontFamily: '"Source Serif Pro", Georgia, serif' }}>
            {!selectedBook ? 'Loading book...' : 'Loading book data...'}
          </p>
          {error && (
            <p className="text-red-500 text-sm mt-2">Error: {error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto">
        <ReadingHeader
          onBack={handleBack}
          onSettings={() => setShowSettingsModal(true)}
          autoScrollPaused={autoScrollPaused}
        />

        {/* Book Content */}
        <div className="pb-32 px-3 bg-[var(--bg-secondary)] mx-4 md:mx-8 rounded-b-lg shadow-sm border-2 border-[var(--accent-secondary)]/20 border-t-0">
          {/* Loading state */}
          {loadState === 'loading' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading {selectedBook?.title} bundles...</p>
            </div>
          )}

          {/* Error state */}
          {loadState === 'error' && error && (
            <div className="text-center py-12">
              <div className="bg-white border border-blue-200 rounded-lg p-6 max-w-md mx-auto shadow-lg">
                <p className="text-[var(--accent-primary)] font-medium">{error}</p>
                <p className="text-gray-400 text-sm mt-2">
                  Try switching to Original or available levels
                </p>
              </div>
            </div>
          )}

          {bundleData && (
            <>
              {/* Book Title */}
              <div className="text-center py-4">
                <h1 className="text-2xl font-semibold text-[var(--text-accent)] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {((bundleData as any).book?.title || bundleData.title || 'Unknown Title')
                    .replace(/\s*\(Bundled\)$/i, '')
                    .replace(/\s*\([A-C][12]?\s*Level\)$/i, '')}
                </h1>
              </div>

              {/* Book Preview Section */}
              {(bundleData as any).preview && (
                <div className="px-4 py-6 mb-6 mx-4 md:mx-8 rounded-lg border-2 border-[var(--accent-primary)]/20 bg-[var(--bg-primary)]">
                  <div className="max-w-2xl mx-auto">
                    <h2 
                      className="text-lg font-semibold text-[var(--text-accent)] mb-3"
                      style={{ fontFamily: 'Playfair Display, serif' }}
                    >
                      About This Story
                    </h2>
                    <p 
                      className="text-[var(--text-primary)] leading-relaxed mb-4"
                      style={{ fontFamily: 'Source Serif Pro, serif', fontSize: '1.05rem' }}
                    >
                      {(bundleData as any).preview}
                    </p>
                    
                    {/* Preview Audio Player */}
                    {(bundleData as any).previewAudio?.audioUrl && (
                      <PreviewAudioPlayer 
                        audioUrl={(bundleData as any).previewAudio.audioUrl}
                        duration={(bundleData as any).previewAudio.duration}
                      />
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mt-4">
                      <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full border border-[var(--accent-primary)]/30">
                        Level {cefrLevel}
                      </span>
                      <span>•</span>
                      <span>~{Math.ceil((bundleData.totalSentences * 15) / 60)} minute read</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Real Text with Chapter Headers */}
              <div className="px-4 py-4 text-left">
                {(() => {
                  const chapters = getBookChapters();
                  const allSentences = bundleData.bundles.flatMap(bundle => bundle.sentences);
                  const result: React.ReactElement[] = [];

                  allSentences.forEach((sentence, index) => {
                    const chapter = chapters.find(ch => ch.startSentence === sentence.sentenceIndex);

                    if (chapter) {
                      result.push(
                        <div key={`chapter-${chapter.chapterNumber}`} className="mb-6 mt-8 first:mt-0">
                          <h2 className="text-2xl font-semibold text-[var(--text-accent)] border-b-2 border-[var(--accent-secondary)]/30 pb-2 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                            Chapter {chapter.chapterNumber}: {chapter.title}
                          </h2>
                        </div>
                      );
                    }

                    result.push(
                      <span
                        key={sentence.sentenceIndex}
                        data-sentence={sentence.sentenceIndex}
                        className={`inline cursor-pointer transition-all duration-700 ease-in-out px-1 py-0.5 mr-1 rounded mobile-reading-text ${
                          sentence.sentenceIndex === currentSentenceIndex && isPlaying
                            ? 'bg-blue-100 text-[var(--text-primary)] font-medium'
                            : sentence.sentenceIndex === currentSentenceIndex + 1 && isPlaying
                            ? 'bg-[var(--accent-primary)]/5 text-[var(--text-secondary)]'
                            : 'hover:bg-[var(--accent-primary)]/3'
                        }`}
                        style={{ textAlign: 'left' }}
                        title={`Sentence ${sentence.sentenceIndex + 1} (${sentence.startTime.toFixed(1)}s - ${sentence.endTime.toFixed(1)}s) - Click to jump | Long-press words for dictionary`}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onClick={async (e) => {
                          if ((e.target as HTMLElement).classList.contains('dictionary-word-selected')) {
                            return;
                          }
                          
                          if (audioManagerRef.current) {
                            audioManagerRef.current.stop();
                          }

                          setCurrentSentenceIndex(sentence.sentenceIndex);
                          setIsPlaying(true);
                          isPlayingRef.current = true;

                          if (audioManagerRef.current) {
                            const targetBundle = findBundleForSentence(sentence.sentenceIndex);
                            if (targetBundle) {
                              if (!targetBundle.audioUrl) {
                                console.error(`Bundle ${targetBundle.bundleId} has no audioUrl`);
                                return;
                              }
                              setCurrentBundle(targetBundle.bundleId);
                              await audioManagerRef.current.playSequentialSentences(targetBundle, sentence.sentenceIndex);
                            }
                          }
                        }}
                      >
                        {sentence.text}
                      </span>
                    );

                    if ((index + 1) % 4 === 0 && index < allSentences.length - 1) {
                      result.push(<div key={`paragraph-break-${sentence.sentenceIndex}`} className="mb-6"></div>);
                    }
                  });

                  return result;
                })()}
              </div>
            </>
          )}
        </div>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          currentLevel={cefrLevel}
          onLevelChange={contextSwitchLevel}
          currentContentMode={contentMode}
          onContentModeChange={contextSwitchContentMode}
          availableLevels={contextAvailableLevels}
        />

        {/* Chapter Navigation Modal */}
        <ChapterModal
          isOpen={showChapterModal}
          onClose={() => setShowChapterModal(false)}
          chapters={getCurrentBookChapters()}
          currentChapter={getCurrentChapter().current}
          onSelectChapter={handleChapterSelect}
        />

        {/* Mobile Control Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-secondary)] border-t border-[var(--border-light)] shadow-lg z-50">
          <div className="px-4 py-3">
            <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] mb-2">
              <span>{formatTime(playbackTime)}</span>
              <span>
                Sentence {currentSentenceIndex + 1}/{getCurrentChapter().totalSentences} • Chapter {getCurrentChapter().current} of {getCurrentChapter().total}
              </span>
              <span>{formatTime(totalTime)}</span>
            </div>

            <div className="w-full h-0.5 bg-[var(--border-light)] rounded-full mb-4">
              <div
                className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-300"
                style={{ width: `${totalTime > 0 ? (playbackTime / totalTime) * 100 : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-center gap-6">
              <button
                onClick={cycleSpeed}
                className="flex items-center justify-center w-9 h-9 text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] rounded-full transition-all"
              >
                <div className="text-sm font-semibold">{formatSpeed(playbackSpeed)}</div>
              </button>

              <button
                onClick={async () => {
                  if (contentMode === 'original') return;
                  if (isPlaying) {
                    handlePause();
                  } else {
                    if (currentSentenceIndex > 0 && currentBundle) {
                      await handleResume();
                    } else {
                      const firstSentence = bundleData?.bundles?.[0]?.sentences?.[0]?.sentenceIndex ?? 0;
                      await handlePlaySequential(firstSentence);
                    }
                  }
                }}
                className={`flex items-center justify-center w-14 h-14 text-white rounded-full transition-all shadow-md ${
                  contentMode === 'original'
                    ? 'bg-[var(--text-secondary)]/50 cursor-not-allowed'
                    : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)]'
                }`}
                disabled={contentMode === 'original'}
              >
                <div className="text-xl">{contentMode === 'original' ? '🚫' : (isPlaying ? '⏸️' : '▶️')}</div>
              </button>

              <button
                onClick={() => setShowChapterModal(true)}
                className="flex items-center justify-center w-9 h-9 text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] rounded-full transition-all"
              >
                <div className="text-lg">📖</div>
              </button>

              <button className="flex items-center justify-center w-9 h-9 text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] rounded-full transition-all">
                <div className="text-lg">🎙️</div>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Control Bar */}
        <div className="hidden md:block fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-2 border-[var(--accent-secondary)]/20 rounded-full px-8 py-4 shadow-2xl">
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={cycleSpeed}
                className="flex items-center justify-center w-11 h-11 text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] rounded-full transition-all hover:scale-105"
              >
                <div className="text-sm font-semibold">{formatSpeed(playbackSpeed)}</div>
              </button>

              <button
                onClick={async () => {
                  if (contentMode === 'original') return;
                  if (isPlaying) {
                    handlePause();
                  } else {
                    if (currentSentenceIndex > 0 && currentBundle) {
                      await handleResume();
                    } else {
                      const firstSentence = bundleData?.bundles?.[0]?.sentences?.[0]?.sentenceIndex ?? 0;
                      await handlePlaySequential(firstSentence);
                    }
                  }
                }}
                className={`flex items-center justify-center w-14 h-14 text-white rounded-full transition-all shadow-lg hover:shadow-xl ${
                  contentMode === 'original'
                    ? 'bg-[var(--text-secondary)]/50 cursor-not-allowed'
                    : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)]'
                }`}
                disabled={contentMode === 'original'}
              >
                <div className="text-xl">{contentMode === 'original' ? '🚫' : (isPlaying ? '⏸️' : '▶️')}</div>
              </button>

              <button
                onClick={() => setShowChapterModal(true)}
                className="flex items-center justify-center w-11 h-11 text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] rounded-full transition-all hover:scale-105"
              >
                <div className="text-lg">📖</div>
              </button>

              <button className="flex items-center justify-center w-11 h-11 text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] rounded-full transition-all hover:scale-105">
                <div className="text-lg">🎙️</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dictionary Debug Indicator */}
      {selectedWord && (
        <div className="fixed top-4 right-4 bg-[var(--accent-primary)] text-white px-4 py-2 rounded-lg shadow-lg z-50">
          📖 Dictionary: "{selectedWord}"
        </div>
      )}

      {/* Dictionary Bottom Sheet */}
      <DefinitionBottomSheet
        word={selectedWord}
        definition={currentDefinition}
        isOpen={isDictionaryOpen}
        loading={definitionLoading}
        onClose={() => {
          setIsDictionaryOpen(false);
          setCurrentDefinition(null);
          clearSelection();
        }}
      />

      {/* AI Chat Modal */}
      <AIBookChatModal
        isOpen={isAIChatOpen}
        book={selectedAIBook}
        onClose={handleCloseAIChat}
        onSendMessage={handleSendAIMessage}
      />

      {/* Feedback Widget */}
      {process.env.NEXT_PUBLIC_ENABLE_FEEDBACK_WIDGET !== 'false' && (
        <FeedbackWidget
          isSettingsModalOpen={showSettingsModal}
          isChapterModalOpen={showChapterModal}
          isAIChatOpen={isAIChatOpen}
          isDictionaryOpen={isDictionaryOpen}
        />
      )}
    </div>
  );
}

