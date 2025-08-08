'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceService, VoiceProvider } from '@/lib/voice-service';
import { ELEVENLABS_VOICES, DEFAULT_ELEVENLABS_VOICE } from '@/lib/elevenlabs-voices';
import { highlightingManager } from '@/lib/highlighting-manager';

interface SmartAudioPlayerProps {
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  className?: string;
  enableHighlighting?: boolean;
  showHighlightedText?: boolean;
  targetElementId?: string;
  variant?: 'reading' | 'chat' | 'default';
}

export const SmartAudioPlayer: React.FC<SmartAudioPlayerProps> = ({
  text,
  onStart,
  onEnd,
  onError,
  className = '',
  enableHighlighting = true,
  showHighlightedText = true,
  targetElementId,
  variant = 'default'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [words, setWords] = useState<string[]>([]);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('web-speech');
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(1);
  const [chunks, setChunks] = useState<{original: string, sanitized: string}[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Debug logging to track component lifecycle
  useEffect(() => {
    console.log('🎵 SmartAudioPlayer mounted, variant:', variant);
    return () => {
      console.log('🎵 SmartAudioPlayer unmounting, variant:', variant);
    };
  }, []);

  useEffect(() => {
    console.log('🎵 SmartAudioPlayer text changed, length:', text?.length || 0, 'variant:', variant);
  }, [text, variant]);

  // Smart text chunking based on provider capabilities
  const createSmartChunks = (text: string, provider: VoiceProvider): {original: string, sanitized: string}[] => {
    const limits = {
      'web-speech': 5000,    // Web Speech can handle more
      'openai': 1200,        // Smaller for faster response
      'elevenlabs': 1800,    // Moderate size
      'elevenlabs-websocket': 10000  // WebSocket can stream
    };

    const maxLength = limits[provider] || 1200;
    
    if (text.length <= maxLength) {
      const sanitized = text
        .replace(/[^\w\s.,!?;:'"()-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return [{original: text, sanitized}];
    }

    // Smart chunking at sentence boundaries on original text
    const chunks: {original: string, sanitized: string}[] = [];
    const sentences = text.split(/([.!?]+\s+)/);
    let currentChunk = '';

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] + (sentences[i + 1] || '');
      
      if (currentChunk.length + sentence.length > maxLength && currentChunk.length > 0) {
        const original = currentChunk.trim();
        const sanitized = original
          .replace(/[^\w\s.,!?;:'"()-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        chunks.push({original, sanitized});
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim()) {
      const original = currentChunk.trim();
      const sanitized = original
        .replace(/[^\w\s.,!?;:'"()-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      chunks.push({original, sanitized});
    }

    console.log(`[SMART AUDIO] Created ${chunks.length} chunks for ${provider}:`, 
      chunks.map(c => `${c.original.length} chars`));

    return chunks;
  };

  // Update chunks when text or provider changes
  useEffect(() => {
    const newChunks = createSmartChunks(text, voiceProvider);
    setChunks(newChunks);
    setTotalChunks(newChunks.length);
    setCurrentChunk(0);

    // Create words from ORIGINAL first chunk for proper display
    if (newChunks[0]) {
      const wordsArray = newChunks[0].original
        .split(/\s+/) // Split on whitespace
        .filter(word => word.trim().length > 0); // Only keep actual words
      setWords(wordsArray);
      console.log('[SMART AUDIO] Display words (simple):', wordsArray.slice(0, 10), '...');
    }
  }, [text, voiceProvider]);

  const handleWordHighlight = (wordIndex: number) => {
    console.log(`🎯 Highlighting word ${wordIndex}: "${words[wordIndex] || 'undefined'}"`);
    console.log(`🎯 targetElementId: "${targetElementId}"`);
    
    if (targetElementId) {
      // Highlight external element instead of internal state
      const targetElement = document.getElementById(targetElementId);
      console.log(`🎯 targetElement found:`, !!targetElement);
      if (targetElement) {
        console.log(`🎯 Calling highlightWordInElement for word ${wordIndex}`);
        highlightWordInElement(targetElement, wordIndex);
      } else {
        console.error(`🎯 Element with ID "${targetElementId}" not found!`);
      }
    } else {
      // Use internal state for showing highlighted text
      console.log(`🎯 Using internal highlighting (no targetElementId)`);
      setHighlightIndex(wordIndex);
    }
  };

  const highlightWordInElement = (element: HTMLElement, wordIndex: number) => {
    console.log(`🎯 highlightWordInElement called: wordIndex=${wordIndex}, element=`, element);
    if (wordIndex < 0) return;
    
    // Store original HTML if not already stored (for proper cleanup later)
    if (!element.dataset.originalHtml) {
      element.dataset.originalHtml = element.innerHTML;
    }
    
    // Get the text content and split into words
    const textContent = element.textContent || '';
    const words = textContent.split(/\s+/).filter(word => word.trim().length > 0);
    
    console.log(`🎯 Total words found: ${words.length}, target index: ${wordIndex}`);
    
    if (wordIndex >= words.length) {
      console.warn(`🎯 Word index ${wordIndex} out of bounds (total words: ${words.length})`);
      return;
    }
    
    const targetWord = words[wordIndex];
    console.log(`🎯 Target word to highlight: "${targetWord}"`);
    
    // Escape special regex characters in the word
    const escapeRegex = (str: string) => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    
    // Start with original HTML to clear any previous highlights
    let html = element.dataset.originalHtml || element.innerHTML;
    
    // Remove any existing highlight spans first
    html = html.replace(/<span class="[^"]*highlight-word[^"]*"[^>]*>(.*?)<\/span>/gi, '$1');
    
    // Create a more robust approach: split HTML by tags to process text separately
    let wordCount = 0;
    let foundAndHighlighted = false;
    
    // Function to process text nodes and highlight the target word
    const processTextForHighlighting = (text: string): string => {
      const textWords = text.split(/(\s+)/); // Keep whitespace
      let result = '';
      
      for (let i = 0; i < textWords.length; i++) {
        const part = textWords[i];
        // Skip whitespace parts
        if (/^\s+$/.test(part)) {
          result += part;
          continue;
        }
        
        // Check if this word matches our target (considering it might have punctuation)
        const cleanWord = part.replace(/[^\w'-]/g, ''); // Remove punctuation except apostrophes and hyphens
        const targetClean = targetWord.replace(/[^\w'-]/g, '');
        
        if (cleanWord.toLowerCase() === targetClean.toLowerCase() && wordCount === wordIndex && !foundAndHighlighted) {
          console.log(`🎯 Highlighting word ${wordCount}: "${part}"`);
          result += `<span class="bg-yellow-300 text-black px-1 rounded transition-all duration-200 highlight-word">${part}</span>`;
          foundAndHighlighted = true;
        } else {
          result += part;
        }
        
        // Only increment for actual words, not whitespace
        if (part.trim().length > 0) {
          wordCount++;
        }
      }
      
      return result;
    };
    
    // Split HTML content while preserving tags
    const htmlParts = html.split(/(<[^>]+>)/);
    let processedHtml = '';
    let insideTag = false;
    
    for (const part of htmlParts) {
      if (part.startsWith('<') && part.endsWith('>')) {
        // This is an HTML tag, keep it as is
        processedHtml += part;
        insideTag = part.startsWith('<script') || part.startsWith('<style');
        if (part.startsWith('</script') || part.startsWith('</style')) {
          insideTag = false;
        }
      } else if (!insideTag && part.trim().length > 0) {
        // This is text content, process it for highlighting
        processedHtml += processTextForHighlighting(part);
      } else {
        // Keep as is (empty strings or content inside script/style tags)
        processedHtml += part;
      }
    }
    
    html = processedHtml;
    
    if (!foundAndHighlighted) {
      console.warn(`🎯 Could not highlight word at index ${wordIndex}: "${targetWord}"`);
    }
    
    // Update the element's HTML
    element.innerHTML = html;
    
    // Scroll the highlighted word into view
    const highlightedSpan = element.querySelector('.highlight-word');
    if (highlightedSpan) {
      console.log(`🎯 Successfully highlighted word, scrolling into view`);
      highlightedSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      console.warn(`🎯 Warning: Highlight span not found after replacement`);
    }
  };

  const playNextChunk = async (chunkIndex: number) => {
    if (chunkIndex >= chunks.length) {
      // All chunks played
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentChunk(0);
      setHighlightIndex(-1);
      
      // Clear external highlighting if using targetElementId
      if (targetElementId) {
        const targetElement = document.getElementById(targetElementId);
        if (targetElement) {
          // Restore original HTML if it was stored
          if (targetElement.dataset.originalHtml) {
            targetElement.innerHTML = targetElement.dataset.originalHtml;
            delete targetElement.dataset.originalHtml;
          } else {
            // Fallback: remove highlight spans
            targetElement.innerHTML = targetElement.innerHTML.replace(
              /<span class="[^"]*highlight-word[^"]*"[^>]*>(.*?)<\/span>/gi, 
              '$1'
            );
          }
        }
      }
      
      if (currentSessionId) {
        highlightingManager.endSession(currentSessionId);
        setCurrentSessionId(null);
      }
      onEnd?.();
      return;
    }

    const chunk = chunks[chunkIndex];
    setCurrentChunk(chunkIndex);
    setHighlightIndex(-1); // Reset highlighting for new chunk

    // Use original text for display (simple word splitting)
    const chunkWords = chunk.original
      .split(/\s+/) // Split on whitespace
      .filter(word => word.trim().length > 0); // Only keep actual words
    
    setWords(chunkWords);
    console.log(`[SMART AUDIO] Playing chunk ${chunkIndex + 1}/${chunks.length}: ${chunk.sanitized.length} chars`);
    console.log(`[SMART AUDIO] Display words (simple):`, chunkWords.slice(0, 10), '...');

    try {
      // Start highlighting session for this chunk (use ORIGINAL text for highlighting)
      const sessionId = await highlightingManager.startSession({
        provider: voiceProvider,
        text: chunk.original, // Use original text for highlighting
        enableHighlighting,
        onWordHighlight: handleWordHighlight,
        onError: (error) => {
          console.error('🎯 Highlighting error:', error);
          onError?.(error);
        }
      });
      
      setCurrentSessionId(sessionId);

      await voiceService.speak({
        text: chunk.sanitized, // Use sanitized text for voice synthesis
        settings: {
          volume: 0.8,
          rate: 0.9,
          provider: voiceProvider,
          voice: undefined,
          openAIVoice: voiceProvider === 'openai' ? 'alloy' : undefined,
          elevenLabsVoice: voiceProvider === 'elevenlabs' || voiceProvider === 'elevenlabs-websocket' ? DEFAULT_ELEVENLABS_VOICE : undefined
        },
        onStart: () => {
          setIsLoading(false); // Stop loading, start playing
          if (chunkIndex === 0) {
            onStart?.();
          }
          
          // Start highlighting immediately for Web Speech
          if (voiceProvider === 'web-speech' && sessionId && enableHighlighting) {
            console.log(`🎯 Starting Web Speech highlighting for chunk ${chunkIndex + 1}`);
            highlightingManager.startHighlighting(sessionId, null as any, handleWordHighlight);
          }
        },
        onEnd: () => {
          // End current session
          if (sessionId) {
            highlightingManager.endSession(sessionId);
          }
          setCurrentSessionId(null);
          setHighlightIndex(-1);
          
          // Auto-play next chunk
          setTimeout(() => {
            playNextChunk(chunkIndex + 1);
          }, 200); // Small gap between chunks
        },
        onError: (error) => {
          console.error('Chunk playback error:', error);
          onError?.(error.toString());
          setIsPlaying(false);
          setIsLoading(false);
        },
        onActuallyPlaying: (duration) => {
          setIsLoading(false); // Ensure loading stops when audio actually plays
          if (sessionId && enableHighlighting && voiceProvider !== 'web-speech') {
            const audioElement = voiceService.getCurrentAudioElement();
            if (audioElement) {
              console.log(`🎯 Starting highlighting for ${voiceProvider} chunk ${chunkIndex + 1}`);
              highlightingManager.startHighlighting(sessionId, audioElement, handleWordHighlight);
            }
          }
        },
        onWordBoundary: (info) => {
          // Handle Web Speech boundary events through highlighting manager
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
      console.error('Error playing chunk:', error);
      onError?.(`Error playing chunk ${chunkIndex + 1}: ${error}`);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const handlePlay = async () => {
    // Stop if already playing
    if (isPlaying || isLoading) {
      console.log('[SMART AUDIO] Stopping playback');
      voiceService.stop();
      setIsPlaying(false);
      setIsLoading(false);
      setHighlightIndex(-1);
      
      // Clear external highlighting if using targetElementId
      if (targetElementId) {
        const targetElement = document.getElementById(targetElementId);
        if (targetElement) {
          // Restore original HTML if it was stored
          if (targetElement.dataset.originalHtml) {
            targetElement.innerHTML = targetElement.dataset.originalHtml;
            delete targetElement.dataset.originalHtml;
          } else {
            // Fallback: remove highlight spans
            targetElement.innerHTML = targetElement.innerHTML.replace(
              /<span class="[^"]*highlight-word[^"]*"[^>]*>(.*?)<\/span>/gi, 
              '$1'
            );
          }
        }
      }
      
      if (currentSessionId) {
        highlightingManager.endSession(currentSessionId);
        setCurrentSessionId(null);
      }
      return;
    }

    if (chunks.length === 0) {
      onError?.('No text to play');
      return;
    }

    console.log('[SMART AUDIO] Starting playback');
    setIsLoading(true);
    setIsPlaying(true);
    setHighlightIndex(-1);

    // Start playing from first chunk (loading will be set to false in playNextChunk)
    await playNextChunk(0);
  };

  // Variant-specific styling
  const containerClasses = {
    reading: 'w-full max-w-4xl mx-auto p-6 bg-slate-900/40 backdrop-blur-lg border border-slate-700/50 rounded-2xl shadow-2xl',
    chat: 'w-full max-w-md p-4 bg-slate-800/70 backdrop-blur-md border border-slate-600/40 rounded-xl shadow-lg',
    default: 'w-full p-4 bg-slate-800/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg'
  };

  const buttonSizeClasses = {
    reading: 'py-4 px-8 text-lg',
    chat: 'py-3 px-6 text-base',
    default: 'py-4 px-8 text-base'
  };

  const textDisplayClasses = {
    reading: 'mb-8 p-8 text-xl leading-relaxed',
    chat: 'mb-4 p-4 text-base leading-normal',
    default: 'mb-6 p-6 text-lg leading-relaxed'
  };

  return (
    <div className={`smart-audio-player ${containerClasses[variant]} ${className}`}>
      {/* Voice Provider Selection - Hide in chat variant if space is tight */}
      {variant !== 'chat' && (
        <div className="mb-6">
          <label className="block text-white/90 text-base font-medium mb-3">Voice Provider:</label>
          <select
            value={voiceProvider}
            onChange={(e) => setVoiceProvider(e.target.value as VoiceProvider)}
            className="w-full p-3 bg-slate-800/80 border border-slate-600 rounded-lg text-white backdrop-blur-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
            disabled={isPlaying}
          >
            <option value="web-speech">Standard (Web Speech) - Instant</option>
            <option value="openai">OpenAI - High Quality</option>
            <option value="elevenlabs">ElevenLabs - Premium</option>
            <option value="elevenlabs-websocket">ElevenLabs Streaming (Beta)</option>
          </select>
        </div>
      )}

      {/* Compact Voice Provider for Chat */}
      {variant === 'chat' && (
        <div className="mb-4">
          <label className="block text-white/80 text-sm font-medium mb-2">Voice:</label>
          <select
            value={voiceProvider}
            onChange={(e) => setVoiceProvider(e.target.value as VoiceProvider)}
            className="w-full p-3 bg-slate-800/80 border border-slate-600 rounded-lg text-white backdrop-blur-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
            disabled={isPlaying}
          >
            <option value="web-speech">Standard Voice</option>
            <option value="openai">OpenAI Voice</option>
            <option value="elevenlabs">ElevenLabs</option>
            <option value="elevenlabs-websocket">ElevenLabs Stream</option>
          </select>
        </div>
      )}

      {/* Progress Indicator */}
      {totalChunks > 1 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-white/70 mb-2">
            <span>Chunk {currentChunk + 1} of {totalChunks}</span>
            <span>{Math.round(((currentChunk + 1) / totalChunks) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-400 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentChunk + 1) / totalChunks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Highlighted Text Display */}
      {showHighlightedText && words.length > 0 && (
        <div className={`${textDisplayClasses[variant]} bg-slate-800/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-lg`}>
          <div className="text-white/90">
            {words.map((word, index) => (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  padding: '3px 8px',
                  margin: '1px 3px',
                  borderRadius: '6px',
                  backgroundColor: index === highlightIndex ? '#fbbf24' : 'transparent',
                  color: index === highlightIndex ? '#111827' : '#ffffff',
                  fontWeight: index === highlightIndex ? '600' : 'normal',
                  fontSize: index === highlightIndex ? '1.05em' : '1em',
                  transform: index === highlightIndex ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: index === highlightIndex ? '0 2px 4px rgba(251, 191, 36, 0.3)' : 'none',
                  transition: voiceProvider === 'web-speech' 
                    ? 'all 0.15s ease-out' 
                    : voiceProvider === 'elevenlabs-websocket'
                      ? 'all 0.12s ease-out'
                      : 'all 0.25s ease-out'
                }}
              >
                {word}
              </span>
            ))}
          </div>
          
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-indigo-300/80 bg-slate-900/30 p-2 rounded">
              Debug: Highlighting index {highlightIndex}, Total words: {words.length}, 
              Current word: "{words[highlightIndex] || 'none'}"
            </div>
          )}
        </div>
      )}

      {/* Play/Stop Button */}
      <button
        onClick={handlePlay}
        disabled={false} // Always allow clicking to start or stop
        className={`
          w-full ${buttonSizeClasses[variant]} rounded-xl font-semibold text-white transition-all duration-300 shadow-lg backdrop-blur-sm border
          ${isLoading 
            ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-orange-400/50 shadow-orange-500/20' 
            : isPlaying 
              ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 border-red-400/50 shadow-red-500/20' 
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-indigo-400/50 shadow-indigo-500/20'
          }
          hover:scale-[1.02] active:scale-[0.98] transform
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            ⏸ Stop (Loading...)
          </span>
        ) : isPlaying ? (
          '⏸ Stop'
        ) : (
          '▶ Play'
        )}
      </button>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-slate-900/50 border border-slate-700 rounded-lg text-xs text-slate-300 space-y-1">
          <div><span className="text-indigo-300">Provider:</span> {voiceProvider}</div>
          <div><span className="text-indigo-300">Chunks:</span> {totalChunks} | <span className="text-indigo-300">Current:</span> {currentChunk + 1}</div>
          <div><span className="text-indigo-300">Words in chunk:</span> {words.length} | <span className="text-indigo-300">Highlighted:</span> {highlightIndex + 1}</div>
          <div><span className="text-indigo-300">Chunk size:</span> {chunks[currentChunk]?.original?.length || 0} chars</div>
        </div>
      )}
    </div>
  );
};