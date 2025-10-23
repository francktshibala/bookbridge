'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ESLControls } from '@/components/esl/ESLControls';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { motion } from 'framer-motion';
import { useReadingPosition } from '@/hooks/useReadingPosition';
import { ResumeToast } from '@/components/reading/ResumeToast';
// PWA COMPLETELY DISABLED FOR TESTING
// import { useReadingEngagement } from '@/components/InstallPrompt';
// import { ReadingProgressTracker } from '@/components/sync/ReadingProgressTracker';
// import { NetworkPerformanceMonitor } from '@/components/NetworkPerformanceMonitor';

interface BookContent {
  id: string;
  title: string;
  author: string;
  chunks: Array<{
    chunkIndex: number;
    content: string;
  }>;
  totalChunks: number;
  stored?: boolean;
  source?: string;
  enhanced?: boolean;
}

export default function BookReaderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { preferences, announceToScreenReader } = useAccessibility();
  const { isMobile } = useIsMobile();
  // PWA DISABLED: const { trackReadingTime, trackChapterCompletion } = useReadingEngagement();
  const [bookContent, setBookContent] = useState<BookContent | null>(null);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [eslLevel, setEslLevel] = useState<string>('B2');
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentContent, setCurrentContent] = useState<string>('');

  // Track previous chunk for page transition detection
  const prevChunkRef = useRef(currentChunk);

  // Debug tracking for currentContent changes
  useEffect(() => {
    console.log('📝 CONTENT CHANGE DETECTED:', {
      contentLength: currentContent.length,
      currentChunk,
      previousChunk: prevChunkRef.current,
      isPageTransition: currentChunk !== prevChunkRef.current,
      firstWords: currentContent.substring(0, 50) + (currentContent.length > 50 ? '...' : ''),
      timestamp: new Date().toISOString()
    });

    // On page transitions, reset highlighting
    if (currentContent.length > 0 && currentChunk !== prevChunkRef.current) {
      console.log('🚀 PAGE TRANSITION: Resetting highlighting');
      resetHighlighting();
    }

    // Update previous chunk reference
    prevChunkRef.current = currentChunk;
  }, [currentContent, currentChunk]);
  const [currentMode, setCurrentMode] = useState<'original' | 'simplified'>('original');
  const [simplifiedContent, setSimplifiedContent] = useState<string>('');
  const [simplificationLoading, setSimplificationLoading] = useState(false);
  const [displayConfig, setDisplayConfig] = useState<any>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);
  const [sessionTimerActive, setSessionTimerActive] = useState(false);
  const [aiMetadata, setAiMetadata] = useState<any>(null);
  const [microHint, setMicroHint] = useState<string>('');
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [sections, setSections] = useState<Array<{title: string; content: string; startIndex: number}>>([]);
  const [simplifiedTotalChunks, setSimplifiedTotalChunks] = useState<number>(0);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);

  // Reading position state
  const [showResumeToast, setShowResumeToast] = useState(false);
  const [hasLoadedPosition, setHasLoadedPosition] = useState(false);

  // Theme-aware text highlighting system
  const [selectedText, setSelectedText] = useState<string>('');
  const [highlightedSelection, setHighlightedSelection] = useState<{ text: string; range: Range } | null>(null);

  const resetHighlighting = () => {
    setSelectedText('');
    setHighlightedSelection(null);
    // Clear any existing text selections
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  };

  // Handle text selection highlighting
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim();
      const range = selection.getRangeAt(0);
      setSelectedText(selectedText);
      setHighlightedSelection({ text: selectedText, range });
    } else {
      setSelectedText('');
      setHighlightedSelection(null);
    }
  };

  const bookId = params.id as string;

  // Two-tier experience detection
  const entrySource = searchParams.get('source'); // 'enhanced' | 'browse' | null
  const isBrowseExperience = entrySource === 'browse';

  // Reading position hook
  const { savedPosition, savePosition, resetPosition } = useReadingPosition({
    bookId,
    userId: user?.id,
    onPositionLoaded: (position) => {
      // Store position to apply later when bookContent loads
      if (position && !hasLoadedPosition) {
        console.log('📖 Position loaded from storage:', position);
        // Position will be applied in useEffect when bookContent is ready
      }
    }
  });

  // Apply saved position when book content is ready
  useEffect(() => {
    if (savedPosition && bookContent && !hasLoadedPosition) {
      // Validate position against book content
      const validChunk = Math.min(savedPosition.currentBundleIndex, bookContent.totalChunks - 1);

      if (validChunk > 0) {
        // Apply saved position
        setCurrentChunk(validChunk);
        setEslLevel(savedPosition.cefrLevel);
        setCurrentMode(savedPosition.contentMode as 'simplified' | 'original');

        // Show resume toast
        setShowResumeToast(true);
        setHasLoadedPosition(true);

        console.log('📖 Applied saved reading position:', {
          chunk: validChunk,
          chapter: savedPosition.currentChapter,
          cefrLevel: savedPosition.cefrLevel,
          mode: savedPosition.contentMode
        });
      }
    }
  }, [savedPosition, bookContent, hasLoadedPosition]);


  // Handle chunk navigation - defined with useCallback for stable reference
  const handleChunkNavigation = useCallback(async (direction: 'prev' | 'next', autoAdvance = false) => {
    console.log('🔄 NAVIGATION DEBUG: handleChunkNavigation called', {
      direction,
      autoAdvance,
      currentChunk,
      currentMode,
      bookContentExists: !!bookContent,
      simplifiedTotalChunks,
      totalChunks: bookContent?.totalChunks
    });
    
    if (!bookContent) {
      console.log('❌ NAVIGATION: No book content, returning');
      return;
    }
    
    const effectiveTotal = currentMode === 'simplified' ? (simplifiedTotalChunks || 0) : bookContent.totalChunks;
    const newChunk = direction === 'next' 
      ? Math.min(currentChunk + 1, effectiveTotal - 1)
      : Math.max(currentChunk - 1, 0);
    
    console.log('🔄 NAVIGATION: Calculated new chunk', {
      effectiveTotal,
      newChunk,
      willChange: newChunk !== currentChunk
    });
    
    if (newChunk !== currentChunk) {
      console.log('🔄 NAVIGATION: Setting new chunk and content', {
        from: currentChunk,
        to: newChunk,
        autoAdvance,
        currentMode,
        willUpdateContent: true
      });

      // Set auto-advancing flag if this is an auto-advance
      if (autoAdvance) {
        console.log('🔄 NAVIGATION: Setting auto-advancing flag');
        setIsAutoAdvancing(true);
        setUserScrolledUp(false);      // Reset scroll flag for clean auto-advance

        // Clear flag after scroll has settled (2 seconds)
        setTimeout(() => {
          setIsAutoAdvancing(false);
          console.log('🔄 NAVIGATION: Cleared auto-advancing flag');
        }, 2000);
      }
      
      setCurrentChunk(newChunk);

      // Save reading position using hook
      savePosition({
        sentenceIndex: 0,
        audioTimestamp: 0,
        scrollPosition: 0,
        playbackSpeed: 1.0,
        chapter: 1,
        chunkIndex: newChunk,
        cefrLevel: eslLevel,
        contentMode: currentMode
      });

      // Reset highlighting for clean page transition
      console.log('🔄 NAVIGATION: Resetting highlighting for page transition');
      resetHighlighting();


      // Get the new content based on current mode
      const newOriginalContent = bookContent.chunks[newChunk]?.content || '';
      if (currentMode === 'original') {
        console.log('🔄 NAVIGATION: Setting original content', {
          chunk: newChunk,
          contentLength: newOriginalContent.length,
          isAutoAdvance: autoAdvance,
          firstWords: newOriginalContent.substring(0, 50) + '...'
        });
        setCurrentContent(newOriginalContent);
      } else if (currentMode === 'simplified') {
        // For simplified mode, we'll rely on the useEffect that handles chunk changes
        // to fetch the simplified content. For now, set original content temporarily.
        console.log('🔄 NAVIGATION: Setting original content temporarily, useEffect will fetch simplified');
        setCurrentContent(newOriginalContent);
      }
      
      // Navigation completed
    } else {
      console.log('🔄 NAVIGATION: No chunk change needed');
    }
  }, [bookContent, currentMode, simplifiedTotalChunks, currentChunk, bookId]);



  useEffect(() => {
    if (bookId) {
      fetchBook();
      checkAuth();
      // Position loading now handled by useReadingPosition hook
    }
  }, [bookId]);

  // Position validation now handled by useReadingPosition hook's onPositionLoaded callback

  // Clear simplified content when chunk changes
  useEffect(() => {
    setSimplifiedContent('');
    setAiMetadata(null);
    setMicroHint('');
    resetHighlighting(); // Reset word highlighting
    
    // Chunk change handling for text-only experience
    console.log('🔄 CHUNK CHANGE: Processing chunk change', {
      isAutoAdvancing
    });
    
    // Reset to original content for new chunk
    if (bookContent?.chunks[currentChunk]) {
      const newContent = bookContent.chunks[currentChunk].content;
      setCurrentContent(newContent);
      console.log('DEBUG: Chunk changed to', currentChunk, 'Content length:', newContent?.length || 0);
      console.log('DEBUG: Content preview:', newContent?.substring(0, 100) || 'No content');
    }
  }, [currentChunk, bookContent]);

  // PWA DISABLED: Track reading engagement for install prompt
  /*
  useEffect(() => {
    if (!bookContent) return;

    // Track reading time every 10 seconds while on page
    const readingTimer = setInterval(() => {
      trackReadingTime(10); // Track 10 seconds of reading time
    }, 10000);

    // Track chapter completion when reaching end of book chunks
    if (currentChunk >= (bookContent.totalChunks - 1)) {
      trackChapterCompletion();
    }

    return () => clearInterval(readingTimer);
  }, [currentChunk, bookContent, trackReadingTime, trackChapterCompletion]);
  */

  // Auto-fetch simplified content when chunk changes in simplified mode
  useEffect(() => {
    console.log('📝 SIMPLIFIED FETCH EFFECT: Triggered', {
      currentMode,
      currentChunk,
      eslLevel,
      hasBookContent: !!bookContent?.chunks[currentChunk],
      shouldFetch: currentMode === 'simplified' && bookContent?.chunks[currentChunk]
    });
    
    if (currentMode === 'simplified' && bookContent?.chunks[currentChunk]) {
      console.log(`📝 SIMPLIFIED FETCH: Auto-fetching simplified content for chunk ${currentChunk} in ${eslLevel} level`);
      fetchSimplifiedContent(eslLevel, currentChunk).then(simplifiedText => {
        if (simplifiedText) {
          console.log(`✅ SIMPLIFIED FETCH: Content loaded for chunk ${currentChunk}, setting as currentContent`);
          setCurrentContent(simplifiedText);
          // Prefetch next chunk in the background if available
          const nextIndex = currentChunk + 1;
          if (bookContent.chunks[nextIndex]) {
            prefetchNextSimplified(eslLevel, nextIndex);
          }
        } else {
          console.log(`❌ SIMPLIFIED FETCH: No content returned for chunk ${currentChunk}`);
        }
      }).catch(error => {
        console.error(`❌ SIMPLIFIED FETCH: Failed for chunk ${currentChunk}:`, error);
      });
    }
  }, [currentChunk, currentMode, eslLevel, bookContent]);


  // OLD loadReadingPosition function removed - now using useReadingPosition hook
  // Position loading, saving, and validation handled by hook

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      if (showLevelDropdown && !target.closest('[data-level-dropdown]')) {
        setShowLevelDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showLevelDropdown]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          if (currentChunk > 0) {
            handleChunkNavigation('prev');
          }
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          if (bookContent && currentChunk < bookContent.totalChunks - 1) {
            handleChunkNavigation('next');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChunk, bookContent]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  // Fetch simplified content from cached database (no AI processing)
  const fetchSimplifiedContent = async (level: string, chunkIndex: number) => {
    console.log(`📚 LOADING CACHED SIMPLIFICATION: /api/books/${bookId}/cached-simplification?level=${level}&chunk=${chunkIndex}`);
    setSimplificationLoading(true);
    try {
      const doFetch = async () => fetch(`/api/books/${bookId}/cached-simplification?level=${level}&chunk=${chunkIndex}`);
      let response = await doFetch();
      if (!response.ok) {
        // Retry once after a short delay on transient issues
        await new Promise(r => setTimeout(r, 200));
        response = await doFetch();
      }
      console.log(`🔥 API Response status: ${response.status}`);
      
      if (!response.ok) {
        // Handle specific 400 errors with detailed logging and fallback
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown 400 error' }));
          console.error('400 Error Details:', errorData);
          
          // Check if it's a chunk index out of range error
          if (errorData.error && errorData.error.includes('out of range')) {
            console.warn(`Chunk index ${chunkIndex} is invalid. Resetting to chunk 0 and clearing stale localStorage.`);

            // Clear potentially stale reading positions (use correct key format matching service/hook)
            localStorage.removeItem(`reading_position_${bookId}`);
            localStorage.removeItem(`reading-mode-${bookId}`);
            
            // Reset to chunk 0 and try again
            setCurrentChunk(0);
            
            // Retry with chunk 0 if we're not already trying chunk 0
            if (chunkIndex !== 0) {
              console.log('Retrying with chunk 0...');
              return await fetchSimplifiedContent(level, 0);
            }
          }
          
          // For other 400 errors, show user-friendly message
          setMicroHint(`Unable to simplify: ${errorData.error || 'Invalid request'}. Showing original text.`);
        }
        
        throw new Error(`Failed to fetch simplified content: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setSimplifiedContent(data.content);
        setDisplayConfig(data.displayConfig);
        setAiMetadata(data.aiMetadata || null);
        setMicroHint(data.microHint || '');
        
        console.log(`Loaded simplified content for level ${level}, chunk ${chunkIndex}`);
        if (data.aiMetadata) {
          console.log(`AI Quality: ${data.aiMetadata.quality}, Similarity: ${data.aiMetadata.similarity}`);
        }
        
        return data.content;
      } else {
        throw new Error(data.error || 'Simplification failed');
      }
    } catch (error) {
      console.error('Error fetching simplified content:', error);
      
      // Enhanced fallback with chunk validation
      if (bookContent?.chunks) {
        // Validate chunk index against available chunks
        const validChunkIndex = Math.min(chunkIndex, bookContent.chunks.length - 1);
        const fallbackContent = bookContent.chunks[validChunkIndex]?.content;
        
        if (fallbackContent) {
          setSimplifiedContent(fallbackContent);
          // Update chunk index if it was corrected
          if (validChunkIndex !== chunkIndex) {
            console.log(`Corrected chunk index from ${chunkIndex} to ${validChunkIndex}`);
            setCurrentChunk(validChunkIndex);
          }
          return fallbackContent;
        }
      }
      
      // Last resort: show error message to user
      setMicroHint('Unable to load content. Please try refreshing the page.');
      return '';
    } finally {
      setSimplificationLoading(false);
    }
  };

  // Prefetch next simplified chunk to reduce transition stalls
  const prefetchNextSimplified = async (level: string, nextChunkIndex: number) => {
    try {
      await fetch(`/api/books/${bookId}/cached-simplification?level=${level}&chunk=${nextChunkIndex}`, { method: 'GET', cache: 'no-store' });
    } catch {}
  };

  // Session Timer Logic
  const startSessionTimer = (cefrLevel: string) => {
    // Configuration matches our DISPLAY_CONFIG
    const sessionMinutes = {
      A1: 12, A2: 18, B1: 22, B2: 27, C1: 30, C2: 35
    }[cefrLevel] || 22;
    
    const totalSeconds = sessionMinutes * 60;
    setSessionTimeLeft(totalSeconds);
    setSessionTimerActive(true);
    console.log(`Started ${sessionMinutes}-minute session timer for level ${cefrLevel}`);
  };

  const stopSessionTimer = () => {
    setSessionTimerActive(false);
    setSessionTimeLeft(null);
  };

  // Timer countdown effect
  useEffect(() => {
    if (!sessionTimerActive || sessionTimeLeft === null || sessionTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          setSessionTimerActive(false);
          // Could show a break reminder here
          console.log('Session timer completed - time for a break!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionTimerActive, sessionTimeLeft]);


  const fetchBook = async () => {
    try {
      // Pass the source parameter to API so browse users get fresh external content
      const sourceParam = entrySource ? `?source=${entrySource}` : '';
      const response = await fetch(`/api/books/${bookId}/content-fast${sourceParam}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Book data received:', data);
      
      // The API returns content in 'context' property and optionally 'chunks' for enhanced books
      if (data.context) {
        let chunks = [] as { chunkIndex: number; content: string }[];
        
        // Use pre-structured chunks from enhanced books if available
        if (data.chunks && Array.isArray(data.chunks)) {
          chunks = data.chunks;
          console.log(`Using ${chunks.length} pre-structured chunks from enhanced book`);
        } else {
          // Split the content into manageable chunks for better reading experience
          const chunkSize = 1500; // ~1500 characters per page for consistent experience
          const fullText = data.context;

          for (let i = 0; i < fullText.length; i += chunkSize) {
            chunks.push({
              chunkIndex: chunks.length,
              content: fullText.substring(i, i + chunkSize)
            });
          }
          console.log(`Split content into ${chunks.length} chunks of ~${chunkSize} characters`);
        }
        
        const bookData = {
          id: data.id,
          title: data.title,
          author: data.author,
          chunks: chunks,
          totalChunks: chunks.length,
          stored: data.stored, // Add stored property for enhanced book detection
          source: data.source  // Add source property for enhanced book detection
        };
        
        // Pre-compute simplified chunk count (400-word pages) for alignment
        try {
          const words = data.context.split(/\s+/);
          setSimplifiedTotalChunks(Math.ceil(words.length / 400));
        } catch {}

        setBookContent(bookData);

        // Set initial content to chunk 0 (position restoration handled by useReadingPosition hook)
        setCurrentChunk(0);
        console.log('🔄 INITIAL LOAD: Setting content for chunk 0, length:', chunks[0].content.length);
        setCurrentContent(chunks[0].content);
        console.log(`Book split into ${chunks.length} chunks, starting at chunk 0 (will resume saved position if available)`);
        console.log('DEBUG: Initial chunk content length:', chunks[0]?.content?.length || 0);
        console.log('DEBUG: Initial chunk preview:', chunks[0]?.content?.substring(0, 100) || 'No content');
      } else {
        console.log('No content found in book data');
        setError('Book content not available');
      }
    } catch (err) {
      console.error('Failed to fetch book:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch book');
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (content: string, mode: 'original' | 'simplified') => {
    setCurrentContent(content);
    setCurrentMode(mode);
  };

  // Handle mode switching - now connects to our simplification API
  const handleModeToggle = async () => {
    const newMode = currentMode === 'original' ? 'simplified' : 'original';
    setCurrentMode(newMode);
    localStorage.setItem(`reading-mode-${bookId}`, newMode);
    
    if (newMode === 'simplified') {
      // Fetch simplified content for current chunk and CEFR level
      const simplifiedText = await fetchSimplifiedContent(eslLevel, currentChunk);
      setCurrentContent(simplifiedText);
      // Start session timer when entering simplified mode
      startSessionTimer(eslLevel);
    } else {
      // Switch back to original content
      if (bookContent?.chunks[currentChunk]) {
        setCurrentContent(bookContent.chunks[currentChunk].content);
      }
      // Clear AI metadata and micro-hints when switching to original
      setAiMetadata(null);
      setMicroHint('');
      // Stop session timer when leaving simplified mode
      stopSessionTimer();
    }
  };

  // handleChunkNavigation is now defined above as useCallback
  

  const goToSection = (index: number) => {
    setCurrentSection(index);
    announceToScreenReader(`Now reading: ${sections[index].title}`);
  };


  const handleModeChange = async (newMode: 'original' | 'simplified') => {
    setCurrentMode(newMode);
    localStorage.setItem(`reading-mode-${bookId}`, newMode);
    
    if (newMode === 'simplified') {
      // Fetch simplified content for current chunk and level
      const simplifiedText = await fetchSimplifiedContent(eslLevel, currentChunk);
      setCurrentContent(simplifiedText);
    } else {
      // Switch back to original content
      const originalContent = bookContent?.chunks[currentChunk]?.content || '';
      setCurrentContent(originalContent);
    }
  };

  const handleCefrLevelChange = async (newLevel: string) => {
    setEslLevel(newLevel);
    localStorage.setItem(`esl-level-${bookId}`, newLevel);
    
    // If we're in simplified mode, refetch content for new level
    if (currentMode === 'simplified') {
      const simplifiedText = await fetchSimplifiedContent(newLevel, currentChunk);
      setCurrentContent(simplifiedText);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg text-gray-600">Loading book...</span>
        </div>
      </div>
    );
  }

  if (error || !bookContent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Error Loading Book</h2>
          <p className="text-gray-600 mb-4">{error || 'Book not found'}</p>
          <button
            onClick={() => router.push('/library')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  const effectiveTotal = currentMode === 'simplified' ? (simplifiedTotalChunks || 0) : (bookContent?.totalChunks || 0);
  const canGoPrev = currentChunk > 0;
  const canGoNext = effectiveTotal ? currentChunk < effectiveTotal - 1 : false;

  // Enhanced book detection - already defined at the top
  
  // Text-only experience: audio controls removed


  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Resume Reading Toast */}
      <ResumeToast
        show={showResumeToast}
        chapter={savedPosition?.currentChapter || 1}
        chunkIndex={currentChunk}
        totalChunks={bookContent?.totalChunks || 0}
        onStartFromBeginning={async () => {
          setCurrentChunk(0);
          await resetPosition();
          setShowResumeToast(false);
        }}
        onDismiss={() => setShowResumeToast(false)}
      />

      {/* Background Reading Progress Tracker - Temporarily disabled */}
      {/* {user && bookContent && (
        <ReadingProgressTracker
          bookId={bookId}
          userId={user.id}
          totalPages={bookContent.totalChunks}
          currentPage={currentChunk + 1}
          cefr={eslLevel}
          voice={selectedVoice}
          onProgressUpdate={(progress) => {
            console.log('📊 Reading progress updated:', progress);
            // Could trigger UI updates or sync status indicators here
          }}
        />
      )} */}
      
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      {/* Mobile Reading Header removed for natural text flow */}

      {/* Main Content - Match Simplified Books Structure */}
      <div className="max-w-4xl mx-auto pb-24">

        {/* Header moved to bottom - keeping content clean */}
        {/* <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-light)] mx-2 sm:mx-4 md:mx-8 rounded-t-lg border-2 border-[var(--accent-secondary)]/20 border-b-[var(--border-light)]">
          <div className="flex justify-between items-center px-6 py-3 relative">
            <button
              onClick={() => router.push('/enhanced-collection')}
              style={{ transition: 'all 0.2s' }}
              className="w-10 h-10 rounded-full border-2 border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xl hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 transition-all duration-200 flex items-center justify-center shadow-sm"
            >
              ←
            </button>
            <div className="flex-1 flex justify-center items-center gap-2 px-2">
              <div className="text-sm text-[var(--text-secondary)] bg-[var(--accent-primary)]/10 px-3 py-1 rounded border border-[var(--accent-primary)]/20">
                {currentChunk + 1} / {effectiveTotal || (bookContent?.totalChunks || 0)}
              </div>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-10 h-10 rounded-full border-2 border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-base font-medium hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 transition-all duration-200 flex items-center justify-center shadow-sm"
            >
              Aa
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6 mx-2 sm:mx-4 md:mx-0">
          <button
            onClick={() => handleChunkNavigation('prev')}
            disabled={!canGoPrev}
            className={`w-12 h-12 rounded-full border-2 border-[var(--border-light)] bg-[var(--bg-secondary)] flex items-center justify-center transition-all duration-200 shadow-sm ${
              canGoPrev
                ? 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 cursor-pointer'
                : 'text-[var(--text-secondary)]/30 cursor-not-allowed opacity-50'
            }`}
            title="Previous page"
          >
            <span className="text-xl">‹</span>
          </button>
          <span className="text-[var(--text-primary)] font-medium px-4 text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>
            {bookContent?.title || 'Loading...'}
          </span>
          <button
            onClick={() => handleChunkNavigation('next')}
            disabled={!canGoNext}
            className={`w-12 h-12 rounded-full border-2 border-[var(--border-light)] bg-[var(--bg-secondary)] flex items-center justify-center transition-all duration-200 shadow-sm ${
              canGoNext
                ? 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 cursor-pointer'
                : 'text-[var(--text-secondary)]/30 cursor-not-allowed opacity-50'
            }`}
            title="Next page"
          >
            <span className="text-xl">›</span>
          </button>
        </div> */}

        {/* Content - Match Simplified Books Natural Flow */}
        <motion.div
          key={currentChunk}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="px-3 sm:px-4 py-4 text-left"
        >
          {/* Book Title */}
          <div className="text-center py-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-accent)] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              {bookContent?.title || 'Loading...'}
            </h1>
          </div>

          {simplificationLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#94a3b8',
              fontSize: '16px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #475569',
                borderTop: '2px solid #6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Loading {currentMode} content for level {eslLevel}...
            </div>
          ) : (
            <>
              {/* Micro-hint for simplification issues */}
              {microHint && currentMode === 'simplified' && (
                <div style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#f59e0b',
                  textAlign: 'center'
                }}>
                  💡 {microHint}
                </div>
              )}

              {/* Enhanced Book Text Content - Natural Flow Like Simplified Books */}
              <div
                id="book-reading-text"
                className="reading-text text-[var(--text-primary)]"
                style={{
                  fontSize: preferences.dyslexiaFont ? `${Math.max(preferences.fontSize, 18)}px` : undefined,
                  lineHeight: preferences.dyslexiaFont ? '1.9' : undefined,
                  fontFamily: preferences.dyslexiaFont ? 'OpenDyslexic, Arial, sans-serif' : undefined,
                  letterSpacing: preferences.dyslexiaFont ? '0.3px' : undefined,
                  wordSpacing: preferences.dyslexiaFont ? '2px' : undefined
                }}
                role="main"
                aria-label="Book content"
                tabIndex={0}
                onMouseUp={handleTextSelection}
                onTouchEnd={handleTextSelection}
              >
                <div
                  data-content="true"
                  className="whitespace-pre-wrap text-[var(--text-primary)]"
                  style={{
                    textAlign: 'justify',
                    color: 'var(--text-primary)',
                    fontSize: '24px',
                    lineHeight: '1.9'
                  }}
                >
                  {currentContent || 'Loading content...'}
                </div>
              </div>
            </>
          )}
        </motion.div>
        
        {/* Upgrade Banner for Browse Experience Users */}
        {isBrowseExperience && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            style={{
              marginTop: '32px',
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
              backdropFilter: 'blur(15px)',
              borderRadius: '16px',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.1)',
              textAlign: 'center'
            }}
          >
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              marginBottom: '12px',
              color: '#e2e8f0',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
            }}>
              ✨ Want Enhanced Features?
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#94a3b8',
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>
              Get AI-powered simplification, instant audio, word highlighting, and more with Enhanced Books
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/enhanced-collection')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              Try Enhanced Books →
            </motion.button>
          </motion.div>
        )}
        
        {/* Section Navigation (if applicable) */}
        {sections.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            style={{
              marginTop: '24px',
              padding: '20px',
              background: 'rgba(45, 55, 72, 0.6)',
              backdropFilter: 'blur(15px)',
              borderRadius: '16px',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}
          >
            {(() => {
              const isExternalBook = bookId.includes('-') && 
                ['gutenberg', 'openlibrary', 'standardebooks', 'googlebooks'].some(source => 
                  bookId.startsWith(source + '-')
                );
              return (
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#cbd5e0',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                }}>
                  {isExternalBook ? 'Chapter sections' : 'Sections in this page'}
                </h3>
              );
            })()}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {sections.map((section, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => goToSection(index)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: index === currentSection ? 
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                      'rgba(102, 126, 234, 0.1)',
                    color: index === currentSection ? '#ffffff' : '#cbd5e0',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                  }}
                >
                  {section.title}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-[var(--bg-secondary)] rounded-lg shadow-xl max-w-sm w-full border-2 border-[var(--accent-secondary)]/20 max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-light)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'Playfair Display, serif' }}>Reading Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] text-xl transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">

              {/* Navigation Controls */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Page Navigation</label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => handleChunkNavigation('prev')}
                    disabled={!canGoPrev}
                    className={`w-10 h-10 rounded-full border border-[var(--border-light)] flex items-center justify-center transition-all ${
                      canGoPrev
                        ? 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 cursor-pointer'
                        : 'text-[var(--text-secondary)]/30 cursor-not-allowed opacity-50'
                    }`}
                  >
                    ‹
                  </button>
                  <span className="text-[var(--text-primary)] font-medium px-4">
                    {currentChunk + 1} / {effectiveTotal || (bookContent?.totalChunks || 0)}
                  </span>
                  <button
                    onClick={() => handleChunkNavigation('next')}
                    disabled={!canGoNext}
                    className={`w-10 h-10 rounded-full border border-[var(--border-light)] flex items-center justify-center transition-all ${
                      canGoNext
                        ? 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 cursor-pointer'
                        : 'text-[var(--text-secondary)]/30 cursor-not-allowed opacity-50'
                    }`}
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Content Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Text Version</label>
                <div className="flex bg-[var(--bg-primary)] rounded-lg p-1 border border-[var(--border-light)]">
                  <button
                    onClick={() => handleModeChange('simplified')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      currentMode === 'simplified'
                        ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Simplified
                  </button>
                  <button
                    onClick={() => handleModeChange('original')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      currentMode === 'original'
                        ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Original
                  </button>
                </div>
              </div>

              {/* CEFR Level Selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">CEFR Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => {
                    const isOriginalMode = currentMode === 'original';
                    const isDisabled = isOriginalMode;

                    return (
                      <button
                        key={level}
                        onClick={() => {
                          if (!isDisabled) {
                            handleCefrLevelChange(level);
                            // Ensure we're in simplified mode when selecting CEFR level
                            handleModeChange('simplified');
                          }
                        }}
                        disabled={isDisabled}
                        className={`py-2 px-3 rounded-md text-sm font-medium transition-all ${
                          eslLevel === level && currentMode === 'simplified'
                            ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                            : isDisabled
                            ? 'bg-[var(--bg-primary)] text-[var(--text-secondary)]/50 cursor-not-allowed opacity-50'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)]/10 border border-[var(--border-light)]'
                        }`}
                        title={
                          isOriginalMode
                            ? 'Switch to Simplified mode to use CEFR levels'
                            : `Switch to ${level} level`
                        }
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Apply Settings Footer */}
              <div className="px-6 py-4 border-t border-[var(--border-light)]">
                <button
                  onClick={async () => {
                    setShowSettingsModal(false);
                    // Trigger re-fetch if mode or level changed
                    if (currentMode === 'simplified') {
                      const simplifiedText = await fetchSimplifiedContent(eslLevel, currentChunk);
                      setCurrentContent(simplifiedText);
                    }
                  }}
                  className="w-full bg-[var(--accent-primary)] text-white py-2 px-4 rounded-md font-medium hover:bg-[var(--accent-secondary)] transition-all shadow-md"
                >
                  Apply Settings
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Mobile/Desktop Responsive Styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-reading-header {
            display: flex !important;
          }
          
          .mobile-reading-controls {
            display: block !important;
          }
          
          .desktop-control-bar {
            display: none !important;
          }
          
          /* Audio controls removed */
          
          .main-content-container {
            padding: 0 !important;
          }
          
          .reading-content-container {
            padding: 0 !important;
            border-radius: 0 !important;
            margin-top: 0 !important;
            margin-bottom: calc(88px + env(safe-area-inset-bottom)) !important; /* leave space for fixed bar */
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            min-height: auto !important;
          }
          
          .book-title-wireframe {
            font-size: 22px !important;
          }
          
          /* Enhanced mobile reading experience optimizations */
          .max-w-4xl {
            margin: 0 auto;
            padding: 0 8px;
          }

          /* Better touch targets for mobile navigation */
          button {
            min-height: 44px;
            min-width: 44px;
          }

          /* Extra large text for enhanced reading experience */
          .reading-text {
            font-size: 22px !important;
            line-height: 1.8 !important;
            text-align: left;
          }

          /* Content text should be extra large */
          [data-content="true"] {
            font-size: 22px !important;
            line-height: 1.8 !important;
          }

          /* Make book text span full mobile width with comfortable gutters */
          .book-text-wireframe {
            width: 100% !important;
            max-width: none !important;
            padding: 0 16px !important; /* slim side gutters */
            margin: 0 !important;
            font-size: 18px !important;
            line-height: 1.7 !important;
            text-align: justify !important;
            hyphens: auto;
            overflow-wrap: anywhere;
          }

          /* Prominent simplified (green) text on mobile */
          .book-text-wireframe.simplified {
            color: #d1fae5 !important; /* brighter green */
            background: transparent !important;
            border: 0 !important;
            box-shadow: none !important;
          }

          /* Ensure highlighter overlay does not reduce content width */
          .word-highlight-overlay {
            width: 100% !important;
            padding: 0 !important;
            background: transparent !important;
          }
          
          /* Theme-aware text highlighting */
          ::selection {
            background: var(--accent-primary, #667eea) !important;
            color: var(--bg-primary, #ffffff) !important;
          }

          ::-moz-selection {
            background: var(--accent-primary, #667eea) !important;
            color: var(--bg-primary, #ffffff) !important;
          }

          .word-highlight-current {
            background: var(--accent-primary, #667eea) !important;
            opacity: 0.3;
            border-radius: 3px;
            padding: 1px 2px;
            font-weight: 600;
            color: var(--text-primary) !important;
          }

          .word-highlight-upcoming {
            background: var(--accent-secondary, #6366f1) !important;
            opacity: 0.15;
            border-radius: 2px;
            padding: 0 1px;
            color: var(--text-primary) !important;
          }

          .reading-text {
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
          }
        }
        
        @media (min-width: 769px) {
          /* Extra large text for desktop reading */
          .reading-text {
            font-size: 26px !important;
            line-height: 2.0 !important;
          }

          [data-content="true"] {
            font-size: 26px !important;
            line-height: 2.0 !important;
          }
        }
        
        .mobile-reading-controls button:active {
          transform: scale(0.95);
        }
        
        /* Audio controls removed */
      `}</style>

      {/* Sticky Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-secondary)] border-t border-[var(--border-light)] shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Back Button */}
            <button
              onClick={() => router.push('/enhanced-collection')}
              className="w-12 h-12 rounded-full border-2 border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xl hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 transition-all duration-200 flex items-center justify-center shadow-sm"
            >
              ←
            </button>

            {/* Navigation Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleChunkNavigation('prev')}
                disabled={!canGoPrev}
                className={`w-12 h-12 rounded-full border-2 border-[var(--border-light)] bg-[var(--bg-secondary)] flex items-center justify-center transition-all duration-200 shadow-sm ${
                  canGoPrev
                    ? 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 cursor-pointer'
                    : 'text-[var(--text-secondary)]/30 cursor-not-allowed opacity-50'
                }`}
                title="Previous page"
              >
                <span className="text-xl">‹</span>
              </button>

              {/* Page Counter */}
              <div className="text-sm text-[var(--text-secondary)] bg-[var(--accent-primary)]/10 px-3 py-2 rounded border border-[var(--accent-primary)]/20 min-w-[80px] text-center">
                {currentChunk + 1} / {effectiveTotal || (bookContent?.totalChunks || 0)}
              </div>

              <button
                onClick={() => handleChunkNavigation('next')}
                disabled={!canGoNext}
                className={`w-12 h-12 rounded-full border-2 border-[var(--border-light)] bg-[var(--bg-secondary)] flex items-center justify-center transition-all duration-200 shadow-sm ${
                  canGoNext
                    ? 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 cursor-pointer'
                    : 'text-[var(--text-secondary)]/30 cursor-not-allowed opacity-50'
                }`}
                title="Next page"
              >
                <span className="text-xl">›</span>
              </button>
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-12 h-12 rounded-full border-2 border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-base font-medium hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--accent-primary)]/5 transition-all duration-200 flex items-center justify-center shadow-sm"
            >
              Aa
            </button>
          </div>
        </div>
      </div>

      {/* Network Performance Monitor - Temporarily disabled */}
      {/* <NetworkPerformanceMonitor
        bookId={bookId}
        isVisible={false}
      /> */}
    </div>
  );
}