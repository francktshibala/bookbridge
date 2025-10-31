/**
 * Featured Books Page - Main Reading Interface
 *
 * Phase 3 Refactor (Component Extraction):
 * - BookSelectionGrid: Book selection screen with grid layout (131 lines)
 * - ReadingHeader: Back button, settings, auto-scroll status (66 lines)
 * - SettingsModal: Content mode & CEFR level settings (157 lines)
 * - ChapterModal: Chapter navigation modal (106 lines)
 *
 * Total: 4 components extracted, ~270 lines reduced from main page
 * Page reduced from ~2,506 → 1,972 lines
 *
 * Architecture: All components follow explicit prop pattern (GPT-5 guidance)
 * - No direct context access in leaf components
 * - Props passed from page (container) to components (presentational)
 * - All state management and side effects remain in page/AudioContext
 */

'use client';

import { useState, useEffect, useRef } from 'react';
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
import { BookSelectionGrid, type FeaturedBook as BookSelectionGridBook } from './components/BookSelectionGrid';
import { ReadingHeader } from './components/ReadingHeader';
import { SettingsModal } from './components/SettingsModal';
import { ChapterModal, type Chapter } from './components/ChapterModal';

// Reuse the working types from test-real-bundles
interface BundleSentence {
  sentenceId: string;
  sentenceIndex: number;
  text: string;
  startTime: number;
  endTime: number;
  wordTimings: Array<{
    word: string;
    start: number;
    end: number;
  }>;
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

// Featured books with bundle architecture
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


const ALL_FEATURED_BOOKS: FeaturedBook[] = [
  // ✅ WORKING BOOKS - Perfect Experience (Top Priority)
  {
    id: 'the-necklace',
    title: 'The Necklace',
    author: 'Guy de Maupassant',
    description: 'Powerful short story about desire and sacrifice. A1, A2 & B1 levels with thematic sections. Perfect 15-minute emotional journey with Sarah (A1) & Daniel (A2/B1) voices.',
    sentences: 20,
    bundles: 5,
    gradient: 'from-purple-500 to-pink-600',
    abbreviation: 'TN'
  },
  {
    id: 'the-dead',
    title: 'The Dead',
    author: 'James Joyce',
    description: 'Modernist masterpiece about love, memory, and mortality. Joyce\'s most celebrated story simplified to A1 level. 451 sentences across 113 bundles with Sarah voice narration.',
    sentences: 451,
    bundles: 113,
    gradient: 'from-blue-500 to-indigo-600',
    abbreviation: 'TD'
  },
  {
    id: 'the-metamorphosis',
    title: 'The Metamorphosis',
    author: 'Franz Kafka',
    description: 'Kafka\'s absurdist masterpiece about transformation and alienation. A man wakes as a giant bug. Simplified to A1 level. 280 sentences across 70 bundles with Sarah voice narration.',
    sentences: 280,
    bundles: 70,
    gradient: 'from-gray-500 to-slate-600',
    abbreviation: 'TM'
  },
  {
    id: 'lady-with-dog',
    title: 'The Lady with the Dog',
    author: 'Anton Chekhov',
    description: 'Psychological masterpiece about unexpected love. A1 level with Sarah voice narration across 6 thematic chapters.',
    sentences: 349,
    bundles: 88,
    gradient: 'from-blue-500 to-purple-600',
    abbreviation: 'LD'
  },
  {
    id: 'gift-of-the-magi',
    title: 'The Gift of the Magi',
    author: 'O. Henry',
    description: 'Heartwarming Christmas story with Sarah voice narration. A1 level with 6 thematic chapters. Complete 13 bundles available.',
    sentences: 51,
    bundles: 13,
    gradient: 'from-red-500 to-green-600',
    abbreviation: 'GM'
  },

  // 📚 OTHER BOOKS - Various Status
  {
    id: 'great-gatsby-a2',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    description: 'Jazz Age masterpiece with A2 simplification. 3,605 sentences across 902 bundles narrated by Sarah.',
    sentences: 3605,
    bundles: 902,
    gradient: 'from-green-500 to-teal-600',
    abbreviation: 'GG'
  },
  {
    id: 'gutenberg-1952-A1',
    title: 'The Yellow Wallpaper',
    author: 'Charlotte Perkins Gilman',
    description: 'Psychological masterpiece simplified to A1 level. 372 sentences across 93 bundles with immersive narration.',
    sentences: 372,
    bundles: 93,
    gradient: 'from-yellow-500 to-amber-600',
    abbreviation: 'YW'
  },
  {
    id: 'gutenberg-43',
    title: 'Dr. Jekyll and Mr. Hyde (A2)',
    author: 'Robert Louis Stevenson',
    description: 'Gothic classic with natural compound sentences. A2 level with Daniel voice narration.',
    sentences: 100,
    bundles: 25,
    gradient: 'from-purple-500 to-indigo-600',
    abbreviation: 'JH'
  },
  {
    id: 'the-devoted-friend',
    title: 'The Devoted Friend',
    author: 'Oscar Wilde',
    description: 'Moral fairy tale about true friendship vs exploitation. A1 level with Sarah voice narration. PILOT: 10 bundles available.',
    sentences: 40,
    bundles: 10,
    gradient: 'from-blue-500 to-purple-600',
    abbreviation: 'DF'
  },
  {
    id: 'sleepy-hollow-enhanced',
    title: 'The Legend of Sleepy Hollow',
    author: 'Washington Irving',
    description: 'Spooky classic enhanced with A1 simplification. 320 sentences across 80 bundles perfect for Halloween.',
    sentences: 320,
    bundles: 80,
    gradient: 'from-orange-500 to-red-600',
    abbreviation: 'SH'
  },
];

const FEATURED_BOOKS = ALL_FEATURED_BOOKS;

// Dynamic API mappings for books with multiple levels
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
  // Single-level books use the default /api/test-book/real-bundles
};

