/**
 * Network-Adaptive Audio Loading Service for BookBridge PWA
 * Provides intelligent audio loading based on network conditions
 * Implements research findings: 2G (32kbps) → 3G (64kbps) → 4G/WiFi (128kbps+)
 */

import { audioCacheDB, AudioQuality, AudioCodec, CachePriority, NetworkType, CachedAudioData } from './audio-cache-db';

interface NetworkAwareAudioOptions {
  bookId: string;
  chunkIndex: number;
  cefrLevel: string;
  voiceId: string;
  sentenceIndex: number;
  priority?: CachePriority;
  forceQuality?: AudioQuality;
}

interface AudioLoadResult {
  audioBlob: Blob;
  duration: number;
  wordTimings: any[];
  quality: AudioQuality;
  fromCache: boolean;
  loadTime: number;
  networkType: NetworkType;
}

interface NetworkCondition {
  type: NetworkType;
  effectiveSpeed: number; // kbps
  rtt: number; // round trip time in ms
  downlink: number; // mbps
  saveData: boolean;
}

export class NetworkAdaptiveAudioService {
  private static instance: NetworkAdaptiveAudioService;
  private loadingQueue = new Map<string, Promise<AudioLoadResult>>();
  private networkMonitor: NetworkCondition | null = null;
  
  static getInstance(): NetworkAdaptiveAudioService {
    if (!NetworkAdaptiveAudioService.instance) {
      NetworkAdaptiveAudioService.instance = new NetworkAdaptiveAudioService();
    }
    return NetworkAdaptiveAudioService.instance;
  }

  constructor() {
    this.initializeNetworkMonitoring();
  }

