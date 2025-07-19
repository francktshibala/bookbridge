'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAccessibility } from '@/contexts/AccessibilityContext';

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
    if (currentChunk > 0) {
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading book content...</p>
        </div>
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
    <div className={`min-h-screen ${getBackgroundClass()}`}>
      {/* Header */}
      <div className={`${getHeaderClass()} border-b sticky top-0 z-10`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/library')}
              className={`${getTextClass()} hover:opacity-75 flex items-center space-x-2`}
            >
              <span>←</span>
              <span>Back to Library</span>
            </button>
            
            <div className="text-center">
              <h1 className={`text-lg font-semibold ${getTextClass()}`}>{bookContent.title}</h1>
              <p className={`text-sm ${getTextClass()} opacity-75`}>by {bookContent.author}</p>
            </div>
            
            <div className={`text-sm ${getTextClass()} opacity-75`}>
              Page {currentChunk + 1} of {bookContent.totalChunks}
              <div className="mt-1 w-16 bg-gray-300 rounded-full h-1">
                <div 
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${((currentChunk + 1) / bookContent.totalChunks) * 100}%` }}
                  aria-label={`Reading progress: ${Math.round(((currentChunk + 1) / bookContent.totalChunks) * 100)}%`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reading Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-lg max-w-none">
          <div 
            className={`whitespace-pre-wrap leading-relaxed ${
              preferences.contrast === 'high' ? 'text-black bg-white' :
              preferences.contrast === 'ultra-high' ? 'text-white bg-black' :
              'text-gray-900'
            }`}
            style={{
              fontSize: `${preferences.fontSize}px`,
              lineHeight: preferences.dyslexiaFont ? '1.8' : '1.6',
              fontFamily: preferences.dyslexiaFont ? 'OpenDyslexic, Arial, sans-serif' : 'inherit'
            }}
            role="main"
            aria-label="Book content"
            tabIndex={0}
          >
            {currentChunkData?.content || 'No content available for this section.'}
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className={`${getHeaderClass()} border-t sticky bottom-0`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={prevChunk}
              disabled={currentChunk === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              aria-label="Previous page"
            >
              <span>←</span>
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-2">
              <span className={`text-sm ${getTextClass()}`}>Go to page:</span>
              <select
                value={currentChunk}
                onChange={(e) => goToChunk(parseInt(e.target.value))}
                className={`border rounded px-2 py-1 text-sm ${
                  preferences.contrast === 'ultra-high' 
                    ? 'bg-gray-900 text-white border-gray-600' 
                    : 'bg-white text-black border-gray-300'
                }`}
                aria-label="Jump to page"
              >
                {Array.from({ length: bookContent.totalChunks }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={nextChunk}
              disabled={currentChunk === bookContent.totalChunks - 1}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              aria-label="Next page"
            >
              <span>Next</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}