/**
 * Gapless Audio Manager
 * Handles seamless audio transitions between chunks/paragraphs
 */

interface AudioBuffer {
  id: string;
  audio: HTMLAudioElement;
  loaded: boolean;
  duration: number;
  src: string;
}

interface CrossfadeConfig {
  duration: number; // milliseconds
  curve: 'linear' | 'exponential';
}

export class GaplessAudioManager {
  private audioPool: Map<string, AudioBuffer> = new Map();
  private currentAudio: HTMLAudioElement | null = null;
  private nextAudio: HTMLAudioElement | null = null;
  private crossfadeConfig: CrossfadeConfig;
  private webAudioContext: AudioContext | null = null;
  private maxPoolSize = 3; // Keep 3 audio elements for smooth transitions

  constructor(crossfadeConfig: CrossfadeConfig = { duration: 25, curve: 'linear' }) {
    this.crossfadeConfig = crossfadeConfig;
    this.initializeWebAudio();
  }

  private async initializeWebAudio() {
    try {
      this.webAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Handle autoplay restrictions
      if (this.webAudioContext.state === 'suspended') {
        // Will be resumed on first user interaction
        document.addEventListener('click', () => {
          if (this.webAudioContext?.state === 'suspended') {
            this.webAudioContext.resume();
          }
        }, { once: true });
      }
    } catch (error) {
      console.warn('Web Audio API not available, falling back to HTML5 audio:', error);
    }
  }

  /**
   * Preload audio for seamless playback
   */
  async preloadAudio(id: string, src: string): Promise<void> {
    if (this.audioPool.has(id)) {
      return; // Already loaded
    }

    // Limit pool size for memory management
    if (this.audioPool.size >= this.maxPoolSize) {
      const oldestId = this.audioPool.keys().next().value;
      if (oldestId) {
        this.removeFromPool(oldestId);
      }
    }

    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';

    const buffer: AudioBuffer = {
      id,
      audio,
      loaded: false,
      duration: 0,
      src
    };

    this.audioPool.set(id, buffer);

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onLoad);
        audio.removeEventListener('error', onError);
        audio.removeEventListener('loadedmetadata', onMetadata);
      };

      const onLoad = () => {
        buffer.loaded = true;
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        this.audioPool.delete(id);
        reject(new Error(`Failed to load audio: ${src}`));
      };

      const onMetadata = () => {
        buffer.duration = audio.duration;
      };

      audio.addEventListener('canplaythrough', onLoad, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audio.addEventListener('loadedmetadata', onMetadata, { once: true });

      audio.src = src;
    });
  }

  /**
   * Play audio with gapless transition
   */
  async playWithTransition(
    currentId: string,
    nextId?: string,
    startTime: number = 0
  ): Promise<void> {
    const currentBuffer = this.audioPool.get(currentId);
    if (!currentBuffer || !currentBuffer.loaded) {
      throw new Error(`Audio not loaded: ${currentId}`);
    }

    // If there's a next audio, prepare it
    if (nextId) {
      const nextBuffer = this.audioPool.get(nextId);
      if (nextBuffer && nextBuffer.loaded) {
        this.nextAudio = nextBuffer.audio;
        this.scheduleTransition(currentBuffer.audio, nextBuffer.audio);
      }
    }

    this.currentAudio = currentBuffer.audio;
    this.currentAudio.currentTime = startTime;

    try {
      await this.currentAudio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
  }

  /**
   * Schedule seamless transition to next audio
   */
  private scheduleTransition(current: HTMLAudioElement, next: HTMLAudioElement) {
    const checkTransition = () => {
      if (!current || current.paused || current.ended) {
        return;
      }

      const timeRemaining = current.duration - current.currentTime;
      const transitionPoint = this.crossfadeConfig.duration / 1000; // Convert to seconds

      if (timeRemaining <= transitionPoint) {
        this.executeTransition(current, next);
      } else {
        // Check again on next frame
        requestAnimationFrame(checkTransition);
      }
    };

    requestAnimationFrame(checkTransition);
  }

  /**
   * Execute crossfade transition
   */
  private async executeTransition(current: HTMLAudioElement, next: HTMLAudioElement) {
    if (!this.webAudioContext) {
      // Fallback: immediate switch
      current.pause();
      await next.play();
      this.currentAudio = next;
      return;
    }

    try {
      const crossfadeDuration = this.crossfadeConfig.duration / 1000;
      const now = this.webAudioContext.currentTime;

      // Create gain nodes for crossfade
      const currentGain = this.webAudioContext.createGain();
      const nextGain = this.webAudioContext.createGain();

      // Connect audio sources
      const currentSource = this.webAudioContext.createMediaElementSource(current);
      const nextSource = this.webAudioContext.createMediaElementSource(next);

      currentSource.connect(currentGain);
      nextSource.connect(nextGain);

      currentGain.connect(this.webAudioContext.destination);
      nextGain.connect(this.webAudioContext.destination);

      // Set initial gain values
      currentGain.gain.value = 1;
      nextGain.gain.value = 0;

      // Start next audio
      await next.play();

      // Schedule crossfade
      currentGain.gain.exponentialRampToValueAtTime(0.01, now + crossfadeDuration);
      nextGain.gain.exponentialRampToValueAtTime(1, now + crossfadeDuration);

      // Clean up after transition
      setTimeout(() => {
        current.pause();
        this.currentAudio = next;
      }, crossfadeDuration * 1000 + 10); // Small buffer

    } catch (error) {
      console.error('Crossfade failed, falling back to immediate switch:', error);
      current.pause();
      await next.play();
      this.currentAudio = next;
    }
  }

  /**
   * Stop all audio
   */
  stop() {
    this.audioPool.forEach(buffer => {
      if (!buffer.audio.paused) {
        buffer.audio.pause();
      }
    });
    this.currentAudio = null;
    this.nextAudio = null;
  }

  /**
   * Clean up audio from pool
   */
  private removeFromPool(id: string) {
    const buffer = this.audioPool.get(id);
    if (buffer) {
      buffer.audio.pause();
      buffer.audio.src = '';
      buffer.audio.load(); // Release memory
      this.audioPool.delete(id);
    }
  }

  /**
   * Get current playback position
   */
  getCurrentTime(): number {
    return this.currentAudio?.currentTime || 0;
  }

  /**
   * Check if audio is playing
   */
  isPlaying(): boolean {
    return this.currentAudio ? !this.currentAudio.paused : false;
  }

  /**
   * Set playback speed
   */
  setPlaybackRate(rate: number) {
    this.audioPool.forEach(buffer => {
      buffer.audio.playbackRate = rate;
    });
  }

  /**
   * Clean up all resources
   */
  destroy() {
    this.stop();
    this.audioPool.forEach((_, id) => this.removeFromPool(id));
    this.audioPool.clear();

    if (this.webAudioContext && this.webAudioContext.state !== 'closed') {
      this.webAudioContext.close();
    }
  }
}