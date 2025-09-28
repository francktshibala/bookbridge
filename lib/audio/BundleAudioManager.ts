/**
 * Bundle Audio Manager
 * Handles playback of sentence bundles with precise timing control
 */

interface BundleSentence {
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
}

interface BundleData {
  bundleId: string;
  bundleIndex: number;
  audioUrl: string;
  totalDuration: number;
  sentences: BundleSentence[];
}

interface BundleAudioOptions {
  onSentenceStart?: (sentence: BundleSentence) => void;
  onSentenceEnd?: (sentence: BundleSentence) => void;
  onBundleComplete?: (bundleId: string) => void;
  onProgress?: (currentTime: number, totalTime: number) => void;
  onTimeUpdate?: (currentTime: number, totalTime: number) => void;
  /**
   * Lead (in milliseconds) to apply to highlighting decisions.
   * Negative values highlight earlier; positive values delay highlighting.
   */
  highlightLeadMs?: number;
}

export class BundleAudioManager {
  private currentAudio: HTMLAudioElement | null = null;
  private currentBundle: BundleData | null = null;
  private currentSentenceIndex = -1;
  private progressTimer: number | null = null;
  private rafId: number | null = null;
  private options: BundleAudioOptions = {};
  private isPlaying = false;
  private isPlayingRef: { current: boolean } = { current: false }; // Critical fix for closure issue
  private highlightLeadSeconds: number = 0;
  private durationScale: number = 1; // scales meta timings to match real audio duration
  private scaledSentences: Map<number, {startTime: number, endTime: number}> = new Map();
  private suppressTransitionsUntil: number = 0; // hysteresis window after resume (performance.now timestamp)
  private pausedAtTime: number = 0; // Store exact audio position when paused
  private pausedAtSentence: number = -1; // Store sentence index when paused

  constructor(options: BundleAudioOptions = {}) {
    this.options = options;
    if (typeof options.highlightLeadMs === 'number' && !Number.isNaN(options.highlightLeadMs)) {
      this.highlightLeadSeconds = options.highlightLeadMs / 1000;
    }
  }

  /**
   * Play a specific sentence within a bundle
   */
  async playBundleSentence(
    bundle: BundleData,
    targetSentenceIndex: number
  ): Promise<void> {
    try {
      console.log(`🎵 Playing sentence ${targetSentenceIndex} from ${bundle.bundleId}`);

      // Find the target sentence
      const targetSentence = bundle.sentences.find(s => s.sentenceIndex === targetSentenceIndex);
      if (!targetSentence) {
        throw new Error(`Sentence ${targetSentenceIndex} not found in ${bundle.bundleId}`);
      }

      // Stop any currently playing audio
      this.stop();

      // Load bundle audio if different from current
      if (!this.currentAudio || this.currentBundle?.bundleId !== bundle.bundleId) {
        await this.loadBundle(bundle);
      }

      if (!this.currentAudio) {
        throw new Error('Failed to load bundle audio');
      }

      // Set playback position to scaled sentence start time
      const scaled = this.scaledSentences.get(targetSentenceIndex);
      this.currentAudio.currentTime = scaled ? scaled.startTime : targetSentence.startTime * this.durationScale;
      this.currentSentenceIndex = targetSentenceIndex;
      this.isPlaying = true;
      this.isPlayingRef.current = true; // Update ref too

      // Start monitoring progress
      this.startProgressMonitoring(targetSentence);

      // Play audio
      await this.currentAudio.play();

      // Notify sentence start
      this.options.onSentenceStart?.(targetSentence);

      console.log(`🎵 Started playing sentence ${targetSentenceIndex} at ${targetSentence.startTime}s`);

    } catch (error) {
      console.error('Failed to play bundle sentence:', error);
      throw error;
    }
  }

  /**
   * Play all sentences in sequence from a starting point
   */
  async playSequentialSentences(
    bundle: BundleData,
    startSentenceIndex: number
  ): Promise<void> {
    try {
      const startSentence = bundle.sentences.find(s => s.sentenceIndex === startSentenceIndex);
      if (!startSentence) {
        throw new Error(`Sentence ${startSentenceIndex} not found in ${bundle.bundleId}`);
      }

      // Check if this is a simulated bundle with individual audio URLs
      const isSimulatedBundle = bundle.sentences.some((s: any) => s.individualAudioUrl);

      if (isSimulatedBundle) {
        // Handle simulated bundles with individual audio files
        await this.playSimulatedBundleSequence(bundle, startSentenceIndex);
      } else {
        // Load bundle audio for real bundles
        if (!this.currentAudio || this.currentBundle?.bundleId !== bundle.bundleId) {
          await this.loadBundle(bundle);
        }

        if (!this.currentAudio) {
          throw new Error('Failed to load bundle audio');
        }

        // Set up sequential playback monitoring
        this.currentSentenceIndex = startSentenceIndex;
        this.isPlaying = true;
        this.isPlayingRef.current = true; // Update ref too

      // Start from scaled sentence beginning
      const scaledStart = this.scaledSentences.get(startSentenceIndex)?.startTime || (startSentence.startTime * this.durationScale);
      this.currentAudio.currentTime = scaledStart;
        this.startSequentialMonitoring(bundle, startSentenceIndex);

        // Play audio
        await this.currentAudio.play();

        // Notify first sentence start
        this.options.onSentenceStart?.(startSentence);

        console.log(`🎵 Started sequential playback from sentence ${startSentenceIndex}`);
      }

    } catch (error) {
      console.error('Failed to play sequential sentences:', error);
      throw error;
    }
  }

