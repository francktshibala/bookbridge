'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BundleAudioManager, type BundleData } from '@/lib/audio/BundleAudioManager';
import AudioBookPlayer from '@/lib/audio/AudioBookPlayer';
import { readingPositionService, type ReadingPosition } from '@/lib/services/reading-position';

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

const FEATURED_BOOKS: FeaturedBook[] = [
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
    id: 'gutenberg-1513',
    title: 'Romeo and Juliet',
    author: 'William Shakespeare',
    description: 'Timeless love story modernized to A1 level. 2,996 sentences across 749 bundles with clear narration.',
    sentences: 2996,
    bundles: 749,
    gradient: 'from-rose-500 to-pink-600',
    abbreviation: 'RJ'
  },
  {
    id: 'gutenberg-43',
    title: 'Dr. Jekyll and Mr. Hyde',
    author: 'Robert Louis Stevenson',
    description: 'Classic gothic tale simplified to A1 level. 1,285 sentences across 322 bundles for easy reading.',
    sentences: 1285,
    bundles: 322,
    gradient: 'from-purple-500 to-indigo-600',
    abbreviation: 'JH'
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
  {
    id: 'christmas-carol-enhanced-v2',
    title: 'A Christmas Carol (Enhanced)',
    author: 'Charles Dickens',
    description: 'Dickens classic with clean A1 text and Daniel voice narration. 40 sentences across 10 bundles with research-optimized TTS settings.',
    sentences: 40,
    bundles: 10,
    gradient: 'from-emerald-500 to-teal-600',
    abbreviation: 'CC'
  }
];

// Smart book-to-level mapping for featured books (single level per book)
const BOOK_LEVEL_MAP: { [bookId: string]: string } = {
  'great-gatsby-a2': 'A2',                  // Only has A2 level
  'gutenberg-1952-A1': 'A1',                // Yellow Wallpaper - A1 level
  'gutenberg-1513': 'A1',                   // Romeo & Juliet - A1 level
  'gutenberg-43': 'A1',                     // Jekyll & Hyde - A1 level (fixed)
  'sleepy-hollow-enhanced': 'A1',           // Sleepy Hollow - A1 level (fixed)
  'christmas-carol-enhanced-v2': 'A1'       // A Christmas Carol - Enhanced clean version
};

// Get the correct CEFR level for a book
const getBookDefaultLevel = (bookId: string): string => {
  return BOOK_LEVEL_MAP[bookId] || 'A1'; // Fallback to A1
};

// Christmas Carol Chapter Structure (pilot version - 40 sentences)
const CHRISTMAS_CAROL_CHAPTERS = [
  {
    chapterNumber: 1,
    title: "Stave 1 - Opening",
    startSentence: 0,
    endSentence: 19,
    startBundle: 0,
    endBundle: 4
  },
  {
    chapterNumber: 2,
    title: "Stave 1 - Continued",
    startSentence: 20,
    endSentence: 39,
    startBundle: 5,
    endBundle: 9
  }
];

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

