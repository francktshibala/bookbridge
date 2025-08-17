'use client';

export interface VoiceSettings {
  voiceId: string;
  provider: 'openai' | 'elevenlabs';
  speed: number;
}

export interface AudioSyncOptions {
  enableHighlighting: boolean;
  onWordChange?: (wordIndex: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export class AudioSyncManager {
  private currentAudio: HTMLAudioElement | null = null;
  private currentWordIndex = -1;
  private words: string[] = [];
  private timings: number[] = [];
  private isPlaying = false;
  private highlightingEnabled = false;
  private onWordChangeCallback?: (wordIndex: number) => void;
  private onCompleteCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;

  constructor() {
    this.cleanup = this.cleanup.bind(this);
  }

  async startSyncedPlayback(
    text: string, 
    settings: VoiceSettings, 
    options: AudioSyncOptions = { enableHighlighting: false }
  ): Promise<void> {
    try {
      // Force stop any existing playback immediately
      this.forceStop();

      // Store callbacks
      this.onWordChangeCallback = options.onWordChange;
      this.onCompleteCallback = options.onComplete;
      this.onErrorCallback = options.onError;
      this.highlightingEnabled = options.enableHighlighting;

      // Prepare text for highlighting
      if (this.highlightingEnabled) {
        this.prepareWordsForHighlighting(text);
      }

      // Generate audio with selected voice
      const audioBlob = await this.generateAudio(text, settings);
      
      // Double-check we weren't stopped during async operation
      if (!this.onCompleteCallback) {
        URL.revokeObjectURL(URL.createObjectURL(audioBlob));
        return;
      }
      
      // Create and configure audio element
      this.currentAudio = new Audio(URL.createObjectURL(audioBlob));
      this.currentAudio.playbackRate = settings.speed;

      // Set up event listeners
      this.setupAudioEventListeners();

      // Start playback with user interaction check
      try {
        await this.currentAudio.play();
        this.isPlaying = true;
      } catch (error: any) {
        // Handle autoplay policy violations
        if (error.name === 'NotAllowedError') {
          console.warn('Autoplay blocked by browser policy. User interaction required.');
          // Reset audio state but don't throw - let user try again
          this.isPlaying = false;
          this.onErrorCallback?.(new Error('Please click play again - browser autoplay policy requires user interaction'));
          return;
        }
        throw error; // Re-throw other errors
      }

      // Start highlighting if enabled
      if (this.highlightingEnabled) {
        this.startWordHighlighting();
      }

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Audio playback failed');
      this.onErrorCallback?.(errorObj);
      throw errorObj;
    }
  }

  private async generateAudio(text: string, settings: VoiceSettings): Promise<Blob> {
    const endpoint = settings.provider === 'openai' ? '/api/openai/tts' : '/api/elevenlabs/tts';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice: settings.voiceId,
        speed: settings.speed,
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.statusText}`);
    }

    return await response.blob();
  }

  private prepareWordsForHighlighting(text: string): void {
    // Split text into words, preserving punctuation
    this.words = text.match(/\S+/g) || [];
    
    // For now, use estimated timings based on average speech rate
    // This could be enhanced with actual word timing data from TTS providers
    const averageWordsPerSecond = 2.5;
    const wordDuration = 1 / averageWordsPerSecond;
    
    this.timings = this.words.map((_, index) => index * wordDuration * 1000);
  }

  private setupAudioEventListeners(): void {
    if (!this.currentAudio) return;

    this.currentAudio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.currentWordIndex = -1;
      this.onCompleteCallback?.();
    });

    this.currentAudio.addEventListener('error', (event) => {
      this.isPlaying = false;
      const error = new Error('Audio playback error');
      this.onErrorCallback?.(error);
    });

    this.currentAudio.addEventListener('pause', () => {
      this.isPlaying = false;
    });

    this.currentAudio.addEventListener('play', () => {
      this.isPlaying = true;
    });
  }

  private startWordHighlighting(): void {
    if (!this.highlightingEnabled || !this.currentAudio) return;

    const updateHighlighting = () => {
      if (!this.currentAudio || !this.isPlaying) return;

      const currentTime = this.currentAudio.currentTime * 1000; // Convert to milliseconds
      
      // Find the current word based on timing
      let wordIndex = -1;
      for (let i = 0; i < this.timings.length; i++) {
        if (currentTime >= this.timings[i]) {
          wordIndex = i;
        } else {
          break;
        }
      }

      // Update highlighting if word changed
      if (wordIndex !== this.currentWordIndex) {
        this.currentWordIndex = wordIndex;
        this.onWordChangeCallback?.(wordIndex);
      }

      // Continue updating if still playing
      if (this.isPlaying) {
        requestAnimationFrame(updateHighlighting);
      }
    };

    // Start the highlighting loop
    requestAnimationFrame(updateHighlighting);
  }

  pause(): void {
    if (this.currentAudio && this.isPlaying) {
      this.currentAudio.pause();
      this.isPlaying = false;
    }
  }

  resume(): void {
    if (this.currentAudio && !this.isPlaying) {
      this.currentAudio.play();
      this.isPlaying = true;
      
      if (this.highlightingEnabled) {
        this.startWordHighlighting();
      }
    }
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.cleanup();
    }
    this.isPlaying = false;
    this.currentWordIndex = -1;
  }

  forceStop(): void {
    // Immediately stop everything without waiting
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {
        // Ignore errors during force stop
      }
      this.cleanup();
    }
    this.isPlaying = false;
    this.currentWordIndex = -1;
    
    // Clear callbacks to prevent duplicate execution
    this.onWordChangeCallback = undefined;
    this.onCompleteCallback = undefined;
    this.onErrorCallback = undefined;
  }

  setSpeed(speed: number): void {
    if (this.currentAudio) {
      this.currentAudio.playbackRate = speed;
    }
  }

  getCurrentWordIndex(): number {
    return this.currentWordIndex;
  }

  getWords(): string[] {
    return [...this.words];
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  private cleanup(): void {
    if (this.currentAudio) {
      // Remove event listeners
      this.currentAudio.removeEventListener('ended', () => {});
      this.currentAudio.removeEventListener('error', () => {});
      this.currentAudio.removeEventListener('pause', () => {});
      this.currentAudio.removeEventListener('play', () => {});
      
      // Clean up audio element
      URL.revokeObjectURL(this.currentAudio.src);
      this.currentAudio = null;
    }
  }

  destroy(): void {
    this.stop();
    this.cleanup();
    this.onWordChangeCallback = undefined;
    this.onCompleteCallback = undefined;
    this.onErrorCallback = undefined;
  }
}