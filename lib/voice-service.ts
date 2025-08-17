'use client';

import { voiceUsageTracker } from './voice-usage-tracker';
import { VoiceErrorHandler } from './voice-error-handler';
import { getElevenLabsWebSocketService, CharacterTiming } from './elevenlabs-websocket';

export type VoiceProvider = 'web-speech' | 'openai' | 'elevenlabs' | 'elevenlabs-websocket';

export interface VoiceSettings {
  rate: number;  // 0.1 to 10
  pitch: number; // 0 to 2
  volume: number; // 0 to 1
  voice: SpeechSynthesisVoice | null;
  provider?: VoiceProvider;
  elevenLabsVoice?: string;
  openAIVoice?: string;
}

export interface WordBoundaryInfo {
  wordIndex: number;
  charIndex: number;
  elapsedTime: number;
  word: string;
}

export interface TTSOptions {
  text: string;
  settings?: Partial<VoiceSettings>;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
  onPause?: () => void;
  onResume?: () => void;
  onWordBoundary?: (info: WordBoundaryInfo) => void;
  onActuallyPlaying?: (duration: number) => void;
  onAudioReady?: (audioBuffer: ArrayBuffer) => void;
  onCharacterBoundary?: (info: CharacterBoundaryInfo) => void;
}

export interface CharacterBoundaryInfo {
  characterIndex: number;
  character: string;
  elapsedTime: number;
  wordIndex: number;
}

export class VoiceService {
  private static instance: VoiceService;
  private speechSynthesis!: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSupported: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private isCurrentlyPlaying: boolean = false;
  private lastRequestTime: number = 0;
  private readonly debounceDelay: number = 500; // 500ms debounce
  private audioContext: AudioContext | null = null;
  private defaultSettings: VoiceSettings = {
    rate: 0.9,
    pitch: 1.0,
    volume: 0.8,
    voice: null,
    provider: 'web-speech'
  };

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
      this.isSupported = true;
      this.loadVoices();
      
      // Handle voices changed event (some browsers load voices asynchronously)
      if (this.speechSynthesis.onvoiceschanged !== undefined) {
        this.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  private loadVoices(): void {
    this.voices = this.speechSynthesis.getVoices();
    
    // Set default voice to highest quality English voice
    if (!this.defaultSettings.voice && this.voices.length > 0) {
      const bestVoice = this.getBestQualityVoice();
      this.defaultSettings.voice = bestVoice;
    }
  }

  // Prioritize high-quality voices for professional sound
  private getBestQualityVoice(): SpeechSynthesisVoice | null {
    const englishVoices = this.voices.filter(voice => voice.lang.startsWith('en-'));
    
    // Priority 1: Premium/Enhanced voices (highest quality)
    const premiumVoices = englishVoices.filter(voice => 
      voice.name.toLowerCase().includes('premium') ||
      voice.name.toLowerCase().includes('enhanced') ||
      voice.name.toLowerCase().includes('neural') ||
      voice.name.toLowerCase().includes('wavenet') ||
      voice.name.toLowerCase().includes('studio')
    );
    
    if (premiumVoices.length > 0) {
      return premiumVoices[0];
    }
    
    // Priority 2: Local system voices (better than cloud)
    const localVoices = englishVoices.filter(voice => voice.localService);
    
    if (localVoices.length > 0) {
      // Prefer natural-sounding names
      const naturalVoices = localVoices.filter(voice =>
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('alex') ||
        voice.name.toLowerCase().includes('kate') ||
        voice.name.toLowerCase().includes('daniel') ||
        voice.name.toLowerCase().includes('karen') ||
        voice.name.toLowerCase().includes('serena')
      );
      
      if (naturalVoices.length > 0) {
        return naturalVoices[0];
      }
      
      return localVoices[0];
    }
    
    // Priority 3: Avoid robotic voices
    const betterVoices = englishVoices.filter(voice =>
      !voice.name.toLowerCase().includes('google') &&
      !voice.name.toLowerCase().includes('espeak') &&
      !voice.name.toLowerCase().includes('microsoft') &&
      !voice.name.toLowerCase().includes('speechsynthesis')
    );
    
    if (betterVoices.length > 0) {
      return betterVoices[0];
    }
    
    // Fallback to any English voice
    return englishVoices[0] || this.voices[0] || null;
  }

  public isTextToSpeechSupported(): boolean {
    return this.isSupported;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  public getEnglishVoices(): SpeechSynthesisVoice[] {
    return this.voices.filter(voice => voice.lang.startsWith('en-'));
  }

  public getCurrentSettings(): VoiceSettings {
    return { ...this.defaultSettings };
  }

  public updateSettings(newSettings: Partial<VoiceSettings>): void {
    this.defaultSettings = { ...this.defaultSettings, ...newSettings };
  }

  public speak(options: TTSOptions): Promise<void> {
    const now = Date.now();
    
    // Debounce rapid requests
    if (now - this.lastRequestTime < this.debounceDelay && this.isCurrentlyPlaying) {
      console.log('Request debounced - too soon after previous request');
      return Promise.resolve();
    }
    
    this.lastRequestTime = now;
    const settings = { ...this.defaultSettings, ...options.settings };
    
    switch (settings.provider) {
      case 'elevenlabs':
        return this.speakWithElevenLabs(options, settings);
      case 'elevenlabs-websocket':
        return this.speakWithElevenLabsWebSocket(options, settings);
      case 'openai':
        return this.speakWithOpenAI(options, settings);
      default:
        return this.speakWithWebSpeech(options, settings);
    }
  }

  private speakWithElevenLabs(options: TTSOptions, settings: VoiceSettings): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        this.isCurrentlyPlaying = false;
        console.warn('ElevenLabs TTS timeout - falling back to Web Speech');
        this.speakWithWebSpeech(options, { ...settings, provider: 'web-speech' })
          .then(resolve)
          .catch(reject);
      }, 30000); // 30 second timeout for ElevenLabs
      
