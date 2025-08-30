/**
 * Predictive Prefetch Algorithm for BookBridge PWA
 * Implements intelligent content preloading based on user behavior and reading patterns
 * Research findings: 2-10 sentences preload based on network, reading speed analysis
 */

import { audioCacheDB, AudioQuality, NetworkType, CachePriority } from './audio-cache-db';
import { networkAdaptiveAudio } from './network-adaptive-audio';
import { audioSegmentation } from './audio-segmentation';
import { advancedPrefetchEngine } from './advanced-prefetch-engine';

interface ReadingPattern {
  userId?: string;
  bookId: string;
  averageReadingSpeed: number; // words per minute
  sessionDuration: number; // minutes
  preferredTime: number; // hour of day (0-23)
  pauseFrequency: number; // pauses per chapter
  skipRate: number; // percentage of sentences skipped
  lastReadingSession: number; // timestamp
}

interface PrefetchPrediction {
  bookId: string;
  chunkIndex: number;
  cefrLevel: string;
  voiceId: string;
  sentenceIndex: number;
  priority: number; // 0-1, higher = more likely to be needed
  confidence: number; // 0-1, prediction confidence
  timeToNeed: number; // estimated seconds until needed
  networkAdaptive: boolean;
}

interface UserReadingBehavior {
  currentPosition: {
    bookId: string;
    chunkIndex: number;
    sentenceIndex: number;
    cefrLevel: string;
    voiceId: string;
  };
  readingSpeed: number; // current WPM
  sessionStartTime: number;
  lastInteractionTime: number;
  isActiveLearner: boolean; // replays, pauses frequently
  preferredQuality: AudioQuality;
}

export class PredictivePrefetchService {
  private static instance: PredictivePrefetchService;
  private readingPatterns = new Map<string, ReadingPattern>();
  private prefetchCache = new Map<string, PrefetchPrediction[]>();
  private currentBehavior: UserReadingBehavior | null = null;
  private prefetchQueue = new Map<string, Promise<void>>();

  static getInstance(): PredictivePrefetchService {
    if (!PredictivePrefetchService.instance) {
      PredictivePrefetchService.instance = new PredictivePrefetchService();
    }
    return PredictivePrefetchService.instance;
  }

  constructor() {
    this.loadReadingPatterns();
    this.startBehaviorAnalysis();
  }

  private async loadReadingPatterns(): Promise<void> {
    // In a real implementation, this would load from IndexedDB or server
    try {
      const stored = localStorage.getItem('bookbridge_reading_patterns');
      if (stored) {
        const patterns = JSON.parse(stored);
        for (const [key, pattern] of Object.entries(patterns)) {
          this.readingPatterns.set(key, pattern as ReadingPattern);
        }
        console.log(`PredictivePrefetch: Loaded ${this.readingPatterns.size} reading patterns`);
      }
    } catch (error) {
      console.warn('PredictivePrefetch: Failed to load reading patterns:', error);
    }
  }

  private async saveReadingPatterns(): Promise<void> {
    try {
      const patterns = Object.fromEntries(this.readingPatterns);
      localStorage.setItem('bookbridge_reading_patterns', JSON.stringify(patterns));
    } catch (error) {
      console.warn('PredictivePrefetch: Failed to save reading patterns:', error);
    }
  }

  private startBehaviorAnalysis(): void {
    // Analyze user behavior every 30 seconds
    setInterval(() => {
      this.analyzeBehavior();
    }, 30000);
  }

