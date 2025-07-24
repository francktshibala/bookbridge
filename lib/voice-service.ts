'use client';

import { voiceUsageTracker } from './voice-usage-tracker';
import { VoiceErrorHandler } from './voice-error-handler';

export type VoiceProvider = 'web-speech' | 'openai' | 'elevenlabs';

export interface VoiceSettings {
  rate: number;  // 0.1 to 10
  pitch: number; // 0 to 2
  volume: number; // 0 to 1
  voice: SpeechSynthesisVoice | null;
  provider?: VoiceProvider;
  elevenLabsVoice?: string;
  openAIVoice?: string;
}

export interface TTSOptions {
  text: string;
  settings?: Partial<VoiceSettings>;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisErrorEvent) => void;
  onPause?: () => void;
  onResume?: () => void;
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
      case 'openai':
        return this.speakWithOpenAI(options, settings);
      default:
        return this.speakWithWebSpeech(options, settings);
    }
  }

  private speakWithElevenLabs(options: TTSOptions, settings: VoiceSettings): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Force complete stop before starting new audio
        this.stop();
        this.isCurrentlyPlaying = true;
        
        // Small delay to ensure previous audio is fully stopped
        await new Promise(resolve => setTimeout(resolve, 100));
        
        options.onStart?.();
        
        // Track usage
        await voiceUsageTracker.trackUsage({
          provider: 'elevenlabs',
          voice_id: settings.elevenLabsVoice,
          character_count: options.text.length
        });
        
        console.log('Making ElevenLabs API request...');
        const response = await fetch('/api/elevenlabs/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: this.cleanTextForSpeech(options.text),
            voice: settings.elevenLabsVoice || 'EXAVITQu4vr4xnSDxMaL',
            speed: settings.rate
          })
        });
        
        console.log('ElevenLabs response:', response.status, response.statusText);
        
        if (!response.ok) throw new Error('ElevenLabs API failed');
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        this.currentAudio = new Audio(audioUrl);
        this.currentAudio.volume = settings.volume;
        this.currentAudio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          this.isCurrentlyPlaying = false;
          options.onEnd?.();
          resolve();
        };
        this.currentAudio.onerror = (e) => {
          this.isCurrentlyPlaying = false;
          console.warn('Audio element error (Safari compatibility):', e);
          // Don't reject on pause-related errors in Safari
          if (!this.currentAudio || this.currentAudio.currentTime > 0) {
            reject(new Error('Audio playback failed'));
          }
        };
        
        await this.currentAudio.play();
      } catch (error) {
        this.isCurrentlyPlaying = false;
        VoiceErrorHandler.logError('elevenlabs', error as Error, true);
        // Wait a moment before fallback to prevent immediate interruption
        await new Promise(resolve => setTimeout(resolve, 200));
        // Fallback to web speech
        this.speakWithWebSpeech(options, { ...settings, provider: 'web-speech' })
          .then(resolve)
          .catch(reject);
      }
    });
  }

  private speakWithOpenAI(options: TTSOptions, settings: VoiceSettings): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        this.stop();
        this.isCurrentlyPlaying = true;
        options.onStart?.();
        
        // Track usage
        await voiceUsageTracker.trackUsage({
          provider: 'openai',
          character_count: options.text.length
        });
        
        const response = await fetch('/api/openai/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: this.cleanTextForSpeech(options.text),
            voice: settings.openAIVoice || 'alloy',
            speed: settings.rate
          })
        });
        
        if (!response.ok) throw new Error('OpenAI TTS API failed');
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        this.currentAudio = new Audio(audioUrl);
        this.currentAudio.volume = settings.volume;
        this.currentAudio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          this.isCurrentlyPlaying = false;
          options.onEnd?.();
          resolve();
        };
        this.currentAudio.onerror = (e) => {
          this.isCurrentlyPlaying = false;
          console.warn('Audio element error (Safari compatibility):', e);
          // Don't reject on pause-related errors in Safari
          if (!this.currentAudio || this.currentAudio.currentTime > 0) {
            reject(new Error('Audio playback failed'));
          }
        };
        
        await this.currentAudio.play();
      } catch (error) {
        this.isCurrentlyPlaying = false;
        VoiceErrorHandler.logError('openai', error as Error, true);
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
      }

      utterance.onstart = () => {
        options.onStart?.();
        // Track usage
        voiceUsageTracker.trackUsage({
          provider: 'web-speech',
          character_count: options.text.length
        });
      };
      utterance.onend = () => {
        this.currentUtterance = null;
        this.isCurrentlyPlaying = false;
        options.onEnd?.();
        resolve();
      };
      utterance.onerror = (event) => {
        this.currentUtterance = null;
        this.isCurrentlyPlaying = false;
        options.onError?.(event);
        reject(new Error(`Speech synthesis error: ${event.error}`));
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
}

// Export singleton instance
export const voiceService = VoiceService.getInstance();