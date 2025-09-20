'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFeatureFlags } from '@/lib/feature-flags';
import { useIsMobile } from '@/hooks/useIsMobile';
import { VirtualizedReader } from './VirtualizedReader';
import { GaplessAudioManager } from '@/lib/audio/GaplessAudioManager';
import { MobilePrefetchManager } from '@/lib/prefetch/MobilePrefetchManager';
import { MobilePerformanceMonitor } from '@/lib/monitoring/MobilePerformanceMonitor';

interface BookContent {
  id: string;
  title: string;
  author: string;
  chunks: Array<{
    chunkIndex: number;
    content: string;
  }>;
  totalChunks: number;
  enhanced?: boolean;
}

interface Paragraph {
  id: string;
  content: string;
  sentences: Sentence[];
  chunkIndex: number;
  paragraphIndex: number;
}

interface Sentence {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  audioUrl?: string;
  wordTimings?: WordTiming[];
}

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
}

interface ContinuousReadingContainerProps {
  bookContent: BookContent;
  currentChunk: number;
  eslLevel: string;
  voiceProvider: 'standard' | 'openai' | 'elevenlabs';
  selectedVoice: string;
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  onChunkChange: (chunkIndex: number) => void;
  onWordHighlight: (wordIndex: number) => void;
  className?: string;
}

