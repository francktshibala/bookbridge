/**
 * Audio Segmentation Service for BookBridge PWA
 * Implements chunked audio loading for network-adaptive streaming
 * Research findings: 5-10 second segments for progressive playback on 2G/3G networks
 */

import { audioCacheDB, AudioQuality, NetworkType, CachePriority } from './audio-cache-db';
import { networkAdaptiveAudio } from './network-adaptive-audio';

interface AudioSegment {
  segmentIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  audioBlob: Blob;
  wordTimings: WordTiming[];
  quality: AudioQuality;
  fromCache: boolean;
}

interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
}

interface SegmentationOptions {
  bookId: string;
  chunkIndex: number;
  cefrLevel: string;
  voiceId: string;
  segmentDuration?: number; // seconds, network-adaptive
  preloadCount?: number;    // how many segments to preload
  priority?: CachePriority;
}

interface SegmentLoadResult {
  segment: AudioSegment;
  totalSegments: number;
  nextSegmentReady: boolean;
  loadTime: number;
  networkType: NetworkType;
}

export class AudioSegmentationService {
  private static instance: AudioSegmentationService;
  private segmentCache = new Map<string, AudioSegment[]>();
  private loadingPromises = new Map<string, Promise<AudioSegment>>();
  
  static getInstance(): AudioSegmentationService {
    if (!AudioSegmentationService.instance) {
      AudioSegmentationService.instance = new AudioSegmentationService();
    }
    return AudioSegmentationService.instance;
  }

  private getOptimalSegmentDuration(networkType: NetworkType): number {
    // Network-adaptive segment sizes based on PWA research
    switch (networkType) {
      case NetworkType.SLOW_2G: return 5;   // 5-second segments for very slow networks
      case NetworkType.TWOG: return 5;      // 5-second segments for 2G
      case NetworkType.THREEG: return 8;    // 8-second segments for 3G
      case NetworkType.FOURG: return 10;    // 10-second segments for 4G
      case NetworkType.WIFI: return 15;     // 15-second segments for WiFi
      default: return 8;                    // 8-second fallback
    }
  }

  private getPreloadCount(networkType: NetworkType): number {
    // Conservative preloading based on network capacity
    switch (networkType) {
      case NetworkType.SLOW_2G: return 1;   // Minimal preload
      case NetworkType.TWOG: return 2;      // Very conservative
      case NetworkType.THREEG: return 3;    // Moderate
      case NetworkType.FOURG: return 4;     // Aggressive
      case NetworkType.WIFI: return 6;      // Maximum preload
      default: return 2;                    // Safe fallback
    }
  }

