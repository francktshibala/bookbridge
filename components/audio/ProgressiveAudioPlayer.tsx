'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioCacheDB } from '../../lib/audio-cache-db';
import { wordTimingGenerator, WordTimingGenerator } from '../../lib/word-timing-generator';

interface SentenceAudio {
  text: string;
  audioUrl: string;
  duration: number;
  wordTimings: WordTiming[];
  sentenceIndex: number;
}

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
}

interface AudioGenerationProgress {
  total: number;
  completed: number;
  currentSentence: string;
  status: 'generating' | 'ready' | 'playing' | 'error';
}

interface ProgressiveAudioPlayerProps {
  bookId: string;
  chunkIndex: number;
  text: string;
  cefrLevel: string;
  voiceId: string;
  isEnhanced: boolean;
  onWordHighlight?: (wordIndex: number) => void;
  onChunkComplete?: () => void;
  onProgressUpdate?: (progress: AudioGenerationProgress) => void;
  className?: string;
}

export const ProgressiveAudioPlayer: React.FC<ProgressiveAudioPlayerProps> = ({
  bookId,
  chunkIndex,
  text,
  cefrLevel,
  voiceId,
  isEnhanced,
  onWordHighlight,
  onChunkComplete,
  onProgressUpdate,
  className = ''
}) => {
  // Audio state
  const [audioQueue, setAudioQueue] = useState<SentenceAudio[]>([]);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<AudioGenerationProgress>({
    total: 0,
    completed: 0,
    currentSentence: '',
    status: 'ready'
  });

  // Audio elements pool for seamless playback
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const endedListenersRef = useRef<Map<HTMLAudioElement, () => void>>(new Map());

  // Initialize audio elements pool
  useEffect(() => {
    // Create 3 audio elements for smooth transitions
    audioRefs.current = Array.from({ length: 3 }, () => {
      const audio = new Audio();
      audio.preload = 'auto';
      return audio;
    });

    return () => {
      // Cleanup audio elements
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = '';
        // Remove event listeners
        const listener = endedListenersRef.current.get(audio);
        if (listener) {
          audio.removeEventListener('ended', listener);
        }
      });
      endedListenersRef.current.clear();
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, []);

  // Update progress callback
  const updateProgress = useCallback((newProgress: AudioGenerationProgress) => {
    setProgress(newProgress);
    onProgressUpdate?.(newProgress);
  }, [onProgressUpdate]);

  // Start progressive audio playback
  const startPlayback = async () => {
    if (!isEnhanced || !text.trim()) {
      console.warn('Progressive audio only available for enhanced books');
      return;
    }

    try {
      setIsLoading(true);
      setIsPlaying(false);
      updateProgress({ total: 0, completed: 0, currentSentence: 'Checking cache...', status: 'generating' });

      // Step 1: Check cache first
      const cachedAudio = await getCachedAudio();
      if (cachedAudio && cachedAudio.length > 0) {
        setAudioQueue(cachedAudio);
        updateProgress({
          total: cachedAudio.length,
          completed: cachedAudio.length,
          currentSentence: 'Ready from cache',
          status: 'ready'
        });
        await playAudioQueue(cachedAudio);
        return;
      }

      // Step 2: Generate progressive audio
      await generateProgressiveAudio();

    } catch (error) {
      console.error('Progressive audio playback failed:', error);
      updateProgress({ total: 0, completed: 0, currentSentence: 'Audio generation failed', status: 'error' });
      setIsLoading(false);
    }
  };

  // Generate progressive audio with streaming
  const generateProgressiveAudio = async () => {
    try {
      // Split text into optimized sentences
      const sentences = await splitTextIntoSentences(text);
      updateProgress({
        total: sentences.length,
        completed: 0,
        currentSentence: 'Processing text...',
        status: 'generating'
      });

      if (sentences.length === 0) {
        throw new Error('No sentences to process');
      }

      // Generate first sentence immediately (priority for <2 second startup)
      updateProgress({
        total: sentences.length,
        completed: 0,
        currentSentence: `Generating: ${sentences[0].substring(0, 50)}...`,
        status: 'generating'
      });

      const firstSentenceAudio = await generateSentenceAudio(sentences[0], 0);
      setAudioQueue([firstSentenceAudio]);
      
      updateProgress({
        total: sentences.length,
        completed: 1,
        currentSentence: 'Starting playback...',
        status: 'ready'
      });

      // Start playback immediately with first sentence
      await playAudioQueue([firstSentenceAudio]);

      // Generate remaining sentences in background
      generateRemainingAudioInBackground(sentences.slice(1));

    } catch (error) {
      console.error('Failed to generate progressive audio:', error);
      throw error;
    }
  };

  // Generate remaining sentences while first plays
  const generateRemainingAudioInBackground = async (remainingSentences: string[]) => {
    // Small delay to prioritize first sentence playback
    setTimeout(async () => {
      for (let i = 0; i < remainingSentences.length; i++) {
        try {
          const sentenceAudio = await generateSentenceAudio(remainingSentences[i], i + 1);
          
          // Add to queue
          setAudioQueue(prev => [...prev, sentenceAudio]);
          
          updateProgress({
            total: remainingSentences.length + 1,
            completed: i + 2,
            currentSentence: `Generated: ${remainingSentences[i].substring(0, 50)}...`,
            status: 'generating'
          });

          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Failed to generate sentence ${i}:`, error);
        }
      }

      updateProgress({
        total: remainingSentences.length + 1,
        completed: remainingSentences.length + 1,
        currentSentence: 'All audio ready',
        status: 'ready'
      });
    }, 500);
  };

  // Play audio queue with seamless transitions
  const playAudioQueue = async (queue: SentenceAudio[]) => {
    if (queue.length === 0) return;

    setIsPlaying(true);
    setIsLoading(false);
    setCurrentSentence(0);

    const audio = audioRefs.current[0];
    currentAudioRef.current = audio;

    // Load and play first audio
    audio.src = queue[0].audioUrl;
    
    // Remove any existing event listener
    const existingListener = endedListenersRef.current.get(audio);
    if (existingListener) {
      audio.removeEventListener('ended', existingListener);
    }
    
    // Add new event listener
    const endedListener = () => handleAudioEnded(0);
    audio.addEventListener('ended', endedListener);
    endedListenersRef.current.set(audio, endedListener);
    
    audio.addEventListener('loadeddata', handleAudioLoaded);
    
    try {
      await audio.play();
      startTimeTracking(queue[0]);
      updateProgress({
        total: queue.length,
        completed: 1,
        currentSentence: queue[0].text.substring(0, 50) + '...',
        status: 'playing'
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsPlaying(false);
      throw error;
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

  // Handle audio loaded event
  const handleAudioLoaded = () => {
    // Audio is ready to play
  };

  // Play next sentence seamlessly
  const playNextSentence = async (nextIndex: number) => {
    if (nextIndex >= audioQueue.length) return;

    const nextAudio = audioRefs.current[nextIndex % audioRefs.current.length];
    const nextSentenceAudio = audioQueue[nextIndex];

    // Remove any existing event listener
    const existingListener = endedListenersRef.current.get(nextAudio);
    if (existingListener) {
      nextAudio.removeEventListener('ended', existingListener);
    }
    
    // Preload next audio
    nextAudio.src = nextSentenceAudio.audioUrl;
    
    // Add new event listener
    const endedListener = () => handleAudioEnded(nextIndex);
    nextAudio.addEventListener('ended', endedListener);
    endedListenersRef.current.set(nextAudio, endedListener);
    
    setCurrentSentence(nextIndex);
    currentAudioRef.current = nextAudio;

    try {
      await nextAudio.play();
      startTimeTracking(nextSentenceAudio);
      
      updateProgress({
        total: audioQueue.length,
        completed: nextIndex + 1,
        currentSentence: nextSentenceAudio.text.substring(0, 50) + '...',
        status: 'playing'
      });
    } catch (error) {
      console.error('Failed to play next sentence:', error);
      setIsPlaying(false);
    }
  };

  // Start word-level time tracking
  const startTimeTracking = (sentenceAudio: SentenceAudio) => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }

    timeUpdateIntervalRef.current = setInterval(() => {
      if (!currentAudioRef.current || !isPlaying) return;

      const currentTime = currentAudioRef.current.currentTime;
      const currentWord = sentenceAudio.wordTimings.find(timing =>
        currentTime >= timing.startTime && currentTime <= timing.endTime
      );

      if (currentWord && onWordHighlight) {
        onWordHighlight(currentWord.wordIndex);
      }
    }, 100); // Update every 100ms for smooth highlighting
  };

  // Handle playback completion
  const handlePlaybackComplete = () => {
    setIsPlaying(false);
    setCurrentSentence(0);
    
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }

    updateProgress({
      total: audioQueue.length,
      completed: audioQueue.length,
      currentSentence: 'Playback complete',
      status: 'ready'
    });

    onChunkComplete?.();
  };

  // Stop playback
  const stopPlayback = () => {
    setIsPlaying(false);
    audioRefs.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }

    updateProgress({
      total: audioQueue.length,
      completed: 0,
      currentSentence: 'Stopped',
      status: 'ready'
    });
  };

  // API calls with IndexedDB caching integration
  const getCachedAudio = async (): Promise<SentenceAudio[] | null> => {
    try {
      // First check IndexedDB cache for instant loading
      if (!audioCacheDB) {
        console.log('AudioCacheDB not available (SSR), skipping cache check');
        return null;
      }
      const cachedAudio = await audioCacheDB.getChunkAudio(bookId, chunkIndex, cefrLevel, voiceId);
      
      if (cachedAudio.length > 0) {
        console.log(`Cache hit: Found ${cachedAudio.length} cached audio sentences`);
        
        // Convert cached data to SentenceAudio format
        const sentenceAudios = await Promise.all(
          cachedAudio.map(async (cached: any) => {
            const audioUrl = URL.createObjectURL(cached.audioBlob);
            return {
              text: cached.text,
              audioUrl,
              duration: cached.duration,
              wordTimings: cached.wordTimings,
              sentenceIndex: cached.sentenceIndex
            };
          })
        );
        
        return sentenceAudios;
      }

      // Fallback to database cache API if not in IndexedDB
      const response = await fetch(
        `/api/audio/cache?bookId=${bookId}&chunkIndex=${chunkIndex}&cefrLevel=${cefrLevel}&voiceId=${voiceId}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.audioData || null;
      }
    } catch (error) {
      console.error('Failed to get cached audio:', error);
    }
    return null;
  };

  const splitTextIntoSentences = async (text: string): Promise<string[]> => {
    // Use TextProcessor for sentence optimization
    const { TextProcessor } = await import('../../lib/text-processor');
    const processedSentences = TextProcessor.splitIntoSentences(text);
    return processedSentences.map(s => s.text);
  };

  const generateSentenceAudio = async (sentence: string, sentenceIndex: number): Promise<SentenceAudio> => {
    try {
      // Generate real audio using existing TTS infrastructure
      const audioResult = await callRealTTSAPI(sentence, voiceId);
      
      // Generate precise word timings using the best available method
      const timingResult = await generateWordTimings(sentence, audioResult.audioUrl, voiceId);

      const sentenceAudio: SentenceAudio = {
        text: sentence,
        audioUrl: audioResult.audioUrl,
        duration: timingResult.actualDuration, // Use actual duration from timing analysis
        wordTimings: timingResult.wordTimings,
        sentenceIndex
      };

      // Cache generated audio in IndexedDB for instant future access
      try {
        // Convert audio URL to blob for caching
        const response = await fetch(audioResult.audioUrl);
        const audioBlob = await response.blob();
        
        if (audioCacheDB) {
          await audioCacheDB.storeAudioSentence(
            bookId,
            chunkIndex,
            cefrLevel,
            voiceId,
            sentenceIndex,
            audioBlob,
            sentenceAudio.duration,
            sentenceAudio.wordTimings,
            sentence
          );
          console.log(`Cached sentence ${sentenceIndex} in IndexedDB`);
        }
      } catch (error) {
        console.warn('Failed to cache audio in IndexedDB:', error);
      }

      return sentenceAudio;
      
    } catch (error) {
      console.error(`Failed to generate audio for sentence ${sentenceIndex}:`, error);
      
      // Fallback to mock data if TTS fails
      const mockWordTimings: WordTiming[] = sentence.split(' ').map((word, index) => ({
        word: word.replace(/[.,!?]/g, ''),
        startTime: index * 0.5,
        endTime: (index + 1) * 0.5,
        wordIndex: index
      }));

      return {
        text: sentence,
        audioUrl: `data:audio/wav;base64,fallback-mock-${sentenceIndex}`,
        duration: sentence.split(' ').length * 0.5,
        wordTimings: mockWordTimings,
        sentenceIndex
      };
    }
  };

  // Helper function to call real TTS APIs with precise duration detection
  const callRealTTSAPI = async (text: string, voiceId: string): Promise<{ audioUrl: string; duration: number }> => {
    // Determine provider based on voiceId
    const isElevenLabs = voiceId.startsWith('eleven_');
    const isOpenAI = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(voiceId);
    
    let audioBlob: Blob;
    
    if (isElevenLabs) {
      // Use ElevenLabs API
      const response = await fetch('/api/elevenlabs/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice_id: voiceId.replace('eleven_', ''),
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
      }

      audioBlob = await response.blob();
      
    } else if (isOpenAI) {
      // Use OpenAI TTS API
      const response = await fetch('/api/openai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: voiceId,
          speed: 1.0
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI TTS failed: ${response.statusText}`);
      }

      audioBlob = await response.blob();
      
    } else {
      throw new Error(`Unsupported voice provider for voiceId: ${voiceId}`);
    }

    // Create audio URL
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Get real audio duration by loading the audio
    const actualDuration = await getAudioDuration(audioUrl);
    
    return { audioUrl, duration: actualDuration };
  };

  // Helper function to get precise audio duration
  const getAudioDuration = async (audioUrl: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      const onLoadedMetadata = () => {
        const duration = audio.duration;
        cleanup();
        
        if (isNaN(duration) || duration === 0) {
          // Fallback to estimated duration if audio metadata is invalid
          console.warn('Could not get audio duration, using estimation');
          resolve(5.0); // 5 second fallback
        } else {
          resolve(duration);
        }
      };
      
      const onError = () => {
        cleanup();
        console.warn('Audio loading failed, using estimated duration');
        // Fallback to word-based estimation
        const estimatedDuration = audioUrl.includes('eleven') ? 3.0 : 2.5;
        resolve(estimatedDuration);
      };
      
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('error', onError);
        audio.src = '';
      };
      
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('error', onError);
      
      // Set source and trigger loading
      audio.src = audioUrl;
      audio.preload = 'metadata';
      
      // Timeout fallback after 3 seconds
      setTimeout(() => {
        if (audio.readyState === 0) {
          cleanup();
          console.warn('Audio duration detection timeout, using estimation');
          resolve(3.0);
        }
      }, 3000);
    });
  };

  // Helper function to generate precise word timings
  const generateWordTimings = async (text: string, audioUrl: string, voiceId: string): Promise<{ wordTimings: WordTiming[]; actualDuration: number }> => {
    try {
      // Determine the best timing method for this voice
      const provider = WordTimingGenerator.getBestTimingMethod(voiceId);
      
      console.log(`Generating word timings using ${provider} for voice ${voiceId}`);
      
      // Generate precise timings
      const result = await wordTimingGenerator.generateWordTimings({
        text,
        voiceId,
        provider,
        audioUrl
      });
      
      console.log(`Word timing accuracy: ${result.accuracy} using ${result.method}`);
      
      return {
        wordTimings: result.wordTimings,
        actualDuration: result.actualDuration
      };
      
    } catch (error) {
      console.error('Precise word timing generation failed, using estimated:', error);
      
      // Fallback to estimated timings
      const words = text.split(' ');
      const avgWordDuration = 0.6; // 600ms per word
      const wordTimings: WordTiming[] = words.map((word, index) => ({
        word: word.replace(/[.,!?]/g, ''),
        startTime: index * avgWordDuration,
        endTime: (index + 1) * avgWordDuration,
        wordIndex: index
      }));
      
      return {
        wordTimings,
        actualDuration: words.length * avgWordDuration
      };
    }
  };

  // Progress indicator component
  const ProgressIndicator = () => (
    <motion.div 
      className="progressive-audio-progress"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        background: 'rgba(102, 126, 234, 0.1)',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#94a3b8'
      }}
    >
      {/* Progress bar */}
      <div style={{
        width: '100px',
        height: '4px',
        background: 'rgba(148, 163, 184, 0.3)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <motion.div
          style={{
            height: '100%',
            background: isPlaying ? '#10b981' : '#667eea',
            borderRadius: '2px'
          }}
          initial={{ width: 0 }}
          animate={{ 
            width: progress.total > 0 ? `${(progress.completed / progress.total) * 100}%` : '0%'
          }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      {/* Status text */}
      <span style={{ minWidth: '120px' }}>
        {progress.completed}/{progress.total} • {progress.status}
      </span>
      
      {/* Loading spinner */}
      {(isLoading || progress.status === 'generating') && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '12px',
            height: '12px',
            border: '2px solid #667eea',
            borderTop: '2px solid transparent',
            borderRadius: '50%'
          }}
        />
      )}
    </motion.div>
  );

  // Minimal, compact, prominent, and wireframe layouts
  return (
    <div className={`progressive-audio-player ${className}`}>
      {className?.includes('prominent') ? (
        // Prominent layout - round play button same size as CEFR
        <motion.button
          onClick={isPlaying ? stopPlayback : startPlayback}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-full flex items-center justify-center text-white transition-all duration-200 flex-shrink-0"
          style={{
            border: '3px solid #667eea',
            background: '#667eea',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
            width: '60px',
            height: '60px',
            fontSize: '22px'
          }}
        >
          {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
        </motion.button>
      ) : className?.includes('minimal') ? (
        // Minimal wireframe layout - just the play button (consistent 48px)
        <motion.button
          onClick={isPlaying ? stopPlayback : startPlayback}
          disabled={isLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg transition-all duration-200 flex-shrink-0"
          style={{
            border: 'none',
            background: '#667eea', // Blue like wireframe
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
        >
          {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
        </motion.button>
      ) : className?.includes('compact') ? (
        // Compact wireframe-style layout
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            onClick={isPlaying ? stopPlayback : startPlayback}
            disabled={isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              background: isPlaying 
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
          >
            {isLoading ? '⏳' : isPlaying ? '⏹' : '▶'}
          </motion.button>

          {/* Compact progress */}
          <div style={{ 
            fontSize: '12px', 
            color: '#94a3b8',
            minWidth: '80px'
          }}>
            {progress.completed}/{progress.total} • {progress.status}
          </div>

          {(isLoading || progress.status === 'generating') && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid #667eea',
                borderTop: '2px solid transparent',
                borderRadius: '50%'
              }}
            />
          )}
        </div>
      ) : (
        // Full layout
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                : 'linear-gradient(135deg, #10b981, #059669)',
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

          {isEnhanced && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                fontSize: '11px',
                borderRadius: '12px'
              }}
            >
              ⚡ Progressive
            </motion.div>
          )}
        </div>
      )}

      {/* Error display */}
      {progress.status === 'error' && (
        <div style={{
          marginTop: '8px',
          padding: '6px 12px',
          background: 'rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          fontSize: '12px',
          borderRadius: '6px',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          Audio generation failed. Please try again.
        </div>
      )}
    </div>
  );
};