      try {
        // Force complete stop before starting new audio
        this.stop();
        this.isCurrentlyPlaying = true;
        
        // Small delay to ensure previous audio is fully stopped
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Track usage
        await voiceUsageTracker.trackUsage({
          provider: 'elevenlabs',
          voice_id: settings.elevenLabsVoice,
          character_count: options.text.length
        });
        
        const requestPayload = {
          text: this.cleanTextForSpeech(options.text),
          voice: settings.elevenLabsVoice || 'EXAVITQu4vr4xnSDxMaL',
          speed: settings.rate
        };
        console.log('🎵 Making ElevenLabs API request with payload:', requestPayload);
        
        const response = await fetch('/api/elevenlabs/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload)
        });
        
        clearTimeout(timeout);
        
        console.log('🎵 ElevenLabs response:', response.status, response.statusText);
        
        if (!response.ok) {
          clearTimeout(timeout);
          const errorText = await response.text();
          console.error('🎵 ElevenLabs API error details:', errorText);
          
          // Parse error for quota issues
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.details && errorData.details.includes('quota_exceeded')) {
              throw new Error('ElevenLabs credits exhausted. Please add credits to your account or use Standard Voice.');
            }
          } catch (parseError) {
            // Continue with generic error
          }
          
          throw new Error(`ElevenLabs API failed: ${response.status} - ${errorText.substring(0, 200)}`);
        }
        
        console.log('🎵 ElevenLabs TTS response received, creating audio...');
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        this.currentAudio = new Audio(audioUrl);
        this.currentAudio.volume = settings.volume;
        this.currentAudio.preload = 'metadata'; // Reduce loading time
        
        // FAST START: Call onStart immediately
        console.log('🎵 ElevenLabs audio element created - calling onStart immediately');
        options.onStart?.(); // Call onStart right away
        
        // Add event listener for when audio actually starts playing
        this.currentAudio.addEventListener('playing', () => {
          console.log('🎵 ElevenLabs audio actually started playing');
          clearTimeout(audioTimeout);
          
          // Call the new callback with actual duration
          if (this.currentAudio && this.currentAudio.duration && !isNaN(this.currentAudio.duration)) {
            options.onActuallyPlaying?.(this.currentAudio.duration);
          }
        }, { once: true });
        
        // Add timeout for audio loading
        const audioTimeout = setTimeout(() => {
          if (this.currentAudio && this.currentAudio.paused && this.currentAudio.currentTime === 0) {
            console.warn('🎵 ElevenLabs audio failed to start within 5 seconds, falling back to Web Speech');
            this.stop();
            this.speakWithWebSpeech(options, { ...settings, provider: 'web-speech' })
              .then(resolve)
              .catch(reject);
          }
        }, 5000);
        
        this.currentAudio.onended = () => {
          clearTimeout(audioTimeout);
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          this.isCurrentlyPlaying = false;
          options.onEnd?.();
          resolve();
        };
        this.currentAudio.onerror = (e) => {
          clearTimeout(audioTimeout);
          this.isCurrentlyPlaying = false;
          console.warn('ElevenLabs audio element error (Safari compatibility):', e);
          
          // Only fallback if audio hasn't started playing successfully
          // Safari sometimes fires error events even for working audio
          if (this.currentAudio && this.currentAudio.currentTime === 0 && this.currentAudio.paused) {
            console.warn('Real ElevenLabs audio failure, falling back to Web Speech');
            this.speakWithWebSpeech(options, { ...settings, provider: 'web-speech' })
              .then(resolve)
              .catch(reject);
          } else {
            console.log('Ignoring Safari compatibility error - audio is working');
          }
        };
        
        console.log('🎵 Starting ElevenLabs audio playback...');
        await this.currentAudio.play();
      } catch (error) {
        clearTimeout(timeout);
        this.isCurrentlyPlaying = false;
        VoiceErrorHandler.logError('elevenlabs', error as Error, true);
        console.warn('ElevenLabs TTS failed, falling back to Web Speech:', error);
        // Wait a moment before fallback to prevent immediate interruption
        await new Promise(resolve => setTimeout(resolve, 200));
        // Fallback to web speech
        this.speakWithWebSpeech(options, { ...settings, provider: 'web-speech' })
          .then(resolve)
          .catch(reject);
      }
    });
  }

  private speakWithElevenLabsWebSocket(options: TTSOptions, settings: VoiceSettings): Promise<void> {
    return new Promise(async (resolve, reject) => {
      console.log('🎤 Starting ElevenLabs WebSocket TTS...');
      
      try {
        // Force complete stop before starting new audio to prevent multiple voices
        this.stop();
        this.isCurrentlyPlaying = true;
        
        // Track usage
        await voiceUsageTracker.trackUsage({
          provider: 'elevenlabs-websocket',
          character_count: options.text.length
        });

        // Get API key from server-side API endpoint
        console.log('🎤 Fetching ElevenLabs API key from server...');
        const keyResponse = await fetch('/api/elevenlabs/websocket-key');
        if (!keyResponse.ok) {
          console.warn('🎤 Could not get ElevenLabs API key from server - falling back to regular ElevenLabs');
          // Try regular ElevenLabs first, but if that also fails due to credits, show better error
          try {
            return await this.speakWithElevenLabs(options, { ...settings, provider: 'elevenlabs' });
          } catch (error: any) {
            if (error.message.includes('credits exhausted')) {
              throw new Error('ElevenLabs credits exhausted. Please add credits to your account or use Standard Voice for free testing.');
            }
            throw error;
          }
        }
        
        const { apiKey } = await keyResponse.json();
        if (!apiKey) {
          console.warn('🎤 ElevenLabs API key not available - falling back to regular ElevenLabs');
          return this.speakWithElevenLabs(options, { ...settings, provider: 'elevenlabs' });
        }

        const webSocketService = getElevenLabsWebSocketService(apiKey);
        
        // Use configured voice or default
        const voiceId = settings.elevenLabsVoice || '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
        
        // Audio chunks for streaming playback
        const audioChunks: ArrayBuffer[] = [];
        let audioElement: HTMLAudioElement | null = null;
        let processedCharacters = 0; // Track sequential character position
        const lastHighlightedWord = new Set<number>(); // Track highlighted words to prevent duplicates
        let lastWordHighlighted = -1; // Track last word for smooth progression
        let isFirstWord = true; // Track if we need to highlight the first word
        
        options.onStart?.();
        console.log('🎤 WebSocket TTS started');
        console.log('🔍 TEXT-ANALYSIS: Original text to be spoken:', `"${options.text}"`);
        console.log('🔍 TEXT-ANALYSIS: Original text length:', options.text.length);
        console.log('🔍 TEXT-ANALYSIS: Text preview:', options.text.substring(0, 50) + (options.text.length > 50 ? '...' : ''));
        console.log('🔍 TEXT-ANALYSIS: Text ends with:', `"${options.text.substring(Math.max(0, options.text.length - 20))}"`);
        
        // Reset character tracking for this session
        processedCharacters = 0;
        lastHighlightedWord.clear();

        await webSocketService.streamTTS({
          text: options.text,
          voiceId: voiceId,
          stability: 0.5,
          similarityBoost: 0.8,
          
          onAudioChunk: (chunk) => {
            console.log(`🎤 Received audio chunk: ${chunk.byteLength} bytes`);
            audioChunks.push(chunk);
            
            // Don't start streaming audio immediately - wait for all chunks
            // ElevenLabs WebSocket sends multiple chunks, we need them all
            console.log(`🎤 Audio chunk ${audioChunks.length} received, total size so far: ${audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)} bytes`);
          },
          
          onCharacterTiming: (timing: CharacterTiming) => {
            console.log(`🔍 ADAPTIVE: Character "${timing.character}" at ${timing.startTime.toFixed(3)}s (event #${processedCharacters})`);
            
            const words = options.text.trim().split(/\s+/).filter(word => word.length > 0);
            const textLength = options.text.length;
            
            // ADAPTIVE APPROACH: Handle different ElevenLabs patterns
            // Short text (< 50 chars): ElevenLabs sends selective boundary events (3 events for 6 words)
            // Long text (> 50 chars): ElevenLabs sends every character + overflow (96+ events for 13 words)
            
            if (textLength < 50) {
              // SHORT TEXT PATTERN: Sparse events, each represents a significant word boundary
              console.log(`🔍 ADAPTIVE: SHORT TEXT MODE - Progressive word highlighting`);
              
              // For short text, ElevenLabs sends selective events (e.g., 3 events for 6 words)
              // Each event should advance us to the next word in sequence
              const nextWordIndex = lastWordHighlighted + 1;
              
              if (nextWordIndex < words.length) {
                console.log(`🔍 ADAPTIVE: ✅ SHORT TEXT NEXT WORD ${nextWordIndex}: "${words[nextWordIndex]}" at ${timing.startTime.toFixed(2)}s`);
                lastWordHighlighted = nextWordIndex;
                
                options.onCharacterBoundary?.({
                  characterIndex: processedCharacters,
                  character: timing.character,
                  elapsedTime: timing.startTime,
                  wordIndex: nextWordIndex
                });
              } else {
                console.log(`🔍 ADAPTIVE: ⏸️  SHORT TEXT - Already at final word`);
              }
            } else {
              // LONG TEXT PATTERN: Dense character events, focus on word boundaries
              console.log(`🔍 ADAPTIVE: LONG TEXT MODE - Word boundary detection`);
              
              // For long text, use word boundary detection approach
              // Only process events that represent word boundaries (spaces, punctuation)
              const isWordBoundary = timing.character === ' ' || /[.!?,:;]/.test(timing.character);
              const isStartOfText = processedCharacters === 0;
              
              if (isWordBoundary || isStartOfText) {
                console.log(`🔍 ADAPTIVE: WORD BOUNDARY detected: "${timing.character}" at ${timing.startTime.toFixed(3)}s`);
                
                // Handle first word highlight
                if (isFirstWord && isStartOfText) {
                  console.log(`🔍 ADAPTIVE: ✅ LONG TEXT FIRST WORD 0: "${words[0]}" at ${timing.startTime.toFixed(2)}s`);
                  lastWordHighlighted = 0;
                  isFirstWord = false;
                  
                  options.onCharacterBoundary?.({
                    characterIndex: processedCharacters,
                    character: timing.character,
                    elapsedTime: timing.startTime,
                    wordIndex: 0
                  });
                } else if (isWordBoundary && !isFirstWord) {
                  // For subsequent words, advance on boundary
                  const nextWordIndex = lastWordHighlighted + 1;
                  
                  if (nextWordIndex < words.length) {
                    console.log(`🔍 ADAPTIVE: ✅ LONG TEXT NEW WORD ${nextWordIndex}: "${words[nextWordIndex]}" at ${timing.startTime.toFixed(2)}s`);
                    lastWordHighlighted = nextWordIndex;
                    
                    options.onCharacterBoundary?.({
                      characterIndex: processedCharacters,
                      character: timing.character,
                      elapsedTime: timing.startTime,
                      wordIndex: nextWordIndex
                    });
                  } else {
                    console.log(`🔍 ADAPTIVE: ⏸️  Already at last word (${lastWordHighlighted})`);
                  }
                }
              } else {
                console.log(`🔍 ADAPTIVE: ⏸️  Non-boundary character "${timing.character}" - skipping`);
              }
            }
            
            processedCharacters++;
          },
          
          onComplete: () => {
            console.log('🎤 ElevenLabs WebSocket TTS completed');
            
            // Create and play complete audio from all chunks
            if (audioChunks.length > 0) {
              console.log(`🎤 Creating complete audio from ${audioChunks.length} chunks`);
              const completeAudioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
              const completeAudioUrl = URL.createObjectURL(completeAudioBlob);
              
              const completeAudio = new Audio(completeAudioUrl);
              completeAudio.volume = 0.8;
              
              completeAudio.addEventListener('canplay', () => {
                console.log('🎤 Complete audio ready to play');
                const duration = completeAudio.duration || 0;
                
                // Store duration globally for timing calculations
                if (typeof window !== 'undefined' && duration > 0) {
                  (window as any).lastAudioDuration = duration;
                  console.log(`🎤 Stored audio duration: ${duration.toFixed(1)}s for timing calculations`);
                }
                
                options.onActuallyPlaying?.(duration);
              });
              
              completeAudio.addEventListener('ended', () => {
                console.log('🎤 Complete WebSocket audio finished');
                URL.revokeObjectURL(completeAudioUrl);
                this.currentAudio = null;
                this.isCurrentlyPlaying = false;
                options.onEnd?.();
                resolve();
              });
              
              completeAudio.play().catch(error => {
                console.error('🎤 Complete audio play error:', error);
                this.isCurrentlyPlaying = false;
                options.onEnd?.();
                reject(error);
              });
              
              this.currentAudio = completeAudio;
              
              // Provide complete audio buffer for highlighting if needed
              completeAudioBlob.arrayBuffer().then(buffer => {
                options.onAudioReady?.(buffer);
              });
            } else {
              console.error('🎤 No audio chunks received');
              options.onEnd?.();
              resolve();
            }
          },
          
          onError: (error) => {
            console.error('🎤 ElevenLabs WebSocket error:', error);
            // Fallback to regular ElevenLabs
            console.log('🎤 Falling back to regular ElevenLabs API');
            this.speakWithElevenLabs(options, { ...settings, provider: 'elevenlabs' })
              .then(resolve)
              .catch(reject);
          }
        });
        
      } catch (error) {
        console.error('🎤 WebSocket TTS setup error:', error);
        // Fallback to regular ElevenLabs
        this.speakWithElevenLabs(options, { ...settings, provider: 'elevenlabs' })
          .then(resolve)
          .catch(reject);
      }
    });
  }

  /**
   * IMPROVED: Sequential character matcher that handles ElevenLabs character stream properly
   */
  private findCharacterInText(originalText: string, character: string, expectedPosition: number): number {
    // ElevenLabs sends characters sequentially, so we should match them in order
    // But handle overflow gracefully
    
    if (expectedPosition >= originalText.length) {
      console.log(`🔍 CHAR-FINDER: OVERFLOW - Position ${expectedPosition} exceeds text length ${originalText.length} for character "${character}"`);
      return -1; // Character is part of ElevenLabs overflow
    }
    
    const expectedChar = originalText[expectedPosition];
    
    if (expectedChar === character) {
      console.log(`🔍 CHAR-FINDER: PERFECT MATCH - Character "${character}" at expected position ${expectedPosition}`);
      return expectedPosition;
    }
    
    // Allow slight misalignment (search nearby positions)
    const searchRange = 3;
    for (let offset = 1; offset <= searchRange; offset++) {
      // Check forward
      const forwardPos = expectedPosition + offset;
      if (forwardPos < originalText.length && originalText[forwardPos] === character) {
        console.log(`🔍 CHAR-FINDER: FORWARD MATCH - Character "${character}" found at position ${forwardPos} (expected ${expectedPosition})`);
        return forwardPos;
      }
      
      // Check backward
      const backwardPos = expectedPosition - offset;
      if (backwardPos >= 0 && originalText[backwardPos] === character) {
        console.log(`🔍 CHAR-FINDER: BACKWARD MATCH - Character "${character}" found at position ${backwardPos} (expected ${expectedPosition})`);
        return backwardPos;
      }
    }
    
    console.log(`🔍 CHAR-FINDER: NO MATCH - Character "${character}" not found near position ${expectedPosition} (expected "${expectedChar}")`);
    return -1; // Character not found
  }

  private convertCharacterToWordBoundary(text: string, characterIndex: number, timing: CharacterTiming): CharacterBoundaryInfo | null {
    try {
      // Split text into words using the same method as AudioPlayerWithHighlighting for consistency
      const words = text
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0)
        .map(word => word.trim());
      
      console.log(`🔍 CHAR->WORD: Processing character "${timing.character}" at index ${characterIndex} of "${text}"`);
      
      // ROBUST ALGORITHM: Build word position map for accurate mapping
      const wordPositions: Array<{word: string, startIndex: number, endIndex: number, wordIndex: number}> = [];
      let searchStart = 0;
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        // Find the actual position of this word in the original text, starting from searchStart
        let wordStart = -1;
        for (let j = searchStart; j <= text.length - word.length; j++) {
          if (text.substring(j, j + word.length) === word) {
            // Check if this is a complete word boundary (not part of another word)
            const prevChar = j > 0 ? text[j - 1] : ' ';
            const nextChar = j + word.length < text.length ? text[j + word.length] : ' ';
            
            if (/\s/.test(prevChar) && (/\s/.test(nextChar) || /[.,!?;:]/.test(nextChar) || j + word.length === text.length)) {
              wordStart = j;
              break;
            }
          }
        }
        
        if (wordStart >= 0) {
          wordPositions.push({
            word,
            startIndex: wordStart,
            endIndex: wordStart + word.length - 1,
            wordIndex: i
          });
          searchStart = wordStart + word.length;
        } else {
          console.warn(`🔍 CHAR->WORD: Could not find position for word "${word}"`);
        }
      }
      
      console.log(`🔍 CHAR->WORD: Built ${wordPositions.length} word positions`);
      
      // Find which word contains this character OR which word this character belongs to
      for (const wordPos of wordPositions) {
        if (characterIndex >= wordPos.startIndex && characterIndex <= wordPos.endIndex) {
          console.log(`🔍 CHAR->WORD: DIRECT HIT - Character "${timing.character}" at index ${characterIndex} maps to word ${wordPos.wordIndex}: "${wordPos.word}" (positions ${wordPos.startIndex}-${wordPos.endIndex})`);
          return {
            characterIndex,
            character: timing.character,
            elapsedTime: timing.startTime,
            wordIndex: wordPos.wordIndex
          };
        }
      }
      
      // SPECIAL CASE: Handle whitespace and punctuation by mapping to the next word
      if (/\s/.test(timing.character)) {
        console.log(`🔍 CHAR->WORD: WHITESPACE - Character is whitespace at index ${characterIndex}`);
        
        // Find the next word after this whitespace
        for (const wordPos of wordPositions) {
          if (wordPos.startIndex > characterIndex) {
            console.log(`🔍 CHAR->WORD: WHITESPACE->NEXT WORD - Mapping whitespace to next word ${wordPos.wordIndex}: "${wordPos.word}"`);
            return {
              characterIndex,
              character: timing.character,
              elapsedTime: timing.startTime,
              wordIndex: wordPos.wordIndex
            };
          }
        }
        
        // If no next word, map to the previous word
        for (let i = wordPositions.length - 1; i >= 0; i--) {
          const wordPos = wordPositions[i];
          if (wordPos.endIndex < characterIndex) {
            console.log(`🔍 CHAR->WORD: WHITESPACE->PREV WORD - Mapping trailing whitespace to previous word ${wordPos.wordIndex}: "${wordPos.word}"`);
            return {
              characterIndex,
              character: timing.character,
              elapsedTime: timing.startTime,
              wordIndex: wordPos.wordIndex
            };
          }
        }
      }
      
      // Enhanced fallback: Find the closest word boundary
      console.warn(`🔍 CHAR->WORD: Using enhanced fallback for character "${timing.character}" at index ${characterIndex}`);
      
      let closestWordIndex = -1;
      let minDistance = Infinity;
      
      for (const wordPos of wordPositions) {
        const distanceToStart = Math.abs(characterIndex - wordPos.startIndex);
        const distanceToEnd = Math.abs(characterIndex - wordPos.endIndex);
        const minDistanceToWord = Math.min(distanceToStart, distanceToEnd);
        
        if (minDistanceToWord < minDistance) {
          minDistance = minDistanceToWord;
          closestWordIndex = wordPos.wordIndex;
        }
      }
      
      if (closestWordIndex >= 0) {
        console.log(`🔍 CHAR->WORD: FALLBACK SUCCESS - Using closest word ${closestWordIndex}: "${words[closestWordIndex]}" (distance: ${minDistance})`);
        return {
          characterIndex,
          character: timing.character,
          elapsedTime: timing.startTime,
          wordIndex: closestWordIndex
        };
      }
      
      console.error(`🔍 CHAR->WORD: COMPLETE FAILURE - Cannot map character "${timing.character}" at index ${characterIndex}`);
      return null;
    } catch (error) {
      console.error('🎤 Error converting character to word boundary:', error);
      return null;
    }
  }

  private startStreamingAudio(audioChunks: ArrayBuffer[], options: TTSOptions): void {
    try {
      // Stop any existing audio first
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
      }
      
      // Convert first chunk to audio URL for immediate playback
      const firstChunk = audioChunks[0];
      const audioBlob = new Blob([firstChunk], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.volume = 0.8;
      
      audio.addEventListener('canplay', () => {
        console.log('🎤 Streaming audio ready to play');
        options.onActuallyPlaying?.(audio.duration || 0);
      });
      
      audio.addEventListener('ended', () => {
        console.log('🎤 WebSocket audio finished');
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        this.isCurrentlyPlaying = false;
      });
      
      audio.play().catch(error => {
        console.error('🎤 Streaming audio play error:', error);
        this.isCurrentlyPlaying = false;
      });
      
      this.currentAudio = audio;
      
    } catch (error) {
      console.error('🎤 Error starting streaming audio:', error);
      this.isCurrentlyPlaying = false;
    }
  }

  private speakWithOpenAI(options: TTSOptions, settings: VoiceSettings): Promise<void> {
    return new Promise(async (resolve, reject) => {
      console.log('[VOICE DEBUG] OpenAI TTS starting:', {
        textLength: options.text.length,
        textPreview: options.text.substring(0, 100),
        voice: settings.openAIVoice || 'alloy',
        timestamp: new Date().toISOString()
      });

      const timeout = setTimeout(() => {
        this.isCurrentlyPlaying = false;
        console.error('[VOICE DEBUG] OpenAI TTS timeout after 25s');
        console.warn('OpenAI TTS timeout - falling back to Web Speech');
        this.speakWithWebSpeech(options, { ...settings, provider: 'web-speech' })
          .then(resolve)
          .catch(reject);
      }, 25000); // 25 second timeout
      
      const startTime = Date.now();
      try {
        this.stop();
        this.isCurrentlyPlaying = true;
        
        // Track usage
        await voiceUsageTracker.trackUsage({
          provider: 'openai',
          character_count: options.text.length
        });
        
        console.log('🎵 Making OpenAI TTS request...');
        const response = await fetch('/api/openai/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: this.cleanTextForSpeech(options.text),
            voice: settings.openAIVoice || 'alloy',
            speed: settings.rate
          })
        });
        
        const responseTime = Date.now() - startTime;
        console.log(`[VOICE DEBUG] OpenAI API response in ${responseTime}ms, status: ${response.status}`);
        
        clearTimeout(timeout);
        
        if (!response.ok) {
          clearTimeout(timeout);
          const errorText = await response.text();
          console.error('[VOICE DEBUG] OpenAI API error:', response.status, errorText);
          throw new Error(`OpenAI TTS API failed: ${response.status} - ${errorText}`);
        }
        
        console.log('🎵 OpenAI TTS response received, creating audio...');
        
        // CRITICAL FIX: Ensure audio context is active BEFORE creating audio element
        await this.ensureAudioContext();
        console.log('🎵 Audio context state:', this.audioContext?.state);
        
        const audioBlob = await response.blob();
        const audioBuffer = await audioBlob.arrayBuffer();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Provide audio buffer for Whisper alignment
        options.onAudioReady?.(audioBuffer);
        
        this.currentAudio = new Audio(audioUrl);
        this.currentAudio.volume = settings.volume;
        this.currentAudio.preload = 'metadata'; // Changed from 'auto' to reduce loading time
        
        // FAST START: Call onStart immediately to remove loading delay
        console.log('🎵 Audio element created - calling onStart immediately');
        options.onStart?.(); // Call onStart right away - don't wait for playing event
        
        // Add event listener for when audio actually starts playing
        this.currentAudio.addEventListener('playing', () => {
          console.log('🎵 OpenAI audio actually started playing');
          clearTimeout(audioTimeout);
          
          console.log('🎵 Audio Element State:', {
            volume: this.currentAudio?.volume,
            currentTime: this.currentAudio?.currentTime,
            paused: this.currentAudio?.paused,
            audioContextState: this.audioContext?.state,
            duration: this.currentAudio?.duration
          });
          
          // Call the new callback with actual duration
          console.log('🎵 Checking onActuallyPlaying conditions:', {
            hasAudio: !!this.currentAudio,
            duration: this.currentAudio?.duration,
            isNaN: this.currentAudio?.duration ? isNaN(this.currentAudio.duration) : 'no duration',
            hasCallback: !!options.onActuallyPlaying
          });
          
          if (this.currentAudio && this.currentAudio.duration && !isNaN(this.currentAudio.duration)) {
            console.log('🎵 Calling onActuallyPlaying with duration:', this.currentAudio.duration);
            options.onActuallyPlaying?.(this.currentAudio.duration);
          } else {
            console.log('🎵 onActuallyPlaying not called - duration not ready yet, trying again in 100ms');
            
            // Retry after a short delay if duration isn't ready
            setTimeout(() => {
              if (this.currentAudio && this.currentAudio.duration && !isNaN(this.currentAudio.duration)) {
                console.log('🎵 Delayed onActuallyPlaying call with duration:', this.currentAudio.duration);
                options.onActuallyPlaying?.(this.currentAudio.duration);
              } else {
                console.log('🎵 Still no duration after delay - skipping onActuallyPlaying');
              }
            }, 100);
          }
          
          // Monitor audio progress without disrupting playback
          let progressCheckCount = 0;
          const progressChecker = setInterval(() => {
            progressCheckCount++;
            
            if (!this.currentAudio) {
              clearInterval(progressChecker);
              return;
            }
            
            const currentTime = this.currentAudio.currentTime;
            console.log(`🎵 Audio progress check ${progressCheckCount}: ${currentTime.toFixed(2)}s`);
            
            // If audio has progressed past 1 second, it's working fine
            if (currentTime > 1.0) {
              console.log('🎵 Audio playing successfully');
              clearInterval(progressChecker);
            }
            // If after 3 checks (1.5s) audio hasn't progressed, there's an issue
            else if (progressCheckCount >= 3 && currentTime < 0.1) {
              console.warn('🎵 Audio appears stuck, but letting it continue');
              clearInterval(progressChecker);
            }
          }, 500);
        }, { once: true });
        
        // Add timeout for audio loading
        const audioTimeout = setTimeout(() => {
          if (this.currentAudio && this.currentAudio.paused && this.currentAudio.currentTime === 0) {
            console.warn('🎵 OpenAI audio failed to start within 5 seconds, falling back to Web Speech');
            this.stop();
            this.speakWithWebSpeech(options, { ...settings, provider: 'web-speech' })
              .then(resolve)
              .catch(reject);
          }
        }, 5000);
        
        // Add pause event listener to detect unexpected pauses
        this.currentAudio.addEventListener('pause', () => {
          console.log('🎵 Audio paused event fired', {
            currentTime: this.currentAudio?.currentTime,
            duration: this.currentAudio?.duration,
            ended: this.currentAudio?.ended
          });
        });
        
        // Add stalled event listener
        this.currentAudio.addEventListener('stalled', () => {
          console.warn('🎵 Audio stalled - network issue or format problem');
        });
        
        this.currentAudio.onended = () => {
          clearTimeout(audioTimeout);
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          this.isCurrentlyPlaying = false;
          options.onEnd?.();
          resolve();
        };
        this.currentAudio.onerror = (e) => {
          clearTimeout(audioTimeout);
          this.isCurrentlyPlaying = false;
          console.warn('OpenAI audio element error (Safari compatibility):', e);
          
          // Only fallback if audio hasn't started playing successfully
          // Safari sometimes fires error events even for working audio
          if (this.currentAudio && this.currentAudio.currentTime === 0 && this.currentAudio.paused) {
            console.warn('Real OpenAI audio failure, falling back to Web Speech');
            this.speakWithWebSpeech(options, { ...settings, provider: 'web-speech' })
              .then(resolve)
              .catch(reject);
          } else {
            console.log('Ignoring Safari compatibility error - audio is working');
          }
        };
        
        console.log('🎵 Starting OpenAI audio playback...');
        
        // Ensure audio context is active (Safari requirement)
        await this.ensureAudioContext();
        
        // Handle play() promise rejection (autoplay policy)
        try {
          await this.currentAudio.play();
        } catch (playError) {
          console.warn('🎵 Audio play() failed (likely autoplay policy):', playError);
          clearTimeout(audioTimeout);
          
          // Check if it's an autoplay issue
          const errorName = (playError as any)?.name;
          if (errorName === 'NotAllowedError') {
            // Signal autoplay blocked to UI
            options.onError?.({
              error: 'canceled',
            } as unknown as SpeechSynthesisErrorEvent);
            
            // Clean up
            URL.revokeObjectURL(audioUrl);
            this.currentAudio = null;
            this.isCurrentlyPlaying = false;
            
            // Don't auto-fallback for autoplay issues - let user retry
            reject(new Error('Autoplay blocked - user interaction required'));
            return;
          }
          
          // For other errors, fallback to Web Speech
          console.warn('Falling back to Web Speech due to audio play error');
          this.speakWithWebSpeech(options, { ...settings, provider: 'web-speech' })
            .then(resolve)
            .catch(reject);
        }
      } catch (error) {
        clearTimeout(timeout);
        this.isCurrentlyPlaying = false;
        VoiceErrorHandler.logError('openai', error as Error, true);
        console.warn('OpenAI TTS failed, falling back to Web Speech:', error);
        // Wait a moment before fallback to prevent immediate interruption
        await new Promise(resolve => setTimeout(resolve, 200));
        // Fallback to web speech
        this.speakWithWebSpeech(options, { ...settings, provider: 'web-speech' })
          .then(resolve)
          .catch(reject);
      }
    });
  }

  private speakWithWebSpeech(options: TTSOptions, settings: VoiceSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[VOICE DEBUG] Web Speech starting:', {
        supported: this.isSupported,
        textLength: options.text.length,
        textPreview: options.text.substring(0, 100),
        voicesAvailable: this.voices.length,
        selectedVoice: settings.voice?.name || 'default'
      });

      if (!this.isSupported) {
        reject(new Error('Text-to-speech not supported'));
        return;
      }

      this.stop();
      this.isCurrentlyPlaying = true;
      const utterance = new SpeechSynthesisUtterance(options.text);

      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;
      if (settings.voice) {
        utterance.voice = settings.voice;
      } else if (this.defaultSettings.voice) {
        utterance.voice = this.defaultSettings.voice;
        console.log('[VOICE DEBUG] Using default voice:', this.defaultSettings.voice.name);
      }

      utterance.onstart = () => {
        console.log('[VOICE DEBUG] Web Speech started');
        options.onStart?.();
        // Track usage
        voiceUsageTracker.trackUsage({
          provider: 'web-speech',
          character_count: options.text.length
        });
      };

      // PERFECT SYNC: Real word boundary events from Web Speech API
      utterance.addEventListener('boundary', (event) => {
        if (event.name === 'word') {
          const charIndex = event.charIndex;
          const elapsedTime = event.elapsedTime / 1000; // Convert to seconds
          
          // Extract current word from character position
          const textUpToChar = options.text.substring(0, charIndex);
          const wordIndex = textUpToChar.split(/\s+/).length - 1;
          const currentWord = options.text.split(/\s+/)[wordIndex];
          
          console.log(`🎯 Web Speech boundary: word ${wordIndex} "${currentWord}" at ${elapsedTime.toFixed(1)}s`);
          
          // Call word boundary callback for highlighting
          options.onWordBoundary?.({
            wordIndex,
            charIndex,
            elapsedTime,
            word: currentWord
          });
        }
      });
      utterance.onend = () => {
        this.currentUtterance = null;
        this.isCurrentlyPlaying = false;
        options.onEnd?.();
        resolve();
      };
      utterance.onerror = (event) => {
        this.currentUtterance = null;
        this.isCurrentlyPlaying = false;
        
        // Don't treat interruptions as real errors - they're often caused by
        // normal operations like stopping/starting new speech
        if (event.error === 'interrupted' || event.error === 'canceled') {
          console.log(`Web Speech ${event.error} (normal operation, not an error)`);
          resolve(); // Resolve normally instead of rejecting
        } else {
          console.warn('Web Speech synthesis error:', event.error);
          options.onError?.(event);
          reject(new Error(`Speech synthesis error: ${event.error}`));
        }
      };
      utterance.onpause = () => options.onPause?.();
      utterance.onresume = () => options.onResume?.();

      this.currentUtterance = utterance;
      this.speechSynthesis.speak(utterance);
    });
  }

  public pause(): void {
    if (this.isSupported && this.speechSynthesis.speaking) {
      this.speechSynthesis.pause();
    }
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
    }
  }

  public resume(): void {
    if (this.isSupported && this.speechSynthesis.paused) {
      this.speechSynthesis.resume();
    }
  }

  public stop(): void {
    // Force stop all audio immediately
    this.isCurrentlyPlaying = false;
    if (this.isSupported) {
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio.src = '';
      this.currentAudio.load(); // Force reload to stop buffering
      this.currentAudio = null;
    }
  }

  public isSpeaking(): boolean {
    return this.isSupported && this.speechSynthesis.speaking;
  }

  public isPaused(): boolean {
    return this.isSupported && this.speechSynthesis.paused;
  }

  // Utility method to break long text into chunks
  public speakLongText(
    text: string,
    options: Omit<TTSOptions, 'text'> = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Split text into sentences to avoid utterance length limits
      const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
      let currentIndex = 0;

      const speakNext = async () => {
        if (currentIndex >= sentences.length) {
          resolve();
          return;
        }

        const sentence = sentences[currentIndex].trim();
        if (sentence) {
          try {
            await this.speak({
              text: sentence,
              ...options,
              onEnd: () => {
                currentIndex++;
                setTimeout(speakNext, 100); // Small pause between sentences
              }
            });
          } catch (error) {
            reject(error);
          }
        } else {
          currentIndex++;
          speakNext();
        }
      };

      speakNext();
    });
  }

  // Enhanced text processing for professional speech synthesis
  public cleanTextForSpeech(text: string): string {
    return text
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      
      // Replace technical symbols with words
      .replace(/&/g, ' and ')
      .replace(/@/g, ' at ')
      .replace(/\$/g, ' dollar ')
      .replace(/%/g, ' percent ')
      .replace(/\+/g, ' plus ')
      .replace(/-/g, ' minus ')
      .replace(/=/g, ' equals ')
      .replace(/\//g, ' slash ')
      .replace(/\\/g, ' backslash ')
      .replace(/#/g, ' hashtag ')
      
      // Expand common abbreviations
      .replace(/\be\.g\./gi, 'for example')
      .replace(/\bi\.e\./gi, 'that is')
      .replace(/\betc\./gi, 'and so on')
      .replace(/\bvs\./gi, 'versus')
      .replace(/\bdr\./gi, 'doctor')
      .replace(/\bmr\./gi, 'mister')
      .replace(/\bms\./gi, 'miss')
      .replace(/\bmrs\./gi, 'missus')
      .replace(/\bprof\./gi, 'professor')
      .replace(/\bst\./gi, 'saint')
      .replace(/\bave\./gi, 'avenue')
      .replace(/\brd\./gi, 'road')
      .replace(/\bblvd\./gi, 'boulevard')
      
      // Handle numbers and dates
      .replace(/(\d+)st/g, '$1st')
      .replace(/(\d+)nd/g, '$1nd')
      .replace(/(\d+)rd/g, '$1rd')
      .replace(/(\d+)th/g, '$1th')
      
      // Add natural pauses
      .replace(/\.\s/g, '. ') // Ensure pause after periods
      .replace(/:\s/g, ': ') // Pause after colons
      .replace(/;\s/g, '; ') // Pause after semicolons
      .replace(/,\s/g, ', ') // Brief pause after commas
      
      // Clean up multiple spaces and line breaks
      .replace(/\n+/g, '. ') // Convert line breaks to periods
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Get recommended voice for the current language/region
  public getRecommendedVoice(): SpeechSynthesisVoice | null {
    const englishVoices = this.getEnglishVoices();
    
    // Prefer high-quality voices
    const preferredVoices = englishVoices.filter(voice => 
      voice.name.includes('Premium') || 
      voice.name.includes('Enhanced') ||
      voice.name.includes('Neural') ||
      voice.localService
    );

    if (preferredVoices.length > 0) {
      return preferredVoices[0];
    }

    return englishVoices[0] || this.voices[0] || null;
  }

  public getCurrentAudioElement(): HTMLAudioElement | null {
    return this.currentAudio;
  }

  private async ensureAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume audio context if suspended (Safari requirement)
    if (this.audioContext.state === 'suspended') {
      console.log('🎵 Resuming audio context for Safari...');
      try {
        await this.audioContext.resume();
        console.log('🎵 Audio context resumed successfully');
      } catch (error) {
        console.warn('🎵 Failed to resume audio context:', error);
      }
    }
  }
}

// Export singleton instance
export const voiceService = VoiceService.getInstance();