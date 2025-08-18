/**
 * Audio Prefetch Service for Progressive Voice Feature
 * Handles smart pre-generation of next chunk audio for seamless auto-advance
 */

interface SentenceAudio {
  text: string;
  audioUrl: string;
  duration: number;
  wordTimings: WordTiming[];
  sentenceIndex: number;
}

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
}

interface PrefetchOptions {
  bookId: string;
  chunkIndex: number;
  cefrLevel: string;
  voiceId: string;
  priority?: 'high' | 'low';
}

interface PrefetchStatus {
  inProgress: boolean;
  completed: boolean;
  error: string | null;
  startTime: number;
  estimatedCompletion: number;
}

export class AudioPrefetchService {
  private static instance: AudioPrefetchService;
  private prefetchQueue: Map<string, Promise<SentenceAudio[]>> = new Map();
  private prefetchStatus: Map<string, PrefetchStatus> = new Map();
  private activeRequests: Set<string> = new Set();
  
  // Configuration
  private readonly MAX_CONCURRENT_PREFETCH = 2;
  private readonly PREFETCH_TIMEOUT = 30000; // 30 seconds
  private readonly CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Start periodic cache cleanup
    this.startCacheCleanup();
  }

  public static getInstance(): AudioPrefetchService {
    if (!AudioPrefetchService.instance) {
      AudioPrefetchService.instance = new AudioPrefetchService();
    }
    return AudioPrefetchService.instance;
  }

  /**
   * Prefetch next chunk audio in background
   * Target: <0.5 second retrieval when user advances
   */
  public async prefetchNextChunk(options: PrefetchOptions): Promise<void> {
    const nextChunkKey = this.generateCacheKey({
      ...options,
      chunkIndex: options.chunkIndex + 1
    });

    // Don't prefetch if already in progress or completed
    if (this.prefetchQueue.has(nextChunkKey) || this.prefetchStatus.get(nextChunkKey)?.completed) {
      return;
    }

    // Check if we're at max concurrent requests
    if (this.activeRequests.size >= this.MAX_CONCURRENT_PREFETCH) {
      console.log('Max concurrent prefetch reached, queuing for later');
      // Queue for later execution
      setTimeout(() => this.prefetchNextChunk(options), 1000);
      return;
    }

    // Start prefetch
    const prefetchPromise = this.executePrefetch({
      ...options,
      chunkIndex: options.chunkIndex + 1
    });

    this.prefetchQueue.set(nextChunkKey, prefetchPromise);
    this.updatePrefetchStatus(nextChunkKey, {
      inProgress: true,
      completed: false,
      error: null,
      startTime: Date.now(),
      estimatedCompletion: Date.now() + 10000 // Estimate 10 seconds
    });

    try {
      await prefetchPromise;
      this.updatePrefetchStatus(nextChunkKey, {
        inProgress: false,
        completed: true,
        error: null,
        startTime: this.prefetchStatus.get(nextChunkKey)?.startTime || Date.now(),
        estimatedCompletion: Date.now()
      });
    } catch (error) {
      console.error('Prefetch failed:', error);
      this.updatePrefetchStatus(nextChunkKey, {
        inProgress: false,
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        startTime: this.prefetchStatus.get(nextChunkKey)?.startTime || Date.now(),
        estimatedCompletion: Date.now()
      });
      this.prefetchQueue.delete(nextChunkKey);
    }
  }

  /**
   * Get preloaded chunk if available (for instant auto-advance)
   */
  public async getPreloadedChunk(
    bookId: string,
    chunkIndex: number,
    cefrLevel: string,
    voiceId: string
  ): Promise<SentenceAudio[] | null> {
    const chunkKey = this.generateCacheKey({ bookId, chunkIndex, cefrLevel, voiceId });
    
    const prefetchPromise = this.prefetchQueue.get(chunkKey);
    if (!prefetchPromise) {
      return null;
    }

    try {
      // Wait for prefetch to complete (should be instant if already done)
      const result = await Promise.race([
        prefetchPromise,
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Prefetch timeout')), 500)
        )
      ]);
      
      return result;
    } catch (error) {
      console.error('Failed to get preloaded chunk:', error);
      return null;
    }
  }

  /**
   * Execute actual prefetch operation
   */
  private async executePrefetch(options: PrefetchOptions): Promise<SentenceAudio[]> {
    const chunkKey = this.generateCacheKey(options);
    this.activeRequests.add(chunkKey);

    try {
      // Step 1: Check if already cached
      const cachedAudio = await this.checkCache(options);
      if (cachedAudio && cachedAudio.length > 0) {
        return cachedAudio;
      }

      // Step 2: Get next chunk content
      const chunkContent = await this.fetchChunkContent(options);
      if (!chunkContent) {
        throw new Error('No content found for chunk');
      }

      // Step 3: Generate audio for the chunk
      const sentenceAudio = await this.generateChunkAudio(chunkContent, options);

      // Step 4: Cache the generated audio
      await this.cacheGeneratedAudio(sentenceAudio, options);

      return sentenceAudio;

    } finally {
      this.activeRequests.delete(chunkKey);
    }
  }

  /**
   * Check cache for existing audio
   */
  private async checkCache(options: PrefetchOptions): Promise<SentenceAudio[] | null> {
    try {
      const response = await fetch(
        `/api/audio/cache?bookId=${options.bookId}&chunkIndex=${options.chunkIndex}&cefrLevel=${options.cefrLevel}&voiceId=${options.voiceId}`
      );

      if (response.ok) {
        const data = await response.json();
        return data.cached ? data.audioData : null;
      }
    } catch (error) {
      console.error('Cache check failed:', error);
    }
    return null;
  }

  /**
   * Fetch content for the next chunk
   */
  private async fetchChunkContent(options: PrefetchOptions): Promise<string | null> {
    try {
      // Use the existing content API to get chunk text
      const response = await fetch(`/api/books/${options.bookId}/content-fast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunkIndex: options.chunkIndex,
          cefrLevel: options.cefrLevel,
          mode: 'simplified'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.content || null;
      }
    } catch (error) {
      console.error('Failed to fetch chunk content:', error);
    }
    return null;
  }

  /**
   * Generate audio for chunk content
   */
  private async generateChunkAudio(
    content: string,
    options: PrefetchOptions
  ): Promise<SentenceAudio[]> {
    // Use TextProcessor to split content into sentences
    const { TextProcessor } = await import('./text-processor');
    const processedSentences = TextProcessor.splitIntoSentences(content);

    const sentenceAudio: SentenceAudio[] = [];

    // Generate audio for each sentence
    for (let i = 0; i < processedSentences.length; i++) {
      const sentence = processedSentences[i];
      
      try {
        const audio = await this.generateSentenceAudio(sentence.text, i, options);
        sentenceAudio.push(audio);
        
        // Small delay to avoid overwhelming TTS API
        if (i < processedSentences.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Failed to generate audio for sentence ${i}:`, error);
        // Continue with other sentences
      }
    }

    return sentenceAudio;
  }

  /**
   * Generate audio for a single sentence
   */
  private async generateSentenceAudio(
    text: string,
    sentenceIndex: number,
    options: PrefetchOptions
  ): Promise<SentenceAudio> {
    // This will integrate with existing TTS system
    // For now, return mock data structure
    const words = text.split(' ');
    const mockWordTimings: WordTiming[] = words.map((word, index) => ({
      word: word.replace(/[.,!?]/g, ''),
      startTime: index * 0.5,
      endTime: (index + 1) * 0.5,
      wordIndex: index
    }));

    // TODO: Replace with actual TTS API call
    return {
      text,
      audioUrl: `mock://audio-${options.bookId}-${options.chunkIndex}-${sentenceIndex}`,
      duration: words.length * 0.5,
      wordTimings: mockWordTimings,
      sentenceIndex
    };
  }

  /**
   * Cache generated audio
   */
  private async cacheGeneratedAudio(
    sentenceAudio: SentenceAudio[],
    options: PrefetchOptions
  ): Promise<void> {
    try {
      // Cache each sentence separately
      for (const audio of sentenceAudio) {
        await fetch('/api/audio/cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId: options.bookId,
            chunkIndex: options.chunkIndex,
            cefrLevel: options.cefrLevel,
            voiceId: options.voiceId,
            sentenceAudio: audio
          })
        });
      }
    } catch (error) {
      console.error('Failed to cache generated audio:', error);
      // Non-critical error - don't throw
    }
  }

  /**
   * Generate cache key for consistent lookups
   */
  private generateCacheKey(options: PrefetchOptions): string {
    return `${options.bookId}_${options.chunkIndex}_${options.cefrLevel}_${options.voiceId}`;
  }

  /**
   * Update prefetch status
   */
  private updatePrefetchStatus(key: string, status: PrefetchStatus): void {
    this.prefetchStatus.set(key, status);
  }

  /**
   * Get prefetch status for debugging
   */
  public getPrefetchStatus(
    bookId: string,
    chunkIndex: number,
    cefrLevel: string,
    voiceId: string
  ): PrefetchStatus | null {
    const key = this.generateCacheKey({ bookId, chunkIndex, cefrLevel, voiceId });
    return this.prefetchStatus.get(key) || null;
  }

  /**
   * Cleanup old prefetch data
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Remove old prefetch status entries (older than 1 hour)
      for (const [key, status] of this.prefetchStatus.entries()) {
        if (now - status.startTime > 60 * 60 * 1000) {
          this.prefetchStatus.delete(key);
        }
      }

      // Remove completed prefetch promises (older than 10 minutes)
      for (const [key, promise] of this.prefetchQueue.entries()) {
        const status = this.prefetchStatus.get(key);
        if (status?.completed && now - status.startTime > 10 * 60 * 1000) {
          this.prefetchQueue.delete(key);
        }
      }
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Force clear prefetch cache (for debugging)
   */
  public clearPrefetchCache(): void {
    this.prefetchQueue.clear();
    this.prefetchStatus.clear();
    this.activeRequests.clear();
  }

  /**
   * Get prefetch statistics
   */
  public getPrefetchStats(): {
    queueSize: number;
    activeRequests: number;
    completedPrefetches: number;
    failedPrefetches: number;
  } {
    const completed = Array.from(this.prefetchStatus.values()).filter(s => s.completed).length;
    const failed = Array.from(this.prefetchStatus.values()).filter(s => s.error !== null).length;

    return {
      queueSize: this.prefetchQueue.size,
      activeRequests: this.activeRequests.size,
      completedPrefetches: completed,
      failedPrefetches: failed
    };
  }
}

// Export singleton instance
export const audioPrefetchService = AudioPrefetchService.getInstance();