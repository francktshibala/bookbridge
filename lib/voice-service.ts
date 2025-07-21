'use client';

export interface VoiceSettings {
  rate: number;  // 0.1 to 10
  pitch: number; // 0 to 2
  volume: number; // 0 to 1
  voice: SpeechSynthesisVoice | null;
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
  private defaultSettings: VoiceSettings = {
    rate: 0.9,    // Slightly slower for more natural sound
    pitch: 1.0,
    volume: 0.8,
    voice: null
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
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('Text-to-speech not supported'));
        return;
      }

      // Stop any current speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(options.text);
      const settings = { ...this.defaultSettings, ...options.settings };

      // Apply settings
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;
      if (settings.voice) {
        utterance.voice = settings.voice;
      }

      // Set up event handlers
      utterance.onstart = () => {
        options.onStart?.();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        options.onEnd?.();
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        options.onError?.(event);
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      utterance.onpause = () => {
        options.onPause?.();
      };

      utterance.onresume = () => {
        options.onResume?.();
      };

      this.currentUtterance = utterance;
      this.speechSynthesis.speak(utterance);
    });
  }

  public pause(): void {
    if (this.isSupported && this.speechSynthesis.speaking) {
      this.speechSynthesis.pause();
    }
  }

  public resume(): void {
    if (this.isSupported && this.speechSynthesis.paused) {
      this.speechSynthesis.resume();
    }
  }

  public stop(): void {
    if (this.isSupported) {
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
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
}

// Export singleton instance
export const voiceService = VoiceService.getInstance();