  private initializeNetworkMonitoring(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkInfo = () => {
        this.networkMonitor = {
          type: this.mapConnectionType(connection.effectiveType),
          effectiveSpeed: this.calculateEffectiveSpeed(connection),
          rtt: connection.rtt || 100,
          downlink: connection.downlink || 1,
          saveData: connection.saveData || false
        };
        
        console.log('NetworkAdaptiveAudio: Network condition updated:', this.networkMonitor);
      };

      // Initial update
      updateNetworkInfo();
      
      // Listen for changes
      connection.addEventListener('change', updateNetworkInfo);
    }
  }

  private mapConnectionType(effectiveType: string): NetworkType {
    switch (effectiveType) {
      case 'slow-2g': return NetworkType.SLOW_2G;
      case '2g': return NetworkType.TWOG;
      case '3g': return NetworkType.THREEG;
      case '4g': return NetworkType.FOURG;
      default: return NetworkType.UNKNOWN;
    }
  }

  private calculateEffectiveSpeed(connection: any): number {
    // Convert connection speed to effective audio loading speed (kbps)
    const downlinkMbps = connection.downlink || 1;
    const rtt = connection.rtt || 100;
    
    // Factor in RTT for effective throughput
    const effectiveMultiplier = Math.max(0.3, 1 - (rtt / 1000)); // Reduce by RTT impact
    return Math.floor(downlinkMbps * 1000 * effectiveMultiplier); // Convert to kbps
  }

  async loadAudio(options: NetworkAwareAudioOptions): Promise<AudioLoadResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(options);
    
    // Check if already loading
    if (this.loadingQueue.has(cacheKey)) {
      return this.loadingQueue.get(cacheKey)!;
    }

    // Create loading promise
    const loadingPromise = this.performAudioLoad(options, startTime);
    this.loadingQueue.set(cacheKey, loadingPromise);
    
    try {
      const result = await loadingPromise;
      return result;
    } finally {
      this.loadingQueue.delete(cacheKey);
    }
  }

  private async performAudioLoad(options: NetworkAwareAudioOptions, startTime: number): Promise<AudioLoadResult> {
    const { bookId, chunkIndex, cefrLevel, voiceId, sentenceIndex, priority = CachePriority.PREGENERATED, forceQuality } = options;
    
    // 1. Try cache first (always fastest)
    const cachedAudio = await audioCacheDB.getBestQualityAudio(bookId, chunkIndex, cefrLevel, voiceId, sentenceIndex);
    
    if (cachedAudio) {
      const cacheKey = this.generateCacheKey(options);
      console.log(`NetworkAdaptiveAudio: Cache hit for ${cacheKey}, quality: ${cachedAudio.quality}`);
      return {
        audioBlob: cachedAudio.audioBlob,
        duration: cachedAudio.duration,
        wordTimings: cachedAudio.wordTimings,
        quality: cachedAudio.quality,
        fromCache: true,
        loadTime: Date.now() - startTime,
        networkType: cachedAudio.networkType
      };
    }

    // 2. Determine optimal quality for current network
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    const targetQuality = forceQuality || this.selectOptimalQuality(networkInfo.type);
    const cacheKey = this.generateCacheKey(options);
    
    console.log(`NetworkAdaptiveAudio: Cache miss for ${cacheKey}, loading quality: ${targetQuality} for network: ${networkInfo.type}`);

    // 3. Load audio from API with network-appropriate settings
    const audioResult = await this.loadFromAPI(options, targetQuality, networkInfo);
    
    // 4. Cache the result for future use
    if (audioResult.audioBlob.size > 0) {
      await audioCacheDB.storeAudioSentence(
        bookId, 
        chunkIndex, 
        cefrLevel, 
        voiceId, 
        sentenceIndex,
        audioResult.audioBlob,
        audioResult.duration,
        audioResult.wordTimings,
        `Sentence ${sentenceIndex}`, // text parameter - placeholder for now
        priority,
        networkInfo.type
      );
    }

    return {
      ...audioResult,
      fromCache: false,
      loadTime: Date.now() - startTime,
      networkType: networkInfo.type
    };
  }

  private selectOptimalQuality(networkType: NetworkType): AudioQuality {
    // Based on PWA research findings
    switch (networkType) {
      case NetworkType.SLOW_2G:
      case NetworkType.TWOG:
        return AudioQuality.LOW; // 24-32kbps Opus
      case NetworkType.THREEG:
        return AudioQuality.MEDIUM; // 64kbps Opus
      case NetworkType.FOURG:
        return AudioQuality.HIGH; // 128kbps AAC
      case NetworkType.WIFI:
        return AudioQuality.HD; // 192kbps AAC
      default:
        return AudioQuality.MEDIUM; // Safe fallback
    }
  }

  private async loadFromAPI(
    options: NetworkAwareAudioOptions, 
    targetQuality: AudioQuality,
    networkInfo: any
  ): Promise<Omit<AudioLoadResult, 'fromCache' | 'loadTime' | 'networkType'>> {
    const { bookId, chunkIndex, cefrLevel, voiceId, sentenceIndex } = options;
    
    // Build API URL with quality parameters
    const apiUrl = this.buildAPIUrl(options, targetQuality);
    
    // Configure fetch with network-appropriate timeouts
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Accept': this.getAcceptHeader(targetQuality),
        'Accept-Encoding': 'gzip, deflate, br',
      },
      // Network-adaptive timeouts
      signal: AbortSignal.timeout(this.getTimeoutForNetwork(networkInfo.type))
    };

    try {
      const response = await fetch(apiUrl, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`Audio API error: ${response.status} ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      
      // Extract audio metadata (simplified for example)
      const duration = await this.extractAudioDuration(audioBlob);
      const wordTimings = await this.extractWordTimings(response);

      return {
        audioBlob,
        duration,
        wordTimings,
        quality: targetQuality
      };
      
    } catch (error) {
      console.error('NetworkAdaptiveAudio: API load failed:', error);
      
      // Fallback to lower quality if available
      if (targetQuality !== AudioQuality.LOW) {
        console.log('NetworkAdaptiveAudio: Retrying with lower quality...');
        const fallbackQuality = this.getFallbackQuality(targetQuality);
        return this.loadFromAPI(options, fallbackQuality, networkInfo);
      }
      
      throw error;
    }
  }

  private buildAPIUrl(options: NetworkAwareAudioOptions, quality: AudioQuality): string {
    const { bookId, chunkIndex, cefrLevel, voiceId, sentenceIndex } = options;
    
    // Quality-specific parameters
    const qualityParams = this.getQualityParameters(quality);
    
    return `/api/audio/sentence/${bookId}/${chunkIndex}/${cefrLevel}/${voiceId}/${sentenceIndex}?${qualityParams}`;
  }

  private getQualityParameters(quality: AudioQuality): string {
    const params = new URLSearchParams();
    
    switch (quality) {
      case AudioQuality.LOW:
        params.set('codec', 'opus');
        params.set('bitrate', '32');
        params.set('format', 'webm');
        break;
      case AudioQuality.MEDIUM:
        params.set('codec', 'opus');
        params.set('bitrate', '64');
        params.set('format', 'webm');
        break;
      case AudioQuality.HIGH:
        params.set('codec', 'aac');
        params.set('bitrate', '128');
        params.set('format', 'mp4');
        break;
      case AudioQuality.HD:
        params.set('codec', 'aac');
        params.set('bitrate', '192');
        params.set('format', 'mp4');
        break;
    }
    
    return params.toString();
  }

  private getAcceptHeader(quality: AudioQuality): string {
    switch (quality) {
      case AudioQuality.LOW:
      case AudioQuality.MEDIUM:
        return 'audio/webm;codecs=opus, audio/ogg;codecs=opus, audio/*';
      case AudioQuality.HIGH:
      case AudioQuality.HD:
        return 'audio/mp4, audio/aac, audio/*';
      default:
        return 'audio/*';
    }
  }

  private getTimeoutForNetwork(networkType: NetworkType): number {
    // Network-adaptive timeouts based on research findings
    switch (networkType) {
      case NetworkType.SLOW_2G: return 30000; // 30s for very slow networks
      case NetworkType.TWOG: return 20000;    // 20s for 2G
      case NetworkType.THREEG: return 10000;  // 10s for 3G
      case NetworkType.FOURG: return 5000;    // 5s for 4G
      case NetworkType.WIFI: return 3000;     // 3s for WiFi
      default: return 10000;                  // 10s fallback
    }
  }

  private getFallbackQuality(currentQuality: AudioQuality): AudioQuality {
    switch (currentQuality) {
      case AudioQuality.HD: return AudioQuality.HIGH;
      case AudioQuality.HIGH: return AudioQuality.MEDIUM;
      case AudioQuality.MEDIUM: return AudioQuality.LOW;
      case AudioQuality.LOW: return AudioQuality.LOW; // Can't go lower
      default: return AudioQuality.LOW;
    }
  }

  private async extractAudioDuration(audioBlob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(0); // Fallback duration
      });
      
      audio.src = url;
    });
  }

  private async extractWordTimings(response: Response): Promise<any[]> {
    // Try to get word timings from response headers or separate API call
    const timingsHeader = response.headers.get('X-Word-Timings');
    if (timingsHeader) {
      try {
        return JSON.parse(timingsHeader);
      } catch (error) {
        console.warn('NetworkAdaptiveAudio: Failed to parse word timings:', error);
      }
    }
    
    return []; // Fallback to empty timings
  }

  private generateCacheKey(options: NetworkAwareAudioOptions): string {
    const { bookId, chunkIndex, cefrLevel, voiceId, sentenceIndex } = options;
    return `${bookId}_${chunkIndex}_${cefrLevel}_${voiceId}_${sentenceIndex}`;
  }

  // Public methods for cache management
  
  async preloadChunk(bookId: string, chunkIndex: number, cefrLevel: string, voiceId: string): Promise<void> {
    console.log(`NetworkAdaptiveAudio: Preloading chunk ${chunkIndex} for book ${bookId}`);
    
    // Mark current book as high priority
    await audioCacheDB.updateCachePriority(bookId, CachePriority.CURRENT_BOOK);
    
    // Preload next few sentences based on network capacity
    const networkInfo = audioCacheDB.getCurrentNetworkInfo();
    const preloadCount = this.getPreloadCount(networkInfo.type);
    
    const preloadPromises: Promise<AudioLoadResult>[] = [];
    
    for (let i = 0; i < preloadCount; i++) {
      const options: NetworkAwareAudioOptions = {
        bookId,
        chunkIndex,
        cefrLevel,
        voiceId,
        sentenceIndex: i,
        priority: CachePriority.CURRENT_BOOK
      };
      
      preloadPromises.push(this.loadAudio(options));
    }
    
    // Don't await all - let them load in background
    Promise.allSettled(preloadPromises).then((results) => {
      const successful = results.filter(r => r.status === 'fulfilled').length;
      console.log(`NetworkAdaptiveAudio: Preloaded ${successful}/${preloadCount} sentences for chunk ${chunkIndex}`);
    });
  }

  private getPreloadCount(networkType: NetworkType): number {
    // Conservative preloading based on network capacity
    switch (networkType) {
      case NetworkType.SLOW_2G: return 2;  // Very limited preload
      case NetworkType.TWOG: return 3;     // Conservative
      case NetworkType.THREEG: return 5;   // Moderate
      case NetworkType.FOURG: return 8;    // Aggressive
      case NetworkType.WIFI: return 10;    // Maximum
      default: return 3;                   // Safe fallback
    }
  }

  getNetworkStatus(): NetworkCondition | null {
    return this.networkMonitor;
  }

  getCacheInfo() {
    return audioCacheDB.getCurrentNetworkInfo();
  }
}

// Export singleton instance
export const networkAdaptiveAudio = NetworkAdaptiveAudioService.getInstance();