  async updateCurrentPosition(
    bookId: string,
    chunkIndex: number,
    sentenceIndex: number,
    cefrLevel: string,
    voiceId: string
  ): Promise<void> {
    // Integrate with advanced prefetch engine
    try {
      const engineStats = await advancedPrefetchEngine.getPredictionStats();
      if (engineStats.strategyName !== 'none') {
        console.log(`PredictivePrefetch: Advanced engine active with ${engineStats.totalPredictions} predictions`);
      }
    } catch (error) {
      // Advanced engine not initialized yet, continue with basic prefetch
      console.log('PredictivePrefetch: Advanced engine not available, using basic strategy');
    }
    const now = Date.now();
    
    // Update current behavior
    if (!this.currentBehavior) {
      this.currentBehavior = {
        currentPosition: { bookId, chunkIndex, sentenceIndex, cefrLevel, voiceId },
        readingSpeed: this.estimateReadingSpeed(bookId),
        sessionStartTime: now,
        lastInteractionTime: now,
        isActiveLearner: false,
        preferredQuality: this.getPreferredQuality()
      };
    } else {
      // Calculate reading speed based on progress
      const timeDelta = (now - this.currentBehavior.lastInteractionTime) / 1000; // seconds
      const sentenceDelta = Math.abs(sentenceIndex - this.currentBehavior.currentPosition.sentenceIndex);
      
      if (timeDelta > 0 && sentenceDelta > 0) {
        // Estimate words per sentence (average 15 words)
        const wordsRead = sentenceDelta * 15;
        const currentWPM = (wordsRead / timeDelta) * 60;
        
        // Smooth the reading speed with exponential moving average
        this.currentBehavior.readingSpeed = 
          this.currentBehavior.readingSpeed * 0.7 + currentWPM * 0.3;
      }

      this.currentBehavior.currentPosition = { bookId, chunkIndex, sentenceIndex, cefrLevel, voiceId };
      this.currentBehavior.lastInteractionTime = now;
    }

    // Trigger predictive prefetch
    await this.updatePredictions();
    this.executePrefetch();
  }

  private estimateReadingSpeed(bookId: string): number {
    const pattern = this.readingPatterns.get(bookId);
    if (pattern) {
      return pattern.averageReadingSpeed;
    }
    
    // Default reading speed based on research
    return 200; // 200 WPM for adult language learners
  }

  private getPreferredQuality(): AudioQuality {
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    
    switch (networkInfo.type) {
      case NetworkType.SLOW_2G:
      case NetworkType.TWOG:
        return AudioQuality.LOW;
      case NetworkType.THREEG:
        return AudioQuality.MEDIUM;
      case NetworkType.FOURG:
        return AudioQuality.HIGH;
      case NetworkType.WIFI:
        return AudioQuality.HD;
      default:
        return AudioQuality.MEDIUM;
    }
  }

  private async updatePredictions(): Promise<void> {
    if (!this.currentBehavior) return;

    const { bookId, chunkIndex, sentenceIndex, cefrLevel, voiceId } = this.currentBehavior.currentPosition;
    const cacheKey = `${bookId}_${chunkIndex}_${cefrLevel}_${voiceId}`;
    
    const predictions = await this.generatePredictions();
    this.prefetchCache.set(cacheKey, predictions);
    
    console.log(`PredictivePrefetch: Generated ${predictions.length} predictions for current position`);
  }

  private async generatePredictions(): Promise<PrefetchPrediction[]> {
    if (!this.currentBehavior) return [];

    const { bookId, chunkIndex, sentenceIndex, cefrLevel, voiceId } = this.currentBehavior.currentPosition;
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    const predictions: PrefetchPrediction[] = [];

    // Calculate prefetch range based on network and reading speed
    const prefetchRange = this.calculatePrefetchRange(networkInfo.type, this.currentBehavior.readingSpeed);
    
    // 1. Sequential reading prediction (highest priority)
    for (let i = 1; i <= prefetchRange.sequential; i++) {
      const targetSentence = sentenceIndex + i;
      
      predictions.push({
        bookId,
        chunkIndex,
        cefrLevel,
        voiceId,
        sentenceIndex: targetSentence,
        priority: Math.max(0.1, 1.0 - (i / prefetchRange.sequential)), // Decreasing priority
        confidence: 0.95, // High confidence for sequential reading
        timeToNeed: this.estimateTimeToSentence(i),
        networkAdaptive: true
      });
    }

    // 2. Chapter boundary prediction
    if (sentenceIndex >= this.getEstimatedChapterLength(chunkIndex) * 0.8) {
      // Likely to move to next chapter soon
      const nextChunkIndex = chunkIndex + 1;
      
      for (let i = 0; i < prefetchRange.nextChapter; i++) {
        predictions.push({
          bookId,
          chunkIndex: nextChunkIndex,
          cefrLevel,
          voiceId,
          sentenceIndex: i,
          priority: 0.7,
          confidence: 0.8,
          timeToNeed: this.estimateTimeToChapter(nextChunkIndex),
          networkAdaptive: true
        });
      }
    }

    // 3. User behavior-based prediction
    const pattern = this.readingPatterns.get(bookId);
    if (pattern && pattern.skipRate > 0.1) {
      // User tends to skip, prefetch further ahead
      const skipDistance = Math.floor(1 / (1 - pattern.skipRate));
      
      for (let i = 2; i <= 5; i++) {
        const targetSentence = sentenceIndex + (i * skipDistance);
        
        predictions.push({
          bookId,
          chunkIndex,
          cefrLevel,
          voiceId,
          sentenceIndex: targetSentence,
          priority: 0.4,
          confidence: pattern.skipRate,
          timeToNeed: this.estimateTimeToSentence(i * skipDistance),
          networkAdaptive: true
        });
      }
    }

    // 4. Quality upgrade prediction (for WiFi users)
    if (networkInfo.type === NetworkType.WIFI && this.currentBehavior.preferredQuality !== AudioQuality.HD) {
      // Prefetch higher quality versions of recent sentences
      for (let i = Math.max(0, sentenceIndex - 3); i <= sentenceIndex + 2; i++) {
        predictions.push({
          bookId,
          chunkIndex,
          cefrLevel,
          voiceId,
          sentenceIndex: i,
          priority: 0.3,
          confidence: 0.6,
          timeToNeed: 0, // Could be replayed anytime
          networkAdaptive: false // Quality upgrade
        });
      }
    }

    // Sort by priority * confidence
    return predictions
      .sort((a, b) => (b.priority * b.confidence) - (a.priority * a.confidence))
      .slice(0, this.getMaxPredictions(networkInfo.type));
  }