  /**
   * Play simulated bundle with individual audio files
   */
  private async playSimulatedBundleSequence(
    bundle: BundleData,
    startSentenceIndex: number
  ): Promise<void> {
    this.currentBundle = bundle;
    this.currentSentenceIndex = startSentenceIndex;
    this.isPlaying = true;
    this.isPlayingRef.current = true;

    const playNextSentence = async (sentenceIndex: number) => {
      console.log(`🔍 playNextSentence called with index ${sentenceIndex}, isPlaying: ${this.isPlayingRef.current}`);

      if (!this.isPlayingRef.current) return;

      const sentence = bundle.sentences.find(s => s.sentenceIndex === sentenceIndex);
      console.log(`🔍 Found sentence:`, sentence ? `${sentence.sentenceIndex}` : 'NOT FOUND');

      if (!sentence) {
        console.log(`🏁 Bundle ${bundle.bundleId} complete - no sentence found for index ${sentenceIndex}`);
        // Check if we need to move to next bundle
        this.handleBundleComplete(bundle);
        return;
      }

      // Get individual audio URL for this sentence
      const audioUrl = (sentence as any).individualAudioUrl || bundle.audioUrl;

      console.log(`🎵 Playing sentence ${sentenceIndex} with individual audio`);

      // Clean up previous audio
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.src = '';
      }

      // Reuse existing audio element or create one if needed
      if (!this.currentAudio) {
        this.currentAudio = new Audio();
        this.currentAudio.crossOrigin = 'anonymous';
      }

      // Stop and update source
      this.currentAudio.pause();
      this.currentAudio.src = audioUrl;
      const audio = this.currentAudio;

      // Set up completion handler
      audio.addEventListener('ended', () => {
        console.log(`✅ Sentence ${sentenceIndex} complete (isPlayingRef: ${this.isPlayingRef.current})`);
        this.options.onSentenceEnd?.(sentence);

        // Play next sentence after a small delay
        const nextIndex = sentenceIndex + 1;
        console.log(`🔄 Attempting to advance to sentence ${nextIndex}, isPlaying: ${this.isPlayingRef.current}`);

        if (this.isPlayingRef.current) {
          setTimeout(() => {
            console.log(`⏭️ Timeout triggered for sentence ${nextIndex}, isPlaying: ${this.isPlayingRef.current}`);
            playNextSentence(nextIndex);
          }, 100);
        } else {
          console.log(`⏹️ Not advancing to sentence ${nextIndex} - not playing`);
        }
      }, { once: true });

      // Notify sentence start
      this.options.onSentenceStart?.(sentence);
      this.currentSentenceIndex = sentenceIndex;

      // Play the audio
      try {
        await audio.play();
      } catch (error) {
        console.error(`Failed to play sentence ${sentenceIndex}:`, error);
        this.stop();
      }
    };

