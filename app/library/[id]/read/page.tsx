'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ESLControls } from '@/components/esl/ESLControls';
import { VocabularyHighlighter } from '@/components/VocabularyHighlighter';
import { SimpleTTS } from '@/components/SimpleTTS';
import { SpeedControl } from '@/components/SpeedControl';

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
  const [bookContent, setBookContent] = useState<BookContent | null>(null);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [eslLevel, setEslLevel] = useState<string>('B2');
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<'standard' | 'openai' | 'elevenlabs'>('standard');
  const [currentContent, setCurrentContent] = useState<string>('');
  const [currentMode, setCurrentMode] = useState<'original' | 'simplified'>('original');
  const [simplifiedContent, setSimplifiedContent] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState(1.0);

  const bookId = params.id as string;

  useEffect(() => {
    if (bookId) {
      fetchBook();
      checkAuth();
      loadReadingPosition();
    }
  }, [bookId]);

  // Clear simplified content when chunk changes
  useEffect(() => {
    setSimplifiedContent('');
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
        setCurrentChunk(position);
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

  // Handle mode switching - simplified version that just changes visual mode
  const handleModeToggle = () => {
    const newMode = currentMode === 'original' ? 'simplified' : 'original';
    setCurrentMode(newMode);
    localStorage.setItem(`reading-mode-${bookId}`, newMode);
    // For now, we'll just use the original content with ESL visual styling
  };

  const handleChunkNavigation = (direction: 'prev' | 'next', autoAdvance = false) => {
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
      }
      // For simplified mode, SimpleReadingModes will handle content update
      
      // For auto-advance, continue playing on the new page
      if (!autoAdvance && isPlaying) {
        setIsPlaying(false);
      }
    }
  };
  
  const handleAutoAdvance = () => {
    const canGoNext = bookContent ? currentChunk < bookContent.totalChunks - 1 : false;
    if (canGoNext) {
      handleChunkNavigation('next', true);
      // Small delay then resume playing on new page
      setTimeout(() => {
        setIsPlaying(true);
      }, 200);
    } else {
      // Reached end of book
      setIsPlaying(false);
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
  const canGoPrev = currentChunk > 0;
  const canGoNext = bookContent ? currentChunk < bookContent.totalChunks - 1 : false;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 shadow-sm border-b border-slate-700">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{bookContent.title}</h1>
              <p className="text-slate-300">by {bookContent.author}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/library')}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                ← Back to Library
              </button>
              <div className="text-xs text-slate-400 hidden lg:block" title="Keyboard shortcuts: Space=Play/Pause, Arrow keys=Navigate, Esc=Stop">
                ⌨️ Space, Arrows, Esc
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 48px' }}>
        {/* FORCED INLINE STYLES CONTROL BAR */}
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
          {/* CEFR Level Selector - FORCED LARGE */}
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
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
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
                    onClick={() => {
                      setEslLevel(level);
                      setShowLevelDropdown(false);
                      localStorage.setItem(`esl-level-${bookId}`, level);
                    }}
                    onMouseEnter={(e) => {
                      if (level !== eslLevel) {
                        e.target.style.backgroundColor = '#475569';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (level !== eslLevel) {
                        e.target.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Simplified Mode Toggle - FORCED LARGE */}
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
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            {currentMode === 'simplified' ? 'Simplified' : 'Original'}
          </button>
          
          {/* TTS Voice Selector - FORCED LARGE */}
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
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
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
                    }}
                    onMouseEnter={(e) => {
                      if (voice.id !== voiceProvider) {
                        e.target.style.backgroundColor = '#475569';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (voice.id !== voiceProvider) {
                        e.target.style.backgroundColor = 'transparent';
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
          
          {/* Play/Pause Button - SEPARATE */}
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
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          
          {/* Speed Control - FORCED LARGE */}
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
              e.target.style.color = 'white';
              e.target.style.backgroundColor = '#475569';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = '#cbd5e1';
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            {speechSpeed}x
          </button>
          
          {/* Navigation - FORCED LARGE */}
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
                  e.target.style.color = 'white';
                  e.target.style.backgroundColor = '#475569';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.color = canGoPrev ? '#94a3b8' : '#475569';
                e.target.style.backgroundColor = 'transparent';
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
                  e.target.style.color = 'white';
                  e.target.style.backgroundColor = '#475569';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.color = canGoNext ? '#94a3b8' : '#475569';
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              ›
            </button>
          </div>
        </div>

        {/* Reading Content - FORCED MARGINS */}
        <div 
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            borderRadius: '24px',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            padding: '48px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
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
          
          {/* Book Text with FORCED LARGE margins */}
          <div style={{ 
            maxWidth: '900px', 
            margin: '0 auto', 
            padding: '32px 80px' 
          }}>
            <VocabularyHighlighter 
              text={currentContent}
              eslLevel={eslLevel}
              mode={currentMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}