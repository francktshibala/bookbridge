'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { motion } from 'framer-motion';
import { SmartAudioPlayer } from '@/components/SmartAudioPlayer';
import { ESLAudioPlayer } from '@/components/ESLAudioPlayer';
import { ESLControls } from '@/components/esl/ESLControls';
import { SplitScreenView } from '@/components/esl/SplitScreenView';
import { ClickableText } from '@/components/esl/ClickableText';
import { AIChat } from '@/components/AIChat';
import { useESLMode } from '@/hooks/useESLMode';

interface BookContent {
  id: string;
  title: string;
  author: string;
  chunks: Array<{
    chunkIndex: number;
    content: string;
    sections?: Array<{
      title: string;
      content: string;
      startIndex: number;
    }>;
  }>;
  totalChunks: number;
}

export default function BookReaderPage() {
  const params = useParams();
  const router = useRouter();
  const { preferences, announceToScreenReader } = useAccessibility();
  const { eslEnabled, eslLevel, nativeLanguage, isLoading: eslLoading } = useESLMode();
  const [bookContent, setBookContent] = useState<BookContent | null>(null);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [sections, setSections] = useState<Array<{title: string; content: string; startIndex: number}>>([]);
  const [displayMode, setDisplayMode] = useState<'original' | 'simplified'>('original');
  const [showSplitScreen, setShowSplitScreen] = useState(false);
  const [enableVocabulary, setEnableVocabulary] = useState(true);
  const [learnedWords, setLearnedWords] = useState<Set<string>>(new Set());
  const [showAIChat, setShowAIChat] = useState(false);

  const bookId = params.id as string;

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push('/auth/login');
        return;
      }
      
      setUser(user);
    }
    
    checkAuth();
  }, [router]);

  useEffect(() => {
    async function fetchBookContent() {
      if (!user || !bookId) return;
      
      try {
        setLoading(true);
        
        // Check if this is an external book (from public domain sources)
        const isExternalBook = bookId.includes('-') && 
          ['gutenberg', 'openlibrary', 'standardebooks', 'googlebooks'].some(source => 
            bookId.startsWith(source + '-')
          );
        
        let response: Response;
        
        if (isExternalBook) {
          // Use external book API for public domain books
          response = await fetch(`/api/books/external/${bookId}`);
        } else {
          // Use internal book API for uploaded books
          response = await fetch(`/api/books/${bookId}/content?chunks=true`);
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch book content');
        }
        
        const data = await response.json();
        let finalData;
        
        // Transform external book response to match internal format
        if (isExternalBook) {
          // For external books, use enhanced chapter detection on full content
          const bookStructure = detectBookStructure(data.content);
          
          // Create chunks based on detected chapters/sections
          const chunks = bookStructure.map((section, index) => ({
            chunkIndex: index,
            content: section.content,
            sections: [section] // Each chunk now contains one meaningful section
          }));
          
          // Ensure at least one chunk
          if (chunks.length === 0) {
            chunks.push({
              chunkIndex: 0,
              content: data.content,
              sections: []
            });
          }
          
          finalData = {
            id: data.book.id,
            title: data.book.title,
            author: data.book.author,
            chunks,
            totalChunks: chunks.length
          };
          setBookContent(finalData);
          
          // Set sections from the book structure
          setSections(bookStructure);
        } else {
          finalData = data;
          setBookContent(data);
          
          // For internal books, use existing section detection
          if (finalData.chunks && finalData.chunks.length > 0) {
            const detectedSections = detectBookStructure(finalData.chunks[currentChunk]?.content || '');
            setSections(detectedSections);
          }
        }
        
        // Load reading progress from localStorage
        const progressKey = `reading-progress-${bookId}`;
        const savedProgress = localStorage.getItem(progressKey);
        if (savedProgress) {
          const progress = parseInt(savedProgress);
          setCurrentChunk(progress);
          setReadingProgress(progress);
          announceToScreenReader(`Resumed reading from page ${progress + 1}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchBookContent();
  }, [bookId, user]);

  // Save reading progress to localStorage
  const saveProgress = (chunkIndex: number) => {
    const progressKey = `reading-progress-${bookId}`;
    localStorage.setItem(progressKey, chunkIndex.toString());
    setReadingProgress(chunkIndex);
  };

  const nextChunk = () => {
    if (bookContent && currentChunk < bookContent.totalChunks - 1) {
      const newChunk = currentChunk + 1;
      setCurrentChunk(newChunk);
      saveProgress(newChunk);
      announceToScreenReader(`Page ${newChunk + 1} of ${bookContent.totalChunks}`);
    }
  };

  const prevChunk = () => {
    if (currentChunk > 0 && bookContent) {
      const newChunk = currentChunk - 1;
      setCurrentChunk(newChunk);
      saveProgress(newChunk);
      announceToScreenReader(`Page ${newChunk + 1} of ${bookContent.totalChunks}`);
    }
  };

  const goToChunk = (chunkIndex: number) => {
    if (bookContent && chunkIndex >= 0 && chunkIndex < bookContent.totalChunks) {
      setCurrentChunk(chunkIndex);
      saveProgress(chunkIndex);
      
      // For external books, each chunk is a chapter/section
      const isExternalBook = bookId.includes('-') && 
        ['gutenberg', 'openlibrary', 'standardebooks', 'googlebooks'].some(source => 
          bookId.startsWith(source + '-')
        );
      
      if (isExternalBook && bookContent.chunks[chunkIndex]?.sections) {
        // External books: each chunk has its section
        const chunkSections = bookContent.chunks[chunkIndex].sections;
        setSections(chunkSections);
        setCurrentSection(0);
        const sectionTitle = chunkSections[0]?.title || `Chapter ${chunkIndex + 1}`;
        announceToScreenReader(`Navigated to ${sectionTitle}`);
      } else {
        // Internal books: re-detect sections for new chunk
        const detectedSections = detectBookStructure(bookContent.chunks[chunkIndex]?.content || '');
        setSections(detectedSections);
        setCurrentSection(0);
        announceToScreenReader(`Navigated to page ${chunkIndex + 1} of ${bookContent.totalChunks}`);
      }
    }
  };

  // Clean content by removing Project Gutenberg headers and footers
  const cleanPublicDomainContent = (content: string): string => {
    let cleaned = content;
    
    // Remove Project Gutenberg header (everything before "*** START OF")
    const startMarker = /\*\*\*\s*START OF (THE )?PROJECT GUTENBERG/i;
    const startMatch = cleaned.search(startMarker);
    if (startMatch !== -1) {
      // Find the end of the header line
      const headerEnd = cleaned.indexOf('\n', startMatch);
      if (headerEnd !== -1) {
        cleaned = cleaned.substring(headerEnd + 1);
      }
    }
    
    // Remove Project Gutenberg footer (everything after "*** END OF")
    const endMarker = /\*\*\*\s*END OF (THE )?PROJECT GUTENBERG/i;
    const endMatch = cleaned.search(endMarker);
    if (endMatch !== -1) {
      cleaned = cleaned.substring(0, endMatch);
    }
    
    // Remove common metadata patterns
    cleaned = cleaned
      // Remove excessive line breaks
      .replace(/\n{4,}/g, '\n\n\n')
      // Remove "Produced by..." lines
      .replace(/^Produced by.*$/gm, '')
      // Remove copyright notices
      .replace(/^Copyright.*$/gm, '')
      // Remove transcriber notes
      .replace(/^\[Transcriber.*?\]$/gm, '')
      .trim();
    
    return cleaned;
  };

  // Enhanced chapter and section detection for public domain books
  const detectBookStructure = (content: string) => {
    const cleanedContent = cleanPublicDomainContent(content);
    const sections = [];
    
    // Enhanced chapter patterns
    const chapterPatterns = [
      /^\s*CHAPTER\s+[IVXLCDM]+\.?\s*$/mi,           // CHAPTER I, II, etc.
      /^\s*CHAPTER\s+\d+\.?\s*$/mi,                  // CHAPTER 1, 2, etc.
      /^\s*Chapter\s+[IVXLCDM]+\.?\s*$/mi,          // Chapter I, II, etc.
      /^\s*Chapter\s+\d+\.?\s*$/mi,                 // Chapter 1, 2, etc.
      /^\s*PART\s+[IVXLCDM]+\.?\s*$/mi,             // PART I, II, etc.
      /^\s*PART\s+\d+\.?\s*$/mi,                    // PART 1, 2, etc.
      /^\s*Book\s+[IVXLCDM]+\.?\s*$/mi,             // Book I, II, etc.
      /^\s*Book\s+\d+\.?\s*$/mi,                    // Book 1, 2, etc.
      /^\s*[IVXLCDM]+\.?\s*$/m,                     // Just Roman numerals: I., II., etc.
      /^\s*\d+\.?\s*$/m                             // Just numbers: 1., 2., etc.
    ];
    
    const lines = cleanedContent.split('\n');
    let currentSection = '';
    let sectionTitle = '';
    let sectionIndex = 0;
    let chapterCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        currentSection += '\n';
        continue;
      }
      
      // Check if this line matches any chapter pattern
      const isChapterHeader = chapterPatterns.some(pattern => pattern.test(line));
      
      // Also check for common section headers
      const isSectionHeader = !isChapterHeader && (
        line.length < 100 && 
        (line === line.toUpperCase() && line.length > 3) ||
        /^(PART|SECTION|PROLOGUE|EPILOGUE|PREFACE|INTRODUCTION|CONCLUSION)\s*$/i.test(line) ||
        line.endsWith(':') && line.length < 50
      );
      
      const isHeader = isChapterHeader || isSectionHeader;
      
      if (isHeader && currentSection.trim().length > 200) {
        // Save previous section
        sections.push({
          title: sectionTitle || `Section ${sections.length + 1}`,
          content: currentSection.trim(),
          startIndex: sectionIndex
        });
        
        // Start new section
        if (isChapterHeader) {
          chapterCount++;
          sectionTitle = line || `Chapter ${chapterCount}`;
        } else {
          sectionTitle = line || `Section ${sections.length + 1}`;
        }
        currentSection = '';
        sectionIndex = i;
      } else if (isHeader && !sectionTitle) {
        if (isChapterHeader) {
          chapterCount++;
          sectionTitle = line || `Chapter ${chapterCount}`;
        } else {
          sectionTitle = line;
        }
      } else {
        currentSection += line + '\n';
      }
      
      // Auto-split very long sections (but prefer chapter breaks)
      if (currentSection.length > 3000 && !isChapterHeader && i < lines.length - 1) {
        // Look ahead for a natural break (paragraph end)
        let splitPoint = i;
        for (let j = i; j < Math.min(i + 20, lines.length); j++) {
          if (!lines[j].trim()) {
            splitPoint = j;
            break;
          }
        }
        
        sections.push({
          title: sectionTitle || `Section ${sections.length + 1}`,
          content: currentSection.trim(),
          startIndex: sectionIndex
        });
        
        sectionTitle = '';
        currentSection = '';
        sectionIndex = splitPoint + 1;
        i = splitPoint;
      }
    }
    
    // Add final section
    if (currentSection.trim()) {
      sections.push({
        title: sectionTitle || `Section ${sections.length + 1}`,
        content: currentSection.trim(),
        startIndex: sectionIndex
      });
    }
    
    // If we found good chapter structure, return it; otherwise fall back to smart paragraphs
    if (chapterCount >= 2) {
      console.log(`✅ Detected ${chapterCount} chapters in book`);
      return sections;
    } else {
      console.log(`📖 No clear chapters found, using smart section detection`);
      return sections.length > 1 ? sections : [{
        title: 'Full Content',
        content: cleanedContent,
        startIndex: 0
      }];
    }
  };

  const goToSection = (sectionIndex: number) => {
    if (sectionIndex >= 0 && sectionIndex < sections.length) {
      setCurrentSection(sectionIndex);
      announceToScreenReader(`Navigated to ${sections[sectionIndex].title}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%)',
        backgroundAttachment: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ textAlign: 'center', padding: '64px 0' }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #667eea',
              margin: '0 auto 16px auto'
            }}
          />
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{
              color: '#4a5568',
              fontSize: '16px',
              fontWeight: '500',
              fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
            }}
          >
            Loading book content...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%)',
        backgroundAttachment: 'fixed'
      }}>
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4 font-semibold">Error loading book</div>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => router.push('/library')}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  if (!bookContent) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%)',
        backgroundAttachment: 'fixed'
      }}>
        <div className="text-center">
          <p className="text-gray-300 mb-4">No content available for this book.</p>
          <button
            onClick={() => router.push('/library')}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  const currentChunkData = bookContent.chunks[currentChunk];

  // Get dynamic background based on contrast preference
  const getBackgroundClass = () => {
    switch (preferences.contrast) {
      case 'high':
        return 'bg-white';
      case 'ultra-high':
        return 'bg-black';
      default:
        return 'bg-white';
    }
  };

  const getHeaderClass = () => {
    switch (preferences.contrast) {
      case 'high':
        return 'bg-gray-100 border-gray-300';
      case 'ultra-high':
        return 'bg-gray-900 border-gray-700';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextClass = () => {
    switch (preferences.contrast) {
      case 'high':
        return 'text-black';
      case 'ultra-high':
        return 'text-white';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1419 100%)',
        backgroundAttachment: 'fixed',
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(59, 130, 246, 0.06) 0%, transparent 50%)
        `
      }}
    >
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        style={{
          background: 'rgba(26, 32, 44, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(102, 126, 234, 0.2)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(102, 126, 234, 0.1)'
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
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
              
              <motion.button
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAIChat(!showAIChat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: showAIChat ? 
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                    'rgba(45, 55, 72, 0.8)',
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
                  if (!showAIChat) {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
                  }
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  if (!showAIChat) {
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                    e.currentTarget.style.backgroundColor = 'rgba(45, 55, 72, 0.8)';
                  }
                  e.currentTarget.style.transform = 'translateY(0px)';
                }}
              >
                <span>🤖</span>
                <span>{showAIChat ? 'Hide AI Chat' : 'AI Chat'}</span>
                {eslEnabled && eslLevel && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    background: 'rgba(16, 185, 129, 0.3)',
                    borderRadius: '10px',
                    color: '#10b981'
                  }}>
                    ESL
                  </span>
                )}
              </motion.button>
            </div>
            
            <motion.div 
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-center flex-1"
            >
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
              
              {/* ESL Mode Indicator with Split View Button */}
              {eslEnabled && eslLevel && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  style={{
                    marginTop: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: '#10b981',
                    fontWeight: '600'
                  }}>
                    <span>📚</span>
                    <span>ESL Mode Active • Level {eslLevel}</span>
                  </div>
                  
                  <button
                    onClick={() => setShowSplitScreen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                      border: '1px solid rgba(102, 126, 234, 0.4)',
                      borderRadius: '20px',
                      fontSize: '12px',
                      color: '#a78bfa',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.4)';
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)';
                    }}
                  >
                    <span>🔀</span>
                    <span>Split View</span>
                  </button>
                  
                  <button
                    onClick={() => setEnableVocabulary(!enableVocabulary)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      background: enableVocabulary ? 
                        'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.3) 100%)' :
                        'rgba(107, 114, 128, 0.2)',
                      border: `1px solid ${enableVocabulary ? 'rgba(59, 130, 246, 0.5)' : 'rgba(107, 114, 128, 0.4)'}`,
                      borderRadius: '20px',
                      fontSize: '12px',
                      color: enableVocabulary ? '#60a5fa' : '#9ca3af',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={enableVocabulary ? 'Click words for definitions' : 'Enable word lookup'}
                  >
                    <span>📖</span>
                    <span>Vocabulary {enableVocabulary ? 'ON' : 'OFF'}</span>
                  </button>
                </motion.div>
              )}
            </motion.div>
            
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
          </div>
        </div>
      </motion.div>

      {/* Reading Content */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="max-w-4xl mx-auto px-4 py-8"
      >
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
            {enableVocabulary ? (
              <ClickableText
                text={sections.length > 0 && sections[currentSection] ? 
                  sections[currentSection].content : 
                  currentChunkData?.content || 'No content available for this section.'}
                eslEnabled={eslEnabled}
                eslLevel={eslLevel || undefined}
                nativeLanguage={nativeLanguage || undefined}
                onWordLearned={(word) => {
                  setLearnedWords(prev => new Set(prev).add(word));
                  announceToScreenReader(`Added "${word}" to learning list`);
                }}
              />
            ) : (
              sections.length > 0 && sections[currentSection] ? 
                sections[currentSection].content : 
                currentChunkData?.content || 'No content available for this section.'
            )}
          </div>
        </motion.div>
        
        {/* Section Navigation */}
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

        {/* AI Chat Section */}
        {showAIChat && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              marginTop: '24px',
              height: '600px',
              borderRadius: '20px',
              overflow: 'hidden',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            <AIChat 
              bookId={bookId}
              bookTitle={bookContent.title}
              bookContext={`${bookContent.title} by ${bookContent.author} - Currently reading: ${sections[currentSection]?.title || `Page ${currentChunk + 1}`}`}
            />
          </motion.div>
        )}

        {/* Audio Player Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          style={{
            marginTop: '24px',
            padding: '24px',
            background: 'rgba(45, 55, 72, 0.6)',
            backdropFilter: 'blur(15px)',
            borderRadius: '16px',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}
        >
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#cbd5e0',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
          }}>
            Listen to this {sections.length > 1 ? 'section' : 'page'}
            {eslEnabled && eslLevel && (
              <span style={{ 
                marginLeft: '8px', 
                fontSize: '14px', 
                color: '#a0aec0',
                fontWeight: '400'
              }}>
                (ESL Mode: {eslLevel})
              </span>
            )}
          </h3>
          
          {/* Always show audio player, but with different modes */}
          {eslEnabled && eslLevel ? (
            <ESLAudioPlayer 
              text={sections.length > 0 && sections[currentSection] ? 
                sections[currentSection].content : 
                currentChunkData?.content || ''}
              bookId={bookId}
              onStart={() => announceToScreenReader(`Started reading ${sections.length > 1 ? sections[currentSection]?.title || 'section' : 'page'} in ESL mode`)}
              onEnd={() => announceToScreenReader(`Finished reading ${sections.length > 1 ? sections[currentSection]?.title || 'section' : 'page'}`)}
              onWordHighlight={(wordIndex) => {
                // Highlight word in the reading text
                const textElement = document.getElementById('book-reading-text');
                if (textElement) {
                  const words = textElement.innerText.split(/\s+/);
                  // Clear previous highlights
                  textElement.innerHTML = words.map((word, idx) => {
                    if (idx === wordIndex) {
                      return `<span style="background-color: #fef3c7; padding: 2px 4px; border-radius: 4px;">${word}</span>`;
                    }
                    return word;
                  }).join(' ');
                }
              }}
            />
          ) : (
            <>
              <SmartAudioPlayer 
                text={sections.length > 0 && sections[currentSection] ? 
                  sections[currentSection].content : 
                  currentChunkData?.content || ''}
                enableHighlighting={true}
                showHighlightedText={false}
                targetElementId="book-reading-text"
                variant="reading"
                onStart={() => announceToScreenReader(`Started reading ${sections.length > 1 ? sections[currentSection]?.title || 'section' : 'page'}`)}
                onEnd={() => announceToScreenReader(`Finished reading ${sections.length > 1 ? sections[currentSection]?.title || 'section' : 'page'}`)}
              />
              
              {/* ESL Mode Prompt */}
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '2px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '14px',
                  color: '#a5b4fc',
                  margin: '0 0 12px 0',
                  fontWeight: '500'
                }}>
                  🎓 Want ESL learning features like simplified text and pronunciation guidance?
                </p>
                <p style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  margin: 0
                }}>
                  Click the ESL Controls button above to enable ESL mode
                </p>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Navigation Controls */}
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
              onClick={prevChunk}
              disabled={currentChunk === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: currentChunk === 0 ? '#f7fafc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: currentChunk === 0 ? '#a0aec0' : 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                cursor: currentChunk === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              aria-label="Previous page"
            >
              <span>←</span>
              <span>Previous</span>
            </motion.button>

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.3 }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
            >
{(() => {
                const isExternalBook = bookId.includes('-') && 
                  ['gutenberg', 'openlibrary', 'standardebooks', 'googlebooks'].some(source => 
                    bookId.startsWith(source + '-')
                  );
                return (
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#cbd5e0',
                    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                  }}>
                    {isExternalBook ? 'Go to chapter:' : 'Go to page:'}
                  </span>
                );
              })()}
              <select
                value={currentChunk}
                onChange={(e) => goToChunk(parseInt(e.target.value))}
                style={{
                  border: '2px solid rgba(102, 126, 234, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  backgroundColor: 'rgba(45, 55, 72, 0.8)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                }}
                aria-label="Jump to chapter or page"
              >
                {Array.from({ length: bookContent.totalChunks }, (_, i) => {
                  const isExternalBook = bookId.includes('-') && 
                    ['gutenberg', 'openlibrary', 'standardebooks', 'googlebooks'].some(source => 
                      bookId.startsWith(source + '-')
                    );
                  
                  if (isExternalBook && bookContent.chunks[i]?.sections?.[0]?.title) {
                    const chapterTitle = bookContent.chunks[i].sections[0].title;
                    return (
                      <option key={i} value={i}>
                        {chapterTitle.length > 30 ? chapterTitle.substring(0, 30) + '...' : chapterTitle}
                      </option>
                    );
                  }
                  
                  return (
                    <option key={i} value={i}>
                      {isExternalBook ? `Chapter ${i + 1}` : `Page ${i + 1}`}
                    </option>
                  );
                })}
              </select>
            </motion.div>

            <motion.button
              whileHover={{ 
                scale: currentChunk === bookContent.totalChunks - 1 ? 1 : 1.05,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.95 }}
              onClick={nextChunk}
              disabled={currentChunk === bookContent.totalChunks - 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: currentChunk === bookContent.totalChunks - 1 ? '#f7fafc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: currentChunk === bookContent.totalChunks - 1 ? '#a0aec0' : 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                cursor: currentChunk === bookContent.totalChunks - 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
              aria-label="Next page"
            >
              <span>Next</span>
              <span>→</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ESL Controls - Floating widget */}
      <ESLControls 
        userId={user?.id}
        onESLModeChange={(enabled, level) => {
          if (enabled && level) {
            announceToScreenReader(`ESL mode enabled with level ${level}`);
            // In future, this will trigger text simplification
            setDisplayMode('simplified');
          } else {
            announceToScreenReader('ESL mode disabled');
            setDisplayMode('original');
          }
        }}
        variant="floating"
      />

      {/* Split Screen View Modal */}
      {showSplitScreen && eslEnabled && eslLevel && (
        <SplitScreenView
          originalText={sections[currentSection]?.content || currentChunkData?.content || ''}
          bookId={bookId}
          eslLevel={eslLevel}
          nativeLanguage={undefined}
          onClose={() => setShowSplitScreen(false)}
        />
      )}
    </motion.div>
  );
}