// Default levels for books (used as starting point)
const BOOK_DEFAULT_LEVELS: { [bookId: string]: string } = {
  'great-gatsby-a2': 'A2',
  'gutenberg-1952-A1': 'A1',
  'gutenberg-43': 'A2',  // Default to A2 for Jekyll & Hyde
  'sleepy-hollow-enhanced': 'A1',
  'the-necklace': 'A1',  // Default to A1 for The Necklace (A1/A2/B1 support)
  'gift-of-the-magi': 'A1',  // Default to A1 for Gift of the Magi (A1/A2 support)
  'lady-with-dog': 'A1',  // Default to A1 for The Lady with the Dog
  'the-dead': 'A1',  // Default to A1 for The Dead
  'the-metamorphosis': 'A1'  // Default to A1 for The Metamorphosis
};

// Get the correct CEFR level for a book
const getBookDefaultLevel = (bookId: string): string => {
  return BOOK_DEFAULT_LEVELS[bookId] || 'A1';
};

// Get the API endpoint for a specific book and level
const getBookApiEndpoint = (bookId: string, level: string): string => {
  // Check if book has custom API mappings
  if (BOOK_API_MAPPINGS[bookId] && BOOK_API_MAPPINGS[bookId][level]) {
    return BOOK_API_MAPPINGS[bookId][level];
  }

  // Use dedicated APIs for specific books

  // Default to test-book API
  return '/api/test-book/real-bundles';
};

// Christmas Carol Chapter Structure (pilot version - 40 sentences)
// Sleepy Hollow Chapter Structure (from enhancement plan)
const SLEEPY_HOLLOW_CHAPTERS = [
  {
    chapterNumber: 1,
    title: "The Schoolmaster of Sleepy Hollow",
    startSentence: 0,
    endSentence: 79,
    startBundle: 0,
    endBundle: 19
  },
  {
    chapterNumber: 2,
    title: "The Legend and the Lady",
    startSentence: 80,
    endSentence: 199,
    startBundle: 20,
    endBundle: 49
  },
  {
    chapterNumber: 3,
    title: "The Party and the Pursuit",
    startSentence: 200,
    endSentence: 279,
    startBundle: 50,
    endBundle: 69
  },
  {
    chapterNumber: 4,
    title: "The Encounter and the Mystery",
    startSentence: 280,
    endSentence: 324,
    startBundle: 70,
    endBundle: 81
  }
];

// The Necklace Chapter Structure (thematic sections for emotional flow)
const THE_NECKLACE_CHAPTERS = [
  {
    chapterNumber: 1,
    title: "The Invitation",
    startSentence: 0,
    endSentence: 78,
    startBundle: 0,
    endBundle: 19
  },
  {
    chapterNumber: 2,
    title: "The Ball",
    startSentence: 79,
    endSentence: 98,
    startBundle: 20,
    endBundle: 24
  },
  {
    chapterNumber: 3,
    title: "The Loss",
    startSentence: 99,
    endSentence: 138,
    startBundle: 25,
    endBundle: 34
  },
  {
    chapterNumber: 4,
    title: "The Sacrifice",
    startSentence: 139,
    endSentence: 178,
    startBundle: 35,
    endBundle: 44
  },
  {
    chapterNumber: 5,
    title: "The Truth",
    startSentence: 179,
    endSentence: 195,
    startBundle: 45,
    endBundle: 48
  }
];

// The Dead Chapter Structure (thematic sections for emotional flow)
const THE_DEAD_CHAPTERS = [
  {
    chapterNumber: 1,
    title: "The Party Begins",
    startSentence: 0,
    endSentence: 35,
    startBundle: 0,
    endBundle: 8
  },
  {
    chapterNumber: 2,
    title: "Dinner and Dancing",
    startSentence: 36,
    endSentence: 71,
    startBundle: 9,
    endBundle: 17
  },
  {
    chapterNumber: 3,
    title: "Gabriel's Speech",
    startSentence: 72,
    endSentence: 107,
    startBundle: 18,
    endBundle: 26
  },
  {
    chapterNumber: 4,
    title: "The Journey Home",
    startSentence: 108,
    endSentence: 143,
    startBundle: 27,
    endBundle: 35
  },
  {
    chapterNumber: 5,
    title: "The Revelation",
    startSentence: 144,
    endSentence: 179,
    startBundle: 36,
    endBundle: 44
  }
];

// The Lady with the Dog Chapter Structure (thematic sections for emotional flow)
const THE_LADY_WITH_DOG_CHAPTERS = [
  {
    chapterNumber: 1,
    title: "First Meeting",
    startSentence: 0,
    endSentence: 32,
    startBundle: 0,
    endBundle: 7
  },
  {
    chapterNumber: 2,
    title: "The Affair Begins",
    startSentence: 33,
    endSentence: 65,
    startBundle: 8,
    endBundle: 16
  },
  {
    chapterNumber: 3,
    title: "Departure and Separation",
    startSentence: 66,
    endSentence: 98,
    startBundle: 17,
    endBundle: 24
  },
  {
    chapterNumber: 4,
    title: "The Reunion",
    startSentence: 99,
    endSentence: 131,
    startBundle: 25,
    endBundle: 32
  },
  {
    chapterNumber: 5,
    title: "True Love Revealed",
    startSentence: 132,
    endSentence: 164,
    startBundle: 33,
    endBundle: 40
  }
];

// Yellow Wallpaper Chapter Structure (psychological progression sections)
const YELLOW_WALLPAPER_CHAPTERS = [
  {
    chapterNumber: 1,
    title: "Arrival at the Estate",
    startSentence: 0,
    endSentence: 95,
    startBundle: 0,
    endBundle: 23
  },
  {
    chapterNumber: 2,
    title: "Growing Unease",
    startSentence: 96,
    endSentence: 187,
    startBundle: 24,
    endBundle: 46
  },
  {
    chapterNumber: 3,
    title: "Obsession with the Pattern",
    startSentence: 188,
    endSentence: 279,
    startBundle: 47,
    endBundle: 69
  },
  {
    chapterNumber: 4,
    title: "The Final Revelation",
    startSentence: 280,
    endSentence: 371,
    startBundle: 70,
    endBundle: 92
  }
];