  private calculatePrefetchRange(networkType: NetworkType, readingSpeed: number): {
    sequential: number;
    nextChapter: number;
  } {
    // Base ranges from PWA research
    const baseRanges = {
      [NetworkType.SLOW_2G]: { sequential: 2, nextChapter: 1 },
      [NetworkType.TWOG]: { sequential: 3, nextChapter: 2 },
      [NetworkType.THREEG]: { sequential: 5, nextChapter: 3 },
      [NetworkType.FOURG]: { sequential: 8, nextChapter: 5 },
      [NetworkType.WIFI]: { sequential: 10, nextChapter: 8 },
      [NetworkType.UNKNOWN]: { sequential: 3, nextChapter: 2 }
    };

    const base = baseRanges[networkType];
    
    // Adjust based on reading speed
    const speedMultiplier = Math.min(2.0, Math.max(0.5, readingSpeed / 200)); // Normalize around 200 WPM
    
    return {
      sequential: Math.floor(base.sequential * speedMultiplier),
      nextChapter: Math.floor(base.nextChapter * speedMultiplier)
    };
  }

  private estimateTimeToSentence(sentenceOffset: number): number {
    if (!this.currentBehavior) return 60; // 1 minute fallback
    
    // Average sentence has 15 words
    const wordsToRead = sentenceOffset * 15;
    const timeInMinutes = wordsToRead / this.currentBehavior.readingSpeed;
    
    return Math.max(5, timeInMinutes * 60); // At least 5 seconds
  }

  private estimateTimeToChapter(chapterIndex: number): number {
    if (!this.currentBehavior) return 300; // 5 minutes fallback
    
    const currentChapter = this.currentBehavior.currentPosition.chunkIndex;
    const chaptersToRead = chapterIndex - currentChapter;
    
    if (chaptersToRead <= 0) return 0;
    
    // Estimate 5 minutes per chapter for average reader
    const baseTimePerChapter = 5 * 60; // 5 minutes in seconds
    const speedAdjustment = 200 / this.currentBehavior.readingSpeed; // Adjust for reading speed
    
    return chaptersToRead * baseTimePerChapter * speedAdjustment;
  }

  private getEstimatedChapterLength(chapterIndex: number): number {
    // Estimated sentences per chapter - would be more accurate with real data
    return 50; // Average 50 sentences per chapter
  }

  private getMaxPredictions(networkType: NetworkType): number {
    // Limit predictions to prevent overwhelming slow networks
    const limits = {
      [NetworkType.SLOW_2G]: 5,
      [NetworkType.TWOG]: 8,
      [NetworkType.THREEG]: 12,
      [NetworkType.FOURG]: 20,
      [NetworkType.WIFI]: 30,
      [NetworkType.UNKNOWN]: 10
    };
    
    return limits[networkType];
  }

