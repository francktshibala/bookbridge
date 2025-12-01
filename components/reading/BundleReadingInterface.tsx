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

import { useState, useEffect, useRef } from 'react';
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

  // TODO: Copy remaining logic from featured-books/page.tsx
  // This is a placeholder structure - we'll add the full reading interface next

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
        
        <div className="text-center py-12">
          <p className="text-[var(--text-secondary)]" style={{ fontFamily: '"Source Serif Pro", Georgia, serif' }}>
            Reading interface will be rendered here...
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Book: {selectedBook.title} | Level: {cefrLevel}
          </p>
        </div>
      </div>
    </div>
  );
}