// Gift of the Magi Chapter Structure (A1 SIMPLIFIED - 13 bundles, 51 sentences)
const GIFT_OF_THE_MAGI_CHAPTERS = [
  {
    chapterNumber: 1,
    title: "Pennies and Parsimony",
    startSentence: 0,
    endSentence: 7,
    startBundle: 0,
    endBundle: 1
  },
  {
    chapterNumber: 2,
    title: "Della's Christmas Eve Predicament",
    startSentence: 8,
    endSentence: 19,
    startBundle: 2,
    endBundle: 4
  },
  {
    chapterNumber: 3,
    title: "Saving for Jim's Present",
    startSentence: 20,
    endSentence: 31,
    startBundle: 5,
    endBundle: 7
  },
  {
    chapterNumber: 4,
    title: "The Unrivaled Platinum Chain",
    startSentence: 32,
    endSentence: 39,
    startBundle: 8,
    endBundle: 9
  },
  {
    chapterNumber: 5,
    title: "Jim's Quiet Entrance",
    startSentence: 40,
    endSentence: 47,
    startBundle: 10,
    endBundle: 11
  },
  {
    chapterNumber: 6,
    title: "Awakening to Love's Worth",
    startSentence: 48,
    endSentence: 50,
    startBundle: 12,
    endBundle: 12
  }
];

// Jekyll & Hyde Chapter Structure (8 chapters) - Based on actual API sentence indices
const JEKYLL_HYDE_CHAPTERS = [
  {
    chapterNumber: 1,
    title: "Story of the Door",
    startSentence: 0,
    endSentence: 137,
    startBundle: 0,
    endBundle: 34
  },
  {
    chapterNumber: 2,
    title: "Search for Mr. Hyde",
    startSentence: 138,
    endSentence: 275,
    startBundle: 35,
    endBundle: 68
  },
  {
    chapterNumber: 3,
    title: "Dr. Jekyll Was Quite at Ease",
    startSentence: 276,
    endSentence: 413,
    startBundle: 69,
    endBundle: 103
  },
  {
    chapterNumber: 4,
    title: "The Carew Murder Case",
    startSentence: 414,
    endSentence: 551,
    startBundle: 104,
    endBundle: 137
  },
  {
    chapterNumber: 5,
    title: "Incident of the Letter",
    startSentence: 552,
    endSentence: 689,
    startBundle: 138,
    endBundle: 172
  },
  {
    chapterNumber: 6,
    title: "Remarkable Incident of Dr. Lanyon",
    startSentence: 690,
    endSentence: 827,
    startBundle: 173,
    endBundle: 206
  },
  {
    chapterNumber: 7,
    title: "Incident at the Window",
    startSentence: 828,
    endSentence: 965,
    startBundle: 207,
    endBundle: 241
  },
  {
    chapterNumber: 8,
    title: "The Last Night",
    startSentence: 968,
    endSentence: 1287,
    startBundle: 242,
    endBundle: 321
  }
];

// Great Gatsby Chapter Structure (9 chapters, ~400 sentences each)
const GREAT_GATSBY_CHAPTERS = [
  {
    chapterNumber: 1,
    title: "Nick Arrives in West Egg",
    startSentence: 0,
    endSentence: 379,
    startBundle: 0,
    endBundle: 94
  },
  {
    chapterNumber: 2,
    title: "The Valley of Ashes",
    startSentence: 380,
    endSentence: 736,
    startBundle: 95,
    endBundle: 184
  },
  {
    chapterNumber: 3,
    title: "Gatsby's Party",
    startSentence: 737,
    endSentence: 1145,
    startBundle: 185,
    endBundle: 286
  },
  {
    chapterNumber: 4,
    title: "The Truth About Gatsby",
    startSentence: 1146,
    endSentence: 1561,
    startBundle: 287,
    endBundle: 390
  },
  {
    chapterNumber: 5,
    title: "The Reunion",
    startSentence: 1562,
    endSentence: 1879,
    startBundle: 391,
    endBundle: 469
  },
  {
    chapterNumber: 6,
    title: "The Past Revealed",
    startSentence: 1880,
    endSentence: 2162,
    startBundle: 470,
    endBundle: 540
  },
  {
    chapterNumber: 7,
    title: "The Confrontation",
    startSentence: 2163,
    endSentence: 2965,
    startBundle: 541,
    endBundle: 741
  },
  {
    chapterNumber: 8,
    title: "The Tragedy",
    startSentence: 2966,
    endSentence: 3322,
    startBundle: 742,
    endBundle: 830
  },
  {
    chapterNumber: 9,
    title: "The End of the Dream",
    startSentence: 3323,
    endSentence: 3604,
    startBundle: 831,
    endBundle: 901
  }
];

