'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { motion } from 'framer-motion';
import { AudioPlayer } from '@/components/AudioPlayer';

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
  const [readingProgress, setReadingProgress] = useState<number>(0);

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
        const response = await fetch(`/api/books/${bookId}/content?chunks=true`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch book content');
        }
        
        const data = await response.json();
        setBookContent(data);
        
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
      announceToScreenReader(`Navigated to page ${chunkIndex + 1} of ${bookContent.totalChunks}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{
        backgroundColor: '#fafafa',
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(255, 219, 112, 0.1) 0%, transparent 50%)
        `,
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error loading book</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/library')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  if (!bookContent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No content available for this book.</p>
          <button
            onClick={() => router.push('/library')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-4"
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
      className={`min-h-screen ${getBackgroundClass()}`}
      style={{
        backgroundColor: '#fafafa',
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 40% 20%, rgba(255, 219, 112, 0.05) 0%, transparent 50%)
        `
      }}
    >
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        style={{
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ x: -4, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/library')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'white',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#4a5568',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.backgroundColor = '#f8faff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <span>←</span>
              <span>Back to Library</span>
            </motion.button>
            
            <motion.div 
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-center"
            >
              <h1 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '4px',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>{bookContent.title}</h1>
              <p style={{
                fontSize: '14px',
                color: '#4a5568',
                fontWeight: '500',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>by {bookContent.author}</p>
            </motion.div>
            
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              style={{
                fontSize: '14px',
                color: '#4a5568',
                fontWeight: '500',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                textAlign: 'right'
              }}
            >
              Page {currentChunk + 1} of {bookContent.totalChunks}
              <div style={{
                marginTop: '8px',
                width: '80px',
                height: '4px',
                backgroundColor: '#e2e8f0',
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
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 20px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            minHeight: '400px'
          }}
        >
          <div 
            className={`whitespace-pre-wrap leading-relaxed ${
              preferences.contrast === 'high' ? 'text-black bg-white' :
              preferences.contrast === 'ultra-high' ? 'text-white bg-black' :
              'text-gray-900'
            }`}
            style={{
              fontSize: `${preferences.fontSize}px`,
              lineHeight: preferences.dyslexiaFont ? '1.8' : '1.7',
              fontFamily: preferences.dyslexiaFont ? 'OpenDyslexic, Arial, sans-serif' : '"Inter", "Georgia", serif'
            }}
            role="main"
            aria-label="Book content"
            tabIndex={0}
          >
            {currentChunkData?.content || 'No content available for this section.'}
          </div>
        </motion.div>
        
        {/* Audio Player Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          style={{
            marginTop: '24px',
            padding: '24px',
            background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}
        >
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#4a5568',
            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
          }}>
            Listen to this chapter
          </h3>
          <AudioPlayer 
            text={currentChunkData?.content || ''}
            onStart={() => announceToScreenReader('Started reading chapter')}
            onEnd={() => announceToScreenReader('Finished reading chapter')}
          />
        </motion.div>
      </motion.div>

      {/* Navigation Controls */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        style={{
          background: 'white',
          borderTop: '1px solid #e2e8f0',
          position: 'sticky',
          bottom: 0,
          boxShadow: '0 -1px 3px rgba(0, 0, 0, 0.1)'
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
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#4a5568',
                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
              }}>Go to page:</span>
              <select
                value={currentChunk}
                onChange={(e) => goToChunk(parseInt(e.target.value))}
                style={{
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                  backgroundColor: 'white',
                  color: '#2d3748',
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
                aria-label="Jump to page"
              >
                {Array.from({ length: bookContent.totalChunks }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
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
    </motion.div>
  );
}