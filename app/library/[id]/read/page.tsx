'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ESLControls } from '@/components/esl/ESLControls';
import { VocabularyHighlighter } from '@/components/VocabularyHighlighter';
import { PrecomputeAudioPlayer } from '@/components/PrecomputeAudioPlayer';
import { AudioPlayerWithHighlighting } from '@/components/AudioPlayerWithHighlighting';
import { IntegratedAudioControls } from '@/components/IntegratedAudioControls';
import { SpeedControl } from '@/components/SpeedControl';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { motion } from 'framer-motion';

interface BookContent {
  id: string;
  title: string;
  author: string;
  chunks: Array<{
    chunkIndex: number;
    content: string;
  }>;
  totalChunks: number;
}

export default function BookReaderPage() {
  const params = useParams();
  const router = useRouter();
  const { preferences, announceToScreenReader } = useAccessibility();
  const [bookContent, setBookContent] = useState<BookContent | null>(null);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [eslLevel, setEslLevel] = useState<string>('B2');
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<'standard' | 'openai' | 'elevenlabs'>('openai');
  const [currentContent, setCurrentContent] = useState<string>('');
  const [currentMode, setCurrentMode] = useState<'original' | 'simplified'>('original');
  const [simplifiedContent, setSimplifiedContent] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [continuousPlayback, setContinuousPlayback] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
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

  const bookId = params.id as string;

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
    // Reset to original content for new chunk
    if (bookContent?.chunks[currentChunk]) {
      const newContent = bookContent.chunks[currentChunk].content;
      setCurrentContent(newContent);
    }
  }, [currentChunk, bookContent]);

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

  const fetchBook = async () => {
    try {
      const response = await fetch(`/api/books/${bookId}/content-fast`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Book data received:', data);
      
      // The API returns content in 'context' property, not 'chunks'
      if (data.context) {
        // Split the content into manageable chunks for better reading experience
        const chunkSize = 1500; // ~1500 characters per page for better breathing room
        const fullText = data.context;
        const chunks = [];
        
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
          totalChunks: chunks.length
        };
        
        setBookContent(bookData);
        
        // Set initial content based on saved position
        const savedPosition = localStorage.getItem(`reading-position-${bookId}`);
        const initialChunk = savedPosition ? parseInt(savedPosition, 10) : 0;
        const validChunk = Math.max(0, Math.min(initialChunk, chunks.length - 1));
        
        setCurrentChunk(validChunk);
        setCurrentContent(chunks[validChunk].content);
        console.log(`Book split into ${chunks.length} chunks, starting at chunk ${validChunk}`);
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

  const handleChunkNavigation = async (direction: 'prev' | 'next', autoAdvance = false) => {
    if (!bookContent) return;
    
    const newChunk = direction === 'next' 
      ? Math.min(currentChunk + 1, bookContent.totalChunks - 1)
      : Math.max(currentChunk - 1, 0);
    
    if (newChunk !== currentChunk) {
      setCurrentChunk(newChunk);
      
      // Save reading position to localStorage
      localStorage.setItem(`reading-position-${bookId}`, newChunk.toString());
      
      // Get the new content based on current mode
      const newOriginalContent = bookContent.chunks[newChunk]?.content || '';
      if (currentMode === 'original') {
        setCurrentContent(newOriginalContent);
      } else if (currentMode === 'simplified') {
        // Fetch simplified content for the new chunk
        const simplifiedText = await fetchSimplifiedContent(eslLevel, newChunk);
        setCurrentContent(simplifiedText);
      }
      
      // For auto-advance, continue playing on the new page
      if (!autoAdvance && isPlaying) {
        setIsPlaying(false);
      }
    }
  };
  
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

  const handleWordHighlight = (wordIndex: number) => {
    setCurrentWordIndex(wordIndex);
  };

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
  const canGoPrev = currentChunk > 0;
  const canGoNext = bookContent ? currentChunk < bookContent.totalChunks - 1 : false;

  return (
    <div className="min-h-screen bg-slate-900">
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-slate-800 shadow-sm border-b border-slate-700"
      >
        <div className="max-w-2xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <motion.button
                whileHover={{ x: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(`/library/${bookId}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(45, 55, 72, 0.8)',
                  border: '2px solid rgba(102, 126, 234, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#e2e8f0',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                  e.currentTarget.style.backgroundColor = 'rgba(45, 55, 72, 0.8)';
                  e.currentTarget.style.transform = 'translateY(0px)';
                }}
              >
                <span>←</span>
                <span>Back to Library</span>
              </motion.button>
            </div>
            <div>
              <h1 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#f7fafc',
                marginBottom: '4px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
              }}>{bookContent.title}</h1>
              <p style={{
                fontSize: '14px',
                color: '#cbd5e0',
                fontWeight: '500',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>by {bookContent.author}</p>
            </div>
            <div className="flex items-center gap-3">
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                style={{
                  fontSize: '14px',
                  color: '#cbd5e0',
                  fontWeight: '500',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  textAlign: 'right'
                }}
              >
                {(() => {
                  const isExternalBook = bookId.includes('-') && 
                    ['gutenberg', 'openlibrary', 'standardebooks', 'googlebooks'].some(source => 
                      bookId.startsWith(source + '-')
                    );
                  return isExternalBook 
                    ? `Chapter ${currentChunk + 1} of ${bookContent.totalChunks}`
                    : `Page ${currentChunk + 1} of ${bookContent.totalChunks}`;
                })()}
                <div style={{
                  marginTop: '8px',
                  width: '80px',
                  height: '4px',
                  backgroundColor: 'rgba(45, 55, 72, 0.6)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentChunk + 1) / bookContent.totalChunks) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    style={{
                      height: '100%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '2px'
                    }}
                    aria-label={`Reading progress: ${Math.round(((currentChunk + 1) / bookContent.totalChunks) * 100)}%`}
                  />
                </div>
              </motion.div>
              <div className="text-xs text-slate-400 hidden lg:block" title="Keyboard shortcuts: Space=Play/Pause, Arrow keys=Navigate, Esc=Stop">
                ⌨️ Space, Arrows, Esc
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 48px' }}>
        {/* ESL Control Bar */}
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
              color: sessionTimeLeft < 300 ? '#ef4444' : '#94a3b8',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>Session</div>
              <div style={{ 
                fontSize: '16px',
                fontFamily: 'monospace',
                color: sessionTimeLeft < 300 ? '#ef4444' : '#10b981'
              }}>
                {Math.floor(sessionTimeLeft / 60)}:{(sessionTimeLeft % 60).toString().padStart(2, '0')}
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

        {/* Reading Content */}
        <motion.div 
          key={currentChunk}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            background: 'rgba(26, 32, 44, 0.8)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(102, 126, 234, 0.2)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            minHeight: '500px'
          }}
        >
          {/* Book Title */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{ 
              fontSize: '36px', 
              fontWeight: 'bold', 
              color: 'white', 
              marginBottom: '16px' 
            }}>
              {bookContent.title}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '16px' }}>by {bookContent.author}</p>
          </div>
          
          {/* Book Text */}
          <div style={{ 
            maxWidth: '900px', 
            margin: '0 auto', 
            padding: '32px 80px',
            fontSize: displayConfig?.fontSize || '16px',
            lineHeight: '1.8',
            transition: 'font-size 0.3s ease'
          }}>
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
                  className={`whitespace-pre-wrap leading-relaxed ${
                    preferences.contrast === 'high' ? 'text-black bg-white' :
                    preferences.contrast === 'ultra-high' ? 'text-white bg-black' :
                    'text-gray-900'
                  }`}
                  style={{
                    fontSize: `${Math.max(preferences.fontSize, 16)}px`,
                    lineHeight: preferences.dyslexiaFont ? '1.9' : '1.8',
                    fontFamily: preferences.dyslexiaFont ? 'OpenDyslexic, Arial, sans-serif' : '"Inter", "Charter", "Georgia", serif',
                    color: preferences.contrast === 'ultra-high' ? '#ffffff' : '#e2e8f0',
                    letterSpacing: '0.3px',
                    wordSpacing: '2px',
                    textAlign: 'justify',
                    textJustify: 'inter-word',
                    hyphens: 'auto',
                    WebkitHyphens: 'auto',
                    msHyphens: 'auto'
                  }}
                  role="main"
                  aria-label="Book content"
                  tabIndex={0}
                >
                  <VocabularyHighlighter 
                    text={currentContent}
                    eslLevel={eslLevel}
                    mode={currentMode}
                  />
                </div>

                {/* Integrated Audio Controls - Invisible but Connected */}
                <IntegratedAudioControls
                  text={currentContent}
                  voiceProvider={voiceProvider}
                  isPlaying={isPlaying}
                  onPlayStateChange={setIsPlaying}
                  onEnd={handleChunkComplete}
                  bookId={bookId}
                  chunkIndex={currentChunk}
                />
                  
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

      {/* Bottom Navigation Controls */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        style={{
          background: 'rgba(26, 32, 44, 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(102, 126, 234, 0.2)',
          position: 'sticky',
          bottom: 0,
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(102, 126, 234, 0.1)'
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ 
                scale: currentChunk === 0 ? 1 : 1.05,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleChunkNavigation('prev')}
              disabled={!canGoPrev}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                background: canGoPrev ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(102, 126, 234, 0.1)',
                color: canGoPrev ? '#ffffff' : '#64748b',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                cursor: canGoPrev ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}
            >
              Previous
            </motion.button>
            
            <span style={{
              fontSize: '14px',
              color: '#cbd5e0',
              fontWeight: '500',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
            }}>
              {currentChunk + 1} / {bookContent?.totalChunks || 0}
            </span>
            
            <motion.button
              whileHover={{ 
                scale: currentChunk === bookContent.totalChunks - 1 ? 1 : 1.05,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleChunkNavigation('next')}
              disabled={!canGoNext}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                background: canGoNext ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(102, 126, 234, 0.1)',
                color: canGoNext ? '#ffffff' : '#64748b',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                cursor: canGoNext ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}
            >
              Next
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}