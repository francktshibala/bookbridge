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

interface BundleData {
  bundleId: string;
  bundleIndex: number;
  audioUrl: string;
  totalDuration: number;
  sentences: Array<{
    sentenceId: string;
    sentenceIndex: number;
    text: string;
    startTime: number;
    endTime: number;
    wordTimings: Array<{
      word: string;
      start: number;
      end: number;
    }>;
  }>;
}

interface SlidingWindowConfig {
  ahead: number;    // How many sentences to keep ahead
  behind: number;   // How many sentences to keep behind
  bundleSize: number; // Sentences per bundle
}

/**
 * Sliding Window Manager
 * Manages efficient loading/unloading of audio bundles for continuous reading
 */
class SlidingWindowManager {
  private config: SlidingWindowConfig;
  private loadedBundles = new Map<string, BundleData>();
  private currentSentenceIndex = 0;
  private totalSentences = 0;
  private onBundleLoad?: (bundleId: string) => void;
  private onBundleUnload?: (bundleId: string) => void;

  constructor(
    config: SlidingWindowConfig = { ahead: 10, behind: 10, bundleSize: 4 },
    callbacks: {
      onBundleLoad?: (bundleId: string) => void;
      onBundleUnload?: (bundleId: string) => void;
    } = {}
  ) {
    this.config = config;
    this.onBundleLoad = callbacks.onBundleLoad;
    this.onBundleUnload = callbacks.onBundleUnload;
  }

  /**
   * Initialize with bundle data
   */
  async initializeWithBundles(bundles: BundleData[]) {
    this.totalSentences = bundles.reduce((total, bundle) => total + bundle.sentences.length, 0);

    // Load initial window around sentence 0
    await this.updateWindow(0, bundles);

    console.log(`📦 SlidingWindow initialized: ${bundles.length} bundles, ${this.totalSentences} sentences`);
  }

  /**
   * Update sliding window based on current sentence position
   */
  async updateWindow(sentenceIndex: number, allBundles: BundleData[]) {
    this.currentSentenceIndex = sentenceIndex;

    // Calculate which bundles we need
    const requiredBundles = this.calculateRequiredBundles(sentenceIndex);

    // Unload bundles outside the window
    const currentBundleIds = Array.from(this.loadedBundles.keys());
    const requiredBundleIds = new Set(requiredBundles.map(idx => `bundle_${idx}`));

    // Unload bundles no longer needed
    for (const bundleId of currentBundleIds) {
      if (!requiredBundleIds.has(bundleId)) {
        this.unloadBundle(bundleId);
      }
    }

    // Load new bundles
    for (const bundleIndex of requiredBundles) {
      const bundleId = `bundle_${bundleIndex}`;
      if (!this.loadedBundles.has(bundleId)) {
        const bundleData = allBundles.find(b => b.bundleIndex === bundleIndex);
        if (bundleData) {
          await this.loadBundle(bundleData);
        }
      }
    }

    console.log(`📦 Window updated: sentence ${sentenceIndex}, loaded bundles: [${Array.from(this.loadedBundles.keys()).join(', ')}]`);
  }

  /**
   * Calculate which bundle indices are needed for current sentence
   */
  private calculateRequiredBundles(sentenceIndex: number): number[] {
    const currentBundleIndex = Math.floor(sentenceIndex / this.config.bundleSize);

    // Calculate sentence range we need to support
    const startSentence = Math.max(0, sentenceIndex - this.config.behind);
    const endSentence = Math.min(this.totalSentences - 1, sentenceIndex + this.config.ahead);

    // Convert to bundle range
    const startBundleIndex = Math.floor(startSentence / this.config.bundleSize);
    const endBundleIndex = Math.floor(endSentence / this.config.bundleSize);

    const requiredBundles: number[] = [];
    for (let i = startBundleIndex; i <= endBundleIndex; i++) {
      requiredBundles.push(i);
    }

    return requiredBundles;
  }

  /**
   * Load a bundle into memory
   */
  private async loadBundle(bundleData: BundleData) {
    this.loadedBundles.set(bundleData.bundleId, bundleData);
    this.onBundleLoad?.(bundleData.bundleId);

    console.log(`📦 Loaded bundle: ${bundleData.bundleId} (${bundleData.sentences.length} sentences)`);
  }

  /**
   * Unload a bundle from memory
   */
  private unloadBundle(bundleId: string) {
    if (this.loadedBundles.has(bundleId)) {
      this.loadedBundles.delete(bundleId);
      this.onBundleUnload?.(bundleId);

      console.log(`📦 Unloaded bundle: ${bundleId}`);
    }
  }

  /**
   * Get bundle data for a specific sentence
   */
  getBundleForSentence(sentenceIndex: number): BundleData | null {
    const bundleIndex = Math.floor(sentenceIndex / this.config.bundleSize);
    const bundleId = `bundle_${bundleIndex}`;

    return this.loadedBundles.get(bundleId) || null;
  }

