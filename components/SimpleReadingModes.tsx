'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { VocabularyHighlighter } from './VocabularyHighlighter';

interface SimpleReadingModesProps {
  bookId: string;
  originalContent: string;
  currentChunk: number;
  eslLevel: string;
  onContentChange?: (content: string, mode: 'original' | 'simplified') => void;
}

export function SimpleReadingModes({ 
  bookId, 
  originalContent, 
  currentChunk, 
  eslLevel,
  onContentChange 
}: SimpleReadingModesProps) {
  const [mode, setMode] = useState<'original' | 'simplified'>('original');
  const [simplifiedContent, setSimplifiedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Load mode preference from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem(`reading-mode-${bookId}`);
    if (savedMode === 'simplified' || savedMode === 'original') {
      setMode(savedMode);
    }
  }, [bookId]);

  // Clear cached content when chunk changes
  useEffect(() => {
    setSimplifiedContent('');
  }, [currentChunk]);
  
  // Fetch simplified content when switching to simplified mode
  const fetchSimplifiedContent = async () => {
    if (simplifiedContent) return; // Already cached for this chunk
    
    // Check localStorage cache first for performance
    const cacheKey = `simplified-${bookId}-${currentChunk}-${eslLevel}`;
    const cachedContent = localStorage.getItem(cacheKey);
    
    if (cachedContent) {
      try {
        const cached = JSON.parse(cachedContent);
        // Check if cache is less than 1 hour old
        if (Date.now() - cached.timestamp < 3600000) {
          setSimplifiedContent(cached.content);
          return;
        }
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }
    
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      const response = await fetch(`/api/esl/books/${bookId}/simplify?level=${eslLevel}&section=${currentChunk}`, {
        headers: {
          'Cache-Control': 'max-age=3600', // 1 hour cache
        }
      });
      const data = await response.json();
      
      const responseTime = Date.now() - startTime;
      console.log(`Simplification took ${responseTime}ms (target: <2000ms)`);
      
      if (data.success) {
        setSimplifiedContent(data.content);
        
        // Cache the result locally
        localStorage.setItem(cacheKey, JSON.stringify({
          content: data.content,
          timestamp: Date.now()
        }));
      } else {
        // Fallback to original if simplification fails
        setMode('original');
        localStorage.setItem(`reading-mode-${bookId}`, 'original');
      }
    } catch (error) {
      console.error('Simplification failed:', error);
      setMode('original');
      localStorage.setItem(`reading-mode-${bookId}`, 'original');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = async (newMode: 'original' | 'simplified') => {
    setMode(newMode);
    localStorage.setItem(`reading-mode-${bookId}`, newMode);
    
    if (newMode === 'simplified') {
      await fetchSimplifiedContent();
    }
    
    const content = newMode === 'simplified' ? simplifiedContent : originalContent;
    onContentChange?.(content, newMode);
  };

  // Update content when mode changes
  useEffect(() => {
    const content = mode === 'simplified' ? simplifiedContent : originalContent;
    onContentChange?.(content, mode);
  }, [mode, simplifiedContent, originalContent, onContentChange]);

  const currentContent = mode === 'simplified' ? simplifiedContent : originalContent;

  return (
    <div className="space-y-4">
      {/* Clean Mode Toggle - Wireframe Style */}
      <div className="flex items-center gap-4">
        <div className="flex bg-gray-100 rounded-full p-1">
          <button
            onClick={() => handleModeChange('original')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
              mode === 'original' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Original
          </button>
          <button
            onClick={() => handleModeChange('simplified')}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
              mode === 'simplified' 
                ? 'bg-blue-500 text-white shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Simplified'}
          </button>
        </div>
        
        {mode === 'simplified' && (
          <div className="text-sm text-blue-600 font-medium">
            {eslLevel}
          </div>
        )}
      </div>

      {/* Content Display with Vocabulary Highlighting */}
      <div className="prose max-w-none">
        {isLoading && mode === 'simplified' ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600">Simplifying text...</span>
            </div>
          </div>
        ) : (
          <VocabularyHighlighter 
            text={currentContent || originalContent}
            eslLevel={eslLevel}
            mode={mode}
          />
        )}
      </div>
    </div>
  );
}