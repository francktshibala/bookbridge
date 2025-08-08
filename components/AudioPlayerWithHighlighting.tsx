'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceService, VoiceProvider } from '@/lib/voice-service';
import { ELEVENLABS_VOICES, DEFAULT_ELEVENLABS_VOICE } from '@/lib/elevenlabs-voices';
import { highlightingManager } from '@/lib/highlighting-manager';

interface AudioPlayerWithHighlightingProps {
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  className?: string;
  enableHighlighting?: boolean;
  showHighlightedText?: boolean;
}

export const AudioPlayerWithHighlighting: React.FC<AudioPlayerWithHighlightingProps> = ({
  text,
  onStart,
  onEnd,
  onError,
  className = '',
  enableHighlighting = true,
  showHighlightedText = true
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [words, setWords] = useState<string[]>([]);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('web-speech');
  const [openAIVoice, setOpenAIVoice] = useState<string>('alloy');
  const [elevenLabsVoice, setElevenLabsVoice] = useState<string>(DEFAULT_ELEVENLABS_VOICE);
  const [playbackRate, setPlaybackRate] = useState(0.9);
  const [volume, setVolume] = useState(0.8);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [lastHighlightedWord, setLastHighlightedWord] = useState<number>(-1);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceService.stop();
      if (currentSessionId) {
        highlightingManager.endSession(currentSessionId);
      }
    };
  }, [currentSessionId]);
  
  // Stop audio when voice provider changes
  useEffect(() => {
    voiceService.stop();
  }, [voiceProvider]);

  // Voice options
  const openAIVoices = [
    { id: 'alloy', name: 'Alloy (Neutral)' },
    { id: 'echo', name: 'Echo (Male)' },
    { id: 'fable', name: 'Fable (British Male)' },
    { id: 'onyx', name: 'Onyx (Deep Male)' },
    { id: 'nova', name: 'Nova (Female)' },
    { id: 'shimmer', name: 'Shimmer (Soft Female)' }
  ];

  useEffect(() => {
    // Debug logging for troubleshooting
    console.log('[VOICE DEBUG] Text received:', {
      length: text?.length || 0,
      preview: text?.substring(0, 100) || 'No text',
      hasSpecialChars: /[^\w\s.,!?;:'"()-]/.test(text || '')
    });

    // Sanitize text first, then split into words
    const sanitized = text
      .replace(/[^\w\s.,!?;:'"()-]/g, ' ')  // Keep only safe chars
      .replace(/\s+/g, ' ')                   // Normalize whitespace
      .trim();

    // Split sanitized text into words for highlighting, preserving punctuation
    const processedWords = sanitized
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.trim());
    
    setWords(processedWords);
    console.log(`🎯 Processed ${processedWords.length} words for highlighting from sanitized text`);
  }, [text]);

  const stopHighlighting = () => {
    if (currentSessionId) {
      highlightingManager.stopHighlighting(currentSessionId);
    }
    setHighlightIndex(-1);
    setLastHighlightedWord(-1);
  };

  const handleWordHighlight = (wordIndex: number) => {
    console.log(`🎯 handleWordHighlight called: word ${wordIndex} "${words[wordIndex]}"`);
    setHighlightIndex(wordIndex);
  };

  // Sanitize and chunk text for faster TTS response
  const sanitizeTextForTTS = (text: string): string => {
    // Remove potentially problematic characters
    let sanitized = text
      .replace(/[^\w\s.,!?;:'"()-]/g, ' ')  // Keep only safe chars
      .replace(/\s+/g, ' ')                   // Normalize whitespace
      .trim();
    
    // Use smaller chunks for faster initial response
    const limits = {
      'openai': 1500,        // Smaller chunks = faster response
      'elevenlabs': 2000,    // Smaller chunks = faster response
      'elevenlabs-websocket': 5000,  // WebSocket can handle more
      'web-speech': 10000    // Web Speech can handle long text
    };
    
    const maxLength = limits[voiceProvider] || 1500;
    if (sanitized.length > maxLength) {
      // Find a good breaking point (end of sentence)
      let breakPoint = maxLength;
      const sentenceEnders = /[.!?]\s+/g;
      let match;
      
      while ((match = sentenceEnders.exec(sanitized)) !== null) {
        if (match.index < maxLength) {
          breakPoint = match.index + match[0].length;
        } else {
          break;
        }
      }
      
      sanitized = sanitized.substring(0, breakPoint).trim();
      console.warn(`[VOICE DEBUG] Text chunked from ${text.length} to ${sanitized.length} chars for ${voiceProvider} (faster response)`);
    }
    
    return sanitized;
  };

  const handlePlay = async () => {
    // Always stop any existing audio first
    voiceService.stop();
    
    // Stop if already playing
    if (isPlaying) {
      stopHighlighting();
      setIsPlaying(false);
      if (currentSessionId) {
        highlightingManager.endSession(currentSessionId);
        setCurrentSessionId(null);
      }
      return;
    }

    if (!enableHighlighting || words.length === 0) {
      console.log('🎯 Highlighting disabled or no words to highlight');
    }

    setIsLoading(true);
    console.log(`🎵 Starting ${voiceProvider} audio generation...`);
    console.log('[VOICE DEBUG] Original text length:', text.length);

    try {
      // Use sanitized text for BOTH voice synthesis and highlighting
      const sanitizedText = sanitizeTextForTTS(text);
      console.log('[VOICE DEBUG] Sanitized text length:', sanitizedText.length);

      // Start new highlighting session with the SAME sanitized text
      const sessionId = await highlightingManager.startSession({
        provider: voiceProvider,
        text: sanitizedText,  // Use sanitized text for highlighting too!
        enableHighlighting,
        onWordHighlight: handleWordHighlight,
        onError: (error) => {
          console.error('🎯 Highlighting error:', error);
          onError?.(error);
        }
      });
      
      setCurrentSessionId(sessionId);
      setLastHighlightedWord(-1); // Reset word tracking for new session
      console.log(`🎯 Started highlighting session: ${sessionId}`);
      console.log(`🎯 Session stored in component state as currentSessionId: ${sessionId}`);

      await voiceService.speak({
        text: sanitizedText,
        settings: {
          volume,
          rate: playbackRate,
          provider: voiceProvider,
          voice: undefined, // Web Speech API will use system default
          openAIVoice: voiceProvider === 'openai' ? openAIVoice : undefined,
          elevenLabsVoice: voiceProvider === 'elevenlabs' ? elevenLabsVoice : undefined
        },
        onStart: () => {
          console.log('🎵 Audio generation completed');
          setIsPlaying(true);
          setIsLoading(false);
          onStart?.();
          
          // For Web Speech, start highlighting immediately since there's no onActuallyPlaying
          // Use the session ID we just created, not the component state which might not be updated yet
          if (voiceProvider === 'web-speech' && sessionId && enableHighlighting) {
            console.log(`🎯 Starting Web Speech highlighting immediately with session: ${sessionId}`);
            const sessionInfo = highlightingManager.getSessionInfo();
            console.log(`🎯 Session info:`, sessionInfo);
            const success = highlightingManager.startHighlighting(sessionId, null as any, handleWordHighlight);
            if (!success) {
              console.error(`🎯 Failed to start highlighting for session ${sessionId}`);
            }
          }
        },
        onAudioReady: (audioBuffer) => {
          // For OpenAI, prepare Whisper alignment in parallel (non-blocking)
          if (voiceProvider === 'openai' && sessionId) {
            console.log('🎯 Starting Whisper alignment in background...');
            
            // Run Whisper alignment in parallel - don't await it!
            highlightingManager.prepareAlignment(sessionId, audioBuffer)
              .then(success => {
                if (success) {
                  console.log('🎯 Whisper alignment completed successfully');
                } else {
                  console.error('🎯 Whisper alignment failed - falling back to time-based highlighting');
                }
              })
              .catch(error => {
                console.error('🎯 Whisper alignment error:', error);
              });
          }
        },
        onActuallyPlaying: (duration) => {
          // Start highlighting when audio actually plays
          if (sessionId && enableHighlighting) {
            const audioElement = voiceService.getCurrentAudioElement();
            if (audioElement) {
              console.log(`🎵 Audio playing with duration: ${duration.toFixed(1)}s - starting highlighting`);
              highlightingManager.startHighlighting(sessionId, audioElement, handleWordHighlight);
            }
          }
        },
        onEnd: () => {
          console.log('🎵 Audio finished');
          stopHighlighting();
          setIsPlaying(false);
          if (currentSessionId) {
            highlightingManager.endSession(currentSessionId);
            setCurrentSessionId(null);
          }
          onEnd?.();
        },
        onError: (error) => {
          console.error('🎵 Audio error:', error);
          stopHighlighting();
          setIsLoading(false);
          setIsPlaying(false);
          if (currentSessionId) {
            highlightingManager.endSession(currentSessionId);
            setCurrentSessionId(null);
          }
          onError?.(error.error || 'Audio playback failed');
        },
        onWordBoundary: (info) => {
          // Handle Web Speech boundary events through highlighting manager
          // Use the session ID we just created, not component state
          console.log(`🎯 onWordBoundary received:`, { voiceProvider, sessionId, enableHighlighting, wordIndex: info.wordIndex });
          if (voiceProvider === 'web-speech' && sessionId && enableHighlighting) {
            console.log(`🎯 Calling highlightingManager.handleWebSpeechBoundary`);
            highlightingManager.handleWebSpeechBoundary(sessionId, info.wordIndex, handleWordHighlight);
          } else {
            console.log(`🎯 onWordBoundary conditions not met:`, { 
              isWebSpeech: voiceProvider === 'web-speech',
              hasSession: !!sessionId,
              highlightingEnabled: enableHighlighting 
            });
          }
        },
        onCharacterBoundary: (info) => {
          // Handle ElevenLabs WebSocket character boundary events through highlighting manager
          console.log(`🎯 onCharacterBoundary received:`, { 
            voiceProvider, 
            sessionId, 
            currentSessionId,
            enableHighlighting, 
            wordIndex: info.wordIndex 
          });
          
          // Try both sessionId (local) and currentSessionId (state) to ensure we catch the events
          const activeSessionId = sessionId || currentSessionId;
          
          if (voiceProvider === 'elevenlabs-websocket' && activeSessionId && enableHighlighting) {
            console.log(`🎯 Calling highlightingManager.handleElevenLabsWebSocketBoundary with session ${activeSessionId}`);
            highlightingManager.handleElevenLabsWebSocketBoundary(activeSessionId, info.wordIndex, handleWordHighlight);
          } else {
            console.log(`🎯 onCharacterBoundary conditions not met:`, { 
              isElevenLabsWebSocket: voiceProvider === 'elevenlabs-websocket',
              hasSession: !!activeSessionId,
              sessionId,
              currentSessionId,
              highlightingEnabled: enableHighlighting 
            });
          }
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      setIsLoading(false);
      setIsPlaying(false);
      if (currentSessionId) {
        highlightingManager.endSession(currentSessionId);
        setCurrentSessionId(null);
      }
      onError?.('Failed to play audio');
    }
  };

  return (
    <div className={`audio-player-with-highlighting ${className}`}>
      {/* Highlighted Text Display */}
      {showHighlightedText && enableHighlighting && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-lg leading-relaxed">
            {words.map((word, index) => (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  padding: '3px 8px',
                  margin: '1px 3px',
                  borderRadius: '6px',
                  backgroundColor: index === highlightIndex ? '#fbbf24' : 'transparent',
                  color: index === highlightIndex ? '#111827' : 'inherit',
                  fontWeight: index === highlightIndex ? '600' : 'normal',
                  fontSize: index === highlightIndex ? '1.05em' : '1em',
                  transform: index === highlightIndex ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: index === highlightIndex ? '0 2px 4px rgba(251, 191, 36, 0.3)' : 'none',
                  transition: voiceProvider === 'web-speech' 
                    ? 'all 0.15s ease-out' 
                    : voiceProvider === 'elevenlabs-websocket'
                      ? 'all 0.12s ease-out' // Faster transitions for WebSocket
                      : 'all 0.25s ease-out'
                }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
        {/* Play/Stop Button */}
        <button
          onClick={handlePlay}
          disabled={isLoading}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            isLoading 
              ? 'bg-gray-300 cursor-not-allowed' 
              : isPlaying 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isLoading ? 'Loading...' : isPlaying ? 'Stop' : 'Play'}
        </button>

        {/* Voice Provider Selection */}
        <select
          value={voiceProvider}
          onChange={(e) => setVoiceProvider(e.target.value as VoiceProvider)}
          disabled={isPlaying || isLoading}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="web-speech">Standard Voice</option>
          <option value="openai">OpenAI Voice</option>
          <option value="elevenlabs">ElevenLabs Voice</option>
          <option value="elevenlabs-websocket">ElevenLabs WebSocket (Perfect Sync)</option>
        </select>

        {/* Voice Selection for OpenAI */}
        {voiceProvider === 'openai' && (
          <select
            value={openAIVoice}
            onChange={(e) => setOpenAIVoice(e.target.value)}
            disabled={isPlaying || isLoading}
            className="px-3 py-2 border rounded-lg"
          >
            {openAIVoices.map(voice => (
              <option key={voice.id} value={voice.id}>{voice.name}</option>
            ))}
          </select>
        )}

        {/* Voice Selection for ElevenLabs */}
        {voiceProvider === 'elevenlabs' && (
          <select
            value={elevenLabsVoice}
            onChange={(e) => setElevenLabsVoice(e.target.value)}
            disabled={isPlaying || isLoading}
            className="px-3 py-2 border rounded-lg"
          >
            {Object.entries(ELEVENLABS_VOICES).map(([key, voice]) => (
              <option key={key} value={voice.voice_id}>{voice.name}</option>
            ))}
          </select>
        )}

        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <label className="text-sm">Speed:</label>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
            disabled={isPlaying || isLoading}
            className="w-20"
          />
          <span className="text-sm">{playbackRate}x</span>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <label className="text-sm">Volume:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            disabled={isPlaying || isLoading}
            className="w-20"
          />
        </div>
      </div>

      {/* Status Display */}
      <div className="mt-2 text-sm text-gray-600 text-center">
        <div>Words loaded: {words.length}</div>
        <div>Highlight index: {highlightIndex}</div>
        <div>Current session: {currentSessionId}</div>
        <div>Enable highlighting: {enableHighlighting ? 'Yes' : 'No'}</div>
        {highlightIndex >= 0 && (
          <div>Currently highlighting: Word {highlightIndex + 1} of {words.length} - "{words[highlightIndex]}"</div>
        )}
      </div>
    </div>
  );
};