  private async executePrefetch(): Promise<void> {
    if (!this.currentBehavior) return;

    const { bookId, chunkIndex, cefrLevel, voiceId } = this.currentBehavior.currentPosition;
    const cacheKey = `${bookId}_${chunkIndex}_${cefrLevel}_${voiceId}`;
    const predictions = this.prefetchCache.get(cacheKey);
    
    if (!predictions || predictions.length === 0) return;

    // Limit concurrent prefetch operations
    const maxConcurrent = this.getMaxConcurrentPrefetch();
    let activeCount = Array.from(this.prefetchQueue.values()).length;
    
    for (const prediction of predictions) {
      if (activeCount >= maxConcurrent) break;
      
      const prefetchKey = `${prediction.bookId}_${prediction.chunkIndex}_${prediction.sentenceIndex}`;
      
      // Skip if already prefetching or cached
      if (this.prefetchQueue.has(prefetchKey)) continue;
      if (await this.isAlreadyCached(prediction)) continue;
      
      // Only prefetch if we have enough time
      if (prediction.timeToNeed < 10) continue; // Skip if needed in <10 seconds
      
      const prefetchPromise = this.prefetchAudio(prediction);
      this.prefetchQueue.set(prefetchKey, prefetchPromise);
      activeCount++;
      
      // Clean up completed promises
      prefetchPromise.finally(() => {
        this.prefetchQueue.delete(prefetchKey);
      });
    }
  }

  private getMaxConcurrentPrefetch(): number {
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    
    const limits = {
      [NetworkType.SLOW_2G]: 1,
      [NetworkType.TWOG]: 1,
      [NetworkType.THREEG]: 2,
      [NetworkType.FOURG]: 3,
      [NetworkType.WIFI]: 5,
      [NetworkType.UNKNOWN]: 2
    };
    
    return limits[networkInfo.type];
  }

  private async isAlreadyCached(prediction: PrefetchPrediction): Promise<boolean> {
    const cached = await audioCacheDB.getAudioSentence(
      prediction.bookId,
      prediction.chunkIndex,
      prediction.cefrLevel,
      prediction.voiceId,
      prediction.sentenceIndex
    );
    
    return cached !== null;
  }

  private async prefetchAudio(prediction: PrefetchPrediction): Promise<void> {
    try {
      console.log(`PredictivePrefetch: Prefetching sentence ${prediction.sentenceIndex} (priority: ${prediction.priority.toFixed(2)}, confidence: ${prediction.confidence.toFixed(2)})`);
      
      const priority = prediction.confidence > 0.8 ? CachePriority.CURRENT_BOOK : CachePriority.RECENTLY_PLAYED;
      
      await networkAdaptiveAudio.loadAudio({
        bookId: prediction.bookId,
        chunkIndex: prediction.chunkIndex,
        cefrLevel: prediction.cefrLevel,
        voiceId: prediction.voiceId,
        sentenceIndex: prediction.sentenceIndex,
        priority,
        forceQuality: prediction.networkAdaptive ? undefined : AudioQuality.HD
      });
      
      console.log(`PredictivePrefetch: Successfully prefetched sentence ${prediction.sentenceIndex}`);
    } catch (error) {
      console.warn(`PredictivePrefetch: Failed to prefetch sentence ${prediction.sentenceIndex}:`, error);
    }
  }

  private analyzeBehavior(): void {
    if (!this.currentBehavior) return;

    const now = Date.now();
    const sessionDuration = (now - this.currentBehavior.sessionStartTime) / (1000 * 60); // minutes
    const timeSinceLastInteraction = (now - this.currentBehavior.lastInteractionTime) / 1000; // seconds

    // Detect if user is actively learning (frequent pauses, replays)
    this.currentBehavior.isActiveLearner = timeSinceLastInteraction > 30; // Paused for 30+ seconds
    
    // Update reading pattern for this book
    this.updateReadingPattern(sessionDuration);
  }