    // Start playing from the requested sentence
    await playNextSentence(startSentenceIndex);
  }

  /**
   * Load a bundle audio file
   */
  private async loadBundle(bundle: BundleData): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`📦 Loading bundle: ${bundle.bundleId}`);

      // Clean up previous audio
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.src = '';
        this.currentAudio.load();
      }

      // Reuse existing audio element or create one if needed
      if (!this.currentAudio) {
        this.currentAudio = new Audio();
        this.currentAudio.crossOrigin = 'anonymous';
      }

      // Stop current audio and update source
      this.currentAudio.pause();
      this.currentAudio.src = bundle.audioUrl;
      this.currentAudio.preload = 'auto';
      const audio = this.currentAudio;

      const onCanPlay = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);

        this.currentAudio = audio;
        this.currentBundle = bundle;

        // Calibrate metadata timings to actual audio duration if needed
        // Use the end of the last sentence as the metadata duration reference
        const metaDuration = (bundle.sentences && bundle.sentences.length > 0)
          ? Math.max(...bundle.sentences.map(s => s.endTime))
          : bundle.totalDuration;
        const realDuration = audio.duration || bundle.totalDuration;
        // Guard against zeros and NaN
        if (metaDuration > 0 && realDuration > 0 && Number.isFinite(realDuration)) {
          const rawScale = realDuration / metaDuration;
          // Clamp duration scale to avoid outliers
          this.durationScale = Math.min(1.10, Math.max(0.85, rawScale));
        } else {
          this.durationScale = 1;
        }

        // Precompute scaled sentence timings
        this.scaledSentences.clear();
        bundle.sentences.forEach(sentence => {
          this.scaledSentences.set(sentence.sentenceIndex, {
            startTime: sentence.startTime * this.durationScale,
            endTime: sentence.endTime * this.durationScale
          });
        });

        if (process.env.NEXT_PUBLIC_AUDIO_DEBUG === '1') {
          console.log(`🧭 Duration calibration: meta=${metaDuration.toFixed(2)}s real=${realDuration.toFixed(2)}s scale=${this.durationScale.toFixed(3)}`);
        }

        if (process.env.NEXT_PUBLIC_AUDIO_DEBUG === '1') {
          console.log(`✅ Bundle loaded: ${bundle.bundleId} (${bundle.totalDuration.toFixed(1)}s)`);
        }
        resolve();
      };

      const onError = (e: any) => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        reject(new Error(`Failed to load bundle: ${bundle.audioUrl}`));
      };

      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('error', onError, { once: true });

      // Start loading
      audio.src = bundle.audioUrl;
      audio.load();
    });
  }

  /**
   * Monitor progress for single sentence playback
   */
  private startProgressMonitoring(targetSentence: BundleSentence) {
    this.stopMonitoring();

    const tick = () => {
      if (!this.currentAudio || !this.isPlayingRef.current) return;

      const rawTime = this.currentAudio.currentTime; // unscaled
      const scaledEnd = this.scaledSentences.get(targetSentence.sentenceIndex)?.endTime || (targetSentence.endTime * this.durationScale);

      // Completion uses raw time vs scaled end (lead does not affect completion)
      if (rawTime >= scaledEnd || this.currentAudio.ended || rawTime >= (this.currentAudio.duration - 0.05)) {
        this.handleSentenceComplete(targetSentence);
        return;
      }

      this.options.onProgress?.(rawTime, this.currentAudio.duration);
      this.options.onTimeUpdate?.(rawTime, this.currentAudio.duration || 0);
      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * Monitor progress for sequential sentence playback
   */
  private startSequentialMonitoring(bundle: BundleData, startIndex: number) {
    this.stopMonitoring();

    let currentSentenceInBundle = bundle.sentences.find(s => s.sentenceIndex === startIndex);
    if (!currentSentenceInBundle) return;

    const tick = () => {
      if (!this.currentAudio || !this.isPlayingRef.current || !currentSentenceInBundle) return;

      const now = performance.now();
      const rawTime = this.currentAudio.currentTime; // unscaled
      const highlightTime = rawTime + this.highlightLeadSeconds;

      const nextSentenceIndex = currentSentenceInBundle.sentenceIndex + 1;
      const nextSentence = bundle.sentences.find(s => s.sentenceIndex === nextSentenceIndex);
      const nextScaledStart = nextSentence ? (this.scaledSentences.get(nextSentenceIndex)?.startTime || 0) : 0;
      const currentScaledEnd = this.scaledSentences.get(currentSentenceInBundle.sentenceIndex)?.endTime || 0;

      // Advance to next sentence when highlight reaches next start, but not during hysteresis window
      if (nextSentence && nextScaledStart > 0 && highlightTime >= nextScaledStart && now >= this.suppressTransitionsUntil) {
        this.options.onSentenceEnd?.(currentSentenceInBundle);
        currentSentenceInBundle = nextSentence;
        this.currentSentenceIndex = nextSentenceIndex;
        this.options.onSentenceStart?.(nextSentence);
      } else {
        // Complete current sentence using raw time vs scaled end
        if ((currentScaledEnd > 0 && rawTime >= currentScaledEnd) || this.currentAudio.ended || rawTime >= (this.currentAudio.duration - 0.05)) {
          this.options.onSentenceEnd?.(currentSentenceInBundle);
          if (nextSentence) {
            currentSentenceInBundle = nextSentence;
            this.currentSentenceIndex = nextSentenceIndex;
            this.options.onSentenceStart?.(nextSentence);
          } else {
            this.handleBundleComplete(bundle);
            return;
          }
        }
      }

      this.options.onProgress?.(rawTime, this.currentAudio.duration);
      this.options.onTimeUpdate?.(rawTime, this.currentAudio.duration || 0);
      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * Handle single sentence completion
   */
  private handleSentenceComplete(sentence: BundleSentence) {
    this.pause();
    this.options.onSentenceEnd?.(sentence);
  }

  /**
   * Handle bundle completion
   */
  private handleBundleComplete(bundle: BundleData) {
    console.log(`✅ Bundle ${bundle.bundleId} complete`);

    // Just pause audio without changing playing state - parent handles transitions
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }

    // DON'T set isPlaying or isPlayingRef to false here
    // The parent component will manage the playing state during bundle transitions

    this.options.onBundleComplete?.(bundle.bundleId);
  }

  /**
   * Pause current playback
   */
  pause() {
    if (this.currentAudio && !this.currentAudio.paused) {
      // Store exact position before pausing
      this.pausedAtTime = this.currentAudio.currentTime;
      this.pausedAtSentence = this.currentSentenceIndex;
      console.log(`⏸️ Paused at time: ${this.pausedAtTime.toFixed(2)}s, sentence: ${this.pausedAtSentence}`);

      this.currentAudio.pause();
    }
    this.isPlaying = false;
    this.isPlayingRef.current = false;

    this.stopMonitoring();
  }

  /**
   * Resume playback
   */
  async resume() {
    if (this.currentAudio && this.currentAudio.paused) {
      this.isPlaying = true;
      this.isPlayingRef.current = true;

      // Restore exact position from pause
      if (this.pausedAtTime > 0 && this.pausedAtSentence >= 0) {
        this.currentAudio.currentTime = this.pausedAtTime;
        this.currentSentenceIndex = this.pausedAtSentence;
        console.log(`▶️ Resuming from exact position: ${this.pausedAtTime.toFixed(2)}s, sentence: ${this.pausedAtSentence}`);
      }

      await this.currentAudio.play();

      // Restart monitoring from the stored sentence index
      if (this.currentBundle && this.currentSentenceIndex >= 0) {
        // No need to recalculate - use stored sentence index
        const activeSentence = this.currentBundle.sentences.find(s => s.sentenceIndex === this.currentSentenceIndex);
        if (activeSentence) {
          // Don't re-trigger onSentenceStart since we're continuing the same sentence

          // Suppress transitions briefly to avoid skips
          this.suppressTransitionsUntil = performance.now() + 200; // Back to 200ms suppression
          this.startSequentialMonitoring(this.currentBundle, this.currentSentenceIndex);
        }
      }
    }
  }

  /**
   * Stop all playback
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }

    this.isPlaying = false;
    this.isPlayingRef.current = false;
    this.currentSentenceIndex = -1;

    // Reset stored pause position
    this.pausedAtTime = 0;
    this.pausedAtSentence = -1;

    this.stopMonitoring();
  }

  /**
   * Get current playback state
   */
  getPlaybackState() {
    return {
      isPlaying: this.isPlaying,
      currentBundle: this.currentBundle?.bundleId || null,
      currentSentenceIndex: this.currentSentenceIndex,
      currentTime: this.currentAudio?.currentTime || 0,
      duration: this.currentBundle?.totalDuration || 0
    };
  }

  /**
   * Get current bundle (for cross-bundle jump detection)
   */
  getCurrentBundle(): BundleData | null {
    return this.currentBundle;
  }

  /**
   * Seek to specific time in current audio
   */
  seekToTime(time: number): void {
    if (this.currentAudio) {
      this.currentAudio.currentTime = time;
      console.log(`⏩ Seeked to ${time.toFixed(2)}s`);
    }
  }

  /**
   * Set current sentence index (for same-bundle jumps)
   */
  setCurrentSentenceIndex(index: number): void {
    this.currentSentenceIndex = index;
    console.log(`📍 Sentence index set to ${index}`);
  }

  /**
   * Set playback rate (speed) for current audio
   */
  setPlaybackRate(rate: number) {
    if (this.currentAudio) {
      this.currentAudio.playbackRate = rate;
      console.log(`🎵 Playback rate set to: ${rate}x`);
    }
  }

  /**
   * Get current audio time
   */
  getCurrentTime(): number {
    return this.currentAudio?.currentTime || 0;
  }

  /**
   * Get total time of current audio
   */
  getTotalTime(): number {
    return this.currentAudio?.duration || this.currentBundle?.totalDuration || 0;
  }

  /**
   * Get current playback speed
   */
  getPlaybackSpeed(): number {
    return this.currentAudio?.playbackRate || 1.0;
  }

  /**
   * Expose callback setters for AudioBookPlayer
   */
  set onSentenceStart(callback: ((sentence: BundleSentence) => void) | undefined) {
    this.options.onSentenceStart = callback;
  }

  set onTimeUpdate(callback: ((currentTime: number, totalTime: number) => void) | undefined) {
    this.options.onTimeUpdate = callback;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stop();

    if (this.currentAudio) {
      this.currentAudio.src = '';
      this.currentAudio.load();
      this.currentAudio = null;
    }

    this.currentBundle = null;
  }

  private stopMonitoring() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

export type { BundleData, BundleSentence, BundleAudioOptions };