  async loadSegment(options: SegmentationOptions, segmentIndex: number): Promise<SegmentLoadResult> {
    const startTime = Date.now();
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    
    const segmentDuration = options.segmentDuration || this.getOptimalSegmentDuration(networkInfo.type);
    const cacheKey = this.generateSegmentCacheKey(options, segmentIndex);

    // Check if segment is already loading
    if (this.loadingPromises.has(cacheKey)) {
      const segment = await this.loadingPromises.get(cacheKey)!;
      return {
        segment,
        totalSegments: await this.estimateTotalSegments(options, segmentDuration),
        nextSegmentReady: this.isNextSegmentReady(options, segmentIndex + 1),
        loadTime: Date.now() - startTime,
        networkType: networkInfo.type
      };
    }

    // Create loading promise
    const loadingPromise = this.performSegmentLoad(options, segmentIndex, segmentDuration);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const segment = await loadingPromise;
      
      // Start preloading next segments in background
      this.preloadNextSegments(options, segmentIndex, networkInfo.type);
      
      return {
        segment,
        totalSegments: await this.estimateTotalSegments(options, segmentDuration),
        nextSegmentReady: this.isNextSegmentReady(options, segmentIndex + 1),
        loadTime: Date.now() - startTime,
        networkType: networkInfo.type
      };
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private async performSegmentLoad(
    options: SegmentationOptions, 
    segmentIndex: number, 
    segmentDuration: number
  ): Promise<AudioSegment> {
    const { bookId, chunkIndex, cefrLevel, voiceId, priority = CachePriority.CURRENT_BOOK } = options;

    // Try to load from cache first
    const cachedSegment = await this.getCachedSegment(options, segmentIndex);
    if (cachedSegment) {
      console.log(`AudioSegmentation: Cache hit for segment ${segmentIndex}`);
      return cachedSegment;
    }

    console.log(`AudioSegmentation: Loading segment ${segmentIndex} from API`);

    // Calculate which sentences belong to this segment
    const sentenceRange = await this.calculateSentenceRange(options, segmentIndex, segmentDuration);
    
    // Load all sentences for this segment
    const segmentSentences: any[] = [];
    
    for (let sentenceIndex = sentenceRange.start; sentenceIndex <= sentenceRange.end; sentenceIndex++) {
      try {
        const audioResult = await networkAdaptiveAudio.loadAudio({
          bookId,
          chunkIndex,
          cefrLevel,
          voiceId,
          sentenceIndex,
          priority
        });
        
        segmentSentences.push({
          sentenceIndex,
          ...audioResult
        });
      } catch (error) {
        console.warn(`AudioSegmentation: Failed to load sentence ${sentenceIndex}:`, error);
        // Continue loading other sentences
      }
    }

    if (segmentSentences.length === 0) {
      throw new Error(`Failed to load any sentences for segment ${segmentIndex}`);
    }

    // Combine sentences into a single segment
    const combinedSegment = await this.combineSentencesIntoSegment(
      segmentSentences, 
      segmentIndex, 
      segmentDuration
    );

    // Cache the combined segment
    await this.cacheSegment(options, combinedSegment);

    return combinedSegment;
  }

  private async calculateSentenceRange(
    options: SegmentationOptions, 
    segmentIndex: number, 
    segmentDuration: number
  ): Promise<{ start: number; end: number }> {
    // This is simplified - in a real implementation, you'd need to know
    // the actual sentence durations to calculate accurate ranges
    const estimatedSentencesPerSegment = Math.max(1, Math.floor(segmentDuration / 3)); // ~3 seconds per sentence estimate
    
    const start = segmentIndex * estimatedSentencesPerSegment;
    const end = start + estimatedSentencesPerSegment - 1;
    
    return { start, end };
  }

  private async combineSentencesIntoSegment(
    sentences: any[], 
    segmentIndex: number, 
    targetDuration: number
  ): Promise<AudioSegment> {
    if (sentences.length === 0) {
      throw new Error('No sentences to combine');
    }

    // For simplicity, we'll use the first sentence's audio as the segment
    // In a real implementation, you'd concatenate multiple audio blobs
    const firstSentence = sentences[0];
    
    // Calculate timing offsets for word timings
    let currentOffset = 0;
    const combinedWordTimings: WordTiming[] = [];
    
    for (const sentence of sentences) {
      const adjustedTimings = sentence.wordTimings.map((timing: WordTiming) => ({
        ...timing,
        startTime: timing.startTime + currentOffset,
        endTime: timing.endTime + currentOffset
      }));
      
      combinedWordTimings.push(...adjustedTimings);
      currentOffset += sentence.duration;
    }

    // Calculate segment timing
    const totalDuration = sentences.reduce((sum, s) => sum + s.duration, 0);
    const startTime = segmentIndex * targetDuration;
    const endTime = startTime + totalDuration;

    return {
      segmentIndex,
      startTime,
      endTime,
      duration: totalDuration,
      audioBlob: firstSentence.audioBlob, // In reality, would be concatenated blob
      wordTimings: combinedWordTimings,
      quality: firstSentence.quality,
      fromCache: false
    };
  }

  private async getCachedSegment(options: SegmentationOptions, segmentIndex: number): Promise<AudioSegment | null> {
    const cacheKey = this.generateSegmentCacheKey(options, segmentIndex);
    
    // Check in-memory cache first
    const cachedSegments = this.segmentCache.get(this.generateChunkCacheKey(options));
    if (cachedSegments) {
      const cachedSegment = cachedSegments.find(s => s.segmentIndex === segmentIndex);
      if (cachedSegment) {
        return { ...cachedSegment, fromCache: true };
      }
    }

    // Could implement IndexedDB segment caching here for persistence
    return null;
  }

  private async cacheSegment(options: SegmentationOptions, segment: AudioSegment): Promise<void> {
    const chunkCacheKey = this.generateChunkCacheKey(options);
    
    if (!this.segmentCache.has(chunkCacheKey)) {
      this.segmentCache.set(chunkCacheKey, []);
    }
    
    const cachedSegments = this.segmentCache.get(chunkCacheKey)!;
    
    // Replace existing segment or add new one
    const existingIndex = cachedSegments.findIndex(s => s.segmentIndex === segment.segmentIndex);
    if (existingIndex !== -1) {
      cachedSegments[existingIndex] = segment;
    } else {
      cachedSegments.push(segment);
      // Keep segments sorted by index
      cachedSegments.sort((a, b) => a.segmentIndex - b.segmentIndex);
    }

    // Limit cache size to prevent memory issues
    if (cachedSegments.length > 20) {
      cachedSegments.splice(0, cachedSegments.length - 20);
    }
  }

  private preloadNextSegments(options: SegmentationOptions, currentSegmentIndex: number, networkType: NetworkType): void {
    const preloadCount = this.getPreloadCount(networkType);
    const segmentDuration = this.getOptimalSegmentDuration(networkType);
    
    // Preload next segments in background
    for (let i = 1; i <= preloadCount; i++) {
      const nextSegmentIndex = currentSegmentIndex + i;
      const cacheKey = this.generateSegmentCacheKey(options, nextSegmentIndex);
      
      // Only preload if not already loading or cached
      if (!this.loadingPromises.has(cacheKey) && !this.isSegmentCached(options, nextSegmentIndex)) {
        // Fire and forget - don't await
        this.performSegmentLoad(options, nextSegmentIndex, segmentDuration).catch(error => {
          console.warn(`AudioSegmentation: Preload failed for segment ${nextSegmentIndex}:`, error);
        });
      }
    }
  }

  private isNextSegmentReady(options: SegmentationOptions, nextSegmentIndex: number): boolean {
    return this.isSegmentCached(options, nextSegmentIndex) || 
           this.loadingPromises.has(this.generateSegmentCacheKey(options, nextSegmentIndex));
  }

  private isSegmentCached(options: SegmentationOptions, segmentIndex: number): boolean {
    const chunkCacheKey = this.generateChunkCacheKey(options);
    const cachedSegments = this.segmentCache.get(chunkCacheKey);
    return cachedSegments?.some(s => s.segmentIndex === segmentIndex) || false;
  }

  private async estimateTotalSegments(options: SegmentationOptions, segmentDuration: number): Promise<number> {
    // This would need to be implemented based on your audio metadata
    // For now, return a reasonable estimate
    const estimatedChunkDuration = 300; // 5 minutes average
    return Math.ceil(estimatedChunkDuration / segmentDuration);
  }

  private generateSegmentCacheKey(options: SegmentationOptions, segmentIndex: number): string {
    return `${this.generateChunkCacheKey(options)}_segment_${segmentIndex}`;
  }

  private generateChunkCacheKey(options: SegmentationOptions): string {
    const { bookId, chunkIndex, cefrLevel, voiceId } = options;
    return `${bookId}_${chunkIndex}_${cefrLevel}_${voiceId}`;
  }

  // Public methods for integration

  async preloadChunk(options: SegmentationOptions): Promise<void> {
    console.log(`AudioSegmentation: Preloading chunk for book ${options.bookId}, chunk ${options.chunkIndex}`);
    
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    const segmentDuration = options.segmentDuration || this.getOptimalSegmentDuration(networkInfo.type);
    const preloadCount = Math.min(5, this.getPreloadCount(networkInfo.type)); // Limit initial preload
    
    // Preload first few segments
    const preloadPromises: Promise<AudioSegment>[] = [];
    
    for (let segmentIndex = 0; segmentIndex < preloadCount; segmentIndex++) {
      const loadingPromise = this.performSegmentLoad(options, segmentIndex, segmentDuration)
        .catch(error => {
          console.warn(`AudioSegmentation: Failed to preload segment ${segmentIndex}:`, error);
          throw error;
        });
      
      preloadPromises.push(loadingPromise);
    }
    
    // Wait for at least the first segment to be ready
    try {
      await preloadPromises[0];
      console.log(`AudioSegmentation: First segment ready for chunk ${options.chunkIndex}`);
    } catch (error) {
      console.error(`AudioSegmentation: Failed to preload first segment:`, error);
      throw error;
    }
    
    // Let other segments load in background
    Promise.allSettled(preloadPromises.slice(1)).then(results => {
      const successful = results.filter(r => r.status === 'fulfilled').length;
      console.log(`AudioSegmentation: Preloaded ${successful + 1}/${preloadCount} segments for chunk ${options.chunkIndex}`);
    });
  }

  clearChunkCache(options: Pick<SegmentationOptions, 'bookId' | 'chunkIndex' | 'cefrLevel' | 'voiceId'>): void {
    const cacheKey = this.generateChunkCacheKey(options as SegmentationOptions);
    this.segmentCache.delete(cacheKey);
    
    // Clear any loading promises for this chunk
    for (const [key, promise] of this.loadingPromises.entries()) {
      if (key.startsWith(cacheKey)) {
        this.loadingPromises.delete(key);
      }
    }
  }

  getSegmentationStatus(options: SegmentationOptions): {
    cachedSegments: number;
    loadingSegments: number;
    totalEstimatedSegments: number;
  } {
    const chunkCacheKey = this.generateChunkCacheKey(options);
    const cachedSegments = this.segmentCache.get(chunkCacheKey)?.length || 0;
    
    let loadingSegments = 0;
    for (const key of this.loadingPromises.keys()) {
      if (key.startsWith(chunkCacheKey)) {
        loadingSegments++;
      }
    }
    
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    const segmentDuration = this.getOptimalSegmentDuration(networkInfo.type);
    const estimatedChunkDuration = 300; // 5 minutes
    const totalEstimatedSegments = Math.ceil(estimatedChunkDuration / segmentDuration);
    
    return {
      cachedSegments,
      loadingSegments,
      totalEstimatedSegments
    };
  }
}

// Export singleton instance
export const audioSegmentation = AudioSegmentationService.getInstance();