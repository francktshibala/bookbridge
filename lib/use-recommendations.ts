'use client';

import { useEffect, useState, useCallback } from 'react';
import { ExternalBook } from '@/types/book-sources';
import { BookRecommendation, trackBookInteraction, recommendationEngine } from './recommendation-engine';

interface UseRecommendationsProps {
  userId?: string;
}

interface RecommendationResponse {
  success: boolean;
  targetBook?: {
    id: string;
    title: string;
    author: string;
    subjects: string[];
  };
  recommendations: BookRecommendation[];
  metadata?: {
    totalCandidates: number;
    sessionId: string;
    generatedAt: string;
  };
  error?: string;
}

export function useRecommendations({ userId }: UseRecommendationsProps = {}) {
  const [sessionId, setSessionId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Initialize session ID
  useEffect(() => {
    const existingSessionId = sessionStorage.getItem('bookbridge_session_id');
    if (existingSessionId) {
      setSessionId(existingSessionId);
    } else {
      const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('bookbridge_session_id', newSessionId);
      setSessionId(newSessionId);
    }
  }, []);

  // Track user interaction with a book
  const trackInteraction = useCallback((
    book: ExternalBook,
    interactionType: 'view' | 'analyze' | 'read' | 'favorite',
    additionalData?: {
      timeSpent?: number;
      analysisDepth?: number;
    }
  ) => {
    if (!sessionId) return;

    trackBookInteraction({
      userId,
      sessionId,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      bookGenres: book.subjects,
      bookSource: book.source,
      interactionType,
      ...additionalData
    });

    console.log('📊 Tracked:', interactionType, 'interaction with', book.title);
  }, [sessionId, userId]);

  // Get recommendations for a specific book
  const getRecommendations = useCallback(async (
    bookId: string,
    options: {
      limit?: number;
    } = {}
  ): Promise<RecommendationResponse> => {
    if (!sessionId) {
      return { 
        success: false, 
        recommendations: [], 
        error: 'Session not initialized' 
      };
    }

    setLoading(true);
    
    try {
      const params = new URLSearchParams({
        sessionId,
        limit: (options.limit || 8).toString()
      });

      if (userId) {
        params.append('userId', userId);
      }

      const response = await fetch(`/api/books/recommendations/${bookId}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recommendations');
      }

      return data;
    } catch (error) {
      console.error('❌ Error fetching recommendations:', error);
      return {
        success: false,
        recommendations: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setLoading(false);
    }
  }, [sessionId, userId]);

  // Get general recommendations for homepage
  const getGeneralRecommendations = useCallback(async (
    options: {
      limit?: number;
    } = {}
  ): Promise<RecommendationResponse> => {
    if (!sessionId) {
      return { 
        success: false, 
        recommendations: [], 
        error: 'Session not initialized' 
      };
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/books/recommendations/general', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userId,
          limit: options.limit || 8
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch general recommendations');
      }

      return data;
    } catch (error) {
      console.error('❌ Error fetching general recommendations:', error);
      return {
        success: false,
        recommendations: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setLoading(false);
    }
  }, [sessionId, userId]);

  return {
    sessionId,
    loading,
    trackInteraction,
    getRecommendations,
    getGeneralRecommendations,
  };
}

// Utility hook for auto-tracking book views
export function useBookViewTracking(book: ExternalBook | null, userId?: string) {
  const { trackInteraction } = useRecommendations({ userId });
  const [hasTracked, setHasTracked] = useState(false);

  useEffect(() => {
    if (book && !hasTracked) {
      // Track view after 3 seconds to ensure user is actually reading
      const timer = setTimeout(() => {
        trackInteraction(book, 'view');
        setHasTracked(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [book, hasTracked, trackInteraction]);

  // Reset tracking when book changes
  useEffect(() => {
    setHasTracked(false);
  }, [book?.id]);

  return {
    trackAnalysis: useCallback(() => {
      if (book) {
        trackInteraction(book, 'analyze');
      }
    }, [book, trackInteraction]),
    
    trackReading: useCallback((timeSpent?: number) => {
      if (book) {
        trackInteraction(book, 'read', { timeSpent });
      }
    }, [book, trackInteraction]),
    
    trackFavorite: useCallback(() => {
      if (book) {
        trackInteraction(book, 'favorite');
      }
    }, [book, trackInteraction])
  };
}