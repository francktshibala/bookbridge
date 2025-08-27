'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  className?: string;
  isPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

interface AudioProgressUpdate {
  currentSentence: number;
  totalSentences: number;
  currentTime: number;
  totalDuration: number;
  status: 'loading' | 'ready' | 'playing' | 'paused' | 'completed' | 'error';
  isPreGenerated: boolean;
}

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
  className = '',
  isPlaying: externalIsPlaying,
  onPlayingChange
}) => {
  // Audio state
  const [audioQueue, setAudioQueue] = useState<SentenceAudio[]>([]);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [isPreGenerated, setIsPreGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  // Get pre-generated audio from API
  const getPreGeneratedAudio = async (): Promise<{
    audioAssets: SentenceAudio[];
    metadata: AudioMetadata;
  } | null> => {
    try {
      const response = await fetch(
        `/api/audio/pregenerated?bookId=${bookId}&cefrLevel=${cefrLevel}&chunkIndex=${chunkIndex}&voiceId=${voiceId}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.cached && data.audioAssets) {
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

  // Play pre-generated audio instantly
  const playInstantAudio = async (audioAssets: SentenceAudio[]) => {
    if (audioAssets.length === 0) return;

    console.log('🎵 playInstantAudio: Setting isPlaying to true');
    setIsPlaying(true);
    setCurrentSentence(0);
    updateProgress({ status: 'playing' });

    // Load and play first audio
    const audio = audioRefs.current[0];
    currentAudioRef.current = audio;

    audio.src = audioAssets[0].audioUrl;
    audio.addEventListener('ended', () => handleAudioEnded(0));
    audio.addEventListener('loadeddata', handleAudioLoaded);

    try {
      await audio.play();
      console.log(`🎵 Audio started playing`);
      startWordHighlighting(audioAssets[0]);
      
      const totalLoadTime = Date.now() - startTimeRef.current;
      console.log(`🎯 Total startup time: ${totalLoadTime}ms`);
      
    } catch (error) {
      console.error('Failed to play instant audio:', error);
      setIsPlaying(false);
      setError('Failed to start audio playback');
    }
  };

  // Fallback to current progressive generation system
  const fallbackToProgressiveGeneration = async () => {
    console.log('🔄 Fallback: Starting progressive generation');
    setIsPreGenerated(false);
    
    try {
      // Use existing OpenAI TTS API
      const response = await fetch('/api/openai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Play next sentence seamlessly
  const playNextSentence = async (nextIndex: number) => {
    if (nextIndex >= audioQueue.length) return;

    const nextAudio = audioRefs.current[nextIndex % audioRefs.current.length];
    const nextSentenceAudio = audioQueue[nextIndex];

    // Preload next audio
    nextAudio.src = nextSentenceAudio.audioUrl;
    nextAudio.addEventListener('ended', () => handleAudioEnded(nextIndex));
    
    setCurrentSentence(nextIndex);
    currentAudioRef.current = nextAudio;

    try {
      await nextAudio.play();
      startWordHighlighting(nextSentenceAudio);
      
    } catch (error) {
      console.error('Failed to play next sentence:', error);
      setIsPlaying(false);
      setError('Playback interrupted');
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
    }

    if (!onWordHighlight || !text) {
      console.log('⚠️ INSTANT AUDIO: No highlight callback or text provided');
      return;
    }
    
    console.log('🎯 REAL-TIME HIGHLIGHTING: Starting with audio tracking', {
      hasWordTimings: !!sentenceAudio.wordTimings?.words,
      wordCount: sentenceAudio.wordTimings?.words?.length,
      duration: sentenceAudio.duration,
      method: sentenceAudio.wordTimings?.method
    });
    
    // Method 1: Use database word timings if available (most accurate)
    if (sentenceAudio.wordTimings?.words?.length > 0) {
      console.log('🎯 Using DATABASE word timings for perfect sync');
      
      // Use 50ms intervals for smooth real-time tracking
      timeUpdateIntervalRef.current = setInterval(() => {
        if (!currentAudioRef.current) return;
        if (currentAudioRef.current.paused) return;

        const currentTime = currentAudioRef.current.currentTime;
        
        // Find current word based on actual audio time with small lookahead
        const lookahead = 0.1; // 100ms lookahead for responsiveness
        const currentWord = sentenceAudio.wordTimings.words.find(timing =>
          (currentTime + lookahead) >= timing.startTime && 
          (currentTime + lookahead) <= timing.endTime
        );

        if (currentWord) {
          console.log(`🎯 DATABASE TIMING: Word ${currentWord.wordIndex} "${currentWord.word}" at ${currentTime.toFixed(2)}s`);
          onWordHighlight(currentWord.wordIndex);
        }

        // Update progress
        updateProgress({ 
          currentTime,
          status: 'playing'
        });
      }, 50); // 50ms for smooth tracking
      
    } else {
      // Method 2: Fallback to IMPROVED estimation with real-time audio position
      console.log('🎯 Using IMPROVED estimation with real-time tracking');
      
      const words = text.split(/\s+/).filter(word => word.length > 0);
      const duration = sentenceAudio.duration || 10;
      
      timeUpdateIntervalRef.current = setInterval(() => {
        if (!currentAudioRef.current) return;
        if (currentAudioRef.current.paused) return;

        const currentTime = currentAudioRef.current.currentTime;
        const progress = Math.min(currentTime / duration, 1); // Clamp to 1
        const estimatedWordIndex = Math.floor(progress * words.length);
        
        if (estimatedWordIndex < words.length && estimatedWordIndex >= 0) {
          console.log(`🎯 IMPROVED ESTIMATION: Word ${estimatedWordIndex} "${words[estimatedWordIndex]}" at ${currentTime.toFixed(2)}s/${duration}s (${(progress*100).toFixed(1)}%)`);
          onWordHighlight(estimatedWordIndex);
        }

        // Update progress
        updateProgress({ 
          currentTime,
          status: 'playing'
        });
      }, 100); // 100ms for estimation method
    }
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

    // Pause and reset all audio elements
    audioRefs.current.forEach((audio, index) => {
      try {
        if (audio && !audio.paused) {
          console.log(`🛑 Pausing audio ${index}: ${audio.src ? audio.src.substring(0, 50) + '...' : 'no src'}`);
          audio.pause();
          audio.currentTime = 0;
          
          // Remove event listeners to prevent any continued playback
          audio.onended = null;
          audio.ontimeupdate = null;
          audio.onloadeddata = null;
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