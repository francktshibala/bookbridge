'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VirtualizedReader } from './VirtualizedReader';
import { GaplessAudioManager } from '@/lib/audio/GaplessAudioManager';
import { MobilePerformanceMonitor } from '@/lib/monitoring/MobilePerformanceMonitor';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useFeatureFlags } from '@/lib/feature-flags';

interface Sentence {
  id: string;
  text: string;
  audioUrl: string;
  startIndex: number;
  endIndex: number;
}

interface TestBookData {
  bookId: string;
  title: string;
  author: string;
  sentences: Sentence[];
  currentLevel: string;
}

interface TestBookContinuousReaderProps {
  bookId: string;
  initialLevel?: string;
}

export function TestBookContinuousReader({
  bookId,
  initialLevel = 'original'
}: TestBookContinuousReaderProps) {
  const [bookData, setBookData] = useState<TestBookData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSentenceId, setCurrentSentenceId] = useState<string | undefined>();
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mobile detection and feature flags
  const isMobile = useIsMobile();
  const featureFlags = useFeatureFlags({ deviceType: isMobile ? 'mobile' : 'desktop' });

  // Audio and performance management
  const audioManagerRef = useRef<GaplessAudioManager | undefined>(undefined);
  const performanceMonitorRef = useRef<MobilePerformanceMonitor | undefined>(undefined);
  const isPlayingRef = useRef<boolean>(false);

  // Load book data and sentences
  const loadBookData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`📚 Loading test book: ${bookId} (${initialLevel})`);

      // Fetch sentence-level audio from database
      const response = await fetch(`/api/test-book/sentences?bookId=${bookId}&level=${initialLevel}`);

      if (!response.ok) {
        // If level doesn't exist (like A2/B1), fallback to original
        if (response.status === 404 && initialLevel !== 'original') {
          console.warn(`Level ${initialLevel} not found, falling back to original`);
          const fallbackResponse = await fetch(`/api/test-book/sentences?bookId=${bookId}&level=original`);
          if (!fallbackResponse.ok) {
            throw new Error(`Failed to load book data: ${fallbackResponse.statusText}`);
          }
          const fallbackData = await fallbackResponse.json();

          // Transform sentences for continuous reading
          const sentences: Sentence[] = fallbackData.sentences.map((s: any, index: number) => ({
            id: `${bookId}-original-sentence-${index}`,
            text: s.text || s.sentence_text || '',
            audioUrl: s.audio_url || s.audioUrl || '',
            startIndex: index * 50,
            endIndex: (index + 1) * 50
          }));

          const testBookData: TestBookData = {
            bookId,
            title: fallbackData.title + ` (${initialLevel} level not available - showing original)`,
            author: fallbackData.author,
            sentences,
            currentLevel: 'original'
          };

          setBookData(testBookData);
          console.log(`✅ Loaded ${sentences.length} sentences (fallback to original)`);
          return;
        }
        throw new Error(`Failed to load book data: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.sentences) {
        throw new Error('Invalid book data received');
      }

      // Transform sentences for continuous reading
      const sentences: Sentence[] = data.sentences.map((s: any, index: number) => ({
        id: `${bookId}-${initialLevel}-sentence-${index}`,
        text: s.text || s.sentence_text || '',
        audioUrl: s.audio_url || s.audioUrl || '',
        startIndex: index * 50, // Approximate character positions
        endIndex: (index + 1) * 50
      }));

      const testBookData: TestBookData = {
        bookId,
        title: data.title || 'Test Book',
        author: data.author || 'Test Author',
        sentences,
        currentLevel: initialLevel
      };

      setBookData(testBookData);
      console.log(`✅ Loaded ${sentences.length} sentences for continuous reading`);

    } catch (error) {
      console.error('Failed to load test book:', error);
      setError(error instanceof Error ? error.message : 'Failed to load book');
    } finally {
      setIsLoading(false);
    }
  }, [bookId, initialLevel]);

  // Initialize audio and performance monitoring
  useEffect(() => {
    if (!bookData) return;

    // Initialize managers
    if (!audioManagerRef.current) {
      audioManagerRef.current = new GaplessAudioManager({ duration: 25, curve: 'linear' });
    }

    if (!performanceMonitorRef.current) {
      performanceMonitorRef.current = new MobilePerformanceMonitor();
      performanceMonitorRef.current.startMonitoring();
    }

    return () => {
      audioManagerRef.current?.destroy();
      audioManagerRef.current = undefined;
      performanceMonitorRef.current?.destroy();
      performanceMonitorRef.current = undefined;
    };
  }, [bookData]);

  // Handle sentence audio playback
  const handleSentencePlay = useCallback(async (sentenceId: string) => {
    if (!audioManagerRef.current || !bookData) {
      console.warn(`❌ Cannot play: audioManager=${!!audioManagerRef.current}, bookData=${!!bookData}`);
      return;
    }

    const sentence = bookData.sentences.find(s => s.id === sentenceId);
    if (!sentence?.audioUrl) {
      console.warn(`❌ No audio URL for sentence: ${sentenceId}`);
      return;
    }

    try {
      const currentIndex = bookData.sentences.findIndex(s => s.id === sentenceId);
      console.log(`🎵 Playing sentence ${currentIndex + 1}/${bookData.sentences.length}: ${sentence.text.substring(0, 50)}...`);
      console.log(`🎵 Audio URL: ${sentence.audioUrl}`);

      // Update current sentence
      setCurrentSentenceId(sentenceId);
      setCurrentWordIndex(0);

      // Play audio through gapless manager
      await audioManagerRef.current.playAudio(sentence.audioUrl, {
        onProgress: (progress) => {
          // Update word highlighting based on progress
          const sentenceWords = sentence.text.split(' ');
          const currentWordInSentence = Math.floor(progress * sentenceWords.length);

          // Calculate global word index
          const currentSentenceIndex = bookData.sentences.findIndex(s => s.id === sentenceId);
          let globalWordIndex = 0;

          // Add words from all previous sentences
          for (let i = 0; i < currentSentenceIndex; i++) {
            globalWordIndex += bookData.sentences[i].text.split(' ').length;
          }

          // Add current position within this sentence
          globalWordIndex += currentWordInSentence;

          console.log(`🔍 Progress: ${Math.round(progress * 100)}%, Word ${currentWordInSentence}/${sentenceWords.length}, Global: ${globalWordIndex}`);
          setCurrentWordIndex(globalWordIndex);
        },
        onComplete: () => {
          console.log(`🎵 Sentence completed: ${sentenceId}`);

          // Move to next sentence automatically
          const currentIndex = bookData.sentences.findIndex(s => s.id === sentenceId);
          const nextSentence = bookData.sentences[currentIndex + 1];

          console.log(`📍 Current index: ${currentIndex}, Next sentence exists: ${!!nextSentence}, Still playing: ${isPlayingRef.current}`);

          if (nextSentence && isPlayingRef.current) {
            console.log(`🔄 Auto-playing next sentence: ${nextSentence.text.substring(0, 30)}...`);
            setTimeout(() => handleSentencePlay(nextSentence.id), 100); // Small delay for smoother transition
          } else {
            console.log(`⏹️ Playback complete - no more sentences or stopped`);
            setIsPlaying(false);
            isPlayingRef.current = false;
            setCurrentWordIndex(-1);
          }
        }
      });

    } catch (error) {
      console.error('Failed to play sentence audio:', error);
    }
  }, [bookData, isPlaying]);

  // Play/pause controls
  const handlePlayPause = useCallback(() => {
    if (!bookData || bookData.sentences.length === 0) return;

    if (isPlaying) {
      // Pause
      console.log(`⏸️ Pausing playback`);
      setIsPlaying(false);
      isPlayingRef.current = false;
      audioManagerRef.current?.pause();
    } else {
      // Start/resume playing
      console.log(`▶️ Starting playback`);
      setIsPlaying(true);
      isPlayingRef.current = true;

      // Start from current sentence or first sentence
      const startSentence = currentSentenceId
        ? bookData.sentences.find(s => s.id === currentSentenceId)
        : bookData.sentences[0];

      if (startSentence) {
        handleSentencePlay(startSentence.id);
      }
    }
  }, [isPlaying, currentSentenceId, bookData, handleSentencePlay]);

  // Load book data on mount
  useEffect(() => {
    loadBookData();
  }, [loadBookData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading test book...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !bookData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Test Book</h3>
          <p className="text-gray-600 mb-4">{error || 'Unknown error'}</p>
          <button
            onClick={loadBookData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Convert sentences to paragraph format for VirtualizedReader
  let currentIndex = 0;
  const fullText = bookData.sentences.map(s => s.text).join(' ');

  const paragraphs = [{
    id: `${bookData.bookId}-continuous`,
    content: fullText,
    sentences: bookData.sentences.map((sentence, index) => {
      const sentenceLength = sentence.text.length;
      const startIndex = currentIndex;
      const endIndex = currentIndex + sentenceLength;
      currentIndex = endIndex + 1; // +1 for the space

      return {
        id: sentence.id,
        text: sentence.text,
        startIndex: startIndex,
        endIndex: endIndex,
        audioUrl: sentence.audioUrl,
        wordTimings: [] // TODO: Add precise word timings
      };
    }),
    chunkIndex: 0,
    paragraphIndex: 0
  }];

  return (
    <div className="test-book-continuous-reader">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{bookData.title}</h1>
        <p className="text-gray-600">by {bookData.author}</p>
        <p className="text-sm text-gray-500 mt-2">
          Continuous Reading Test • {bookData.sentences.length} sentences • Level: {bookData.currentLevel.toUpperCase()}
        </p>
      </div>

      {/* Audio Controls */}
      <div className={`mb-6 flex justify-center ${isMobile ? 'px-4' : ''}`}>
        <div className={`flex items-center bg-white rounded-lg shadow-sm border ${
          isMobile ? 'w-full max-w-md p-3 space-x-3' : 'space-x-4 p-4'
        }`}>
          <button
            onClick={handlePlayPause}
            className={`flex items-center justify-center rounded-full transition-colors touch-manipulation ${
              isMobile ? 'w-14 h-14 text-lg' : 'w-12 h-12'
            } ${
              isPlaying
                ? 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white'
            }`}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>

          <div className={`text-gray-600 flex-1 ${isMobile ? 'text-sm' : 'text-sm'}`}>
            <div className="font-medium">{isPlaying ? 'Playing' : 'Paused'}</div>
            <div className="text-xs opacity-75">
              Sentence {currentSentenceId ?
                bookData.sentences.findIndex(s => s.id === currentSentenceId) + 1 : 0}
              of {bookData.sentences.length}
            </div>
          </div>

          {/* Mobile-specific speed control */}
          {isMobile && (
            <button className="text-xs bg-gray-100 px-2 py-1 rounded-md">
              1x
            </button>
          )}
        </div>
      </div>

      {/* Continuous Reading Content */}
      <div className={`continuous-reading-container ${isMobile ? 'mobile' : 'desktop'}`}>
        <VirtualizedReader
          paragraphs={paragraphs}
          currentSentenceId={currentSentenceId}
          highlightedWordIndex={currentWordIndex}
          onSentenceVisible={(sentenceId) => {
            // Auto-scroll to visible sentence
            console.log(`📍 Sentence visible: ${sentenceId}`);
            console.log(`📍 Current playing sentence: ${currentSentenceId}`);
          }}
          onWordClick={() => {}} // No word clicking in test mode
          eslLevel="original" // Required prop
          className={`virtualized-reader ${isMobile ? 'mobile-reader' : 'desktop-reader'}`}
        />
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
          <h4 className="font-semibold mb-2">Debug Info:</h4>
          <p>Book ID: {bookData.bookId}</p>
          <p>Level: {bookData.currentLevel}</p>
          <p>Sentences: {bookData.sentences.length}</p>
          <p>Current Sentence: {currentSentenceId || 'None'}</p>
          <p>Word Index: {currentWordIndex}</p>
          <p>Playing: {isPlaying ? 'Yes' : 'No'}</p>
          <p>Mobile: {isMobile ? 'Yes' : 'No'}</p>
          <p>Sentences Count: {bookData.sentences.length}</p>
          <p>VirtualizedScrolling: {featureFlags.virtualizedScrolling ? 'Yes' : 'No'}</p>
          <p>Paragraph count: {paragraphs.length}</p>
          <p>First paragraph sentences: {paragraphs[0]?.sentences.length}</p>
        </div>
      )}
    </div>
  );
}