export default function FeaturedBooksPage() {
  // =========================================================================
  // AUDIO CONTEXT (Phase 1, Task 1.5, Commit 2d: Use directly without prefixes)
  // =========================================================================
  const {
    // Book & Content (no prefix - used directly)
    selectedBook,
    cefrLevel,
    contentMode,
    bundleData,
    // Still prefixed (will convert in later commits)
    availableLevels: contextAvailableLevels,
    currentBookAvailableLevels: contextCurrentBookAvailableLevels,
    isPlaying: contextIsPlaying,
    currentSentenceIndex: contextCurrentSentenceIndex,
    currentChapter: contextCurrentChapter,
    currentBundle: contextCurrentBundle,
    playbackTime: contextPlaybackTime,
    totalTime: contextTotalTime,
    playbackSpeed: contextPlaybackSpeed,
    // Loading state (no prefix)
    loadState,
    loading,
    error,
    // Resume state (Commit 5)
    resumeInfo,
    // Actions (keep context prefix)
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

  // =========================================================================
  // LOCAL STATE (Phase 1, Task 1.5, Commit 2d: No longer need aliases)
  // =========================================================================
  // selectedBook, cefrLevel, contentMode now destructured directly from context above
  const [showBookSelection, setShowBookSelection] = useState(true);
  // Phase 1, Task 1.5, Commit 3: No-op setters removed, handlers now dispatch to context
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);

  // AI Chat Modal state
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [selectedAIBook, setSelectedAIBook] = useState<ExternalBook | null>(null);

  // Dictionary interaction state
  const {
    selectedWord,
    selectedElement,
    handleMouseDown,
    handleMouseUp,
    handleTouchStart,
    handleTouchEnd,
    clearSelection
  } = useDictionaryInteraction();

  // Dictionary bottom sheet state
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [currentDefinition, setCurrentDefinition] = useState<any>(null);
  const [definitionLoading, setDefinitionLoading] = useState(false);

  // Data state (Phase 1, Task 1.5, Commit 4: availableLevels now from context)
  // selectedBook, cefrLevel, contentMode, bundleData, loading, error, availableLevels all from context now
  // REMOVED: Local availableLevels state - now using contextAvailableLevels from AudioContext

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [currentBundle, setCurrentBundle] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showChapterPicker, setShowChapterPicker] = useState(false);

  // Audio manager
  const audioManagerRef = useRef<BundleAudioManager | null>(null);
  const playerRef = useRef<AudioBookPlayer | null>(null);
  const handleNextBundleRef = useRef<() => void>(() => {});
  const isPlayingRef = useRef<boolean>(false); // Critical fix for React closure issue
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollEnabledRef = useRef(true);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);

  // Phase 1, Task 1.5, Commit 4: Request refs removed - AudioContext handles request management

  // Get bookId from selected book or URL params
  // Commit 6: Removed dead getBookId() function and commented-out useEffect
  // URL param handling and auto-level setting are now handled by AudioContext

  // Detect user scrolling and pause auto-scroll temporarily
  useEffect(() => {
    const handleUserScroll = () => {
      // Disable auto-scroll when user scrolls manually
      autoScrollEnabledRef.current = false;
      setAutoScrollPaused(true);

      // Clear existing timeout
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }

      // Re-enable auto-scroll after 3 seconds of no scrolling
      userScrollTimeoutRef.current = setTimeout(() => {
        autoScrollEnabledRef.current = true;
        setAutoScrollPaused(false);
        console.log('Auto-scroll re-enabled after user inactivity');
      }, 3000);
    };

    // Add scroll listener
    window.addEventListener('wheel', handleUserScroll, { passive: true });
    window.addEventListener('touchmove', handleUserScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleUserScroll);
      window.removeEventListener('touchmove', handleUserScroll);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

  // Phase 2, Task 2.5: Restore last-read book on mount (GPT-5 fix)
  // Root cause: Previous effect ran too early without checking loadState
  // Solution: Only dispatch selectBook when context is idle
  const hasAttemptedRestoreRef = useRef(false);
  useEffect(() => {
    // One-time execution guard
    if (hasAttemptedRestoreRef.current) return;
    hasAttemptedRestoreRef.current = true;

    // Early returns: wait for the right moment
    const lastBookId = localStorage.getItem('lastReadBookId');
    if (!lastBookId) {
      console.log('📚 No last-read book found');
      return;
    }
    if (selectedBook) {
      console.log('📚 Book already selected, skipping restore');
      return;
    }

    // Find the book in FEATURED_BOOKS
    const book = FEATURED_BOOKS.find(b => b.id === lastBookId);
    if (!book) {
      console.log('📚 Last-read book not found in FEATURED_BOOKS:', lastBookId);
      return;
    }

    // Only dispatch when context is idle (GPT-5: wait for AudioContext to be ready)
    if (loadState === 'idle') {
      console.log('📚 Restoring last-read book:', book.title);
      void contextSelectBook(book);
      // Note: showBookSelection will be hidden by the separate effect below
    }
  }, [loadState, selectedBook, contextSelectBook]);

  // Phase 2, Task 2.5: Auto-hide book selection grid (GPT-5 fix)
  // Root cause: Grid stayed visible during context loading
  // Solution: Hide grid as soon as load begins or book is selected
  useEffect(() => {
    if (selectedBook || loadState === 'loading' || loadState === 'ready') {
      setShowBookSelection(false);
      console.log('📚 Hiding book selection grid - loadState:', loadState);
    }
  }, [selectedBook, loadState]);

  // Phase 1, Task 1.5, Commit 4: checkAvailableLevels REMOVED
  // AudioContext now handles availability checking via loadBookData()

  // Phase 1, Task 1.5, Commit 4: Minimal read-only effect - context handles all fetching
  useEffect(() => {
    // Early returns: wait for context to load data
    if (!selectedBook) {
      console.log('⏭️ No selectedBook yet');
      return;
    }
    if (loadState !== 'ready') {
      console.log('⏭️ loadState not ready:', loadState);
      return;
    }
    if (!bundleData) {
      console.log('⏭️ No bundleData yet');
      return;
    }

    // Page-local side effects only (no fetching, no context state mutations)
    async function initializePageSideEffects() {
      try {
        const currentBookId = selectedBook!.id; // Non-null: guarded above
        console.log(`🎵 Initializing page side effects for ${currentBookId}`);

        // Initialize audio manager if needed (uses bundleData from context)
        if (!audioManagerRef.current && bundleData!.audioType !== 'none') { // Non-null: guarded above
          // Determine highlight lead based on audio provider
          const firstSentence = bundleData!.bundles?.[0]?.sentences?.[0];
          const hasPreciseTimings = Array.isArray(firstSentence?.wordTimings) && firstSentence.wordTimings.length > 0;

          // For TTS, use immediate highlighting since timings are estimated
          const audioProvider = bundleData!.audioType || 'elevenlabs';
          const isTTS = audioProvider === 'elevenlabs' || audioProvider === 'openai' || currentBookId === 'great-gatsby-a2';
          const leadMs = isTTS ? -500 : (hasPreciseTimings ? 500 : 1400);

          const audioManager = new BundleAudioManager({
            highlightLeadMs: leadMs,
            onSentenceStart: (sentence) => {
              setCurrentSentenceIndex(sentence.sentenceIndex);

              // Smart auto-scroll
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
            onSentenceEnd: (sentence) => {
              console.log(`✅ Sentence ended: ${sentence.sentenceIndex}`);
            },
            onBundleComplete: (bundleId) => {
              console.log(`📦 Bundle complete: ${bundleId}`);
              handleNextBundleRef.current();
            },
            onProgress: (currentTime, duration) => {
              setPlaybackTime(currentTime);
              setTotalTime(duration);
            }
          });
          audioManagerRef.current = audioManager;

          // Set analytics context for playback stability tracking (Feature 8)
          audioManager.setAnalyticsContext({
            bookId: currentBookId,
            level: cefrLevel
          });

          // Create unified player with global sentence map
          playerRef.current = new AudioBookPlayer(bundleData!.bundles, {
            highlightLeadMs: leadMs,
            preloadRadius: 1,
            debug: false,
            bookId: currentBookId,
            onPositionUpdate: (position: ReadingPosition) => {
              setCurrentSentenceIndex(position.currentSentenceIndex);
              setCurrentChapter(position.currentChapter);
              console.log('📍 Position updated:', {
                sentence: position.currentSentenceIndex,
                chapter: position.currentChapter,
                completion: position.completionPercentage.toFixed(1) + '%'
              });
            }
          });

          // Phase 2 Task 2.4: Removed setTimeout hack - scroll will happen in dedicated useEffect below
        }
      } catch (error) {
        console.error('Error initializing page side effects:', error);
      }
    }

    initializePageSideEffects();

    // Cleanup on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.forceSavePosition().catch(console.error);
      }
      audioManagerRef.current?.destroy();
    };
  }, [selectedBook, bundleData, loadState]);

  // Phase 2 Task 2.4a: Scroll to saved position using state guards (no setTimeout)
  // GPT-5 guidance: Replace "Wait X ms before scroll" with loadState gates
  const didAutoScrollRef = useRef<string | null>(null); // Track last scrolled book+level
  useEffect(() => {
    const scrollKey = `${selectedBook?.id}-${cefrLevel}-${contextCurrentSentenceIndex}`;

    // State gates: only scroll when context is fully loaded AND we haven't scrolled yet for this book/level/position
    if (
      loadState === 'ready' &&
      bundleData &&
      contextCurrentSentenceIndex > 0 &&
      resumeInfo &&
      didAutoScrollRef.current !== scrollKey
    ) {
      // Use requestAnimationFrame for DOM readiness (GPT-5: render-readiness without polling)
      requestAnimationFrame(() => {
        const sentenceElement = document.querySelector(`[data-sentence-index="${contextCurrentSentenceIndex}"]`);
        if (sentenceElement) {
          sentenceElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          console.log('📍 [Phase 2] Scrolled to saved position (state-gated):', contextCurrentSentenceIndex);
          didAutoScrollRef.current = scrollKey; // Mark as scrolled
        }
      });
    }
  }, [loadState, bundleData, contextCurrentSentenceIndex, resumeInfo, selectedBook?.id, cefrLevel]);

  // Audio playback functions
  const findBundleForSentence = (sentenceIndex: number): BundleData | null => {
    if (!bundleData) return null;

    // Bounds checking
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

      // Apply current playback speed
      audioManagerRef.current.setPlaybackRate(playbackSpeed);

      await audioManagerRef.current.playSequentialSentences(bundle, startSentenceIndex);

      // This line executes when playSequentialSentences completes (bundle finished)
      console.log(`📌 playSequentialSentences completed for bundle ${bundle.bundleId}, isPlayingRef.current = ${isPlayingRef.current}`);

    } catch (error) {
      console.error('Sequential playback failed:', error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const handleNextBundle = async () => {
    console.log('🔄 handleNextBundle called', { bundleData: !!bundleData, currentBundle, isPlaying: isPlayingRef.current });

    if (!bundleData || !currentBundle) {
      console.log('❌ handleNextBundle early return - missing data');
      return;
    }

    // Only continue if still playing
    if (!isPlayingRef.current) {
      console.log('❌ handleNextBundle early return - not playing');
      return;
    }

    const currentBundleIndex = bundleData.bundles.findIndex(b => b.bundleId === currentBundle);
    const nextBundle = bundleData.bundles[currentBundleIndex + 1];

    console.log(`📊 Bundle progress: ${currentBundleIndex + 1}/${bundleData.bundles.length}`);

    if (nextBundle && nextBundle.sentences.length > 0) {
      console.log(`📦 Auto-advancing to next bundle: ${nextBundle.bundleId}`);
      const nextSentenceIndex = nextBundle.sentences[0].sentenceIndex;
      console.log(`🎯 Next bundle starts at sentence ${nextSentenceIndex}`);
      console.log(`📝 Bundle ${nextBundle.bundleId} contains:`,
        nextBundle.sentences.map(s => `s${s.sentenceIndex}: "${s.text?.substring(0, 25)}..."`).join(', ')
      );

      // Phase 2 Task 2.4d: Removed setTimeout delay - bundle already complete, can advance immediately
      if (isPlayingRef.current) { // Check before advancing
        console.log(`✅ Still playing, advancing to sentence ${nextSentenceIndex}`);
        handlePlaySequential(nextSentenceIndex);
      } else {
        console.log(`⛔ Playback was stopped, not advancing to next bundle`);
      }
    } else {
      console.log('🎉 All bundles complete!');
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentBundle(null);
    }
  };

  // Update the ref whenever handleNextBundle changes
  useEffect(() => {
    handleNextBundleRef.current = handleNextBundle;
  });

  // Dictionary effect - watch for word selection and fetch definition
  useEffect(() => {
    if (selectedWord) {
      setIsDictionaryOpen(true);
      setDefinitionLoading(true);

      // Use client-side cache for instant lookups
      const fetchDefinition = async () => {
        try {
          console.log('🔍 Dictionary: Using cached lookup for:', selectedWord);

          const result = await dictionaryCache.fetchWithCache(selectedWord);
          console.log(`✅ Dictionary: Got ${result.cached ? 'cached' : 'fresh'} result in ${result.responseTime}ms:`, result);

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

            // Log performance metrics
            if (result.cached) {
              console.log('⚡ Dictionary: Cache hit! Response time:', result.responseTime + 'ms');
            } else {
              console.log('🔄 Dictionary: Fresh lookup, response time:', result.responseTime + 'ms');
            }

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

  // Performance monitoring effect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const interval = setInterval(() => {
      // Check for performance alerts
      dictionaryAnalytics.checkPerformanceAlerts();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handlePause = async () => {
    audioManagerRef.current?.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;

    // Save position when user pauses
    if (playerRef.current) {
      await playerRef.current.forceSavePosition();
    }
  };

  const handleResume = async () => {
    if (!audioManagerRef.current || !bundleData) return;

    try {
      // If we have a current position, resume from there
      if (currentSentenceIndex >= 0 && currentBundle) {
        const bundle = findBundleForSentence(currentSentenceIndex);
        if (bundle) {
          setIsPlaying(true);
          isPlayingRef.current = true; // Make sure the play flag is set

          // Phase 2 Task 2.4b: Removed force-highlighting setTimeout hack
          // Highlighting responds naturally to isPlaying + currentSentenceIndex state

          // Apply current playback speed
          audioManagerRef.current.setPlaybackRate(playbackSpeed);

          await audioManagerRef.current.playSequentialSentences(bundle, currentSentenceIndex);

          // After playSequentialSentences completes, check if we should continue to next bundle
          console.log(`📌 Resume playback completed for bundle ${bundle.bundleId}, checking for next bundle`);

          // Only continue to next bundle if still playing
          if (isPlayingRef.current) {
            handleNextBundle();
          }
        } else {
          // Fallback to resume if bundle not found
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
    } catch (error) {
      console.error('Resume failed:', error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  // AI Chat Modal handlers
  const handleAskAI = (book: FeaturedBook) => {
    console.log('Featured Books - Original book data:', book);

    // Convert FeaturedBook to ExternalBook format for AI modal
    const externalBook: ExternalBook = {
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description || 'Classic literature with multiple CEFR difficulty levels',
      subjects: ['Literature', 'Classic'],
      language: 'en',
      source: 'gutenberg',
      publicationYear: undefined,
      popularity: 1
    };

    console.log('Featured Books - Converted ExternalBook:', externalBook);

    setSelectedAIBook(externalBook);
    setIsAIChatOpen(true);
  };

  // Phase 3, Task 3.1: Book selection handler for BookSelectionGrid
  const handleSelectBook = async (book: FeaturedBook) => {
    // Save last-read book to localStorage
    localStorage.setItem('lastReadBookId', book.id);

    // Select book via AudioContext
    await contextSelectBook(book);

    // Hide book selection grid
    setShowBookSelection(false);
  };

  // Phase 3, Task 3.2: Back button handler for ReadingHeader
  const handleBackToBookSelection = () => {
    setShowBookSelection(true);
    contextUnload();
    handleStop();
  };

  // Phase 3, Task 3.4: Get chapters for current book
  const getCurrentBookChapters = (): Chapter[] => {
    if (!selectedBook) return [];

    switch (selectedBook.id) {
      case 'sleepy-hollow-enhanced':
        return SLEEPY_HOLLOW_CHAPTERS;
      case 'great-gatsby-a2':
        return GREAT_GATSBY_CHAPTERS;
      case 'gutenberg-1952-A1':
        return YELLOW_WALLPAPER_CHAPTERS;
      case 'gutenberg-43':
        return JEKYLL_HYDE_CHAPTERS;
      case 'the-necklace':
        return THE_NECKLACE_CHAPTERS;
      case 'the-dead':
        return THE_DEAD_CHAPTERS;
      case 'lady-with-dog':
        return THE_LADY_WITH_DOG_CHAPTERS;
      default:
        return GREAT_GATSBY_CHAPTERS;
    }
  };

  // Phase 3, Task 3.4: Chapter selection handler for ChapterModal
  const handleChapterSelect = async (chapter: Chapter) => {
    // Stop current playback
    handleStop();

    // Update sentence index
    setCurrentSentenceIndex(chapter.startSentence);

    // Force auto-scroll to chapter start
    autoScrollEnabledRef.current = true;
    setAutoScrollPaused(false);

    // Jump to chapter and continue playing
    jumpToSentence(chapter.startSentence).then(() => {
      // Use RAF for DOM-readiness (GPT-5 guidance)
      requestAnimationFrame(() => {
        const sentenceElement = document.querySelector(`[data-sentence-index="${chapter.startSentence}"]`);
        if (sentenceElement) {
          sentenceElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      });
    });
  };

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

      // Also save to conversation if needed
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

  const handleStop = () => {
    audioManagerRef.current?.stop();
    setIsPlaying(false);
    setCurrentBundle(null);
    setCurrentSentenceIndex(0);
    setPlaybackTime(0);
    setTotalTime(0);
  };

  // Position tracking is now handled automatically by AudioBookPlayer

  // Update AudioBookPlayer when settings change
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.updateSettings(cefrLevel, playbackSpeed, contentMode);
    }
  }, [cefrLevel, playbackSpeed, contentMode]);

  // Jump to any sentence (by absolute sentence index)
  const jumpToSentence = async (targetIndex: number) => {
    // Bounds checking to prevent out-of-range access
    if (!bundleData) return;

    const maxSentenceIndex = bundleData.totalSentences - 1;
    const clampedIndex = Math.max(0, Math.min(targetIndex, maxSentenceIndex));

    if (clampedIndex !== targetIndex) {
      console.warn(`Sentence index ${targetIndex} clamped to ${clampedIndex} (valid range: 0-${maxSentenceIndex})`);
    }

    // Always use handlePlaySequential for proper bundle continuation
    // This ensures that after jumping to a chapter, playback continues through subsequent bundles
    await handlePlaySequential(clampedIndex);
  };

  // Mobile-optimized chapter picker
  const ChapterPicker = () => {
    const chapters = selectedBook?.id === 'sleepy-hollow-enhanced' ? SLEEPY_HOLLOW_CHAPTERS :
                    selectedBook?.id === 'great-gatsby-a2' ? GREAT_GATSBY_CHAPTERS :
                    selectedBook?.id === 'gutenberg-1952-A1' ? YELLOW_WALLPAPER_CHAPTERS :
                    selectedBook?.id === 'gutenberg-43' ? JEKYLL_HYDE_CHAPTERS :
                    selectedBook?.id === 'gift-of-the-magi' ? GIFT_OF_THE_MAGI_CHAPTERS : GREAT_GATSBY_CHAPTERS;
    return (
      <div className="flex items-center gap-1 w-full max-w-xs">
        <select
          className="border rounded px-1 py-1 text-xs flex-1 min-w-0"
          onChange={async (e) => {
            const chapterNum = Number(e.target.value);
            const chapter = chapters.find(c => c.chapterNumber === chapterNum);
            if (!chapter) return;

            // Phase 2 Task 2.4c: Removed setTimeout delay - handleStop() is synchronous
            handleStop();
            setCurrentSentenceIndex(chapter.startSentence);
            jumpToSentence(chapter.startSentence);
          }}
          value={getCurrentChapter().current}
        >
          {chapters.map(c => (
            <option key={c.chapterNumber} value={c.chapterNumber}>
              Ch {c.chapterNumber}: {c.title.length > 20 ? c.title.substring(0, 20) + '...' : c.title}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Speed control functionality
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

  // Get current chapter info using detailed metadata
  const getCurrentChapter = () => {
    if (!selectedBook) {
      return { current: 1, total: 1, title: '', totalSentences: 0 };
    }

    // Choose appropriate chapter structure
    let chapters;
    if (selectedBook.id === 'sleepy-hollow-enhanced') {
      chapters = SLEEPY_HOLLOW_CHAPTERS;
    } else if (selectedBook.id === 'great-gatsby-a2') {
      chapters = GREAT_GATSBY_CHAPTERS;
    } else if (selectedBook.id === 'gutenberg-1952-A1') {
      chapters = YELLOW_WALLPAPER_CHAPTERS;
    } else if (selectedBook.id === 'gutenberg-43') {
      chapters = JEKYLL_HYDE_CHAPTERS;
    } else if (selectedBook.id === 'gift-of-the-magi') {
      chapters = GIFT_OF_THE_MAGI_CHAPTERS;
    } else if (selectedBook.id === 'the-necklace') {
      chapters = THE_NECKLACE_CHAPTERS;
    } else if (selectedBook.id === 'the-dead') {
      chapters = THE_DEAD_CHAPTERS;
    } else if (selectedBook.id === 'lady-with-dog') {
      chapters = THE_LADY_WITH_DOG_CHAPTERS;
    } else {
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
      title: chapters[0].title,
      totalSentences: selectedBook.sentences
    };
  };

  // Get chapters for the current book
  const getBookChapters = () => {
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

  // Activate wake lock to prevent screen from turning off during playback
  useWakeLock(isPlaying);

  // Set up media session for lock screen controls
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
      // Go to previous sentence
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
      // Go to next sentence
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
      // Go to previous bundle
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
      // Go to next bundle
      handleNextBundle();
    }
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Phase 3, Task 3.1: Book Selection Screen - Extracted to BookSelectionGrid component */}
      {showBookSelection && (
        <BookSelectionGrid
          books={FEATURED_BOOKS}
          onSelectBook={handleSelectBook}
          onAskAI={handleAskAI}
        />
      )}

      {/* Reading Interface */}
      {!showBookSelection && selectedBook && (
        <div className="max-w-4xl mx-auto">

        {/* Phase 3, Task 3.2: Reading Header - Extracted to ReadingHeader component */}
        <ReadingHeader
          onBack={handleBackToBookSelection}
          onSettings={() => setShowSettingsModal(true)}
          autoScrollPaused={autoScrollPaused}
        />

        {/* Desktop: Dark Controls Section - Removed for consistency */}
        <div className="hidden">{/* Desktop dark controls removed for consistency */}
          <div className="p-4">

            {/* Row 1: Back, Toggle, Settings */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  setShowBookSelection(true);
                  contextUnload();
                  handleStop();
                }}
                className="flex items-center text-gray-300 hover:text-white"
              >
                ← {/* Back arrow */}
              </button>

              {/* Original/Simplified Toggle (center) */}
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={async () => await contextSwitchContentMode('original')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    contentMode === 'original'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={async () => await contextSwitchContentMode('simplified')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    contentMode === 'simplified'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  Simplified
                </button>
              </div>

              {/* Settings icon removed - all controls are visible on desktop */}
              <div></div>
            </div>

            {/* Row 2: CEFR Level Selector - Always show, but disable unavailable levels */}
            <div className="flex justify-center">
              <div className="flex bg-gray-700 rounded-lg p-1 gap-1">
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((level) => {
                  const isOriginalMode = contentMode === 'original';
                  const isLevelAvailable = contextAvailableLevels[level.toLowerCase()] === true;
                  const isDisabled = isOriginalMode || !isLevelAvailable;

                  return (
                    <button
                      key={level}
                      onClick={async () => {
                        if (!isDisabled) {
                          await contextSwitchLevel(level as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2');
                        }
                      }}
                      disabled={isDisabled}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-w-[44px] ${
                        cefrLevel === level && contentMode === 'simplified'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : isDisabled
                          ? 'text-gray-500 cursor-not-allowed opacity-50'
                          : 'text-gray-300 hover:text-white hover:bg-gray-600'
                      }`}
                      title={
                        isOriginalMode
                          ? 'Switch to Simplified mode to use CEFR levels'
                          : !isLevelAvailable
                          ? `${level} not available for this book`
                          : `Switch to ${level} level`
                      }
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Real Moby Dick Content */}
        <div className="pb-32 px-3 bg-[var(--bg-secondary)] mx-4 md:mx-8 rounded-b-lg shadow-sm border-2 border-[var(--accent-secondary)]/20 border-t-0">

          {/* Loading state (Phase 1, Task 1.5, Commit 2a: Use loadState) */}
          {loadState === 'loading' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading {selectedBook?.title} bundles...</p>
            </div>
          )}

          {/* Error state (Phase 1, Task 1.5, Commit 2a: Use loadState) */}
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

              {/* Real Text with Chapter Headers - Speechify Style */}
              <div className="px-4 py-4 text-left">
                {(() => {
                  const chapters = getBookChapters();
                  const allSentences = bundleData.bundles.flatMap(bundle => bundle.sentences);
                  const result: React.ReactElement[] = [];

                  allSentences.forEach((sentence, index) => {
                    // Check if this sentence starts a new chapter
                    const chapter = chapters.find(ch => ch.startSentence === sentence.sentenceIndex);

                    if (chapter) {
                      // Add chapter header
                      result.push(
                        <div key={`chapter-${chapter.chapterNumber}`} className="mb-6 mt-8 first:mt-0">
                          <h2 className="text-2xl font-semibold text-[var(--text-accent)] border-b-2 border-[var(--accent-secondary)]/30 pb-2 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                            Chapter {chapter.chapterNumber}: {chapter.title}
                          </h2>
                        </div>
                      );
                    }

                    // Add the sentence
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
                        style={{
                          textAlign: 'left'
                        }}
                        title={`Sentence ${sentence.sentenceIndex + 1} (${sentence.startTime.toFixed(1)}s - ${sentence.endTime.toFixed(1)}s) - Click to jump | Long-press words for dictionary`}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onClick={async (e) => {
                          // If this was a dictionary long-press, don't handle click
                          if ((e.target as HTMLElement).classList.contains('dictionary-word-selected')) {
                            return;
                          }
                          console.log(`🖱️ Clicked sentence ${sentence.sentenceIndex}`);

                          // FIRST: Stop any current playback completely
                          if (audioManagerRef.current) {
                            audioManagerRef.current.stop();
                          }

                          // Update highlight immediately (optimistic UI)
                          setCurrentSentenceIndex(sentence.sentenceIndex);

                          // Ensure playback state is active for continuation
                          setIsPlaying(true);
                          isPlayingRef.current = true;

                          // Jump to sentence using the UI-connected audio manager
                          if (audioManagerRef.current) {
                            const targetBundle = findBundleForSentence(sentence.sentenceIndex);
                            if (targetBundle) {
                              console.log(`🎯 Jumping to sentence ${sentence.sentenceIndex} in bundle ${targetBundle.bundleId}, audioUrl: ${targetBundle.audioUrl}`);

                              // Ensure bundle has audio URL
                              if (!targetBundle.audioUrl) {
                                console.error(`Bundle ${targetBundle.bundleId} has no audioUrl`);
                                return;
                              }

                              // Update current bundle state so handleNextBundle works correctly
                              setCurrentBundle(targetBundle.bundleId);

                              await audioManagerRef.current.playSequentialSentences(targetBundle, sentence.sentenceIndex);
                            } else {
                              console.error(`No bundle found for sentence ${sentence.sentenceIndex}`);
                            }
                          }
                        }}
                      >
                        {sentence.text}
                      </span>
                    );

                    // Add paragraph break every 4 sentences (bundle boundaries)
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

        {/* Phase 3, Task 3.3: Settings Modal - Extracted to SettingsModal component */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          currentLevel={cefrLevel}
          onLevelChange={contextSwitchLevel}
          currentContentMode={contentMode}
          onContentModeChange={contextSwitchContentMode}
          availableLevels={contextAvailableLevels}
        />

        {/* Phase 3, Task 3.4: Chapter Navigation Modal - Extracted to ChapterModal component */}
        <ChapterModal
          isOpen={showChapterModal}
          onClose={() => setShowChapterModal(false)}
          chapters={getCurrentBookChapters()}
          currentChapter={getCurrentChapter().current}
          onSelectChapter={handleChapterSelect}
        />

        {/* Mobile Control Bar - Full Width */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-secondary)] border-t border-[var(--border-light)] shadow-lg z-50">
          <div className="px-4 py-3">

            {/* Progress Info Row */}
            <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] mb-2">
              <span>{formatTime(playbackTime)}</span>
              <span>
                Sentence {currentSentenceIndex + 1}/{getCurrentChapter().totalSentences} • Chapter {getCurrentChapter().current} of {getCurrentChapter().total}
              </span>
              <span>{formatTime(totalTime)}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-0.5 bg-[var(--border-light)] rounded-full mb-4">
              <div
                className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-300"
                style={{ width: `${totalTime > 0 ? (playbackTime / totalTime) * 100 : 0}%` }}
              />
            </div>

            {/* Control Buttons Row */}
            <div className="flex items-center justify-center gap-6">

              {/* Speed Control */}
              <button
                onClick={cycleSpeed}
                className="flex items-center justify-center w-9 h-9 text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] rounded-full transition-all"
              >
                <div className="text-sm font-semibold">{formatSpeed(playbackSpeed)}</div>
              </button>

              {/* Play/Pause - Center & Larger */}
              <button
                onClick={async () => {
                  // Disable audio controls for original text mode
                  if (contentMode === 'original') {
                    return;
                  }
                  if (isPlaying) {
                    handlePause();
                  } else {
                    // Always try to resume first if we have a current position
                    if (currentSentenceIndex > 0 && currentBundle) {
                      await handleResume();
                    } else {
                      // Start from first available sentence (not necessarily 0)
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

              {/* Chapter Navigation */}
              <button
                onClick={() => setShowChapterModal(true)}
                className="flex items-center justify-center w-9 h-9 text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] rounded-full transition-all"
              >
                <div className="text-lg">📖</div>
              </button>

              {/* Voice Selector */}
              <button className="flex items-center justify-center w-9 h-9 text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] rounded-full transition-all">
                <div className="text-lg">🎙️</div>
              </button>

            </div>

          </div>
        </div>

        {/* Desktop Control Bar - Floating */}
        <div className="hidden md:block fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-2 border-[var(--accent-secondary)]/20 rounded-full px-8 py-4 shadow-2xl">

            {/* Control Buttons Row */}
            <div className="flex items-center justify-center gap-5">

              {/* Speed Control */}
              <button
                onClick={cycleSpeed}
                className="flex items-center justify-center w-11 h-11 text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] rounded-full transition-all hover:scale-105"
              >
                <div className="text-sm font-semibold">{formatSpeed(playbackSpeed)}</div>
              </button>

              {/* Play/Pause - Center & Larger */}
              <button
                onClick={async () => {
                  // Disable audio controls for original text mode
                  if (contentMode === 'original') {
                    return;
                  }
                  if (isPlaying) {
                    handlePause();
                  } else {
                    // Always try to resume first if we have a current position
                    if (currentSentenceIndex > 0 && currentBundle) {
                      await handleResume();
                    } else {
                      // Start from first available sentence (not necessarily 0)
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

              {/* Chapter Navigation */}
              <button
                onClick={() => setShowChapterModal(true)}
                className="flex items-center justify-center w-11 h-11 text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] rounded-full transition-all hover:scale-105"
              >
                <div className="text-lg">📖</div>
              </button>

              {/* Voice Selector */}
              <button className="flex items-center justify-center w-11 h-11 text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)] rounded-full transition-all hover:scale-105">
                <div className="text-lg">🎙️</div>
              </button>

            </div>

          </div>
        </div>

        </div>
      )}

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
    </div>
  );
}