  /**
   * Get sentence data by index
   */
  getSentenceData(sentenceIndex: number): BundleData['sentences'][0] | null {
    const bundle = this.getBundleForSentence(sentenceIndex);
    if (!bundle) return null;

    // Find sentence within bundle
    return bundle.sentences.find(s => s.sentenceIndex === sentenceIndex) || null;
  }

  /**
   * Get current memory usage (approximate)
   */
  getMemoryUsage(): { bundles: number; estimatedMB: number } {
    const bundleCount = this.loadedBundles.size;
    // Rough estimate: each bundle ~2MB (4 sentences * ~500KB each)
    const estimatedMB = bundleCount * 2;

    return { bundles: bundleCount, estimatedMB };
  }

  /**
   * Get loaded bundle IDs for debugging
   */
  getLoadedBundleIds(): string[] {
    return Array.from(this.loadedBundles.keys());
  }

  /**
   * Clean up all loaded bundles
   */
  destroy() {
    this.loadedBundles.clear();
    console.log('📦 SlidingWindow destroyed');
  }
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
  private slidingWindow: SlidingWindowManager | null = null;

  constructor(crossfadeConfig: CrossfadeConfig = { duration: 25, curve: 'linear' }) {
    this.crossfadeConfig = crossfadeConfig;
    this.initializeWebAudio();
  }

  /**
   * Initialize sliding window for bundle management
   */
  initializeSlidingWindow(
    config: SlidingWindowConfig = { ahead: 10, behind: 10, bundleSize: 4 }
  ): SlidingWindowManager {
    this.slidingWindow = new SlidingWindowManager(config, {
      onBundleLoad: (bundleId) => {
        console.log(`🎵 Audio manager notified: ${bundleId} loaded`);
      },
      onBundleUnload: (bundleId) => {
        console.log(`🎵 Audio manager notified: ${bundleId} unloaded`);
        // Clean up any audio elements for this bundle
        this.cleanupBundleAudio(bundleId);
      }
    });

    return this.slidingWindow;
  }

  /**
   * Clean up audio elements related to a specific bundle
   */
  private cleanupBundleAudio(bundleId: string) {
    // Remove any audio buffers that belong to this bundle
    const toRemove: string[] = [];
    this.audioPool.forEach((buffer, id) => {
      if (id.startsWith(bundleId)) {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => this.removeFromPool(id));
  }

  /**
   * Get sliding window manager (if initialized)
   */
  getSlidingWindow(): SlidingWindowManager | null {
    return this.slidingWindow;
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
   * Play a single audio file (for sentence-level playback)
   */
  async playAudio(
    audioUrl: string,
    options: {
      onProgress?: (progress: number) => void;
      onComplete?: () => void;
    } = {}
  ): Promise<void> {
    try {
      console.log(`🎵 Playing audio: ${audioUrl}`);

      // Stop any currently playing audio
      if (this.currentAudio && !this.currentAudio.paused) {
        this.currentAudio.pause();
      }

      // Create new audio element
      const audio = new Audio(audioUrl);
      audio.crossOrigin = 'anonymous';

      this.currentAudio = audio;

      // Set up completion handler FIRST (before other events)
      if (options.onComplete) {
        const completeHandler = () => {
          console.log(`🎵 Audio ended: ${audioUrl}`);
          options.onComplete!();
        };
        audio.addEventListener('ended', completeHandler, { once: true });

        // Also listen for error events that might prevent completion
        audio.addEventListener('error', (e) => {
          console.error(`🎵 Audio error: ${audioUrl}`, e);
        });
      }

      // Set up progress tracking
      if (options.onProgress) {
        const progressHandler = () => {
          if (audio.duration && audio.duration > 0) {
            const progress = audio.currentTime / audio.duration;
            options.onProgress!(progress);
          }
        };
        audio.addEventListener('timeupdate', progressHandler);
      }

      // Wait for audio to be ready before playing
      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          resolve();
        };

        const onError = (e: any) => {
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('error', onError);
          reject(new Error(`Failed to load audio: ${audioUrl}`));
        };

        audio.addEventListener('canplay', onCanPlay, { once: true });
        audio.addEventListener('error', onError, { once: true });

        // Start loading
        audio.load();
      });

      // Play the audio
      console.log(`🎵 Starting playback: ${audioUrl}`);
      await audio.play();

    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
  }

  /**
   * Pause current audio
   */
  pause() {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
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

    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
    }

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

    // Clean up sliding window
    if (this.slidingWindow) {
      this.slidingWindow.destroy();
      this.slidingWindow = null;
    }

    if (this.webAudioContext && this.webAudioContext.state !== 'closed') {
      this.webAudioContext.close();
    }
  }
}

// Export types and classes for external use
export { SlidingWindowManager, type BundleData, type SlidingWindowConfig };