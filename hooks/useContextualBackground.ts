'use client';

import { useState, useEffect, useMemo } from 'react';

interface Book {
  id: string;
  title: string;
  author: string;
  genre?: string;
  description?: string;
  publishYear?: number;
}

interface BackgroundContext {
  genre: string;
  mood: 'light' | 'dark' | 'mysterious' | 'romantic' | 'adventurous' | 'scholarly';
  intensity: 'subtle' | 'medium' | 'vivid';
}

// Map book characteristics to moods and intensity
const getMoodFromBook = (book: Book): BackgroundContext['mood'] => {
  const title = book.title.toLowerCase();
  const description = book.description?.toLowerCase() || '';
  const author = book.author.toLowerCase();
  
  // Dark/mysterious themes
  if (title.includes('dark') || title.includes('shadow') || title.includes('secret') ||
      title.includes('mystery') || title.includes('murder') || title.includes('death') ||
      description.includes('dark') || description.includes('mystery') ||
      author.includes('poe') || author.includes('doyle') || author.includes('christie')) {
    return 'mysterious';
  }
  
  // Romantic themes
  if (title.includes('love') || title.includes('heart') || title.includes('romance') ||
      title.includes('pride') || title.includes('persuasion') ||
      description.includes('love') || description.includes('romance') ||
      author.includes('austen') || author.includes('bronte')) {
    return 'romantic';
  }
  
  // Adventure themes
  if (title.includes('adventure') || title.includes('journey') || title.includes('treasure') ||
      title.includes('island') || title.includes('voyage') || title.includes('quest') ||
      description.includes('adventure') || description.includes('journey') ||
      author.includes('verne') || author.includes('stevenson')) {
    return 'adventurous';
  }
  
  // Scholarly/classic themes
  if ((book.publishYear && book.publishYear < 1900) ||
      author.includes('shakespeare') || author.includes('dickens') || 
      author.includes('twain') || author.includes('wilde') ||
      title.includes('philosophy') || title.includes('essay')) {
    return 'scholarly';
  }
  
  // Default to light for general fiction
  return 'light';
};

const getIntensityFromUserBehavior = (
  timeOnPage: number,
  interactionCount: number
): BackgroundContext['intensity'] => {
  // More engaged users get more immersive backgrounds
  if (timeOnPage > 300000 && interactionCount > 10) { // 5+ minutes, lots of interactions
    return 'vivid';
  } else if (timeOnPage > 120000 && interactionCount > 5) { // 2+ minutes, some interactions
    return 'medium';
  }
  return 'subtle';
};

export const useContextualBackground = (currentBook?: Book | null) => {
  const [sessionData, setSessionData] = useState({
    startTime: Date.now(),
    interactionCount: 0,
    lastInteraction: Date.now()
  });

  const [backgroundContext, setBackgroundContext] = useState<BackgroundContext>({
    genre: 'Fiction',
    mood: 'light',
    intensity: 'subtle'
  });

  // Track user interactions
  const trackInteraction = () => {
    setSessionData(prev => ({
      ...prev,
      interactionCount: prev.interactionCount + 1,
      lastInteraction: Date.now()
    }));
  };

  // Calculate time on page
  const timeOnPage = useMemo(() => {
    return Date.now() - sessionData.startTime;
  }, [sessionData.startTime]);

  // Update background context when book changes
  useEffect(() => {
    if (!currentBook) {
      setBackgroundContext({
        genre: 'Fiction',
        mood: 'light',
        intensity: 'subtle'
      });
      return;
    }

    const genre = currentBook.genre || 'Fiction';
    const mood = getMoodFromBook(currentBook);
    const intensity = getIntensityFromUserBehavior(timeOnPage, sessionData.interactionCount);

    setBackgroundContext({
      genre,
      mood,
      intensity
    });
  }, [currentBook, timeOnPage, sessionData.interactionCount]);

  // Auto-increase intensity over time for engaged users
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTimeOnPage = Date.now() - sessionData.startTime;
      const timeSinceLastInteraction = Date.now() - sessionData.lastInteraction;
      
      // Only increase intensity if user is still active (interacted within last 5 minutes)
      if (timeSinceLastInteraction < 300000) {
        const newIntensity = getIntensityFromUserBehavior(currentTimeOnPage, sessionData.interactionCount);
        
        setBackgroundContext(prev => ({
          ...prev,
          intensity: newIntensity
        }));
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [sessionData]);

  // Add event listeners for user interactions
  useEffect(() => {
    const handleUserInteraction = () => {
      trackInteraction();
    };

    // Track various user interactions
    const events = ['click', 'scroll', 'keydown', 'mousemove', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, []);

  return {
    backgroundContext,
    trackInteraction,
    sessionData: {
      timeOnPage: Math.floor(timeOnPage / 1000), // in seconds
      interactionCount: sessionData.interactionCount
    }
  };
};