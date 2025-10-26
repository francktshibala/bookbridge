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
  private durationScaleClamp = [0.85, 1.10]; // Allow 85-110% timing adjustment for ElevenLabs voices
  private scaledSentences: Map<number, {startTime: number, endTime: number}> = new Map();
  private bundleOffsets: Map<string, number> = new Map(); // Per-bundle timing offset for ElevenLabs drift correction
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

      // Start from scaled sentence beginning with offset correction
      const scaledStart = this.scaledSentences.get(startSentenceIndex)?.startTime || (startSentence.startTime * this.durationScale);
      const bundleOffset = this.bundleOffsets.get(bundle.bundleId) || 0;
      this.currentAudio.currentTime = scaledStart + bundleOffset;
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
      console.log(`📊 DEBUG: Bundle ${bundle.bundleId} has ${bundle.sentences.length} sentences`);
      console.log(`📊 DEBUG: Available sentence indexes:`, bundle.sentences.map(s => s.sentenceIndex));

      if (!this.isPlayingRef.current) return;

      const sentence = bundle.sentences.find(s => s.sentenceIndex === sentenceIndex);
      console.log(`🔍 Found sentence:`, sentence ? `${sentence.sentenceIndex}: "${sentence.text.substring(0, 50)}..."` : 'NOT FOUND');

      if (sentence) {
        console.log(`⏱️ DEBUG: Sentence ${sentenceIndex} timing: ${sentence.startTime}s - ${sentence.endTime}s (${(sentence.endTime - sentence.startTime).toFixed(2)}s duration)`);
        console.log(`📝 DEBUG: Sentence text length: ${sentence.text.length} chars, word count: ${sentence.text.split(/\s+/).length}`);
      }

      if (!sentence) {
        console.log(`❌ SKIP DETECTED: Bundle ${bundle.bundleId} complete - no sentence found for index ${sentenceIndex}`);
        console.log(`❌ SKIP ANALYSIS: Requested ${sentenceIndex}, but available are:`, bundle.sentences.map(s => s.sentenceIndex));
        console.log(`❌ POTENTIAL CAUSE: Long sentence skipping or timing issue`);
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

        // Precompute scaled sentence timings with clamping (pipeline fix for ElevenLabs)
        this.scaledSentences.clear();

        // Clamp the scale to prevent extreme timing distortions
        const rawScale = this.durationScale;
        const clampedScale = Math.max(this.durationScaleClamp[0], Math.min(this.durationScaleClamp[1], rawScale));

        console.log(`📐 Bundle ${bundle.bundleId} timing scale: ${rawScale.toFixed(3)} (clamped to ${clampedScale.toFixed(3)})`);
        console.log(`⏱️ Bundle duration - Meta: ${metaDuration.toFixed(2)}s, Real: ${realDuration.toFixed(2)}s`);

        // CRITICAL DEBUG: Compare our timing formula vs actual audio duration
        const calculatedTotal = bundle.sentences.reduce((sum, s) => {
          const words = s.text.split(/\s+/).length;
          return sum + Math.max(words * 0.4, 2.0);  // Our Jekyll formula
        }, 0);

        console.log(`🔍 DURATION ANALYSIS FOR CHRISTMAS CAROL:`);
        console.log(`   🧮 Our formula (0.4s/word + 2.0s min): ${calculatedTotal.toFixed(2)}s`);
        console.log(`   🎵 Actual Daniel voice audio: ${realDuration.toFixed(2)}s`);
        console.log(`   ⚠️ Timing difference: ${(realDuration - calculatedTotal).toFixed(2)}s`);
        console.log(`   📈 Daniel voice scale factor: ${(realDuration / calculatedTotal).toFixed(3)}x`);

        if (Math.abs(realDuration - calculatedTotal) > 2) {
          console.log(`🚨 MAJOR DANIEL VOICE MISMATCH: Our timing is ${Math.abs(realDuration - calculatedTotal).toFixed(1)}s off!`);
          console.log(`💡 This explains why sentences don't complete - our timing is wrong for Daniel voice`);
        }

        bundle.sentences.forEach(sentence => {
          const scaledStart = sentence.startTime * clampedScale;
          const scaledEnd = sentence.endTime * clampedScale;

          // Ensure minimum duration for long sentences + safety tail for Daniel's delivery
          const words = sentence.text.split(/\s+/).length;
          const minDuration = Math.max(words * 0.45, 2.5); // ElevenLabs Daniel base timing
          const safetyTail = 0.12; // 120ms safety buffer for breathing/tails (GPT-5 fix)
          const adjustedEnd = Math.max(scaledEnd, scaledStart + minDuration) + safetyTail;

          this.scaledSentences.set(sentence.sentenceIndex, {
            startTime: scaledStart,
            endTime: adjustedEnd
          });

          // DEBUG: Detailed sentence timing analysis
          const originalDuration = sentence.endTime - sentence.startTime;
          const expectedDuration = Math.max(words * 0.4, 2.0);
          const actualScaledDuration = adjustedEnd - scaledStart;

          console.log(`📅 Sentence ${sentence.sentenceIndex} TIMING BREAKDOWN:`);
          console.log(`   📝 "${sentence.text.substring(0, 40)}${sentence.text.length > 40 ? '...' : ''}"`);
          console.log(`   🧮 Expected (${words}w * 0.4): ${expectedDuration.toFixed(2)}s`);
          console.log(`   🎵 API timing: ${originalDuration.toFixed(2)}s`);
          console.log(`   📊 After scaling+safety: ${actualScaledDuration.toFixed(2)}s`);
          console.log(`   ⏱️ Final range: ${scaledStart.toFixed(2)}s - ${adjustedEnd.toFixed(2)}s`);

          if (Math.abs(originalDuration - expectedDuration) > 1) {
            console.log(`   🚨 SENTENCE MISMATCH: API timing differs from our formula by ${Math.abs(originalDuration - expectedDuration).toFixed(2)}s`);
          }

          if (words > 15) {
            console.log(`   🚫 LONG SENTENCE ALERT: ${words} words might cause completion issues`);
          }
        });

        if (process.env.NEXT_PUBLIC_AUDIO_DEBUG === '1') {
          console.log(`🧭 Duration calibration: meta=${metaDuration.toFixed(2)}s real=${realDuration.toFixed(2)}s scale=${this.durationScale.toFixed(3)}`);
        }

        if (process.env.NEXT_PUBLIC_AUDIO_DEBUG === '1') {
          const safeTotal = Number(bundle.totalDuration);
          const printableTotal = Number.isFinite(safeTotal) ? `${safeTotal.toFixed(1)}s` : 'N/A';
          console.log(`✅ Bundle loaded: ${bundle.bundleId} (${printableTotal})`);
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

      // Bundle completion: Use natural audio end only (GPT-5 fix)
      // Lead affects highlighting only, NOT completion timing
      const isAudioEnded = this.currentAudio.ended || rawTime >= (this.currentAudio.duration - 0.05);

      if (isAudioEnded) {
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

      // DEBUG: Log current timing state
      if (Math.floor(rawTime * 10) % 5 === 0) { // Log every 500ms
        console.log(`🎯 TIMING DEBUG: rawTime=${rawTime.toFixed(2)}s, highlightTime=${highlightTime.toFixed(2)}s, lead=${this.highlightLeadSeconds.toFixed(2)}s`);
        console.log(`📍 Current sentence ${currentSentenceInBundle.sentenceIndex}: "${currentSentenceInBundle.text.substring(0, 40)}..."`);
      }

      const nextSentenceIndex = currentSentenceInBundle.sentenceIndex + 1;
      const nextSentence = bundle.sentences.find(s => s.sentenceIndex === nextSentenceIndex);
      // CRITICAL FIX: Don't default to 0 when nextSentence doesn't exist
      const nextScaledStart = nextSentence ? (this.scaledSentences.get(nextSentenceIndex)?.startTime || 0) : Infinity;
      const currentScaledEnd = this.scaledSentences.get(currentSentenceInBundle.sentenceIndex)?.endTime || 0;

      // DEBUG: Log timing comparison every few frames
      if (Math.floor(rawTime * 10) % 3 === 0) { // Every 300ms
        console.log(`🔄 TRANSITION CHECK: current=${currentSentenceInBundle.sentenceIndex}, next=${nextSentenceIndex} (exists: ${!!nextSentence})`);
        console.log(`   ⏰ highlightTime=${highlightTime.toFixed(2)} vs nextStart=${nextScaledStart === Infinity ? 'Infinity' : nextScaledStart.toFixed(2)} (diff: ${nextScaledStart === Infinity ? 'N/A' : (nextScaledStart - highlightTime).toFixed(2)}s)`);
        console.log(`   ⏱️ rawTime=${rawTime.toFixed(2)} vs currentEnd=${currentScaledEnd.toFixed(2)} (diff: ${(currentScaledEnd - rawTime).toFixed(2)}s)`);
      }

      // Advance to next sentence when highlight reaches next start, but not during hysteresis window
      // CRITICAL FIX: Check nextSentence exists AND nextScaledStart is valid (not Infinity)
      if (nextSentence && nextScaledStart !== Infinity && nextScaledStart > 0 && highlightTime >= nextScaledStart && now >= this.suppressTransitionsUntil) {
        console.log(`🚀 SENTENCE TRANSITION: ${currentSentenceInBundle.sentenceIndex} → ${nextSentenceIndex}`);
        console.log(`   ⏰ Trigger: highlightTime(${highlightTime.toFixed(2)}) >= nextStart(${nextScaledStart.toFixed(2)})`);
        console.log(`   🎵 Audio position: ${rawTime.toFixed(2)}s / ${this.currentAudio.duration.toFixed(2)}s`);
        console.log(`   📝 Ending: "${currentSentenceInBundle.text.substring(0, 30)}..."`);
        console.log(`   📝 Starting: "${nextSentence.text.substring(0, 30)}..."`);

        this.options.onSentenceEnd?.(currentSentenceInBundle);
        currentSentenceInBundle = nextSentence;
        this.currentSentenceIndex = nextSentenceIndex;
        this.options.onSentenceStart?.(nextSentence);
      } else {
        // Complete current sentence: Use natural audio end for completion (GPT-5 fix)
        // Lead affects highlighting only, NOT sentence completion
        const isAudioEnded = this.currentAudio.ended || rawTime >= (this.currentAudio.duration - 0.05);
        const isSentenceComplete = currentScaledEnd > 0 && rawTime >= currentScaledEnd;

        if (isAudioEnded || isSentenceComplete) {
          console.log(`✅ SENTENCE COMPLETION: ${currentSentenceInBundle.sentenceIndex}`);
          console.log(`   🎵 Audio: ended=${this.currentAudio.ended}, rawTime=${rawTime.toFixed(2)}, duration=${this.currentAudio.duration.toFixed(2)}`);
          console.log(`   ⏱️ Timing: scaledEnd=${currentScaledEnd.toFixed(2)}, complete=${isSentenceComplete}`);
          console.log(`   📝 Completed: "${currentSentenceInBundle.text.substring(0, 50)}..."`);

          this.options.onSentenceEnd?.(currentSentenceInBundle);
          if (nextSentence) {
            console.log(`   ➡️ Advancing to sentence ${nextSentenceIndex}`);
            currentSentenceInBundle = nextSentence;
            this.currentSentenceIndex = nextSentenceIndex;
            this.options.onSentenceStart?.(nextSentence);
          } else {
            console.log(`   🏁 Bundle ${bundle.bundleId} complete - no more sentences`);
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

    // CRITICAL DEBUG: Log actual vs expected completion time
    if (this.currentAudio) {
      const actualDurationRaw = this.currentAudio.duration;
      const currentTimeRaw = this.currentAudio.currentTime;
      const expectedFromBundle = (bundle as any).totalDuration ?? (bundle as any).duration;

      // Fallbacks: use sentence metadata max endTime, then audio duration
      const validEndTimes = Array.isArray(bundle.sentences) && bundle.sentences.length > 0
        ? bundle.sentences.map(s => s.endTime).filter(t => typeof t === 'number' && Number.isFinite(t))
        : [];
      const metaEnd = validEndTimes.length > 0 ? Math.max(...validEndTimes) : undefined;

      const expectedDuration = [expectedFromBundle, metaEnd, actualDurationRaw]
        .map(v => (typeof v === 'number' && Number.isFinite(v) ? v : undefined))
        .find(v => v !== undefined) ?? 0;

      const actualDuration = Number.isFinite(actualDurationRaw) ? actualDurationRaw : (expectedDuration || 0);
      const currentTime = Number.isFinite(currentTimeRaw) ? currentTimeRaw : 0;

      console.log(`🏁 BUNDLE COMPLETION ANALYSIS:`);
      console.log(`   🎵 Actual audio duration: ${Number(actualDuration).toFixed(2)}s`);
      console.log(`   ⏰ Stopped at time: ${Number(currentTime).toFixed(2)}s`);
      console.log(`   🧮 Expected duration: ${Number(expectedDuration).toFixed(2)}s`);
      console.log(`   ⚠️ Time remaining: ${Number(actualDuration - currentTime).toFixed(2)}s`);

      if ((actualDuration - currentTime) > 0.5) {
        console.log(`🚨 EARLY COMPLETION: Stopped ${Number(actualDuration - currentTime).toFixed(1)}s before audio end!`);
        console.log(`💡 This is why sentences don't finish - bundle completing too early`);
      }

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

    // ⭐ FIX 1b: Clear currentBundle so next play() will reload bundles
    this.currentBundle = null;

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