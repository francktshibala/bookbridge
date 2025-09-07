'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ESLControls } from '@/components/esl/ESLControls';
import { VocabularyHighlighter } from '@/components/VocabularyHighlighter';
import { PrecomputeAudioPlayer } from '@/components/PrecomputeAudioPlayer';
import { AudioPlayerWithHighlighting } from '@/components/AudioPlayerWithHighlighting';
import { IntegratedAudioControls } from '@/components/IntegratedAudioControls';
import { WireframeAudioControls } from '@/components/audio/WireframeAudioControls';
import { ProgressiveAudioPlayer, InstantAudioPlayer } from '@/lib/dynamic-imports';
import { WordHighlighter, useWordHighlighting } from '@/components/audio/WordHighlighter';
import { AutoScrollHandler } from '@/components/audio/AutoScrollHandler';
import { SpeedControl } from '@/components/SpeedControl';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useAutoAdvance } from '@/hooks/useAutoAdvance';
import { motion } from 'framer-motion';
import { SmartPlayButton } from '@/components/audio/SmartPlayButton';
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
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<'standard' | 'openai' | 'elevenlabs'>('openai');
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [currentContent, setCurrentContent] = useState<string>('');
  const [currentMode, setCurrentMode] = useState<'original' | 'simplified'>('original');
  const [simplifiedContent, setSimplifiedContent] = useState<string>('');
  const [isPlaying, setIsPlayingState] = useState(false);
  
  const setIsPlaying = (playing: boolean) => {
    console.log('🔄 PLAYING STATE CHANGE:', {
      from: isPlaying,
      to: playing,
      currentChunk,
      autoAdvanceEnabled,
      stackTrace: new Error().stack?.split('\n')[1] // Show where this was called from
    });
    setIsPlayingState(playing);
  };
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [continuousPlayback, setContinuousPlayback] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
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
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const suppressPauseOnNextChunkRef = useRef(false);

  // Word highlighting integration
  const { currentWordIndex, handleWordHighlight, resetHighlighting } = useWordHighlighting();

  const bookId = params.id as string;

  // Two-tier experience detection
  const entrySource = searchParams.get('source'); // 'enhanced' | 'browse' | null
  const isEnhancedExperience = entrySource === 'enhanced' || bookContent?.stored === true;
  const isBrowseExperience = entrySource === 'browse';
  

  // Enhanced book detection - calculated here to avoid hooks order issues
  const isEnhancedBook = bookContent?.stored === true && 
    (bookContent?.source === 'database' || bookContent?.source === 'enhanced_database' || bookContent?.enhanced === true);

  // Handle chunk navigation - defined with useCallback for stable reference
  const handleChunkNavigation = useCallback(async (direction: 'prev' | 'next', autoAdvance = false) => {
    console.log('🔄 NAVIGATION DEBUG: handleChunkNavigation called', {
      direction,
      autoAdvance,
      currentChunk,
      currentMode,
      isPlaying,
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
        currentMode
      });
      
      // Set auto-advancing flag if this is an auto-advance to prevent scroll detection pause
      if (autoAdvance) {
        console.log('🔄 NAVIGATION: Setting auto-advancing flag to prevent scroll pause');
        // One-shot guard to prevent pause during the immediate chunk-change effect
        suppressPauseOnNextChunkRef.current = true;
        setIsAutoAdvancing(true);
        setUserScrolledUp(false);      // Reset scroll flag for clean auto-advance
        setAutoScrollEnabled(true);     // Re-enable auto-scroll for continuous playback
        
        // Clear flag after scroll has settled (2 seconds)
        setTimeout(() => {
          setIsAutoAdvancing(false);
          console.log('🔄 NAVIGATION: Cleared auto-advancing flag');
        }, 2000);
      }
      
      setCurrentChunk(newChunk);
      
      // Save reading position to localStorage
      localStorage.setItem(`reading-position-${bookId}`, newChunk.toString());
      
      // Get the new content based on current mode
      const newOriginalContent = bookContent.chunks[newChunk]?.content || '';
      if (currentMode === 'original') {
        console.log('🔄 NAVIGATION: Setting original content');
        setCurrentContent(newOriginalContent);
      } else if (currentMode === 'simplified') {
        // For simplified mode, we'll rely on the useEffect that handles chunk changes
        // to fetch the simplified content. For now, set original content temporarily.
        console.log('🔄 NAVIGATION: Setting original content temporarily, useEffect will fetch simplified');
        setCurrentContent(newOriginalContent);
      }
      
      // For auto-advance, continue playing on the new page
      if (!autoAdvance && isPlaying) {
        console.log('🔄 NAVIGATION: Manual navigation while playing, stopping audio');
        setIsPlaying(false);
      } else if (autoAdvance) {
        console.log('🔄 NAVIGATION: Auto-advance navigation, keeping play state as is');
      }
    } else {
      console.log('🔄 NAVIGATION: No chunk change needed');
    }
  }, [bookContent, currentMode, simplifiedTotalChunks, currentChunk, bookId, isPlaying]);

  // Auto-advance functionality - must be at top level for hooks rules
  const {
    autoAdvanceEnabled,
    toggleAutoAdvance,
    handleChunkComplete: autoAdvanceChunkComplete
  } = useAutoAdvance({
    isEnhanced: isEnhancedBook,
    currentChunk,
    totalChunks: bookContent?.totalChunks || 0,
    onNavigate: handleChunkNavigation,
    onPlayStateChange: setIsPlaying
  });


  useEffect(() => {
    if (bookId) {
      fetchBook();
      checkAuth();
      loadReadingPosition();
    }
  }, [bookId]);

  // Re-validate reading position after book content is loaded
  useEffect(() => {
    if (bookContent?.chunks) {
      loadReadingPosition(); // Re-validate position against actual book content
    }
  }, [bookContent]);

  // Clear simplified content when chunk changes
  useEffect(() => {
    setSimplifiedContent('');
    setAiMetadata(null);
    setMicroHint('');
    resetHighlighting(); // Reset word highlighting
    
    // Use one-shot suppression ref to avoid race with state updates
    if (suppressPauseOnNextChunkRef.current) {
      console.log('🔄 CHUNK CHANGE: Suppression ref active - keeping audio playing during auto-advance');
      suppressPauseOnNextChunkRef.current = false; // consume the one-shot guard
    } else {
      console.log('🔄 CHUNK CHANGE: Stopping audio - manual navigation or no suppression');
      setIsPlaying(false); // Stop audio when changing chunks manually
    }
    
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
        } else {
          console.log(`❌ SIMPLIFIED FETCH: No content returned for chunk ${currentChunk}`);
        }
      }).catch(error => {
        console.error(`❌ SIMPLIFIED FETCH: Failed for chunk ${currentChunk}:`, error);
      });
    }
  }, [currentChunk, currentMode, eslLevel, bookContent]);

  // Load saved voice selection from localStorage
  useEffect(() => {
    if (bookId) {
      const savedVoice = localStorage.getItem(`voice-selection-${bookId}`);
      if (savedVoice) {
        setSelectedVoice(savedVoice);
      }
    }
  }, [bookId]);

  // Load saved continuousPlayback state from localStorage
  useEffect(() => {
    if (bookId) {
      const savedContinuous = localStorage.getItem(`continuous-playback-${bookId}`);
      if (savedContinuous !== null) {
        setContinuousPlayback(savedContinuous === 'true');
      }
    }
  }, [bookId]);

  // Load reading position from localStorage
  const loadReadingPosition = () => {
    const savedPosition = localStorage.getItem(`reading-position-${bookId}`);
    const savedEslLevel = localStorage.getItem(`esl-level-${bookId}`);
    const savedMode = localStorage.getItem(`reading-mode-${bookId}`);
    const savedVoiceProvider = localStorage.getItem(`voice-provider-${bookId}`);
    
    if (savedPosition) {
      const position = parseInt(savedPosition, 10);
      if (position >= 0) {
        // Validate chunk position against actual book content when available
        if (bookContent?.chunks && position >= bookContent.chunks.length) {
          console.warn(`Saved position ${position} exceeds book length (${bookContent.chunks.length} chunks). Resetting to 0.`);
          localStorage.setItem(`reading-position-${bookId}`, '0');
          setCurrentChunk(0);
        } else {
          setCurrentChunk(position);
        }
      }
    }
    
    if (savedEslLevel) {
      setEslLevel(savedEslLevel);
    }
    
    if (savedMode === 'simplified' || savedMode === 'original') {
      setCurrentMode(savedMode);
    }
    
    if (savedVoiceProvider === 'standard' || savedVoiceProvider === 'openai' || savedVoiceProvider === 'elevenlabs') {
      setVoiceProvider(savedVoiceProvider);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (showLevelDropdown && !target.closest('[data-level-dropdown]')) {
        setShowLevelDropdown(false);
      }
      
      if (showVoiceDropdown && !target.closest('[data-voice-dropdown]')) {
        setShowVoiceDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showLevelDropdown, showVoiceDropdown]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't interfere if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        return;
      }

      switch (event.key) {
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          setIsPlaying(!isPlaying);
          break;
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
        case 'Escape':
          if (isPlaying) {
            setIsPlaying(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentChunk, bookContent]);

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
      const response = await fetch(`/api/books/${bookId}/cached-simplification?level=${level}&chunk=${chunkIndex}`);
      console.log(`🔥 API Response status: ${response.status}`);
      
      if (!response.ok) {
        // Handle specific 400 errors with detailed logging and fallback
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown 400 error' }));
          console.error('400 Error Details:', errorData);
          
          // Check if it's a chunk index out of range error
          if (errorData.error && errorData.error.includes('out of range')) {
            console.warn(`Chunk index ${chunkIndex} is invalid. Resetting to chunk 0 and clearing stale localStorage.`);
            
            // Clear potentially stale reading positions
            localStorage.removeItem(`reading-position-${bookId}`);
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

  // Scroll-to-pause behavior removed per user request

  // Smooth auto-scroll handler that follows voice reading naturally
  const handleAutoScroll = (scrollProgress: number) => {
    if (!autoScrollEnabled || userScrolledUp || !currentContent) return;
    
    // Get the main content container
    const contentContainer = document.querySelector('[data-content="true"]');
    if (!contentContainer) return;
    
    const containerRect = contentContainer.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // Calculate ideal reading position (center of screen)
    const idealReadingPosition = windowHeight * 0.4; // 40% from top for comfortable reading
    const currentContentTop = containerRect.top;
    
    // Only scroll if content is getting too high or too low from ideal position
    const offsetFromIdeal = currentContentTop - idealReadingPosition;
    
    // Smooth scrolling threshold - gentle and user-friendly
    const scrollThreshold = 120; // pixels - increased for less frequent scrolling
    
    if (Math.abs(offsetFromIdeal) > scrollThreshold) {
      // Calculate smooth scroll distance - gentle movement for comfortable reading
      const scrollDistance = offsetFromIdeal * 0.25; // Move 25% of the way - slower, more natural
      const currentScroll = window.scrollY;
      const targetScroll = currentScroll + scrollDistance;
      
      // Limit maximum scroll per adjustment for smoothness
      const maxScrollStep = 40; // Maximum 40px per scroll - reduced for gentler movement
      const clampedScrollDistance = Math.max(-maxScrollStep, Math.min(maxScrollStep, scrollDistance));
      const clampedTargetScroll = currentScroll + clampedScrollDistance;
      
      // Use smooth scrolling with longer duration for natural movement
      window.scrollTo({
        top: clampedTargetScroll,
        behavior: 'smooth'
      });
      
      console.log(`📜 SMOOTH AUTO-SCROLL: ${(scrollProgress * 100).toFixed(1)}% → ${clampedScrollDistance > 0 ? '+' : ''}${clampedScrollDistance.toFixed(0)}px`);
    }
  };

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
      
      // The API returns content in 'context' property, not 'chunks'
      if (data.context) {
        // Split the content into manageable chunks for better reading experience
        const chunkSize = 1500; // ~1500 characters per page for consistent experience
        const fullText = data.context;
        const chunks = [] as { chunkIndex: number; content: string }[];

        for (let i = 0; i < fullText.length; i += chunkSize) {
          chunks.push({
            chunkIndex: chunks.length,
            content: fullText.substring(i, i + chunkSize)
          });
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
          const words = fullText.split(/\s+/);
          setSimplifiedTotalChunks(Math.ceil(words.length / 400));
        } catch {}

        setBookContent(bookData);
        
        // Set initial content based on saved position
        const savedPosition = localStorage.getItem(`reading-position-${bookId}`);
        const initialChunk = savedPosition ? parseInt(savedPosition, 10) : 0;
        const validChunk = Math.max(0, Math.min(initialChunk, chunks.length - 1));
        
        setCurrentChunk(validChunk);
        setCurrentContent(chunks[validChunk].content);
        console.log(`Book split into ${chunks.length} chunks, starting at chunk ${validChunk}`);
        console.log('DEBUG: First chunk content length:', chunks[validChunk]?.content?.length || 0);
        console.log('DEBUG: First chunk preview:', chunks[validChunk]?.content?.substring(0, 100) || 'No content');
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
  
  const handleAutoAdvance = () => {
    const canGoNext = bookContent ? currentChunk < bookContent.totalChunks - 1 : false;
    if (canGoNext && continuousPlayback) {
      console.log(`🎵 Auto-advancing to chunk ${currentChunk + 1} for continuous playback`);
      handleChunkNavigation('next', true);
      // Small delay then resume playing on new page
      setTimeout(() => {
        setIsPlaying(true);
      }, 200);
    } else {
      // Reached end of book or continuous playback disabled
      setIsPlaying(false);
      if (!canGoNext) {
        console.log('🏁 Reached end of book');
      }
    }
  };

  // handleWordHighlight now comes from useWordHighlighting hook

  const handleChunkComplete = () => {
    console.log(`🎵 Chunk ${currentChunk} audio completed`);
    if (continuousPlayback) {
      handleAutoAdvance();
    } else {
      setIsPlaying(false);
    }
  };

  const goToSection = (index: number) => {
    setCurrentSection(index);
    announceToScreenReader(`Now reading: ${sections[index].title}`);
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    localStorage.setItem(`voice-selection-${bookId}`, voiceId);
  };

  const handlePreviewVoice = async (voiceId: string) => {
    // Implement voice preview functionality here
    console.log('Previewing voice:', voiceId);
    // Could play a short sample text with the selected voice
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

  const currentChunkData = bookContent?.chunks?.[currentChunk];
  const effectiveTotal = currentMode === 'simplified' ? (simplifiedTotalChunks || 0) : (bookContent?.totalChunks || 0);
  const canGoPrev = currentChunk > 0;
  const canGoNext = effectiveTotal ? currentChunk < effectiveTotal - 1 : false;

  // Enhanced book detection - already defined at the top
  
  // Feature flag for progressive audio vs wireframe controls
  const useProgressiveAudio = true; // Enable Progressive Voice for enhanced books
  const useWireframeControls = false; // Always hide legacy wireframe bar in unified layout

  const getEffectiveTotal = () => (currentMode === 'simplified' ? (simplifiedTotalChunks || 0) : (bookContent?.totalChunks || 0));


  return (
    <div className="min-h-screen bg-slate-900">
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
      {/* Mobile Reading Header */}
      <div 
        className="mobile-reading-header"
        style={{
          display: 'none',
          height: '56px',
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #334155',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <button 
          onClick={() => router.push(isEnhancedBook ? '/enhanced-collection' : '/library')}
          style={{
            padding: '8px 12px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '8px',
            color: '#60a5fa',
            textDecoration: 'none',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>
        <span style={{ fontSize: '14px', color: '#94a3b8' }}>
          Chapter {currentChunk + 1} of {bookContent?.totalChunks || 0}
        </span>
      </div>

      {/* Main Content */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: isMobile ? '16px 8px' : '64px 48px' 
      }} className="main-content-container">
        {/* Old ESL Control Bar - removed in unified layout */}
        {false && (
        <div 
          style={{
            backgroundColor: '#1e293b',
            border: '2px solid #475569',
            borderRadius: '24px',
            padding: '32px',
            marginBottom: '48px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '48px'
          }}
        >
          {/* CEFR Level Selector */}
          <div style={{ position: 'relative' }} data-level-dropdown>
            <button
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#6366f1',
                color: 'white',
                fontSize: '18px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.2s'
              }}
              onClick={() => setShowLevelDropdown(!showLevelDropdown)}
              onMouseEnter={(e) => (e.target as HTMLElement).style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.transform = 'scale(1)'}
            >
              {eslLevel}
            </button>
            
            {/* Dropdown Menu */}
            {showLevelDropdown && (
              <div style={{
                position: 'absolute',
                top: '72px',
                left: '0',
                backgroundColor: '#1e293b',
                border: '2px solid #475569',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                zIndex: 50,
                minWidth: '80px'
              }}>
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
                  <button
                    key={level}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: level === eslLevel ? '#6366f1' : 'transparent',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.2s',
                      borderRadius: level === 'A1' ? '10px 10px 0 0' : level === 'C2' ? '0 0 10px 10px' : '0'
                    }}
                    onClick={async () => {
                      setEslLevel(level);
                      setShowLevelDropdown(false);
                      localStorage.setItem(`esl-level-${bookId}`, level);
                      
                      // If we're in simplified mode, refetch content for new level
                      if (currentMode === 'simplified') {
                        const simplifiedText = await fetchSimplifiedContent(level, currentChunk);
                        setCurrentContent(simplifiedText);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (level !== eslLevel) {
                        (e.target as HTMLElement).style.backgroundColor = '#475569';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (level !== eslLevel) {
                        (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Simplified Mode Toggle */}
          <button
            onClick={handleModeToggle}
            style={{
              padding: '16px 40px',
              borderRadius: '32px',
              backgroundColor: currentMode === 'simplified' ? '#6366f1' : '#475569',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              border: currentMode === 'simplified' ? 'none' : '2px solid #64748b',
              cursor: 'pointer',
              minHeight: '64px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.transform = 'scale(1)'}
          >
            {currentMode === 'simplified' ? 'Simplified' : 'Original'}
          </button>

          
          
          {/* TTS Voice Selector */}
          <div style={{ position: 'relative' }} data-voice-dropdown>
            <button
              onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#6366f1',
                color: 'white',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.transform = 'scale(1)'}
            >
              🎤
              {/* Voice indicator */}
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '20px',
                height: '20px',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {voiceProvider === 'openai' ? 'AI' : voiceProvider === 'elevenlabs' ? '11' : 'S'}
              </span>
            </button>
            
            {/* Voice Dropdown Menu */}
            {showVoiceDropdown && (
              <div style={{
                position: 'absolute',
                top: '72px',
                left: '0',
                backgroundColor: '#1e293b',
                border: '2px solid #475569',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                zIndex: 50,
                minWidth: '160px'
              }}>
                {[
                  { id: 'standard', name: '🔊 Standard', desc: 'Web Speech' },
                  { id: 'openai', name: '🤖 OpenAI', desc: 'Premium AI' },
                  { id: 'elevenlabs', name: '🎵 ElevenLabs', desc: 'Ultra Realistic' }
                ].map((voice, index) => (
                  <button
                    key={voice.id}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: voice.id === voiceProvider ? '#6366f1' : 'transparent',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.2s',
                      borderRadius: index === 0 ? '10px 10px 0 0' : index === 2 ? '0 0 10px 10px' : '0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start'
                    }}
                    onClick={() => {
                      setVoiceProvider(voice.id as 'standard' | 'openai' | 'elevenlabs');
                      setShowVoiceDropdown(false);
                      localStorage.setItem(`voice-provider-${bookId}`, voice.id);
                      
                      // Stop any playing audio when switching voice
                      if (isPlaying) {
                        setIsPlaying(false);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (voice.id !== voiceProvider) {
                        (e.target as HTMLElement).style.backgroundColor = '#475569';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (voice.id !== voiceProvider) {
                        (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{voice.name}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{voice.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#6366f1',
              color: 'white',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.transform = 'scale(1)'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          {/* Continuous Playback Toggle */}
          <button
            onClick={() => setContinuousPlayback(!continuousPlayback)}
            title={continuousPlayback ? 'Continuous playback enabled' : 'Enable continuous playback'}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: continuousPlayback ? '#10b981' : '#475569',
              color: 'white',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s',
              position: 'relative'
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => (e.target as HTMLElement).style.transform = 'scale(1)'}
          >
            🔁
            {continuousPlayback && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '12px',
                height: '12px',
                backgroundColor: '#10b981',
                borderRadius: '50%',
                border: '2px solid white'
              }} />
            )}
          </button>
          
          {/* Speed Control */}
          <button
            onClick={() => {
              const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];
              const currentIndex = speeds.indexOf(speechSpeed);
              const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
              setSpeechSpeed(nextSpeed);
            }}
            style={{
              color: '#cbd5e1',
              fontSize: '18px',
              fontWeight: '600',
              padding: '12px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.color = 'white';
              (e.target as HTMLElement).style.backgroundColor = '#475569';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.color = '#cbd5e1';
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            {speechSpeed}x
          </button>
          
          {/* AI Quality Indicator */}
          {currentMode === 'simplified' && aiMetadata && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: aiMetadata.quality === 'excellent' ? '#10b981' : 
                     aiMetadata.quality === 'good' ? '#3b82f6' :
                     aiMetadata.quality === 'acceptable' ? '#f59e0b' : '#ef4444',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              <div style={{ marginBottom: '2px' }}>AI Quality</div>
              <div style={{ 
                fontSize: '10px',
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255,255,255,0.1)'
              }}>
                {aiMetadata.quality}
              </div>
              <div style={{ 
                fontSize: '9px', 
                marginTop: '2px',
                opacity: 0.7
              }}>
                {Math.round(aiMetadata.similarity * 100)}%
              </div>
            </div>
          )}

          {/* Session Timer Display */}
          {sessionTimerActive && sessionTimeLeft !== null && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: (sessionTimeLeft ?? 0) < 300 ? '#ef4444' : '#94a3b8',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>Session</div>
              <div style={{ 
                fontSize: '16px',
                fontFamily: 'monospace',
                color: (sessionTimeLeft ?? 0) < 300 ? '#ef4444' : '#10b981'
              }}>
                {Math.floor((sessionTimeLeft ?? 0) / 60)}:{(((sessionTimeLeft ?? 0) % 60).toString()).padStart(2, '0')}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => handleChunkNavigation('prev')}
              disabled={!canGoPrev}
              style={{
                width: '48px',
                height: '48px',
                color: canGoPrev ? '#94a3b8' : '#475569',
                fontSize: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: canGoPrev ? 'pointer' : 'not-allowed',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (canGoPrev) {
                  (e.target as HTMLElement).style.color = 'white';
                  (e.target as HTMLElement).style.backgroundColor = '#475569';
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = canGoPrev ? '#94a3b8' : '#475569';
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              ‹
            </button>
            <span style={{
              color: '#cbd5e1',
              fontSize: '16px',
              fontWeight: '500',
              padding: '0 16px',
              minWidth: '60px',
              textAlign: 'center'
            }}>
              {currentChunk + 1}/{bookContent?.totalChunks || 0}
            </span>
            <button
              onClick={() => handleChunkNavigation('next')}
              disabled={!canGoNext}
              style={{
                width: '48px',
                height: '48px',
                color: canGoNext ? '#94a3b8' : '#475569',
                fontSize: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: canGoNext ? 'pointer' : 'not-allowed',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (canGoNext) {
                  (e.target as HTMLElement).style.color = 'white';
                  (e.target as HTMLElement).style.backgroundColor = '#475569';
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = canGoNext ? '#94a3b8' : '#475569';
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
              }}
            >
              ›
            </button>
          </div>
        </div>
        )}

        {/* Mobile-Responsive Reading Controls */}
        {isEnhancedBook && useProgressiveAudio && !isBrowseExperience ? (
          <>
            {/* Mobile Reading Controls - Visible on mobile */}
            <div 
              className="mobile-reading-controls"
              style={{
                display: 'block',
                padding: '16px',
                background: 'rgba(51, 65, 85, 0.3)',
                borderBottom: '1px solid #334155'
              }}
            >
              {/* Original/Simplified Toggle */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderRadius: '8px',
                  padding: '4px',
                  border: '1px solid #334155'
                }}>
                  <button
                    onClick={() => handleModeChange && handleModeChange('original')}
                    style={{
                      flex: 1,
                      height: '36px',
                      border: 'none',
                      background: currentMode === 'original' ? '#3b82f6' : 'none',
                      color: currentMode === 'original' ? 'white' : '#94a3b8',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      padding: '0 16px',
                      minWidth: '44px',
                      transition: 'all 0.2s'
                    }}
                  >
                    Original
                  </button>
                  <button
                    onClick={() => handleModeChange && handleModeChange('simplified')}
                    style={{
                      flex: 1,
                      height: '36px',
                      border: 'none',
                      background: currentMode === 'simplified' ? '#3b82f6' : 'none',
                      color: currentMode === 'simplified' ? 'white' : '#94a3b8',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      padding: '0 16px',
                      minWidth: '44px',
                      transition: 'all 0.2s'
                    }}
                  >
                    Simplified
                  </button>
                </div>
              </div>
              
              {/* CEFR Level Selector */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '6px',
                flexWrap: 'wrap'
              }}>
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
                  <button
                    key={level}
                    onClick={async () => {
                      await handleCefrLevelChange(level);
                    }}
                    style={{
                      width: '44px',
                      height: '32px',
                      border: '1px solid #334155',
                      background: level === eslLevel ? '#3b82f6' : '#1e293b',
                      color: level === eslLevel ? 'white' : '#94a3b8',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Control Bar - removed in unified layout */}
            <div className="mb-8 desktop-control-bar" style={{ display: 'none' }}>
              <div 
                className="control-bar-grouped"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(30, 41, 59, 0.8)',
                  borderRadius: '16px',
                  border: '1px solid rgba(71, 85, 105, 0.3)',
                  maxWidth: '900px',
                  margin: '0 auto',
                  padding: '16px 24px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
                }}
              >
              {/* Content Controls Group */}
              <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* CEFR Level Selector */}
                <div className="relative">
                  <button 
                    className="level-badge"
                    style={{
                      background: '#667eea',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '50px',
                      fontWeight: '600',
                      fontSize: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      minWidth: '44px',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                  >
                    {eslLevel}
                  </button>
                  
                  {/* CEFR Level Dropdown */}
                  {showLevelDropdown && (
                    <div 
                      className="absolute top-12 left-0 z-50"
                      style={{
                        background: 'rgba(30, 41, 59, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(71, 85, 105, 0.3)',
                        borderRadius: '8px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                        minWidth: '80px',
                        overflow: 'hidden',
                        padding: '4px'
                      }}
                    >
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
                        <button
                          key={level}
                          className="w-full px-4 py-2 text-center text-white font-semibold transition-all duration-200 hover:bg-blue-600"
                          style={{
                            backgroundColor: level === eslLevel ? '#667eea' : 'transparent',
                            fontSize: '14px'
                          }}
                          onClick={async () => {
                            await handleCefrLevelChange(level);
                            setShowLevelDropdown(false);
                          }}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mode Toggle */}
                <button
                  onClick={handleModeChange ? () => handleModeChange(currentMode === 'original' ? 'simplified' : 'original') : undefined}
                  className="mode-toggle"
                  style={{
                    background: currentMode === 'simplified' ? '#667eea' : 'transparent',
                    border: '1px solid #334155',
                    color: '#e2e8f0',
                    padding: '8px 16px',
                    borderRadius: '50px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                    borderColor: currentMode === 'simplified' ? '#667eea' : '#334155'
                  }}
                >
                  {currentMode === 'simplified' ? 'Simplified' : 'Original'}
                </button>
              </div>

              {/* Control Divider */}
              <div style={{ width: '1px', height: '30px', background: '#334155' }}></div>

              {/* Audio Controls Group */}
              <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Voice Selector - Simplified to just current voice name */}
                <div className="relative">
                  <button
                    onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #334155',
                      color: '#e2e8f0',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      minHeight: '44px'
                    }}
                  >
                    {selectedVoice}
                  </button>
                  
                  {/* Voice Dropdown - Only show Alloy/Nova for enhanced books */}
                  {showVoiceDropdown && (
                    <div 
                      className="absolute top-12 left-0 z-50"
                      style={{
                        background: 'rgba(30, 41, 59, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(71, 85, 105, 0.3)',
                        borderRadius: '8px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                        minWidth: '120px',
                        overflow: 'hidden',
                        padding: '4px'
                      }}
                    >
                      {/* Only show available voices for enhanced books */}
                      {(isEnhancedBook ? ['alloy', 'nova'] : ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).map((voice) => (
                        <button
                          key={voice}
                          className="w-full px-4 py-2 text-center text-white font-medium transition-all duration-200 hover:bg-green-600 capitalize"
                          style={{
                            backgroundColor: voice === selectedVoice ? '#10b981' : 'transparent',
                            fontSize: '13px'
                          }}
                          onClick={() => {
                            handleVoiceChange(voice);
                            setShowVoiceDropdown(false);
                          }}
                        >
                          {voice} {isEnhancedBook && ['alloy', 'nova'].includes(voice) && '⚡'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Smart Play/Auto Button - Combined play and auto-advance */}
                <SmartPlayButton
                  isPlaying={isPlaying}
                  isLoading={isAudioLoading}
                  autoAdvanceEnabled={autoAdvanceEnabled}
                  onPlayPause={() => {
                    const newPlayingState = !isPlaying;
                    console.log('📱 Reading page onPlayPause:', { 
                      currentState: isPlaying, 
                      newState: newPlayingState,
                      currentChunk,
                      currentMode,
                      autoAdvanceEnabled,
                      currentContent: currentContent.substring(0, 50) + '...',
                      isEnhanced: isEnhancedBook
                    });
                    setIsPlaying(newPlayingState);
                  }}
                  onToggleAutoAdvance={() => {
                    console.log('🔄 Toggle auto-advance clicked, current state:', autoAdvanceEnabled);
                    toggleAutoAdvance();
                  }}
                />
                
                {/* Hidden InstantAudioPlayer for audio functionality */}
                <div style={{ display: 'none' }}>
                  <InstantAudioPlayer
                    bookId={bookId}
                    chunkIndex={currentChunk}
                    text={currentContent}
                    cefrLevel={eslLevel}
                    voiceId={selectedVoice}
                    isEnhanced={isEnhancedBook}
                    onWordHighlight={(wordIndex: number) => {
                      console.log('🎯 InstantAudioPlayer calling onWordHighlight with index:', wordIndex);
                      handleWordHighlight(wordIndex);
                    }}
                    onChunkComplete={() => {
                      console.log('🏁 InstantAudioPlayer onChunkComplete called');
                      autoAdvanceChunkComplete();
                    }}
                    onProgressUpdate={(progress: any) => {
                      console.log('📊 Instant audio progress:', {
                        status: progress.status,
                        currentSentence: progress.currentSentence,
                        totalSentences: progress.totalSentences,
                        currentTime: progress.currentTime,
                        isPreGenerated: progress.isPreGenerated
                      });
                      // Update loading state based on audio status
                      setIsAudioLoading(progress.status === 'loading');
                    }}
                    // onAutoScroll handled by separate AutoScrollHandler component
                    className="hidden"
                    isPlaying={isPlaying}
                    onPlayingChange={(playing: boolean) => {
                      console.log('🔄 InstantAudioPlayer onPlayingChange called with:', playing);
                      setIsPlaying(playing);
                      
                      // Re-enable auto-scroll when user manually starts playing
                      if (playing) {
                        console.log('🔄 Re-enabling auto-scroll - user started playback');
                        setAutoScrollEnabled(true);
                        if (userScrolledUp) {
                          setUserScrolledUp(false);
                        }
                      }
                    }}
                  />
                </div>

                {/* Speed Control */}
                <button
                  onClick={() => {
                    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];
                    const currentIndex = speeds.indexOf(speechSpeed);
                    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
                    setSpeechSpeed(nextSpeed);
                  }}
                  className="speed-control"
                  style={{
                    color: '#94a3b8',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid transparent',
                    transition: 'all 0.2s',
                    background: 'transparent',
                    minHeight: '44px'
                  }}
                >
                  {speechSpeed}x
                </button>

                {/* Scroll-to-pause notification */}
                {userScrolledUp && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{
                      fontSize: '11px',
                      color: '#f59e0b',
                      background: 'rgba(245, 158, 11, 0.15)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    📜 Paused by scroll
                  </motion.div>
                )}
              </div>

              {/* Control Divider */}
              <div style={{ width: '1px', height: '30px', background: '#334155' }}></div>

              {/* Navigation Group */}
              <div className="nav-arrows" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleChunkNavigation('prev')}
                  disabled={!canGoPrev}
                  className="nav-arrow"
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '1px solid #334155',
                    background: 'transparent',
                    color: canGoPrev ? '#94a3b8' : '#475569',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: canGoPrev ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    fontSize: '16px'
                  }}
                >
                  ‹
                </button>
                <span 
                  className="page-indicator"
                  style={{
                    color: '#94a3b8',
                    fontSize: '14px',
                    minWidth: '60px',
                    textAlign: 'center'
                  }}
                >
                  {currentChunk + 1}/{bookContent?.totalChunks || 0}
                </span>
                <button
                  onClick={() => handleChunkNavigation('next')}
                  disabled={!canGoNext}
                  className="nav-arrow"
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '1px solid #334155',
                    background: 'transparent',
                    color: canGoNext ? '#94a3b8' : '#475569',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: canGoNext ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    fontSize: '16px'
                  }}
                >
                  ›
                </button>
              </div>
            </div>
            </div>
          </>
        ) : isBrowseExperience ? (
          <div className="mb-8" style={{ display: 'none' }}>
            <div 
              className="browse-controls"
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '16px',
                border: '1px solid rgba(71, 85, 105, 0.3)',
                maxWidth: '400px',
                margin: '0 auto',
                padding: '16px 24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}
            >
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                Page {currentChunk + 1} of {bookContent?.totalChunks || 0}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleChunkNavigation('prev')}
                  disabled={currentChunk <= 0}
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '1px solid #334155',
                    background: 'transparent',
                    color: currentChunk > 0 ? '#94a3b8' : '#475569',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: currentChunk > 0 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    fontSize: '16px'
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={() => handleChunkNavigation('next')}
                  disabled={currentChunk >= (bookContent?.totalChunks || 0) - 1}
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '1px solid #334155',
                    background: 'transparent',
                    color: currentChunk < (bookContent?.totalChunks || 0) - 1 ? '#94a3b8' : '#475569',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: currentChunk < (bookContent?.totalChunks || 0) - 1 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    fontSize: '16px'
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        ) : useWireframeControls ? (
          <WireframeAudioControls
            enableWordHighlighting={isEnhancedBook}
            text={currentContent}
            voiceProvider={voiceProvider}
            isPlaying={isPlaying}
            onPlayStateChange={setIsPlaying}
            onEnd={autoAdvanceChunkComplete}
            bookId={bookId}
            chunkIndex={currentChunk}
            cefrLevel={eslLevel}
            onCefrLevelChange={handleCefrLevelChange}
            currentChunk={currentChunk}
            totalChunks={bookContent?.totalChunks || 0}
            onNavigate={handleChunkNavigation}
            selectedVoice={selectedVoice}
            onVoiceChange={handleVoiceChange}
            onPreviewVoice={handlePreviewVoice}
            currentMode={currentMode}
            onModeChange={handleModeChange}
            onWordHighlight={handleWordHighlight}
            autoAdvanceEnabled={autoAdvanceEnabled}
            onToggleAutoAdvance={toggleAutoAdvance}
          />
        ) : (
          <IntegratedAudioControls
            text={currentContent}
            voiceProvider={voiceProvider}
            isPlaying={isPlaying}
            onPlayStateChange={setIsPlaying}
            onEnd={handleChunkComplete}
            bookId={bookId}
            chunkIndex={currentChunk}
          />
        )}

        {/* Reading Content - Mobile Responsive */}
        <motion.div 
          key={currentChunk}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="reading-content-container"
          style={{
            background: 'rgba(26, 32, 44, 0.5)',
            backdropFilter: 'blur(20px)',
            borderRadius: isMobile ? '16px' : '24px',
            padding: isMobile ? '8px' : '48px 40px', // MINIMAL PADDING ON MOBILE
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(102, 126, 234, 0.15)',
            border: '1px solid rgba(102, 126, 234, 0.15)',
            minHeight: isMobile ? '400px' : '600px',
            marginTop: '16px',
            marginBottom: '100px', // Space for mobile audio controls
            margin: isMobile ? '8px' : undefined
          }}
        >
          {/* Book Title */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 className="book-title-wireframe" style={{ marginBottom: '12px' }}>
              {bookContent.title}
            </h1>
            <p style={{ 
              color: '#94a3b8', 
              fontSize: '17px', 
              textAlign: 'center', 
              marginBottom: '0',
              fontStyle: 'italic',
              letterSpacing: '0.5px'
            }}>
              by {bookContent.author}
            </p>
          </div>
          
          {/* Book Text */}
          <div 
            className="book-content-wireframe"
            style={{
              maxWidth: isMobile ? '100%' : undefined,
              margin: isMobile ? '0' : undefined,
              padding: isMobile ? '0' : undefined
            }}
          >
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
                
                <div 
                  id="book-reading-text"
                  className={`book-text-wireframe ${currentMode === 'simplified' ? 'simplified' : ''} whitespace-pre-wrap ${
                    preferences.contrast === 'high' ? 'text-black bg-white' :
                    preferences.contrast === 'ultra-high' ? 'text-white bg-black' : ''
                  }`}
                  style={{
                    fontSize: preferences.dyslexiaFont ? `${Math.max(preferences.fontSize, 18)}px` : undefined,
                    lineHeight: preferences.dyslexiaFont ? '1.9' : undefined,
                    fontFamily: preferences.dyslexiaFont ? 'OpenDyslexic, Arial, sans-serif' : undefined,
                    letterSpacing: preferences.dyslexiaFont ? '0.3px' : undefined,
                    wordSpacing: preferences.dyslexiaFont ? '2px' : undefined,
                  }}
                  role="main"
                  aria-label="Book content"
                  tabIndex={0}
                >
                  {/* Enhanced books: Use WordHighlighter for text display with highlighting disabled */}
                  {isEnhancedBook ? (
                    <div style={{ position: 'relative' }} data-content="true">
                      {/* Auto-scroll handler - works independently of highlighting */}
                      <AutoScrollHandler
                        text={currentContent}
                        currentWordIndex={currentWordIndex}
                        isPlaying={isPlaying}
                        enabled={autoScrollEnabled}
                      />
                      
                      {/* Word highlighting - DISABLED but still displays text */}
                      <WordHighlighter
                        text={currentContent}
                        currentWordIndex={-1} // DISABLED: Causes dizziness, doesn't match voice speed
                        isPlaying={isPlaying}
                        animationType="speechify"
                        highlightColor="#10b981"
                        showProgress={true}
                        className="word-highlight-overlay"
                      />
                    </div>
                  ) : (
                    /* Browse experience: Direct text display without highlighting */
                    <div data-content="true" style={{ 
                      color: '#e2e8f0', 
                      fontSize: '16px', 
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {currentContent || 'Loading content...'}
                    </div>
                  )}
                </div>

                  
                {/* Continuous Playback Status */}
                {continuousPlayback && (
                  <div style={{
                    textAlign: 'center',
                    marginTop: '16px',
                    padding: '8px 16px',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#10b981'
                  }}>
                    📚 Continuous playback enabled - will auto-advance to next chunk
                  </div>
                )}

                {/* Current word highlight debug info */}
                {process.env.NODE_ENV === 'development' && currentWordIndex >= 0 && (
                  <div style={{
                    textAlign: 'center',
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    Highlighting word {currentWordIndex + 1}
                  </div>
                )}
              </>
            )}
          </div>
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

      {/* Mobile Audio Controls - Fixed Bottom (Unified layout for desktop & mobile) */}
      {isEnhancedBook && (
        <div 
          className="mobile-audio-controls"
          style={{
            display: 'flex',
            position: 'fixed',
            bottom: '0',
            left: '0',
            right: '0',
            maxWidth: 'none',
            margin: '0',
            height: '72px',
            background: 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid #334155',
            borderRadius: '0',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '0 16px',
            zIndex: 1100
          }}
        >
          {/* All Controls in One Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Voice Selector Button */}
            <button
              onClick={() => {
                const voices = isEnhancedBook ? ['alloy', 'nova'] : ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
                const currentIndex = voices.indexOf(selectedVoice || 'alloy');
                const nextVoice = voices[(currentIndex + 1) % voices.length];
                setSelectedVoice(nextVoice);
                localStorage.setItem(`voice-selection-${bookId}`, nextVoice);
              }}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '22px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                lineHeight: '1.2',
                padding: '4px',
                textTransform: 'capitalize'
              }}
              aria-label={`Voice: ${selectedVoice}`}
            >
              {selectedVoice.substring(0, 4)}
            </button>

            {/* Playback Controls */}
            <button 
              onClick={() => handleChunkNavigation('prev')}
              disabled={!canGoPrev}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '22px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                color: canGoPrev ? '#60a5fa' : '#475569',
                fontSize: '16px',
                cursor: canGoPrev ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ⏮
            </button>
            
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '28px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            
            <button 
              onClick={() => handleChunkNavigation('next')}
              disabled={!canGoNext}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '22px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                color: canGoNext ? '#60a5fa' : '#475569',
                fontSize: '16px',
                cursor: canGoNext ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ⏭
            </button>

            {/* Auto-advance Toggle (wired to useAutoAdvance) */}
            <button
              onClick={() => {
                toggleAutoAdvance();
              }}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '22px',
                background: autoAdvanceEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                border: `1px solid ${autoAdvanceEnabled ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.2)'}`,
                color: autoAdvanceEnabled ? '#10b981' : '#60a5fa',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
              aria-label={`Auto-advance: ${autoAdvanceEnabled ? 'On' : 'Off'}`}
              title="Toggle auto-advance"
            >
              {autoAdvanceEnabled ? '✓' : '→'}
              {autoAdvanceEnabled && (
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#10b981',
                  borderRadius: '50%',
                  border: '2px solid rgba(30, 41, 59, 0.95)'
                }} />
              )}
            </button>
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
          
          .mobile-audio-controls {
            display: flex !important;
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            max-width: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
            height: 72px !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            padding-bottom: env(safe-area-inset-bottom) !important;
            background: #0f172a !important; /* opaque to avoid seeing text under */
            border-top: 1px solid #334155 !important;
            border-left: none !important;
            border-right: none !important;
            border-bottom: none !important;
            box-shadow: none !important;
            z-index: 999 !important;
          }
          
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
          
          .word-highlight-current {
            background: linear-gradient(120deg, 
              rgba(16, 185, 129, 0.3) 0%, 
              rgba(16, 185, 129, 0.4) 100%) !important;
            border-radius: 3px;
            padding: 1px 2px;
            font-weight: 600;
          }
          
          .word-highlight-upcoming {
            background: rgba(59, 130, 246, 0.15) !important;
            border-radius: 2px;
            padding: 0 1px;
          }
        }
        
        @media (min-width: 769px) {
          ${'' /* Unified bottom controls on desktop when flag is on */}
        }
        
        .mobile-reading-controls button:active {
          transform: scale(0.95);
        }
        
        .mobile-audio-controls button:active {
          transform: scale(0.95);
        }
      `}</style>

      {/* Network Performance Monitor - Temporarily disabled */}
      {/* <NetworkPerformanceMonitor 
        bookId={bookId}
        isVisible={false}
      /> */}
    </div>
  );
}