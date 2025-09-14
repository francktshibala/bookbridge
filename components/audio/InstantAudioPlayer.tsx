'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TimingCalibrator } from '@/lib/audio/TimingCalibrator';
import { chunkCache } from '@/lib/chunk-memory-cache';
import { ChunkTransitionManager } from '@/lib/audio/ChunkTransitionManager';

interface SentenceAudio {
  id: string;
  sentenceIndex: number;
  audioUrl: string;
  duration: number;
  wordTimings: WordTimingData;
  provider: string;
  voiceId: string;
  format: string;
}

interface WordTimingData {
  words: WordTiming[];
  method: string;
  accuracy: number;
  generatedAt: string;
}

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
  confidence: number;
}

interface AudioMetadata {
  bookId: string;
  cefrLevel: string;
  chunkIndex: number;
  voiceId: string;
  totalSentences: number;
  totalDuration: number;
  cacheKey: string;
  duration?: number; // Optional for compatibility
}

interface InstantAudioPlayerProps {
  bookId: string;
  chunkIndex: number;
  text: string;
  cefrLevel: string;
  voiceId: string;
  isEnhanced: boolean;
  onWordHighlight?: (wordIndex: number) => void;
  onChunkComplete?: () => void;
  onProgressUpdate?: (progress: AudioProgressUpdate) => void;
  onAutoScroll?: (scrollProgress: number) => void;
  className?: string;
  isPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  cachedAudioUrl?: string | null;
  onAudioCache?: (audioUrl: string, metadata: any) => Promise<void>;
  onSentenceChange?: (currentSentenceIndex: number, totalSentences: number) => void;
}

interface AudioProgressUpdate {
  currentSentence: number;
  totalSentences: number;
  currentTime: number;
  totalDuration: number;
  status: 'loading' | 'ready' | 'playing' | 'paused' | 'completed' | 'error';
  isPreGenerated: boolean;
}

// Configurable timing offset for synchronization tuning
// This offset delays highlighting to account for audio pipeline latency
// Timing configuration - now using intelligent calibration
const DEFAULT_SYNC_OFFSET = 0.30; // Moderate base offset; subtracting offset to delay highlight