  private updateReadingPattern(sessionDuration: number): void {
    if (!this.currentBehavior) return;

    const { bookId } = this.currentBehavior.currentPosition;
    const pattern = this.readingPatterns.get(bookId) || {
      userId: undefined,
      bookId,
      averageReadingSpeed: 200,
      sessionDuration: 0,
      preferredTime: new Date().getHours(),
      pauseFrequency: 0,
      skipRate: 0,
      lastReadingSession: Date.now()
    };

    // Update with exponential moving average
    pattern.averageReadingSpeed = pattern.averageReadingSpeed * 0.8 + this.currentBehavior.readingSpeed * 0.2;
    pattern.sessionDuration = Math.max(pattern.sessionDuration, sessionDuration);
    pattern.lastReadingSession = Date.now();

    this.readingPatterns.set(bookId, pattern);
    
    // Save periodically
    if (Math.random() < 0.1) { // 10% chance to save each analysis
      this.saveReadingPatterns();
    }
  }

  // Public methods for integration

  async clearPrefetchCache(): Promise<void> {
    this.prefetchCache.clear();
    
    // Cancel pending prefetch operations
    for (const [key, promise] of this.prefetchQueue.entries()) {
      // Can't cancel the promise, but we can clear the queue
      this.prefetchQueue.delete(key);
    }
  }

  getPrefetchStatus(): {
    activePrefetches: number;
    totalPredictions: number;
    currentReadingSpeed: number;
    sessionDuration: number;
  } {
    const totalPredictions = Array.from(this.prefetchCache.values())
      .reduce((sum, predictions) => sum + predictions.length, 0);

    return {
      activePrefetches: this.prefetchQueue.size,
      totalPredictions,
      currentReadingSpeed: this.currentBehavior?.readingSpeed || 0,
      sessionDuration: this.currentBehavior 
        ? (Date.now() - this.currentBehavior.sessionStartTime) / (1000 * 60)
        : 0
    };
  }

  getReadingInsights(bookId: string): ReadingPattern | null {
    return this.readingPatterns.get(bookId) || null;
  }

  async optimizeForSession(): Promise<void> {
    // Analyze current network and adjust prefetch strategy
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    
    console.log(`PredictivePrefetch: Optimizing for ${networkInfo.type} network`);
    
    // Integrate with advanced prefetch engine for enhanced optimization
    try {
      const currentStrategy = await advancedPrefetchEngine.getCurrentStrategy();
      if (currentStrategy) {
        console.log(`PredictivePrefetch: Coordinating with advanced strategy: ${currentStrategy.name}`);
        
        // Let advanced engine handle resource-intensive optimizations on fast networks
        if (networkInfo.type === NetworkType.WIFI || networkInfo.type === NetworkType.FOURG) {
          return; // Defer to advanced engine
        }
      }
    } catch (error) {
      console.log('PredictivePrefetch: Advanced engine not available, using basic optimization');
    }
    
    // Clear low-priority cache if on slow network
    if (networkInfo.type === NetworkType.SLOW_2G || networkInfo.type === NetworkType.TWOG) {
      await this.clearLowPriorityCache();
    }
    
    // Pre-warm next chapter on fast networks (if advanced engine not handling it)
    if ((networkInfo.type === NetworkType.FOURG || networkInfo.type === NetworkType.WIFI) && 
        this.currentBehavior) {
      await this.prewarmNextChapter();
    }
  }

  private async clearLowPriorityCache(): Promise<void> {
    // This would integrate with cache eviction system
    console.log('PredictivePrefetch: Clearing low-priority cache for slow network');
  }

  private async prewarmNextChapter(): Promise<void> {
    if (!this.currentBehavior) return;
    
    const { bookId, chunkIndex, cefrLevel, voiceId } = this.currentBehavior.currentPosition;
    const nextChunkIndex = chunkIndex + 1;
    
    console.log(`PredictivePrefetch: Pre-warming next chapter ${nextChunkIndex}`);
    
    // Prefetch first 5 sentences of next chapter
    for (let i = 0; i < 5; i++) {
      this.prefetchAudio({
        bookId,
        chunkIndex: nextChunkIndex,
        cefrLevel,
        voiceId,
        sentenceIndex: i,
        priority: 0.6,
        confidence: 0.7,
        timeToNeed: 300, // 5 minutes
        networkAdaptive: true
      });
    }
  }
}

// Export singleton instance
export const predictivePrefetch = PredictivePrefetchService.getInstance();