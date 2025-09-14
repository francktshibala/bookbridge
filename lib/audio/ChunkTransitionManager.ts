export class ChunkTransitionManager {
  private preloadedChunks: Map<number, HTMLAudioElement> = new Map();
  private currentChunkIndex: number = -1;
  private transitionDuration: number = 150; // ms for crossfade
  private preloadAhead: number = 2; // Preload next 2 chunks

  constructor() {
    this.cleanupOldChunks = this.cleanupOldChunks.bind(this);
  }

  // Preload upcoming chunks
  async preloadChunks(chunks: Array<{ chunkIndex: number; audioUrl: string }>, currentIndex: number) {
    const toPreload = chunks.slice(currentIndex + 1, currentIndex + 1 + this.preloadAhead);

    for (const chunk of toPreload) {
      if (!this.preloadedChunks.has(chunk.chunkIndex)) {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = chunk.audioUrl;

        // Start loading but don't wait
        audio.load();

        this.preloadedChunks.set(chunk.chunkIndex, audio);

        console.log(`📦 Preloaded chunk ${chunk.chunkIndex}`);
      }
    }

    // Clean up old chunks
    this.cleanupOldChunks(currentIndex);
  }

  // Get preloaded audio element or create new one
  getAudioElement(chunkIndex: number, audioUrl: string): HTMLAudioElement {
    const preloaded = this.preloadedChunks.get(chunkIndex);

    if (preloaded) {
      console.log(`✅ Using preloaded chunk ${chunkIndex}`);
      this.preloadedChunks.delete(chunkIndex); // Remove from cache once used
      return preloaded;
    }

    // Fallback: create new audio element
    console.log(`⚠️ Chunk ${chunkIndex} not preloaded, creating new`);
    const audio = new Audio();
    audio.src = audioUrl;
    return audio;
  }

  // Smooth transition between chunks
  async transitionToChunk(
    currentAudio: HTMLAudioElement | null,
    nextAudio: HTMLAudioElement,
    onTransitionComplete?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!currentAudio || currentAudio.paused) {
        // No current audio or it's paused, just start the next one
        nextAudio.play().then(() => {
          onTransitionComplete?.();
          resolve();
        });
        return;
      }

      // Crossfade between chunks
      const fadeOutInterval = 10; // ms
      const fadeSteps = this.transitionDuration / fadeOutInterval;
      let step = 0;

      // Start playing next audio at low volume
      nextAudio.volume = 0;
      nextAudio.play().then(() => {
        const fadeInterval = setInterval(() => {
          step++;
          const progress = step / fadeSteps;

          // Fade out current
          if (currentAudio && !currentAudio.paused) {
            currentAudio.volume = Math.max(0, 1 - progress);
          }

          // Fade in next
          nextAudio.volume = Math.min(1, progress);

          if (step >= fadeSteps) {
            clearInterval(fadeInterval);

            // Stop old audio
            if (currentAudio) {
              currentAudio.pause();
              currentAudio.volume = 1; // Reset volume
            }

            onTransitionComplete?.();
            resolve();
          }
        }, fadeOutInterval);
      }).catch(err => {
        console.error('Failed to start next chunk:', err);
        resolve();
      });
    });
  }

  // Clean up chunks that are too far behind
  private cleanupOldChunks(currentIndex: number) {
    const keepThreshold = currentIndex - 2; // Keep 2 chunks behind

    for (const [index, audio] of this.preloadedChunks.entries()) {
      if (index < keepThreshold) {
        audio.src = ''; // Release resources
        this.preloadedChunks.delete(index);
        console.log(`🗑️ Cleaned up old chunk ${index}`);
      }
    }
  }

  // Get transition readiness status
  isChunkReady(chunkIndex: number): boolean {
    const audio = this.preloadedChunks.get(chunkIndex);
    return audio ? audio.readyState >= 3 : false; // HAVE_FUTURE_DATA or better
  }

  // Calculate optimal preload timing
  getPreloadTiming(currentProgress: number, chunkDuration: number): number {
    // Start preloading when 80% through current chunk
    const preloadThreshold = 0.8;
    const progressRatio = currentProgress / chunkDuration;

    if (progressRatio >= preloadThreshold) {
      return 0; // Preload immediately
    }

    // Calculate time until preload threshold
    const remainingTime = (preloadThreshold - progressRatio) * chunkDuration;
    return remainingTime * 1000; // Convert to ms
  }

  // Cleanup all resources
  destroy() {
    for (const audio of this.preloadedChunks.values()) {
      audio.src = '';
    }
    this.preloadedChunks.clear();
  }
}