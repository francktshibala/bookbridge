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
}

export class BundleAudioManager {
  private currentAudio: HTMLAudioElement | null = null;
  private currentBundle: BundleData | null = null;
  private currentSentenceIndex = -1;
  private progressTimer: number | null = null;
  private options: BundleAudioOptions = {};
  private isPlaying = false;
  private isPlayingRef: { current: boolean } = { current: false }; // Critical fix for closure issue

  constructor(options: BundleAudioOptions = {}) {
    this.options = options;
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

      // Set playback position to sentence start time
      this.currentAudio.currentTime = targetSentence.startTime;
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

        // Start from sentence beginning
        this.currentAudio.currentTime = startSentence.startTime;
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

      // Create new audio for this sentence
      const audio = new Audio(audioUrl);
      audio.crossOrigin = 'anonymous';
      this.currentAudio = audio;

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

      // Create new audio element
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';

      const onCanPlay = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);

        this.currentAudio = audio;
        this.currentBundle = bundle;

        console.log(`✅ Bundle loaded: ${bundle.bundleId} (${bundle.totalDuration.toFixed(1)}s)`);
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
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }

    this.progressTimer = window.setInterval(() => {
      if (!this.currentAudio || !this.isPlayingRef.current) return;

      const currentTime = this.currentAudio.currentTime;

      // Check if sentence is complete
      if (currentTime >= targetSentence.endTime) {
        this.handleSentenceComplete(targetSentence);
        return;
      }

      // Report progress
      this.options.onProgress?.(currentTime, targetSentence.endTime);

    }, 50); // Check every 50ms for precision
  }

  /**
   * Monitor progress for sequential sentence playback
   */
  private startSequentialMonitoring(bundle: BundleData, startIndex: number) {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }

    let currentSentenceInBundle = bundle.sentences.find(s => s.sentenceIndex === startIndex);
    if (!currentSentenceInBundle) return;

    this.progressTimer = window.setInterval(() => {
      if (!this.currentAudio || !this.isPlayingRef.current || !currentSentenceInBundle) return;

      const currentTime = this.currentAudio.currentTime;

      // Debug timing progress (disabled for production)
      // if (currentSentenceInBundle && currentTime % 1 < 0.1) {
      //   console.log(`⏱️ Progress: ${currentTime.toFixed(1)}s / ${currentSentenceInBundle.endTime}s (sentence ${currentSentenceInBundle.sentenceIndex})`);
      // }

      // Check for next sentence START TIME to highlight immediately
      const nextSentenceIndex = currentSentenceInBundle.sentenceIndex + 1;
      const nextSentence = bundle.sentences.find(s => s.sentenceIndex === nextSentenceIndex);

      if (nextSentence && currentTime >= nextSentence.startTime) {
        // Immediately highlight next sentence when its start time is reached
        this.options.onSentenceEnd?.(currentSentenceInBundle);
        currentSentenceInBundle = nextSentence;
        this.currentSentenceIndex = nextSentenceIndex;
        this.options.onSentenceStart?.(nextSentence);
      }
      // Check if current sentence is complete OR if audio has naturally ended
      else if (currentTime >= currentSentenceInBundle.endTime ||
          (this.currentAudio.ended) ||
          (currentTime >= this.currentAudio.duration - 0.1)) {
        console.log(`✅ Sentence ${currentSentenceInBundle.sentenceIndex} complete at ${currentTime}s (endTime: ${currentSentenceInBundle.endTime}s)`);
        this.options.onSentenceEnd?.(currentSentenceInBundle);

        if (nextSentence) {
          // Continue to next sentence
          currentSentenceInBundle = nextSentence;
          this.currentSentenceIndex = nextSentenceIndex;
          this.options.onSentenceStart?.(nextSentence);
          console.log(`🎵 Auto-advancing to sentence ${nextSentenceIndex}`);
        } else {
          // Bundle complete - also check if we're near the end of audio
          console.log(`🏁 No next sentence found. Audio duration: ${this.currentAudio.duration}s, currentTime: ${currentTime}s`);
          this.handleBundleComplete(bundle);
          return;
        }
      }

      // Report progress
      this.options.onProgress?.(currentTime, bundle.totalDuration);

    }, 50);
  }

  /**
   * Handle single sentence completion
   */
  private handleSentenceComplete(sentence: BundleSentence) {
    console.log(`✅ Sentence ${sentence.sentenceIndex} complete`);

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
      this.currentAudio.pause();
    }
    this.isPlaying = false;
    this.isPlayingRef.current = false;

    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  /**
   * Resume playback
   */
  async resume() {
    if (this.currentAudio && this.currentAudio.paused) {
      this.isPlaying = true;
      this.isPlayingRef.current = true;
      await this.currentAudio.play();

      // Restart monitoring based on current context
      if (this.currentBundle && this.currentSentenceIndex >= 0) {
        const currentSentence = this.currentBundle.sentences.find(
          s => s.sentenceIndex === this.currentSentenceIndex
        );
        if (currentSentence) {
          this.startProgressMonitoring(currentSentence);
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

    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
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
}

export type { BundleData, BundleSentence, BundleAudioOptions };