export const ContinuousReadingContainer: React.FC<ContinuousReadingContainerProps> = ({
  bookContent,
  currentChunk,
  eslLevel,
  voiceProvider,
  selectedVoice,
  isPlaying,
  onPlayStateChange,
  onChunkChange,
  onWordHighlight,
  className
}) => {
  const { isMobile } = useIsMobile();
  const featureFlags = useFeatureFlags({
    deviceType: isMobile ? 'mobile' : 'desktop',
    bookId: bookContent.id
  });

  // State management
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [currentSentenceId, setCurrentSentenceId] = useState<string>();
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Managers
  const audioManagerRef = useRef<GaplessAudioManager | undefined>(undefined);
  const prefetchManagerRef = useRef<MobilePrefetchManager | undefined>(undefined);
  const performanceMonitorRef = useRef<MobilePerformanceMonitor | undefined>(undefined);

  // Initialize managers
  useEffect(() => {
    if (!featureFlags.continuousReading) return;

    audioManagerRef.current = new GaplessAudioManager();
    prefetchManagerRef.current = new MobilePrefetchManager();
    performanceMonitorRef.current = new MobilePerformanceMonitor();

    // Start performance monitoring
    performanceMonitorRef.current.startMonitoring();

    return () => {
      audioManagerRef.current?.destroy();
      prefetchManagerRef.current?.destroy();
      performanceMonitorRef.current?.destroy();
    };
  }, [featureFlags.continuousReading]);

  /**
   * Convert chunks to paragraphs for virtualization
   */
  const convertChunksToParagraphs = useCallback(async () => {
    if (!bookContent.chunks.length) return;

    setLoading(true);
    const startTime = performance.now();

    try {
      const newParagraphs: Paragraph[] = [];

      for (const chunk of bookContent.chunks) {
        // Split chunk content into paragraphs
        const paragraphTexts = chunk.content
          .split(/\n\s*\n/)
          .filter(p => p.trim().length > 0);

        for (let i = 0; i < paragraphTexts.length; i++) {
          const paragraphText = paragraphTexts[i].trim();

          // Split paragraph into sentences
          const sentences = paragraphText
            .split(/(?<=[.!?])\s+/)
            .filter(s => s.trim().length > 0)
            .map((sentenceText, sentenceIndex) => {
              const sentence: Sentence = {
                id: `${chunk.chunkIndex}-${i}-${sentenceIndex}`,
                text: sentenceText.trim(),
                startIndex: 0, // Will be calculated properly in production
                endIndex: sentenceText.length,
                // Audio URL will be loaded on demand
                audioUrl: `/api/books/${bookContent.id}/sentence-audio?chunk=${chunk.chunkIndex}&paragraph=${i}&sentence=${sentenceIndex}&level=${eslLevel}&voice=${selectedVoice}`
              };

              return sentence;
            });

          const paragraph: Paragraph = {
            id: `${chunk.chunkIndex}-${i}`,
            content: paragraphText,
            sentences,
            chunkIndex: chunk.chunkIndex,
            paragraphIndex: i
          };

          newParagraphs.push(paragraph);
        }
      }

      setParagraphs(newParagraphs);

      // Track performance
      performanceMonitorRef.current?.trackChunkTransition(startTime);

      // Start prefetching
      if (featureFlags.predictivePrefetch && prefetchManagerRef.current) {
        await prefetchManagerRef.current.schedulePrefetch(
          {
            chunkIndex: currentChunk,
            paragraphIndex: 0,
            eslLevel
          },
          bookContent.id
        );
      }

    } catch (error) {
      console.error('Failed to convert chunks to paragraphs:', error);
      setError('Failed to load content for continuous reading');
    } finally {
      setLoading(false);
    }
  }, [bookContent, currentChunk, eslLevel, selectedVoice, featureFlags]);

  // Convert chunks when content changes
  useEffect(() => {
    convertChunksToParagraphs();
  }, [convertChunksToParagraphs]);

  /**
   * Handle sentence becoming visible
   */
  const handleSentenceVisible = useCallback((sentenceId: string) => {
    setCurrentSentenceId(sentenceId);

    // Find the paragraph and update current chunk if needed
    const paragraph = paragraphs.find(p =>
      p.sentences.some(s => s.id === sentenceId)
    );

    if (paragraph && paragraph.chunkIndex !== currentChunk) {
      onChunkChange(paragraph.chunkIndex);
    }
  }, [paragraphs, currentChunk, onChunkChange]);

  /**
   * Handle word click for seeking
   */
  const handleWordClick = useCallback((wordIndex: number) => {
    setHighlightedWordIndex(wordIndex);
    onWordHighlight(wordIndex);

    // TODO: Seek audio to word position
    // This would integrate with the audio manager
  }, [onWordHighlight]);

  /**
   * Handle audio playback
   */
  const handleAudioPlayback = useCallback(async () => {
    if (!audioManagerRef.current || !currentSentenceId) return;

    const currentSentence = paragraphs
      .flatMap(p => p.sentences)
      .find(s => s.id === currentSentenceId);

    if (!currentSentence?.audioUrl) return;

    const startTime = performance.now();

    try {
      if (featureFlags.gaplessAudio) {
        // Preload current and next audio
        await audioManagerRef.current.preloadAudio(currentSentence.id, currentSentence.audioUrl);

        // Find next sentence for gapless transition
        const allSentences = paragraphs.flatMap(p => p.sentences);
        const currentIndex = allSentences.findIndex(s => s.id === currentSentenceId);
        const nextSentence = allSentences[currentIndex + 1];

        if (nextSentence?.audioUrl) {
          await audioManagerRef.current.preloadAudio(nextSentence.id, nextSentence.audioUrl);
        }

        // Play with transition
        await audioManagerRef.current.playWithTransition(
          currentSentence.id,
          nextSentence?.id
        );
      } else {
        // Fallback to regular audio playback
        const audio = new Audio(currentSentence.audioUrl);
        await audio.play();
      }

      // Track performance
      performanceMonitorRef.current?.trackAudioStart(startTime);

    } catch (error) {
      console.error('Audio playback failed:', error);
      setError('Audio playback failed');
    }
  }, [audioManagerRef, currentSentenceId, paragraphs, featureFlags]);

  // Handle play state changes
  useEffect(() => {
    if (isPlaying) {
      handleAudioPlayback();
    } else {
      audioManagerRef.current?.stop();
    }
  }, [isPlaying, handleAudioPlayback]);

  // Fallback to chunk-based reading if continuous reading is disabled
  if (!featureFlags.continuousReading) {
    return (
      <div className={`chunk-based-reader ${className}`}>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <p className="text-blue-800">
            📖 Using chunk-based reading mode. Enable continuous reading in settings for a seamless experience.
          </p>
        </div>
        {/* Render current chunk only */}
        <div className="prose max-w-none">
          {bookContent.chunks[currentChunk]?.content}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`loading-container ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Preparing continuous reading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`error-container ${className}`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => {
              setError(null);
              convertChunksToParagraphs();
            }}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`continuous-reading-container ${className}`}>
      {/* Performance indicator (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-indicator mb-4 p-2 bg-gray-100 rounded text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>📊 FPS: {performanceMonitorRef.current?.getMetrics().scrollFPS.toFixed(0) || 'N/A'}</div>
            <div>🧠 Memory: {((performanceMonitorRef.current?.getMetrics().memoryUsage || 0) / 1024 / 1024).toFixed(0)}MB</div>
            <div>🎵 Audio: {performanceMonitorRef.current?.getMetrics().audioStartLatency.toFixed(0) || 'N/A'}ms</div>
            <div>📱 Paragraphs: {paragraphs.length}</div>
          </div>
        </div>
      )}

      {/* Main virtualized reader */}
      <VirtualizedReader
        paragraphs={paragraphs}
        currentSentenceId={currentSentenceId}
        highlightedWordIndex={highlightedWordIndex}
        onSentenceVisible={handleSentenceVisible}
        onWordClick={handleWordClick}
        eslLevel={eslLevel}
        className="h-full"
      />

      {/* Status indicator */}
      <div className="status-bar fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-3 text-xs">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            featureFlags.continuousReading ? 'bg-green-500' : 'bg-gray-400'
          }`}></div>
          <span>
            {featureFlags.continuousReading ? 'Continuous' : 'Chunks'} |
            {featureFlags.gaplessAudio ? ' Gapless' : ' Standard'} |
            {featureFlags.virtualizedScrolling ? ' Virtual' : ' Static'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ContinuousReadingContainer;