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

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
// Note: Using ChapterModal's Chapter type (compatible with chapters.ts Chapter interface)
import FeedbackWidget from '@/components/feedback/FeedbackWidget';
import { trackFirstBookOpened } from '@/lib/analytics/posthog';
import { createClient } from '@/lib/supabase/client';
import posthog from 'posthog-js';

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
  GREAT_GATSBY_CHAPTERS
} from '@/lib/config/chapters';
// Note: Using Chapter type from ChapterModal (compatible with chapters.ts)

// Intro Section with Sentence-Level Highlighting and Sync
function IntroSectionWithHighlighting({ 
  combinedText, 
  audioUrl, 
  duration,
  sentenceTimings: providedTimings
}: { 
  combinedText: string; 
  audioUrl: string; 
  duration: number;
  sentenceTimings?: Array<{ startTime: number; endTime: number; duration: number; text: string }> | null;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textContainerRef = useRef<HTMLDivElement | null>(null);
  const timeUpdateRef = useRef<number | undefined>(undefined);
  const lastKnownIndexRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrolledIndexRef = useRef<number>(-1);
  const lastUpdateTimeRef = useRef<number>(0);
  const UPDATE_THROTTLE_MS = 100; // Update every 100ms (10fps) instead of 60fps for smoother performance

  // Split text into sentences
  const sentences = React.useMemo(() => {
    if (!combinedText) return [];
    
    // Remove "About This Story" title and split by sentences
    const textWithoutTitle = combinedText.replace(/^About This Story\s*\n\n*/i, '');
    const sentenceRegex = /([^.!?]+[.!?]+)/g;
    const matches = textWithoutTitle.match(sentenceRegex) || [];
    return matches.map((text, index) => ({
      index,
      text: text.trim(),
      wordCount: text.trim().split(/\s+/).length
    })).filter(s => s.text.length > 0);
  }, [combinedText]);

  // Use pre-calculated timings if available, otherwise calculate on the fly (fallback)
  const sentenceTimings = React.useMemo(() => {
    // PREFERRED: Use pre-calculated Enhanced Timing v3 timings from audio generation
    if (providedTimings && providedTimings.length > 0) {
      return providedTimings.map((timing, index) => ({
        start: timing.startTime,
        end: timing.endTime,
        duration: timing.duration,
        sentence: timing.text,
        index: index
      }));
    }
    
    // FALLBACK: Calculate timings on the fly (less accurate)
    if (sentences.length === 0 || duration === 0) return [];
    
    // Enhanced Timing v3: Character-count-based with punctuation penalties
    const baseSecondsPerChar = 0.05; // Base rate for Jane voice (adjusted for 0.85× slowdown)
    const speed = 0.85; // FFmpeg slowdown applied
    
    // Calculate total "weighted" characters (characters + punctuation bonuses)
    let totalWeightedChars = 0;
    const sentenceWeights = sentences.map((sentence) => {
      const chars = sentence.text.length;
      // Punctuation penalties (adds time for pauses)
      const punctuationBonus = (sentence.text.match(/[.!?]/g) || []).length * 5; // 5 chars per punctuation
      const weightedChars = chars + punctuationBonus;
      totalWeightedChars += weightedChars;
      return { sentence, weightedChars, chars };
    });
    
    // Calculate timings proportionally based on weighted characters
    let currentTime = 0;
    return sentenceWeights.map(({ sentence, weightedChars }) => {
      const ratio = weightedChars / totalWeightedChars;
      const sentenceDuration = duration * ratio;
      
      const timing = {
        start: currentTime,
        end: currentTime + sentenceDuration,
        duration: sentenceDuration,
        sentence: sentence.text,
        index: sentence.index
      };
      currentTime += sentenceDuration;
      return timing;
    });
  }, [sentences, duration, providedTimings]);

  // Find current sentence based on audio time
  const findCurrentSentence = useCallback((time: number) => {
    if (sentenceTimings.length === 0) return -1;
    
    const LOOKAHEAD_MS = 0.12; // 120ms look-ahead
    const t = time + LOOKAHEAD_MS;
    const lastIdx = lastKnownIndexRef.current;
    
    // Check last known position first
    if (lastIdx < sentenceTimings.length && t >= sentenceTimings[lastIdx].start && t < sentenceTimings[lastIdx].end) {
      return lastIdx;
    }
    
    // Check neighbors
    if (lastIdx + 1 < sentenceTimings.length && t >= sentenceTimings[lastIdx + 1].start && t < sentenceTimings[lastIdx + 1].end) {
      lastKnownIndexRef.current = lastIdx + 1;
      return lastIdx + 1;
    }
    if (lastIdx - 1 >= 0 && t >= sentenceTimings[lastIdx - 1].start && t < sentenceTimings[lastIdx - 1].end) {
      lastKnownIndexRef.current = lastIdx - 1;
      return lastIdx - 1;
    }
    
    // Full scan
    for (let i = 0; i < sentenceTimings.length; i++) {
      if (t >= sentenceTimings[i].start && t < sentenceTimings[i].end) {
        lastKnownIndexRef.current = i;
        return i;
      }
    }
    
    // If past all sentences, return last sentence
    if (t >= sentenceTimings[sentenceTimings.length - 1].end) {
      lastKnownIndexRef.current = sentenceTimings.length - 1;
      return sentenceTimings.length - 1;
    }
    
    return -1;
  }, [sentenceTimings]);

  // Update time and highlighting (throttled for smooth performance)
  const updateTimeAndHighlight = useCallback(() => {
    if (!audioRef.current || !isPlaying) return;
    
    const now = performance.now();
    // Throttle updates to 10fps (every 100ms) for smoother performance
    if (now - lastUpdateTimeRef.current < UPDATE_THROTTLE_MS) {
      timeUpdateRef.current = requestAnimationFrame(updateTimeAndHighlight);
      return;
    }
    lastUpdateTimeRef.current = now;
    
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    
    const newSentenceIndex = findCurrentSentence(time);
    if (newSentenceIndex !== currentSentenceIndex && newSentenceIndex >= 0) {
      setCurrentSentenceIndex(newSentenceIndex);
      
      // Auto-scroll to current sentence (debounced and only when needed)
      if (textContainerRef.current && newSentenceIndex !== lastScrolledIndexRef.current) {
        // Clear any pending scroll
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // Debounce scroll with delay for smoother transitions (like main story)
        scrollTimeoutRef.current = setTimeout(() => {
          const sentenceElements = textContainerRef.current?.querySelectorAll('span[data-sentence-index]');
          const currentElement = sentenceElements?.[newSentenceIndex] as HTMLElement;
          if (currentElement) {
            const elementRect = currentElement.getBoundingClientRect();
            const containerRect = textContainerRef.current?.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // Only scroll if element is actually out of view (like demo)
            const isNearBottom = elementRect.bottom > viewportHeight - 150;
            const isAboveView = elementRect.top < (containerRect?.top || 0);
            
            if (isNearBottom || isAboveView) {
              currentElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
              });
              lastScrolledIndexRef.current = newSentenceIndex;
            }
          }
        }, 200); // 200ms delay like main story for smoother scrolling
      }
    }
    
    timeUpdateRef.current = requestAnimationFrame(updateTimeAndHighlight);
  }, [isPlaying, findCurrentSentence, currentSentenceIndex]);

  // Initialize audio (only when audioUrl changes)
  useEffect(() => {
    if (!audioUrl) {
      console.warn('⚠️ Intro audio: No audio URL provided');
      return;
    }
    
    console.log('🎵 Intro audio: Initializing with URL:', audioUrl);
    console.log('🎵 Intro audio: Duration:', duration);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    // Set audio properties
    audio.preload = 'metadata';
    audio.volume = 1.0;
    audio.muted = false;
    
    const handleEnded = () => {
      console.log('✅ Intro audio: Playback ended');
      setIsPlaying(false);
      setCurrentSentenceIndex(-1);
      setCurrentTime(0);
      lastKnownIndexRef.current = 0;
    };
    
    const handlePause = () => {
      console.log('⏸️ Intro audio: Paused');
      setIsPlaying(false);
      if (timeUpdateRef.current) {
        cancelAnimationFrame(timeUpdateRef.current);
      }
    };
    
    const handlePlay = () => {
      console.log('▶️ Intro audio: Playing');
      setIsPlaying(true);
      // Start the update loop
      if (timeUpdateRef.current) {
        cancelAnimationFrame(timeUpdateRef.current);
      }
      timeUpdateRef.current = requestAnimationFrame(updateTimeAndHighlight);
    };
    
    const handleError = (e: any) => {
      console.error('❌ Intro audio: Error occurred:', e);
      setIsPlaying(false);
    };
    
    const handleCanPlay = () => {
      console.log('✅ Intro audio: Can play');
    };
    
    const handleLoadedData = () => {
      console.log('✅ Intro audio: Data loaded');
    };
    
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadeddata', handleLoadedData);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.pause();
      audio.src = '';
      if (timeUpdateRef.current) {
        cancelAnimationFrame(timeUpdateRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]); // Only re-initialize when audioUrl changes, not when updateTimeAndHighlight changes

  // Start time tracking when playing
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      // Start the update loop
      const startLoop = () => {
        if (timeUpdateRef.current) {
          cancelAnimationFrame(timeUpdateRef.current);
        }
        timeUpdateRef.current = requestAnimationFrame(updateTimeAndHighlight);
      };
      startLoop();
    } else if (timeUpdateRef.current) {
      cancelAnimationFrame(timeUpdateRef.current);
      timeUpdateRef.current = undefined;
    }
    
    return () => {
      if (timeUpdateRef.current) {
        cancelAnimationFrame(timeUpdateRef.current);
        timeUpdateRef.current = undefined;
      }
    };
  }, [isPlaying, updateTimeAndHighlight]);

  const togglePlay = async () => {
    if (!audioRef.current) {
      console.error('❌ Intro audio: No audio ref available');
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        const audio = audioRef.current;
        
        // Check if audio is ready
        if (audio.readyState < 2) {
          console.log('⏳ Intro audio: Waiting for audio to load...');
          await new Promise((resolve) => {
            const handleCanPlay = () => {
              audio.removeEventListener('canplay', handleCanPlay);
              resolve(undefined);
            };
            audio.addEventListener('canplay', handleCanPlay);
          });
        }
        
        // Ensure volume is set
        audio.volume = 1.0;
        audio.muted = false;
        
        console.log('🎵 Intro audio: Attempting to play', {
          src: audio.src,
          readyState: audio.readyState,
          networkState: audio.networkState,
          duration: audio.duration
        });
        
        // Play audio and handle promise
        await audio.play();
        setIsPlaying(true);
        console.log('✅ Intro audio: Playback started successfully');
      } catch (error: any) {
        console.error('❌ Intro audio: Playback failed:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          code: error.code
        });
        setIsPlaying(false);
        // Show user-friendly error message
        alert(`Unable to play audio: ${error.message || 'Please check your browser settings or try again.'}`);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse and render text with highlighting
  const renderText = () => {
    if (!combinedText || sentences.length === 0) return null;
    
    const sections = combinedText.split(/\n\n+/).filter(s => s.trim());
    let previewContent = '';
    let hookContent = '';
    let backgroundContent = '';
    let foundPreview = false;
    
    sections.forEach((section: string) => {
      const trimmed = section.trim();
      if (trimmed === 'About This Story') {
        foundPreview = true;
      } else if (foundPreview && previewContent === '') {
        previewContent = trimmed;
      } else if (foundPreview && previewContent !== '' && hookContent === '') {
        hookContent = trimmed;
      } else if (foundPreview && previewContent !== '' && hookContent !== '' && backgroundContent === '') {
        backgroundContent = trimmed;
      }
    });
    
    // Split content into sentences for rendering
    const splitIntoSentences = (text: string) => {
      const sentenceRegex = /([^.!?]+[.!?]+)/g;
      return text.match(sentenceRegex) || [text];
    };
    
    const previewSentences = previewContent ? splitIntoSentences(previewContent) : [];
    const hookSentences = hookContent ? splitIntoSentences(hookContent) : [];
    const backgroundSentences = backgroundContent ? splitIntoSentences(backgroundContent) : [];
    
    let sentenceIdx = 0;
    
    return (
      <>
        <h2 
          className="text-lg font-semibold text-[var(--text-accent)] mb-3"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          About This Story
        </h2>
        <div ref={textContainerRef} className="space-y-3">
          {previewSentences.length > 0 && (
            <p className="text-[var(--text-primary)] leading-relaxed" style={{ fontFamily: 'Source Serif Pro, serif', fontSize: '1.05rem' }}>
              {previewSentences.map((sentence, idx) => {
                const currentIdx = sentenceIdx++;
                const isCurrent = currentSentenceIndex === currentIdx;
                return (
                  <span
                    key={idx}
                    data-sentence-index={currentIdx}
                    style={{
                      background: isCurrent ? 'var(--accent-primary)' : 'transparent',
                      color: isCurrent ? 'var(--bg-primary)' : 'inherit',
                      padding: isCurrent ? '2px 6px' : '0',
                      borderRadius: isCurrent ? '4px' : '0',
                      transition: 'all 0.3s ease',
                      fontWeight: isCurrent ? '500' : '400',
                      display: 'inline'
                    }}
                  >
                    {sentence}
                  </span>
                );
              })}
            </p>
          )}
          {hookSentences.length > 0 && (
            <p className="text-[var(--text-primary)] leading-relaxed font-medium mt-4" style={{ fontFamily: 'Source Serif Pro, serif', fontSize: '1.05rem' }}>
              {hookSentences.map((sentence, idx) => {
                const currentIdx = sentenceIdx++;
                const isCurrent = currentSentenceIndex === currentIdx;
                return (
                  <span
                    key={idx}
                    data-sentence-index={currentIdx}
                    style={{
                      background: isCurrent ? 'var(--accent-primary)' : 'transparent',
                      color: isCurrent ? 'var(--bg-primary)' : 'inherit',
                      padding: isCurrent ? '2px 6px' : '0',
                      borderRadius: isCurrent ? '4px' : '0',
                      transition: 'all 0.3s ease',
                      fontWeight: isCurrent ? '500' : '400',
                      display: 'inline'
                    }}
                  >
                    {sentence}
                  </span>
                );
              })}
            </p>
          )}
          {backgroundSentences.length > 0 && (
            <>
              <h3 
                className="text-sm font-semibold text-[var(--text-secondary)] mb-2 mt-6 uppercase tracking-wide"
                style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.85rem', letterSpacing: '0.05em' }}
              >
                Background Context
              </h3>
              <p className="text-[var(--text-secondary)] leading-relaxed italic" style={{ fontFamily: 'Source Serif Pro, serif', fontSize: '0.95rem' }}>
                {backgroundSentences.map((sentence, idx) => {
                const currentIdx = sentenceIdx++;
                const isCurrent = currentSentenceIndex === currentIdx;
                return (
                  <span
                    key={idx}
                    data-sentence-index={currentIdx}
                    style={{
                      background: isCurrent ? 'var(--accent-primary)' : 'transparent',
                      color: isCurrent ? 'var(--bg-primary)' : 'inherit',
                      padding: isCurrent ? '2px 6px' : '0',
                      borderRadius: isCurrent ? '4px' : '0',
                      transition: 'all 0.3s ease',
                      fontWeight: isCurrent ? '500' : '400',
                      display: 'inline'
                    }}
                  >
                    {sentence}
                  </span>
                );
              })}
              </p>
            </>
          )}
        </div>
      </>
    );
  };

  // Don't render if no audio URL
  if (!audioUrl) {
    return null;
  }
  
  return (
    <>
      {/* Audio Player Controls */}
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
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      
      {/* Text with Highlighting */}
      {renderText()}
    </>
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

  // Track if we're changing settings (to auto-close modal)
  const isChangingSettingsRef = useRef(false);

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

  // Auto-close settings modal when loading completes after a settings change
  useEffect(() => {
    if (isChangingSettingsRef.current && loadState === 'ready' && showSettingsModal) {
      console.log('✅ [BundleReadingInterface] Settings change complete, closing modal');
      setShowSettingsModal(false);
      isChangingSettingsRef.current = false;
    }
  }, [loadState, showSettingsModal]);

  // Track first_book_opened event (Phase 5: Step 3)
  useEffect(() => {
    const trackFirstBook = async () => {
      if (!selectedBook || loadState !== 'ready' || !bundleData) return;

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return; // Only track for logged-in users

        // Check if user has opened any book before (check reading_positions table)
        const { data: positions, error } = await supabase
          .from('reading_positions')
          .select('book_id')
          .eq('user_id', user.id)
          .limit(1);

        // If no reading positions exist, this is the first book opened
        if (!error && (!positions || positions.length === 0)) {
          const bookTitle = selectedBook.title || selectedBook.id;
          trackFirstBookOpened(selectedBook.id, bookTitle);
          
          // Set user property in PostHog to prevent duplicate tracking
          if (typeof window !== 'undefined') {
            posthog.identify(user.id, {
              first_book_opened: true,
              first_book_opened_date: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.error('[BundleReadingInterface] Failed to track first_book_opened:', err);
      }
    };

    trackFirstBook();
  }, [selectedBook, loadState, bundleData]);

  // Wrapper handlers that track settings changes
  const handleLevelChange = async (level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2') => {
    isChangingSettingsRef.current = true;
    await contextSwitchLevel(level);
  };

  const handleContentModeChange = async (mode: 'simplified' | 'original') => {
    isChangingSettingsRef.current = true;
    await contextSwitchContentMode(mode);
  };

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
        if (!selectedBook || !bundleData) return; // Guard clauses
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
  if (!selectedBook || loadState === 'loading' || loadState === 'idle') {
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

              {/* Unified Intro Section (Preview + Hook + Background with highlighting) */}
              {(bundleData as any).previewCombined && (bundleData as any).previewCombinedAudio?.audioUrl && (
                <div className="px-4 py-6 mb-6 mx-4 md:mx-8 rounded-lg border-2 border-[var(--accent-primary)]/20 bg-[var(--bg-primary)]">
                  <div className="max-w-2xl mx-auto">
                    <IntroSectionWithHighlighting
                      combinedText={(bundleData as any).previewCombined}
                      audioUrl={(bundleData as any).previewCombinedAudio.audioUrl}
                      duration={(bundleData as any).previewCombinedAudio.duration || 0}
                      sentenceTimings={(bundleData as any).previewCombinedAudio.sentenceTimings || null}
                    />
                    
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mt-6">
                      <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full border border-[var(--accent-primary)]/30">
                        Level {cefrLevel}
                      </span>
                      <span>•</span>
                      <span>~{Math.ceil((bundleData.totalSentences * 15) / 60)} minute read</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Fallback: Display separate sections if previewCombined is not available */}
              {!(bundleData as any).previewCombined && (
                <>
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
                        
                        {(bundleData as any).previewAudio?.audioUrl && (
                          <audio 
                            src={(bundleData as any).previewAudio.audioUrl}
                            controls
                            className="w-full mt-4"
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

                  {(bundleData as any).backgroundContext && (
                    <div className="px-4 py-5 mb-4 mx-4 md:mx-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                      <div className="max-w-2xl mx-auto">
                        <h3 
                          className="text-sm font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wide"
                          style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.85rem', letterSpacing: '0.05em' }}
                        >
                          Background Context
                        </h3>
                        <p 
                          className="text-[var(--text-secondary)] leading-relaxed italic"
                          style={{ fontFamily: 'Source Serif Pro, serif', fontSize: '0.95rem' }}
                        >
                          {(bundleData as any).backgroundContext}
                        </p>
                      </div>
                    </div>
                  )}

                  {(bundleData as any).emotionalHook && (
                    <div className="px-4 py-5 mb-6 mx-4 md:mx-8 rounded-lg bg-gradient-to-r from-[var(--accent-primary)]/5 to-[var(--accent-secondary)]/5 border border-[var(--accent-primary)]/20">
                      <div className="max-w-2xl mx-auto">
                        <h3 
                          className="text-sm font-semibold text-[var(--text-accent)] mb-3 uppercase tracking-wide"
                          style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.85rem', letterSpacing: '0.05em' }}
                        >
                          The Story Begins
                        </h3>
                        <p 
                          className="text-[var(--text-primary)] leading-relaxed font-medium"
                          style={{ fontFamily: 'Source Serif Pro, serif', fontSize: '1.05rem' }}
                        >
                          {(bundleData as any).emotionalHook}
                        </p>
                      </div>
                    </div>
                  )}
                </>
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
          onClose={() => {
            setShowSettingsModal(false);
            isChangingSettingsRef.current = false; // Reset flag when manually closed
          }}
          currentLevel={cefrLevel}
          onLevelChange={handleLevelChange}
          currentContentMode={contentMode}
          onContentModeChange={handleContentModeChange}
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

