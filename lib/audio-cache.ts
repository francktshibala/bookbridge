// Temporary in-memory audio cache for instant playback
// This bypasses database issues while providing instant OpenAI audio

interface CachedAudio {
  audioBlob: ArrayBuffer;
  duration: number;
  timestamp: number;
}

class AudioCache {
  private cache = new Map<string, CachedAudio>();
  private readonly maxAge = 30 * 60 * 1000; // 30 minutes
  
  private getCacheKey(bookId: string, chunkIndex: number, voiceId: string): string {
    return `${bookId}-${chunkIndex}-${voiceId}`;
  }
  
  async get(bookId: string, chunkIndex: number, voiceId: string): Promise<ArrayBuffer | null> {
    const key = this.getCacheKey(bookId, chunkIndex, voiceId);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`🚀 Cache HIT: ${key} (${(cached.audioBlob.byteLength/1024).toFixed(1)}KB)`);
    return cached.audioBlob;
  }
  
  set(bookId: string, chunkIndex: number, voiceId: string, audioBlob: ArrayBuffer, duration: number): void {
    const key = this.getCacheKey(bookId, chunkIndex, voiceId);
    this.cache.set(key, {
      audioBlob,
      duration,
      timestamp: Date.now()
    });
    
    console.log(`💾 Cache SET: ${key} (${(audioBlob.byteLength/1024).toFixed(1)}KB, ${duration.toFixed(1)}s)`);
  }
  
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Audio cache cleared');
  }
  
  getStats(): { size: number; totalBytes: number } {
    let totalBytes = 0;
    for (const cached of this.cache.values()) {
      totalBytes += cached.audioBlob.byteLength;
    }
    
    return {
      size: this.cache.size,
      totalBytes
    };
  }
}

export const audioCache = new AudioCache();