// Romeo and Juliet Chapter Structure (10 chapters based on Acts/Scenes)
const ROMEO_JULIET_CHAPTERS = [
  {
    chapterNumber: 1,
    title: "Act I: The Feud Begins",
    startSentence: 0,
    endSentence: 299,
    startBundle: 0,
    endBundle: 74
  },
  {
    chapterNumber: 2,
    title: "Act I: The Party",
    startSentence: 300,
    endSentence: 599,
    startBundle: 75,
    endBundle: 149
  },
  {
    chapterNumber: 3,
    title: "Act II: The Balcony",
    startSentence: 600,
    endSentence: 899,
    startBundle: 150,
    endBundle: 224
  },
  {
    chapterNumber: 4,
    title: "Act II: The Marriage",
    startSentence: 900,
    endSentence: 1199,
    startBundle: 225,
    endBundle: 299
  },
  {
    chapterNumber: 5,
    title: "Act III: The Fight",
    startSentence: 1200,
    endSentence: 1499,
    startBundle: 300,
    endBundle: 374
  },
  {
    chapterNumber: 6,
    title: "Act III: The Banishment",
    startSentence: 1500,
    endSentence: 1799,
    startBundle: 375,
    endBundle: 449
  },
  {
    chapterNumber: 7,
    title: "Act IV: The Potion",
    startSentence: 1800,
    endSentence: 2099,
    startBundle: 450,
    endBundle: 524
  },
  {
    chapterNumber: 8,
    title: "Act IV: The Wedding Plans",
    startSentence: 2100,
    endSentence: 2399,
    startBundle: 525,
    endBundle: 599
  },
  {
    chapterNumber: 9,
    title: "Act V: The Tomb",
    startSentence: 2400,
    endSentence: 2699,
    startBundle: 600,
    endBundle: 674
  },
  {
    chapterNumber: 10,
    title: "Act V: The Tragedy",
    startSentence: 2700,
    endSentence: 2995,
    startBundle: 675,
    endBundle: 748
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
  // Book selection state
  const [selectedBook, setSelectedBook] = useState<FeaturedBook | null>(null);
  const [showBookSelection, setShowBookSelection] = useState(true);

  // UI state
  const [contentMode, setContentMode] = useState<'original' | 'simplified'>('simplified');
  const [cefrLevel, setCefrLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('A1'); // Initialize to A1, will be updated by book selection
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showContinueReading, setShowContinueReading] = useState(false);
  const [savedPosition, setSavedPosition] = useState<{sentenceIndex: number, timestamp: number} | null>(null);

  // Data state
  const [bundleData, setBundleData] = useState<RealBundleApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableLevels, setAvailableLevels] = useState<{[key: string]: boolean}>({});

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

  // Request cancellation and race condition prevention
  const currentRequestIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get bookId from selected book or URL params
  const getBookId = () => {
    if (selectedBook) {
      return selectedBook.id;
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlBookId = params.get('bookId');
      if (urlBookId) {
        // Auto-select book from URL
        const book = FEATURED_BOOKS.find(b => b.id === urlBookId);
        if (book) {
          setSelectedBook(book);
          setShowBookSelection(false);
          return urlBookId;
        }
      }
    }
    return FEATURED_BOOKS[0].id; // Default to first book
  };

  // Auto-set CEFR level when book is selected and clear stale data
  useEffect(() => {
    if (selectedBook) {
      const bookDefaultLevel = getBookDefaultLevel(selectedBook.id);
      console.log(`📚 Book selected: ${selectedBook.title}, setting default level: ${bookDefaultLevel}`);
      setCefrLevel(bookDefaultLevel as any);

      // Clear stale data and abort previous requests
      setBundleData(null);
      setLoading(true);
      setError(null);

      // Abort any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [selectedBook]);

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

  // Check available levels for a book with request guarding
  const checkAvailableLevels = async (bookId: string, signal: AbortSignal, reqId: string) => {
    const levels = ['original', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const availability: {[key: string]: boolean} = {};

    for (const level of levels) {
      // Guard: check if request is still current
      if (currentRequestIdRef.current !== reqId || signal.aborted) {
        console.log(`🛑 Availability check aborted for ${reqId}`);
        return;
      }

      try {
        if (level === 'original') {
          // Check if original content is available via content API
          const response = await fetch(`/api/books/${bookId}/content`, {
            cache: 'no-store',
            signal
          });
          availability[level.toLowerCase()] = response.ok;
        } else {
          // Use consistent API endpoint for all books
          const apiUrl = bookId === 'gutenberg-43'
            ? `/api/jekyll-hyde/bundles?bookId=${bookId}&level=${level}&t=${Date.now()}`
            : `/api/test-book/real-bundles?bookId=${bookId}&level=${level}&t=${Date.now()}`;

          const response = await fetch(apiUrl, {
            cache: 'no-store',
            signal
          });
          if (response.ok) {
            const data = await response.json();
            // Accept single-level books as valid
            availability[level.toLowerCase()] = data.success === true;
          } else {
            availability[level.toLowerCase()] = false;
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log(`🛑 Availability fetch aborted for ${level}`);
          return;
        }
        availability[level.toLowerCase()] = false;
      }
    }

    // Ensure at least one level is marked as available
    const hasAnyLevel = Object.values(availability).some(v => v === true);
    if (!hasAnyLevel) {
      // Use book-specific default level for single-level books
      const defaultLevel = getBookDefaultLevel(bookId);
      availability[defaultLevel.toLowerCase()] = true;
      console.log(`📋 No levels detected, defaulting to ${defaultLevel} for ${bookId}`);
    }

    // Guard: only update state if this is still the current request
    if (currentRequestIdRef.current === reqId && !signal.aborted) {
      setAvailableLevels(availability);
      console.log(`📋 Available levels for ${bookId}:`, availability);
    }
  };

  // Load bundle data
  useEffect(() => {
    async function loadData() {
      // Create new request token and abort controller
      const reqId = crypto.randomUUID();
      currentRequestIdRef.current = reqId;
      console.log(`🔄 Starting request ${reqId}`);

      // Abort previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // Snapshot book ID and level at start
        const selectedId = selectedBook?.id || FEATURED_BOOKS[0].id;
        const params = new URLSearchParams(window.location.search);
        const urlLevel = params.get('level');

        // Determine final level parameter once
        let levelParam = contentMode === 'original' ? 'original' : cefrLevel;
        if (urlLevel) {
          levelParam = urlLevel.toUpperCase();
          // Update state to match URL
          if (urlLevel.toLowerCase() === 'original') {
            setContentMode('original');
            levelParam = 'original';
          } else {
            setContentMode('simplified');
            setCefrLevel(urlLevel.toUpperCase() as any);
          }
        }

        // Use book's available level if current level doesn't exist
        const bookDefaultLevel = getBookDefaultLevel(selectedId);
        if (levelParam !== 'original' && levelParam !== bookDefaultLevel) {
          console.log(`📋 Level ${levelParam} not available for ${selectedId}, using default level: ${bookDefaultLevel}`);
          levelParam = bookDefaultLevel;
          // Update UI state to match
          if (currentRequestIdRef.current === reqId) {
            setCefrLevel(bookDefaultLevel as any);
          }
        }

        // Guard: only proceed if this is still the current request
        if (currentRequestIdRef.current !== reqId) {
          console.log(`🚫 Request ${reqId} aborted before main fetch`);
          return;
        }

        // Set loading state only for current request
        if (currentRequestIdRef.current === reqId) {
          setLoading(true);
          setError(null);
        }

        // Check available levels with abort signal
        await checkAvailableLevels(selectedId, abortController.signal, reqId);


        let data: RealBundleApiResponse | null = null;

        // Handle original content differently
        if (contentMode === 'original' && levelParam === 'original') {
          // Guard: check if request is still current
          if (currentRequestIdRef.current !== reqId) {
            console.log(`🚫 Request ${reqId} aborted before original content fetch`);
            return;
          }

          // Fetch original text from book content API
          const contentResponse = await fetch(`/api/books/${selectedId}/content`, {
            cache: 'no-store',
            signal: abortController.signal
          });

          if (contentResponse.ok) {
            const contentData = await contentResponse.json();

            // Transform original content to bundle format
            const sentences = contentData.content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
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
              bookId: selectedId,
              title: contentData.title || selectedBook?.title || 'Book',
              author: contentData.author || selectedBook?.author || 'Author',
              level: 'original',
              bundleCount: bundles.length,
              totalSentences: sentences.length,
              bundles: bundles,
              audioType: 'none'
            };
          }
        } else {
          // Guard: check if request is still current
          if (currentRequestIdRef.current !== reqId) {
            console.log(`🚫 Request ${reqId} aborted before simplified content fetch`);
            return;
          }

          // Use consistent API endpoint for all books
          const apiUrl = selectedId === 'gutenberg-43'
            ? `/api/jekyll-hyde/bundles?bookId=${selectedId}&level=${levelParam}&t=${Date.now()}`
            : `/api/test-book/real-bundles?bookId=${selectedId}&level=${levelParam}&t=${Date.now()}`;

          const response = await fetch(apiUrl, {
            cache: 'no-store',
            signal: abortController.signal
          });

          if (response.ok) {
            data = await response.json();
          }
        }

        // Guard: only proceed if this is still the current request
        if (currentRequestIdRef.current !== reqId || abortController.signal.aborted) {
          console.log(`🚫 Request ${reqId} aborted before setting bundle data`);
          return;
        }

        if (data && data.success && data.totalSentences > 0) {
          // Guard: only update state if this is still the current request
          if (currentRequestIdRef.current === reqId) {
            setBundleData(data);
          }

          // Initialize unified player and audio manager (skip for original text without audio)
          if (!audioManagerRef.current && data.audioType !== 'none') {
            // Use the snapshot book ID
            const currentBookId = selectedId;

            // Determine highlight lead based on audio provider
            const firstSentence = data?.bundles?.[0]?.sentences?.[0];
            const hasPreciseTimings = Array.isArray(firstSentence?.wordTimings) && firstSentence.wordTimings.length > 0;

            // For TTS (ElevenLabs), use immediate highlighting since timings are estimated
            const audioProvider = data?.audioType || 'elevenlabs';
            const isTTS = audioProvider === 'elevenlabs' || audioProvider === 'openai' || currentBookId === 'great-gatsby-a2';
            // Use consistent TTS lead time for both books
            const leadMs = isTTS ? -500 : (hasPreciseTimings ? 500 : 1400);

            const audioManager = new BundleAudioManager({
              highlightLeadMs: leadMs,
              onSentenceStart: (sentence) => {
                // Immediate highlight; predictive lead handled inside BundleAudioManager
                setCurrentSentenceIndex(sentence.sentenceIndex);

                // Smart auto-scroll: only scroll if user hasn't manually scrolled recently
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
                console.log(`🔍 isPlayingRef.current before handleNextBundle: ${isPlayingRef.current}`);
                handleNextBundleRef.current();
                console.log(`🔍 isPlayingRef.current after handleNextBundle: ${isPlayingRef.current}`);
              },
              onProgress: (currentTime, duration) => {
                setPlaybackTime(currentTime);
                setTotalTime(duration);
              }
            });
            audioManagerRef.current = audioManager;


            // Create unified player with global sentence map and preloading
            if (currentBookId) {
              playerRef.current = new AudioBookPlayer(data.bundles, {
                highlightLeadMs: leadMs,
                preloadRadius: 1,
                debug: false,
                bookId: currentBookId,
                onPositionUpdate: (position: ReadingPosition) => {
                  // Update UI state when position changes
                  setCurrentSentenceIndex(position.currentSentenceIndex);
                  setCurrentChapter(position.currentChapter);
                  // Update other UI elements as needed
                  console.log('📍 Position updated:', {
                    sentence: position.currentSentenceIndex,
                    chapter: position.currentChapter,
                    completion: position.completionPercentage.toFixed(1) + '%'
                  });
                }
              });

              // Load saved reading position from database after successful initialization
              setTimeout(async () => {
                try {
                  const savedPosition = await readingPositionService.loadPosition(currentBookId);
                  if (savedPosition && savedPosition.currentSentenceIndex > 0) {
                    console.log('🔄 Loading saved position:', savedPosition.currentSentenceIndex);

                    // Check how long ago the user last read
                    const hoursSinceLastRead = savedPosition.lastAccessed
                      ? (Date.now() - new Date(savedPosition.lastAccessed).getTime()) / (1000 * 60 * 60)
                      : 999;

                    // Always restore position to the UI
                    setCurrentSentenceIndex(savedPosition.currentSentenceIndex);
                    setCurrentChapter(savedPosition.currentChapter);

                    if (hoursSinceLastRead < 24) { // Within last 24 hours - show continue modal
                      setSavedPosition({
                        sentenceIndex: savedPosition.currentSentenceIndex,
                        timestamp: new Date(savedPosition.lastAccessed || Date.now()).getTime()
                      });
                      setShowContinueReading(true);
                    }

                    // Update current settings from saved position
                    if (savedPosition.cefrLevel) {
                      setCefrLevel(savedPosition.cefrLevel as any);
                    }
                    if (savedPosition.playbackSpeed) {
                      setPlaybackSpeed(savedPosition.playbackSpeed);
                    }
                    if (savedPosition.contentMode) {
                      setContentMode(savedPosition.contentMode);
                    }

                    // Scroll to the saved position
                    setTimeout(() => {
                      const sentenceElement = document.querySelector(`[data-sentence-index="${savedPosition.currentSentenceIndex}"]`);
                      if (sentenceElement) {
                        sentenceElement.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center'
                        });
                        console.log('📍 Scrolled to saved sentence:', savedPosition.currentSentenceIndex);
                      } else {
                        console.log('⚠️ Could not find sentence element for index:', savedPosition.currentSentenceIndex);
                      }
                    }, 1000); // Wait for DOM to be fully ready
                  }
                } catch (error) {
                  console.error('Error loading saved reading position:', error);
                }
              }, 500); // Small delay to ensure DOM is ready
            }
          }

          // Position loading is now handled inside AudioBookPlayer initialization

        } else {
          // Guard: only set error if this is still the current request
          if (currentRequestIdRef.current === reqId) {
            setError(`Level ${levelParam} not available for this book. Please try the available level or switch to Original.`);
          }
        }

      } catch (err: any) {
        // Handle AbortError gracefully
        if (err.name === 'AbortError') {
          console.log(`🛑 Request ${reqId} was aborted`);
          return;
        }

        // Guard: only set error if this is still the current request
        if (currentRequestIdRef.current === reqId) {
          setError(err instanceof Error ? err.message : 'Failed to load book data');
        }
      } finally {
        // Guard: only clear loading if this is still the current request and not aborted
        if (currentRequestIdRef.current === reqId && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    // Cleanup on unmount
    return () => {
      // Save position before cleanup
      if (playerRef.current) {
        playerRef.current.forceSavePosition().catch(console.error);
      }
      audioManagerRef.current?.destroy();
    };
  }, [contentMode, cefrLevel, selectedBook]);

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

      setTimeout(() => {
        if (isPlayingRef.current) { // Check again before advancing
          console.log(`✅ Still playing, advancing to sentence ${nextSentenceIndex}`);
          handlePlaySequential(nextSentenceIndex);
        } else {
          console.log(`⛔ Playback was stopped, not advancing to next bundle`);
        }
      }, 100);
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

  const continueReading = async () => {
    if (savedPosition) {
      setCurrentSentenceIndex(savedPosition.sentenceIndex);
      setShowContinueReading(false);
      await handlePlaySequential(savedPosition.sentenceIndex);
    }
  };

  const startFromBeginning = async () => {
    setShowContinueReading(false);
    setCurrentSentenceIndex(0);
    setCurrentChapter(1);

    // Reset position in database
    if (playerRef.current) {
      await playerRef.current.resetPosition();
    }

    await handlePlaySequential(0);
  };

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
                    selectedBook?.id === 'gutenberg-1513' ? ROMEO_JULIET_CHAPTERS :
                    selectedBook?.id === 'gutenberg-43' ? JEKYLL_HYDE_CHAPTERS :
                    selectedBook?.id === 'christmas-carol-enhanced-v2' ? CHRISTMAS_CAROL_CHAPTERS : GREAT_GATSBY_CHAPTERS;
    return (
      <div className="flex items-center gap-1 w-full max-w-xs">
        <select
          className="border rounded px-1 py-1 text-xs flex-1 min-w-0"
          onChange={async (e) => {
            const chapterNum = Number(e.target.value);
            const chapter = chapters.find(c => c.chapterNumber === chapterNum);
            if (!chapter) return;

            // Stop current playback first
            handleStop();

            // Wait a moment then jump to chapter
            setTimeout(async () => {
              setCurrentSentenceIndex(chapter.startSentence);
              await jumpToSentence(chapter.startSentence);
            }, 100);
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
    } else if (selectedBook.id === 'gutenberg-1513') {
      chapters = ROMEO_JULIET_CHAPTERS;
    } else if (selectedBook.id === 'gutenberg-43') {
      chapters = JEKYLL_HYDE_CHAPTERS;
    } else if (selectedBook.id === 'christmas-carol-enhanced-v2') {
      chapters = CHRISTMAS_CAROL_CHAPTERS;
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Book Selection Screen */}
      {showBookSelection && (
        <div className="min-h-screen bg-gray-900 text-white">
          <div className="max-w-6xl mx-auto px-4 py-8">

            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                🎧 Featured Books
              </h1>
              <p className="text-gray-300 text-lg">
                Experience continuous reading with perfect text-audio harmony
              </p>
            </div>

            {/* Featured Books Grid */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
              {FEATURED_BOOKS.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group cursor-pointer"
                  onClick={() => {
                    setSelectedBook(book);
                    setShowBookSelection(false);
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(51, 65, 85, 0.5)',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      padding: '16px',
                      width: '100%'
                    }}
                  >

                    {/* Card Content */}
                    <div>
                      {/* Book Title */}
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#e2e8f0',
                        marginBottom: '4px'
                      }}>
                        {book.title}
                      </div>

                      {/* Author */}
                      <div style={{
                        fontSize: '14px',
                        color: '#94a3b8',
                        marginBottom: '12px'
                      }}>
                        by {book.author}
                      </div>

                      {/* Meta Tags */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '12px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{
                          padding: '4px 8px',
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          {book.id === 'great-gatsby-a2' ? 'A2' : 'A1-C2'}
                        </span>
                        <span style={{
                          padding: '4px 8px',
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          Classic
                        </span>
                        <span style={{
                          padding: '4px 8px',
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          {book.id === 'great-gatsby-a2' ? '~7.5h' : '~2h'}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div style={{
                        display: 'flex',
                        gap: '8px'
                      }}>
                        <button
                          style={{
                            flex: 1,
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(139, 92, 246, 0.2)',
                            color: '#a78bfa',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          Ask AI
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBook(book);
                            setShowBookSelection(false);
                          }}
                          style={{
                            flex: 1,
                            height: '36px',
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          🎧 Start Reading
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Reading Interface */}
      {!showBookSelection && selectedBook && (
        <div className="max-w-4xl mx-auto">

        {/* Header - Matched Width with Content Container */}

        {/* Unified Header: Same width as content container below */}
        <div className="bg-white border-b border-gray-200 mx-4 md:mx-8 rounded-t-lg">
          <div className="flex justify-between items-center px-6 py-3 relative">
            <button
              onClick={() => {
                setShowBookSelection(true);
                setSelectedBook(null);
                handleStop();
              }}
              className="text-gray-600 text-xl"
            >
              ←
            </button>

            {/* Auto-scroll Status */}
            <div className="flex-1 flex justify-center items-center gap-2 px-2">
              {autoScrollPaused && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded animate-pulse">
                  📍 Auto-scroll paused
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-gray-600 text-lg font-medium hover:bg-gray-100 px-2 py-1 rounded flex-shrink-0"
            >
              Aa
            </button>
          </div>
        </div>

        {/* Desktop: Dark Controls Section - Removed for consistency */}
        <div className="hidden">{/* Desktop dark controls removed for consistency */}
          <div className="p-4">

            {/* Row 1: Back, Toggle, Settings */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  setShowBookSelection(true);
                  setSelectedBook(null);
                  handleStop();
                }}
                className="flex items-center text-gray-300 hover:text-white"
              >
                ← {/* Back arrow */}
              </button>

              {/* Original/Simplified Toggle (center) */}
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setContentMode('original')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    contentMode === 'original'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => setContentMode('simplified')}
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

            {/* Row 2: CEFR Level Selector */}
            <div className="flex justify-center">
              <div className="flex bg-gray-700 rounded-lg p-1 gap-1">
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((level) => {
                  const isOriginalMode = contentMode === 'original';
                  const isLevelAvailable = availableLevels[level.toLowerCase()];
                  const isDisabled = isOriginalMode || !isLevelAvailable;

                  return (
                    <button
                      key={level}
                      onClick={() => {
                        if (!isDisabled) {
                          setCefrLevel(level);
                          // Ensure we're in simplified mode when selecting CEFR level
                          setContentMode('simplified');
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
        <div className="pb-32 px-6 bg-white mx-4 md:mx-8 rounded-b-lg shadow-sm border-l border-r border-b border-gray-200">

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading {selectedBook?.title} bundles...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="bg-white border border-blue-200 rounded-lg p-6 max-w-md mx-auto shadow-lg">
                <p className="text-blue-600 font-medium">{error}</p>
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
                <h1 className="text-2xl font-semibold text-gray-700 mb-4">
                  {((bundleData as any).book?.title || bundleData.title || 'Unknown Title').replace(/\s*\(Bundled\)$/i, '')}
                </h1>
              </div>

              {/* Real Moby Dick Text - Speechify Style */}
              <div className="px-4 py-4 text-left">
                {bundleData.bundles.flatMap(bundle =>
                  bundle.sentences.map((sentence) => (
                    <span
                      key={sentence.sentenceId}
                      data-sentence={sentence.sentenceIndex}
                      className={`inline cursor-pointer transition-all duration-700 ease-in-out px-1 py-0.5 rounded mobile-reading-text ${
                        sentence.sentenceIndex === currentSentenceIndex && isPlaying
                          ? 'bg-blue-100'
                          : 'hover:bg-gray-100'
                      }`}
                      style={{
                        textAlign: 'left'
                      }}
                      title={`Sentence ${sentence.sentenceIndex + 1} (${sentence.startTime.toFixed(1)}s - ${sentence.endTime.toFixed(1)}s) - Click to jump`}
                      onClick={async () => {
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
                        if (playerRef.current && audioManagerRef.current) {
                          const pos = playerRef.current.getSentencePosition(sentence.sentenceIndex);
                          if (pos) {
                            const targetBundle = bundleData.bundles[pos.bundleIndex];

                            // Update current bundle state so handleNextBundle works correctly
                            setCurrentBundle(targetBundle.bundleId);

                            await audioManagerRef.current.playSequentialSentences(targetBundle, sentence.sentenceIndex);
                          }
                        }
                      }}
                    >
                      {sentence.text}
                      {' '}
                    </span>
                  ))
                )}
              </div>
            </>
          )}

        </div>

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">

              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Reading Settings</h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">

                {/* Content Mode Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Text Version</label>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setContentMode('simplified')}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        contentMode === 'simplified'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Simplified
                    </button>
                    <button
                      onClick={() => setContentMode('original')}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        contentMode === 'original'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Original
                    </button>
                  </div>
                </div>

                {/* CEFR Level Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">CEFR Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setCefrLevel(level)}
                        className={`py-2 px-3 rounded-md text-sm font-medium transition-all ${
                          cefrLevel === level
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200">
                <button
                  onClick={async () => {
                    setShowSettingsModal(false);
                    // Force useEffect to re-run by updating a dependency
                    // The useEffect will handle loading state properly
                    setCefrLevel(cefrLevel);
                    setContentMode(contentMode);
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-md font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-md"
                >
                  Apply Settings
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Chapter Navigation Modal */}
        {showChapterModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">

              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Jump to Chapter</h2>
                <button
                  onClick={() => setShowChapterModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(selectedBook?.id === 'sleepy-hollow-enhanced' ? SLEEPY_HOLLOW_CHAPTERS :
                    selectedBook?.id === 'great-gatsby-a2' ? GREAT_GATSBY_CHAPTERS :
                    selectedBook?.id === 'gutenberg-1952-A1' ? YELLOW_WALLPAPER_CHAPTERS :
                    selectedBook?.id === 'gutenberg-1513' ? ROMEO_JULIET_CHAPTERS :
                    selectedBook?.id === 'gutenberg-43' ? JEKYLL_HYDE_CHAPTERS :
                    selectedBook?.id === 'christmas-carol-enhanced-v2' ? CHRISTMAS_CAROL_CHAPTERS : GREAT_GATSBY_CHAPTERS).map((chapter) => (
                    <button
                      key={chapter.chapterNumber}
                      onClick={async () => {
                        setShowChapterModal(false);

                        // Stop current playback first
                        handleStop();

                        // Wait a moment then jump to chapter and continue playing
                        setTimeout(async () => {
                          setCurrentSentenceIndex(chapter.startSentence);

                          // Force auto-scroll to chapter start immediately
                          autoScrollEnabledRef.current = true;
                          setAutoScrollPaused(false);

                          // Jump to chapter and continue playing
                          await jumpToSentence(chapter.startSentence);

                          // Ensure the sentence element scrolls into view
                          setTimeout(() => {
                            const sentenceElement = document.querySelector(`[data-sentence-index="${chapter.startSentence}"]`);
                            if (sentenceElement) {
                              sentenceElement.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                              });
                            }
                          }, 200);
                        }, 100);
                      }}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        getCurrentChapter().current === chapter.chapterNumber
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                      }`}
                    >
                      <div className="font-medium">Chapter {chapter.chapterNumber}</div>
                      <div className={`text-sm ${
                        getCurrentChapter().current === chapter.chapterNumber
                          ? 'text-blue-100'
                          : 'text-gray-600'
                      }`}>
                        {chapter.title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Continue Reading Modal */}
        {showContinueReading && savedPosition && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">

              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Continue Reading?</h2>
                <button
                  onClick={() => setShowContinueReading(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  You were reading sentence {savedPosition.sentenceIndex + 1} of {bundleData?.totalSentences || 0}.
                  Would you like to continue where you left off?
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={startFromBeginning}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={continueReading}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium"
                  >
                    Continue Reading
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Mobile Control Bar - Full Width */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="px-4 py-3">

            {/* Progress Info Row */}
            <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
              <span>{formatTime(playbackTime)}</span>
              <span>
                Sentence {currentSentenceIndex + 1}/{getCurrentChapter().totalSentences} • Chapter {getCurrentChapter().current} of {getCurrentChapter().total}
              </span>
              <span>{formatTime(totalTime)}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-0.5 bg-gray-200 rounded-full mb-4">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300"
                style={{ width: `${totalTime > 0 ? (playbackTime / totalTime) * 100 : 0}%` }}
              />
            </div>

            {/* Control Buttons Row */}
            <div className="flex items-center justify-center gap-6">

              {/* Speed Control */}
              <button
                onClick={cycleSpeed}
                className="flex items-center justify-center w-9 h-9 text-gray-600 hover:bg-gray-100 rounded-full transition-all"
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
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                }`}
                disabled={contentMode === 'original'}
              >
                <div className="text-xl">{contentMode === 'original' ? '🚫' : (isPlaying ? '⏸️' : '▶️')}</div>
              </button>

              {/* Chapter Navigation */}
              <button
                onClick={() => setShowChapterModal(true)}
                className="flex items-center justify-center w-9 h-9 text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <div className="text-lg">📖</div>
              </button>

              {/* Voice Selector */}
              <button className="flex items-center justify-center w-9 h-9 text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                <div className="text-lg">🎙️</div>
              </button>

            </div>

          </div>
        </div>

        {/* Desktop Control Bar - Floating */}
        <div className="hidden md:block fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-full px-8 py-4 shadow-2xl">

            {/* Control Buttons Row */}
            <div className="flex items-center justify-center gap-5">

              {/* Speed Control */}
              <button
                onClick={cycleSpeed}
                className="flex items-center justify-center w-11 h-11 text-gray-600 hover:bg-gray-100/80 rounded-full transition-all hover:scale-105"
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
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                }`}
                disabled={contentMode === 'original'}
              >
                <div className="text-xl">{contentMode === 'original' ? '🚫' : (isPlaying ? '⏸️' : '▶️')}</div>
              </button>

              {/* Chapter Navigation */}
              <button
                onClick={() => setShowChapterModal(true)}
                className="flex items-center justify-center w-11 h-11 text-gray-600 hover:bg-gray-100/80 rounded-full transition-all hover:scale-105"
              >
                <div className="text-lg">📖</div>
              </button>

              {/* Voice Selector */}
              <button className="flex items-center justify-center w-11 h-11 text-gray-600 hover:bg-gray-100/80 rounded-full transition-all hover:scale-105">
                <div className="text-lg">🎙️</div>
              </button>

            </div>

          </div>
        </div>

        </div>
      )}
    </div>
  );
}