export const InstantAudioPlayer: React.FC<InstantAudioPlayerProps> = ({
  bookId,
  chunkIndex,
  text,
  cefrLevel,
  voiceId,
  isEnhanced,
  onWordHighlight,
  onChunkComplete,
  onProgressUpdate,
  onAutoScroll,
  className = '',
  isPlaying: externalIsPlaying,
  onPlayingChange,
  onSentenceChange
}) => {
  // Audio state
  const [audioQueue, setAudioQueue] = useState<SentenceAudio[]>([]);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [isPreGenerated, setIsPreGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);
  
  // Use external play state if provided, otherwise use internal
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  const setIsPlaying = (playing: boolean) => {
    console.log('🎵 InstantAudioPlayer setIsPlaying called:', playing, { 
      hasExternal: externalIsPlaying !== undefined,
      hasCallback: !!onPlayingChange 
    });
    
    if (externalIsPlaying !== undefined && onPlayingChange) {
      // External control mode - only notify parent
      onPlayingChange(playing);
    } else {
      // Internal control mode - update internal state
      setInternalIsPlaying(playing);
    }
  };

  // Audio elements and tracking
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const startHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHighlightedIndexRef = useRef<number>(-1);
  const lastProgressUpdateRef = useRef<number>(0);
  const syncOffsetRef = useRef<number>(DEFAULT_SYNC_OFFSET);
  const calibratorRef = useRef<TimingCalibrator | null>(null);
  const pendingOffsetRef = useRef<number | null>(null);
  const transitionManagerRef = useRef<ChunkTransitionManager | null>(null);
  const calibrationCountRef = useRef<number>(0);
  const disableAutoCalibrationRef = useRef<boolean>(false);
  const lastAutoScrollRef = useRef<number>(0);
  const nextChunkCacheRef = useRef<SentenceAudio[] | null>(null);

  // Initialize audio elements pool
  useEffect(() => {
    // Create 3 audio elements for smooth transitions
    audioRefs.current = Array.from({ length: 3 }, () => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      return audio;
    });

    return () => {
      // Cleanup audio elements
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (startHighlightTimeoutRef.current) {
        clearTimeout(startHighlightTimeoutRef.current);
        startHighlightTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle external play state changes
  useEffect(() => {
    console.log('🎵 External control effect triggered:', { 
      externalIsPlaying, 
      internalIsPlaying, 
      externalIsDefined: externalIsPlaying !== undefined 
    });
    
    if (externalIsPlaying !== undefined) {
      if (externalIsPlaying && !internalIsPlaying) {
        // External requested play
        console.log('🎵 External play request - starting playback');
        startPlayback();
      } else if (!externalIsPlaying && internalIsPlaying) {
        // External requested stop
        console.log('🎵 External pause request - stopping playback');
        stopPlayback();
      } else if (!externalIsPlaying && !internalIsPlaying) {
        // Both false, ensure audio is really stopped
        console.log('🎵 Both states false - ensuring audio is stopped');
        stopPlayback();
      }
    }
  }, [externalIsPlaying, internalIsPlaying]);

  // Reset calibration when book or chunk changes to avoid cross-page drift
  useEffect(() => {
    // Reset timing state on chunk change to avoid speed drift
    if (calibratorRef.current) calibratorRef.current.reset();
    syncOffsetRef.current = DEFAULT_SYNC_OFFSET;
    pendingOffsetRef.current = null;
    lastHighlightedIndexRef.current = -1;
    lastProgressUpdateRef.current = 0;
    lastAutoScrollRef.current = 0;

    // Critical: Clear any existing audio state and prepare for new chunk
    console.log('🔄 Chunk changed, resetting audio state for chunk:', chunkIndex);
    setIsLoading(false);
    setError(null);
    setIsPreGenerated(false);

    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    // Clear audio refs for fresh start
    audioRefs.current.forEach(audio => {
      audio.pause();
      audio.src = '';
    });

    // Clear prefetch cache for new chunk
    nextChunkCacheRef.current = null;
    setIsPrefetching(false);
  }, [bookId, chunkIndex]);

  // Update progress callback
  const updateProgress = useCallback((update: Partial<AudioProgressUpdate>) => {
    const currentTime = currentAudioRef.current?.currentTime || 0;
    const totalDuration = audioQueue.reduce((sum, audio) => sum + audio.duration, 0);
    
    const progressUpdate: AudioProgressUpdate = {
      currentSentence,
      totalSentences: audioQueue.length,
      currentTime,
      totalDuration,
      status: 'ready',
      isPreGenerated,
      ...update
    };
    
    onProgressUpdate?.(progressUpdate);
  }, [currentSentence, audioQueue.length, isPreGenerated, onProgressUpdate]);

  // Main playback function - instant if pre-generated, fallback if not
  const startPlayback = async () => {
    if (!text.trim()) {
      setError('No text available for this chunk');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      startTimeRef.current = Date.now();
      
      updateProgress({ status: 'loading' });

      // Step 1: Try to get pre-generated audio (instant if available)
      const preGenerated = await getPreGeneratedAudio();
      
      if (preGenerated) {
        console.log('🚀 Instant playback: Pre-generated audio found!');
        setAudioQueue(preGenerated.audioAssets);
        setMetadata(preGenerated.metadata);
        setIsPreGenerated(true);
        
        const loadTime = Date.now() - startTimeRef.current;
        console.log(`⚡ Time to first audio: ${loadTime}ms`);
        
        await playInstantAudio(preGenerated.audioAssets);
        return;
      }

      // Step 2: Fallback behavior
      if (isEnhanced) {
        // Only use progressive generation for enhanced contexts
        console.log('📦 Fallback: Using progressive generation');
        setIsPreGenerated(false);
        await fallbackToProgressiveGeneration();
      } else {
        setError('Pre-generated audio not found for this page');
        updateProgress({ status: 'error' });
      }

    } catch (error) {
      console.error('Audio playback failed:', error);
      setError('Audio playback failed. Please try again.');
      updateProgress({ status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Get pre-generated audio from cache or API
  const getPreGeneratedAudio = async (): Promise<{
    audioAssets: SentenceAudio[];
    metadata: AudioMetadata;
  } | null> => {
    const cacheKey = chunkCache.getCacheKey(bookId, chunkIndex, cefrLevel);

    // Check memory cache first
    const cached = chunkCache.get(cacheKey);
    if (cached) {
      console.log('⚡ Using cached audio for instant loading!');
      return {
        audioAssets: cached.audioAssets,
        metadata: {
          bookId,
          cefrLevel,
          chunkIndex,
          voiceId,
          totalSentences: cached.audioAssets.length,
          totalDuration: cached.audioAssets.reduce((sum, audio) => sum + audio.duration, 0),
          cacheKey: cacheKey
        }
      };
    }

    // Check prefetch temp cache for auto-advance scenarios
    if (nextChunkCacheRef.current) {
      console.log('🚀 Using prefetched audio for instant transition!');
      const cachedAudio = nextChunkCacheRef.current;
      nextChunkCacheRef.current = null; // Clear temp cache after use

      // Store in persistent cache for potential reuse
      chunkCache.set(cacheKey, { audioAssets: cachedAudio });

      return {
        audioAssets: cachedAudio,
        metadata: {
          bookId,
          cefrLevel,
          chunkIndex,
          voiceId,
          totalSentences: cachedAudio.length,
          totalDuration: cachedAudio.reduce((sum, audio) => sum + audio.duration, 0),
          cacheKey: cacheKey
        }
      };
    }

    try {
      const { ApiAdapter } = await import('../../lib/api-adapter');
      const response = await ApiAdapter.fetch(
        `/api/audio/pregenerated?bookId=${bookId}&cefrLevel=${cefrLevel}&chunkIndex=${chunkIndex}&voiceId=${voiceId}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.cached && data.audioAssets) {
          // Store in cache for future use
          chunkCache.set(cacheKey, { audioAssets: data.audioAssets });

          return {
            audioAssets: data.audioAssets,
            metadata: data.metadata
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get pre-generated audio:', error);
      return null;
    }
  };

  // Prefetch multiple chunks using bulk API for maximum efficiency
  const prefetchNextChunk = useCallback(async (nextChunk: number) => {
    if (isPrefetching || !isEnhanced) return;

    const cacheKey = chunkCache.getCacheKey(bookId, nextChunk, cefrLevel);

    // Check if already cached
    if (chunkCache.has(cacheKey)) {
      console.log(`✅ Chunk ${nextChunk} already cached, skipping prefetch`);
      return;
    }

    console.log(`🚀 Bulk prefetching 3 chunks starting from ${nextChunk} for seamless transitions`);
    setIsPrefetching(true);

    try {
      const { ApiAdapter } = await import('../../lib/api-adapter');

      // Use bulk API to fetch current + next 2 chunks in one query
      const response = await ApiAdapter.fetch(
        `/api/audio/pregenerated?bookId=${bookId}&cefrLevel=${cefrLevel}&chunkIndex=${nextChunk}&voiceId=${voiceId}&bulk=true&chunkCount=3`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.cached && data.bulk && data.chunks) {
          // Store all fetched chunks in cache
          Object.entries(data.chunks).forEach(([chunkIdx, audioAssets]: [string, any]) => {
            const bulkCacheKey = chunkCache.getCacheKey(bookId, parseInt(chunkIdx), cefrLevel);
            chunkCache.set(bulkCacheKey, { audioAssets });

            // Set immediate next chunk in temp ref for auto-advance
            if (parseInt(chunkIdx) === nextChunk) {
              nextChunkCacheRef.current = audioAssets;
            }
          });

          const chunkCount = Object.keys(data.chunks).length;
          console.log(`✅ Bulk prefetched ${chunkCount} chunks starting from ${nextChunk}`);
        }
      } else {
        // Fallback to single chunk prefetch if bulk fails
        console.log('🔄 Bulk prefetch failed, falling back to single chunk');
        const fallbackResponse = await ApiAdapter.fetch(
          `/api/audio/pregenerated?bookId=${bookId}&cefrLevel=${cefrLevel}&chunkIndex=${nextChunk}&voiceId=${voiceId}`
        );

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.cached && fallbackData.audioAssets) {
            chunkCache.set(cacheKey, { audioAssets: fallbackData.audioAssets });
            nextChunkCacheRef.current = fallbackData.audioAssets;
            console.log(`✅ Fallback prefetched chunk ${nextChunk} audio (${fallbackData.audioAssets.length} sentences)`);
          }
        }
      }
    } catch (error) {
      console.error('Prefetch failed:', error);
    } finally {
      setIsPrefetching(false);
    }
  }, [bookId, cefrLevel, voiceId, isEnhanced, isPrefetching]);

  // Play pre-generated audio instantly
  const playInstantAudio = async (audioAssets: SentenceAudio[]) => {
    if (audioAssets.length === 0) return;

    console.log('🎵 playInstantAudio: Setting isPlaying to true');
    setIsPlaying(true);
    setCurrentSentence(0);
    // Notify sentence index immediately
    try { onSentenceChange?.(0, audioAssets.length); } catch {}
    updateProgress({ status: 'playing' });

    // Load and play first audio with proper abort handling
    const audio = audioRefs.current[0];
    currentAudioRef.current = audio;

    // Stop any existing playback first to prevent conflicts
    if (!audio.paused) {
      console.log('🔄 Stopping existing audio before starting new playback');
      audio.pause();
      audio.currentTime = 0;
    }

    audio.src = audioAssets[0].audioUrl;
    audio.addEventListener('ended', () => handleAudioEnded(0));
    audio.addEventListener('loadeddata', handleAudioLoaded);

    try {
      // Add small delay to ensure previous audio is fully stopped
      await new Promise(resolve => setTimeout(resolve, 50));
      await audio.play();
      console.log(`🎵 Audio started playing`);
      
      // Start word highlighting immediately - timing compensation happens in real-time tracking
      startWordHighlighting(audioAssets[0]);
      
      const totalLoadTime = Date.now() - startTimeRef.current;
      console.log(`🎯 Total startup time: ${totalLoadTime}ms`);
      
    } catch (error: any) {
      // Gracefully handle AbortError from play-pause race during transitions
      const message = typeof error?.message === 'string' ? error.message : '';
      const name = typeof error?.name === 'string' ? error.name : '';
      const isAbort = name === 'AbortError' || message.includes('interrupted by a call to pause');
      if (isAbort) {
        console.warn('🟡 Play was interrupted by a pause - ignoring (expected during transitions)');
        updateProgress({ status: 'paused' });
      } else {
        console.error('Failed to play instant audio:', error);
        setError('Failed to start audio playback');
      }
      setIsPlaying(false);
    }
  };

  // Fallback to current progressive generation system
  const fallbackToProgressiveGeneration = async () => {
    console.log('🔄 Fallback: Starting progressive generation');
    setIsPreGenerated(false);
    
    try {
      // Use existing OpenAI TTS API
      const { ApiAdapter } = await import('../../lib/api-adapter');
      const response = await ApiAdapter.fetch('/api/openai/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: text,
          voice: voiceId,
          speed: 1.0
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Get actual audio duration
        const audio = new Audio(audioUrl);
        await new Promise(resolve => {
          audio.onloadedmetadata = resolve;
        });
        
        // Generate real word timings for synchronized highlighting
        const wordTimings = await generateRealWordTimings(text, audioUrl, voiceId);
        
        // Create single audio asset for progressive playback
        const progressiveAudio = [{
          id: crypto.randomUUID(),
          sentenceIndex: 0,
          audioUrl,
          duration: audio.duration,
          wordTimings,
          provider: 'openai',
          voiceId,
          format: 'mp3'
        }];

        setAudioQueue(progressiveAudio);
        await playInstantAudio(progressiveAudio);
      } else {
        throw new Error('Progressive generation failed');
      }
    } catch (error) {
      console.error('Progressive generation failed:', error);
      setError('Audio generation failed. Please try again.');
      updateProgress({ status: 'error' });
    }
  };

  // Generate real word timings using word-timing-generator
  const generateRealWordTimings = async (text: string, audioUrl: string, voiceId: string) => {
    try {
      const { WordTimingGenerator } = await import('@/lib/word-timing-generator');
      
      // Determine best timing method based on voice
      const timingMethod = WordTimingGenerator.getBestTimingMethod(voiceId);
      
      const wordTimingGen = new WordTimingGenerator();
      const result = await wordTimingGen.generateWordTimings({
        text,
        voiceId,
        provider: timingMethod,
        audioUrl
      });

      return {
        words: result.wordTimings.map(timing => ({
          ...timing,
          confidence: result.accuracy === 'high' ? 0.95 : result.accuracy === 'medium' ? 0.8 : 0.6
        })),
        method: result.method,
        accuracy: result.accuracy === 'high' ? 0.95 : result.accuracy === 'medium' ? 0.8 : 0.6,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Real word timing generation failed, falling back to estimates:', error);
      
      // Fallback to estimated timings if real timing fails
      const words = text.split(/\s+/).filter(word => word.trim().length > 0);
      const avgWordDuration = 0.6; // 600ms per word average
      
      const wordTimings = words.map((word, index) => ({
        word: word.replace(/[.,!?]/g, ''),
        startTime: index * avgWordDuration,
        endTime: (index + 1) * avgWordDuration,
        wordIndex: index,
        confidence: 0.6
      }));

      return {
        words: wordTimings,
        method: 'estimated-fallback',
        accuracy: 0.6,
        generatedAt: new Date().toISOString()
      };
    }
  };

  // Handle when audio segment ends
  const handleAudioEnded = useCallback((sentenceIndex: number) => {
    if (!isPlaying) return;

    const nextSentenceIndex = sentenceIndex + 1;
    
    if (nextSentenceIndex >= audioQueue.length) {
      // All sentences complete
      handlePlaybackComplete();
      return;
    }

    // Play next sentence immediately
    playNextSentence(nextSentenceIndex);
  }, [isPlaying, audioQueue.length]);

  // Play next sentence with smooth transition
  const playNextSentence = async (nextIndex: number) => {
    if (nextIndex >= audioQueue.length) return;

    // Stop any ongoing highlighting to prevent overlap
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const nextSentenceAudio = audioQueue[nextIndex];

    // Use transition manager for smooth chunk transitions
    const nextAudio = transitionManagerRef.current
      ? transitionManagerRef.current.getAudioElement(nextIndex, nextSentenceAudio.audioUrl)
      : audioRefs.current[nextIndex % audioRefs.current.length];

    if (!transitionManagerRef.current) {
      nextAudio.src = nextSentenceAudio.audioUrl;
    }

    nextAudio.addEventListener('ended', () => handleAudioEnded(nextIndex));

    const previousAudio = currentAudioRef.current;
    currentAudioRef.current = nextAudio;
    setCurrentSentence(nextIndex);
    // Notify sentence index on transition
    try { onSentenceChange?.(nextIndex, audioQueue.length); } catch {}

    // Apply any pending calibrated offset at sentence boundary to prevent mid-play jumps
    if (pendingOffsetRef.current !== null) {
      if (Math.abs(pendingOffsetRef.current - syncOffsetRef.current) > 0.001) {
        console.log(`📊 Applying calibrated offset at sentence boundary: ${(pendingOffsetRef.current * 1000).toFixed(0)}ms (was ${(syncOffsetRef.current * 1000).toFixed(0)}ms)`);
      }
      syncOffsetRef.current = pendingOffsetRef.current;
      pendingOffsetRef.current = null;
    }

    try {
      // Gentle debounce before starting the next sentence to avoid perceived speed-up
      await new Promise(r => setTimeout(r, 120));
      // Use smooth transition if manager available
      if (transitionManagerRef.current && previousAudio) {
        await transitionManagerRef.current.transitionToChunk(
          previousAudio,
          nextAudio,
          () => startWordHighlighting(nextSentenceAudio)
        );
      } else {
        await nextAudio.play();
        startWordHighlighting(nextSentenceAudio);
      }
      
    } catch (error: any) {
      // Treat AbortError as benign during quick transitions
      const message = typeof error?.message === 'string' ? error.message : '';
      const name = typeof error?.name === 'string' ? error.name : '';
      const isAbort = name === 'AbortError' || message.includes('interrupted by a call to pause');
      if (isAbort) {
        console.warn('🟡 Next sentence play interrupted by pause - skipping this segment');
        // Attempt to continue with following sentence if available
        const after = nextIndex + 1;
        if (after < audioQueue.length) {
          playNextSentence(after);
          return;
        }
        setIsPlaying(false);
        updateProgress({ status: 'paused' });
      } else {
        console.error('Failed to play next sentence:', error);
        setIsPlaying(false);
        setError('Playback interrupted');
      }
    }
  };

  // Handle audio loaded event
  const handleAudioLoaded = () => {
    updateProgress({ status: 'ready' });
  };

  // Start word-level highlighting using REAL-TIME audio tracking (most accurate)
  const startWordHighlighting = (sentenceAudio: SentenceAudio) => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (startHighlightTimeoutRef.current) {
      clearTimeout(startHighlightTimeoutRef.current);
      startHighlightTimeoutRef.current = null;
    }

    if (!onWordHighlight || !text) {
      console.log('⚠️ INSTANT AUDIO: No highlight callback or text provided');
      return;
    }
    
    console.log('🎯 REAL-TIME HIGHLIGHTING: Starting with audio tracking', {
      hasWordTimings: !!sentenceAudio.wordTimings?.words,
      wordCount: sentenceAudio.wordTimings?.words?.length,
      duration: sentenceAudio.duration,
      method: sentenceAudio.wordTimings?.method,
      initialOffset: `${syncOffsetRef.current * 1000}ms`,
      fixApplied: 'Subtracting sync offset to delay highlight'
    });

    // Expose debug state to window for AudioDebugOverlay
    (window as any).__audioPlayerDebug = {
      syncOffset: syncOffsetRef.current,
      lastHighlightedIndex: lastHighlightedIndexRef.current,
      calibrationCount: calibrationCountRef.current,
      audioElement: currentAudioRef.current,
      sentenceAudio
    };

    // Reset ALL timing state for new sentence/chunk to prevent acceleration
    lastHighlightedIndexRef.current = -1;
    lastProgressUpdateRef.current = 0;
    lastAutoScrollRef.current = 0;
    calibrationCountRef.current = 0;

    // Initialize managers if needed
    if (typeof window !== 'undefined') {
      if (!calibratorRef.current) {
        calibratorRef.current = new TimingCalibrator(DEFAULT_SYNC_OFFSET);
      }
      if (!transitionManagerRef.current) {
        transitionManagerRef.current = new ChunkTransitionManager();
      }

      // Get calibrated offset for this book
      const bookId = (window as any).__currentBookId || 'default';
      syncOffsetRef.current = calibratorRef.current.getOptimalOffset(bookId);
    } else {
      syncOffsetRef.current = DEFAULT_SYNC_OFFSET;
    }

    // Apply any pending calibrated offset now that a new sentence highlighting starts
    if (pendingOffsetRef.current !== null) {
      if (Math.abs(pendingOffsetRef.current - syncOffsetRef.current) > 0.001) {
        console.log(`📊 Applying pending calibrated offset at start of sentence: ${(pendingOffsetRef.current * 1000).toFixed(0)}ms (was ${(syncOffsetRef.current * 1000).toFixed(0)}ms)`);
      }
      syncOffsetRef.current = pendingOffsetRef.current;
      pendingOffsetRef.current = null;
    }

    // Start highlighting immediately - no startup delay to avoid double compensation
    const useDatabaseTimings = !!sentenceAudio.wordTimings?.words?.length;

    const frame = () => {
      if (!currentAudioRef.current || currentAudioRef.current.paused) {
        rafIdRef.current = null;
        return;
      }

      const rawCurrentTime = currentAudioRef.current.currentTime;
      // SUBTRACT offset to delay highlighting so it matches audible output latency
      const adjustedTime = Math.max(0, rawCurrentTime - syncOffsetRef.current);

      if (useDatabaseTimings) {
        const timings = sentenceAudio.wordTimings!.words;
        const current = timings.find(t => adjustedTime >= t.startTime && t.endTime >= adjustedTime);
        if (current) {
          // Anti-skip guard: prevent sudden jumps far ahead
          const previousIndex = lastHighlightedIndexRef.current;
          const candidate = current.wordIndex;
          const bounded = previousIndex >= 0 && candidate > previousIndex + 20 ? previousIndex + 2 : candidate;

          if (bounded !== previousIndex) {
            lastHighlightedIndexRef.current = bounded;
            onWordHighlight(bounded);
          }
          
          // Detailed timing debug
          console.log(`Audio: ${rawCurrentTime.toFixed(2)}s, Adjusted: ${adjustedTime.toFixed(2)}s (−${syncOffsetRef.current}s), Current word times: ${current.startTime}-${current.endTime}`);
          
          // Update debug state
          (window as any).__audioPlayerDebug = {
            ...(window as any).__audioPlayerDebug,
            lastHighlightedIndex: lastHighlightedIndexRef.current,
            syncOffset: syncOffsetRef.current,
            currentWord: current,
            rawCurrentTime,
            adjustedTime
          };

          // Record timing sample for intelligent calibration
          if (!disableAutoCalibrationRef.current && calibratorRef.current) {
            calibratorRef.current.recordSample(current.startTime, rawCurrentTime);

            // Update offset if calibration confidence is high
            const confidence = calibratorRef.current.getConfidence();
            if (confidence > 0.7) {
              const bookId = (window as any).__currentBookId || 'default';
              const newOffset = calibratorRef.current.getOptimalOffset(bookId);

              if (Math.abs(newOffset - syncOffsetRef.current) > 0.02) {
                // Defer applying the new offset until sentence boundary to prevent mid-play jumps
                pendingOffsetRef.current = newOffset;
                console.log(`📊 Calibration computed (deferred): ${(newOffset * 1000).toFixed(0)}ms (confidence: ${(confidence * 100).toFixed(0)}%)`);
              }
            }
          }
        }
      } else {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const duration = Math.max(0.001, sentenceAudio.duration || 10);
        // Use ADJUSTED time (delayed) for fallback to keep sync direction consistent
        const progress = Math.min(Math.max(0, adjustedTime) / duration, 1);
        const idx = Math.floor(progress * words.length);
        if (idx >= 0 && idx < words.length && idx !== lastHighlightedIndexRef.current) {
          lastHighlightedIndexRef.current = idx;
          onWordHighlight(idx); // Progressive fallback is chunk-global already
        }
      }

      // Throttle progress updates to ~10 Hz
      const now = performance.now();
      if (now - lastProgressUpdateRef.current >= 100) {
        lastProgressUpdateRef.current = now;
        updateProgress({ currentTime: rawCurrentTime, status: 'playing' });

        // Prefetch next chunk when 80% through current chunk
        if (sentenceAudio && rawCurrentTime / sentenceAudio.duration > 0.8) {
          prefetchNextChunk(chunkIndex + 1);
        }
      }
      
      // Auto-scroll at much lower frequency for smoothness (2Hz)
      if (onAutoScroll && now - lastAutoScrollRef.current >= 500) {
        lastAutoScrollRef.current = now;
        const duration = Math.max(0.001, sentenceAudio.duration || 10);
        const scrollProgress = Math.min(rawCurrentTime / duration, 1);
        onAutoScroll(scrollProgress);
      }

      rafIdRef.current = requestAnimationFrame(frame);
    };

    rafIdRef.current = requestAnimationFrame(frame);
  };

  // Handle playback completion
  const handlePlaybackComplete = () => {
    console.log('🏁 INSTANT AUDIO: Playback completed, calling onChunkComplete', {
      hasCallback: !!onChunkComplete,
      currentSentence,
      totalSentences: audioQueue.length
    });
    
    setIsPlaying(false);
    setCurrentSentence(0);
    
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (startHighlightTimeoutRef.current) {
      clearTimeout(startHighlightTimeoutRef.current);
      startHighlightTimeoutRef.current = null;
    }

    updateProgress({ status: 'completed' });
    
    if (onChunkComplete) {
      console.log('🏁 INSTANT AUDIO: Calling onChunkComplete callback');
      onChunkComplete();
    } else {
      console.log('⚠️ INSTANT AUDIO: No onChunkComplete callback provided');
    }
  };

  // Stop playback
  const stopPlayback = () => {
    console.log('🛑 stopPlayback called - pausing all audio');
    
    // Clear highlighting interval first
    if (timeUpdateIntervalRef.current) {
      console.log('🛑 Clearing highlighting interval');
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (startHighlightTimeoutRef.current) {
      clearTimeout(startHighlightTimeoutRef.current);
      startHighlightTimeoutRef.current = null;
    }

    // Pause and reset all audio elements more aggressively
    audioRefs.current.forEach((audio, index) => {
      try {
        if (audio) {
          console.log(`🛑 Stopping audio ${index}: ${audio.src ? audio.src.substring(0, 50) + '...' : 'no src'}`);
          
          // Remove event listeners first to prevent race conditions
          audio.removeEventListener('ended', () => handleAudioEnded(index));
          audio.removeEventListener('loadeddata', handleAudioLoaded);
          audio.onended = null;
          audio.ontimeupdate = null;
          audio.onloadeddata = null;
          audio.onerror = null;
          
          // Force stop playback
          if (!audio.paused) {
            audio.pause();
          }
          audio.currentTime = 0;
          
          // Clear the src to prevent any pending loads
          audio.src = '';
          audio.load(); // Reset the audio element completely
        }
      } catch (e) {
        console.error(`Error pausing audio ${index}:`, e);
      }
    });
    
    // Clear current audio reference
    if (currentAudioRef.current) {
      try {
        console.log('🛑 Clearing currentAudioRef');
        if (!currentAudioRef.current.paused) {
          currentAudioRef.current.pause();
        }
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current.onended = null;
        currentAudioRef.current.ontimeupdate = null;
        currentAudioRef.current = null;
      } catch (e) {
        console.error('Error clearing currentAudioRef:', e);
      }
    }
    
    // Update state
    setIsPlaying(false);
    setCurrentSentence(0);
    updateProgress({ status: 'paused' });
  };

  // Status indicator component
  const StatusIndicator = () => (
    <motion.div 
      className="instant-audio-status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        background: isPreGenerated 
          ? 'rgba(16, 185, 129, 0.2)' 
          : 'rgba(102, 126, 234, 0.2)',
        color: isPreGenerated ? '#10b981' : '#667eea'
      }}
    >
      {isPreGenerated ? '⚡ Instant' : '📦 Progressive'}
      {isLoading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '10px',
            height: '10px',
            border: '2px solid currentColor',
            borderTop: '2px solid transparent',
            borderRadius: '50%'
          }}
        />
      )}
    </motion.div>
  );

  // Progress indicator
  const ProgressIndicator = () => (
    <div style={{ 
      fontSize: '12px', 
      color: '#94a3b8',
      minWidth: '80px'
    }}>
      {currentSentence + 1}/{audioQueue.length}
      {metadata && ` • ${Math.round(metadata.totalDuration)}s`}
    </div>
  );

  // Main render - matches existing UI styling
  return (
    <div className={`instant-audio-player ${className}`}>
      {className?.includes('prominent') ? (
        // Prominent layout - round play button same size as CEFR
        <motion.button
          onClick={isPlaying ? stopPlayback : startPlayback}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-full flex items-center justify-center text-white transition-all duration-200 flex-shrink-0"
          style={{
            border: `3px solid ${isPreGenerated ? '#10b981' : '#667eea'}`,
            background: isPreGenerated ? '#10b981' : '#667eea',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            boxShadow: `0 6px 20px ${isPreGenerated ? 'rgba(16, 185, 129, 0.4)' : 'rgba(102, 126, 234, 0.4)'}`,
            width: '60px',
            height: '60px',
            fontSize: '22px'
          }}
        >
          {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
        </motion.button>
      ) : className?.includes('minimal') ? (
        // Minimal layout
        <motion.button
          onClick={isPlaying ? stopPlayback : startPlayback}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg transition-all duration-200 flex-shrink-0"
          style={{
            border: 'none',
            background: isPreGenerated ? '#10b981' : '#667eea',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
        >
          {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
        </motion.button>
      ) : (
        // Full layout with status and progress
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            onClick={isPlaying ? stopPlayback : startPlayback}
            disabled={isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              background: isPlaying 
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : isPreGenerated 
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}
          >
            {isLoading ? '⏳' : isPlaying ? '⏹' : '▶'}
          </motion.button>

          <ProgressIndicator />
          <StatusIndicator />
        </div>
      )}

      {/* Error display */}
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '6px 12px',
          background: 'rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          fontSize: '12px',
          borderRadius: '6px',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};