/**
 * Progressive Audio Service for BookBridge
 * Provides instant audio playback with background generation and word-level highlighting
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

interface ProgressiveAudioOptions {
  bookId: string;
  chunkIndex: number;
  cefrLevel: string;
  voiceId: string;
  text: string;
}

interface AudioGenerationProgress {
  total: number;
  completed: number;
  currentSentence: string;
  status: 'generating' | 'ready' | 'error';
}

export class ProgressiveAudioService {
  private audioQueue: SentenceAudio[] = [];
  private currentSentence = 0;
  private isPlaying = false;
  private audioElements: HTMLAudioElement[] = [];
  private progressCallback?: (progress: AudioGenerationProgress) => void;
  private wordHighlightCallback?: (wordIndex: number) => void;
  private chunkCompleteCallback?: () => void;
  
  // Core configuration
  private readonly SENTENCE_CHUNK_SIZE = 2; // Sentences per audio chunk for optimal performance
  private readonly PREFETCH_AHEAD = 1; // How many chunks to prefetch
  private readonly CACHE_EXPIRY_DAYS = 30;

  constructor() {
    this.initializeAudioElements();
  }

  /**
   * Initialize reusable audio elements for seamless playback
   */
  private initializeAudioElements(): void {
    // Create pool of audio elements to avoid gaps
    for (let i = 0; i < 3; i++) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.addEventListener('ended', this.handleAudioEnded.bind(this));
      audio.addEventListener('timeupdate', this.handleTimeUpdate.bind(this));
      this.audioElements.push(audio);
    }
  }

  /**
   * Set callback functions for UI updates
   */
  public setCallbacks(callbacks: {
    onProgress?: (progress: AudioGenerationProgress) => void;
    onWordHighlight?: (wordIndex: number) => void;
    onChunkComplete?: () => void;
  }): void {
    this.progressCallback = callbacks.onProgress;
    this.wordHighlightCallback = callbacks.onWordHighlight;
    this.chunkCompleteCallback = callbacks.onChunkComplete;
  }

  /**
   * Start progressive audio playback - main entry point
   * Target: <2 seconds from call to first word
   */
  public async startProgressivePlayback(options: ProgressiveAudioOptions): Promise<void> {
    try {
      this.updateProgress(0, 0, 'Preparing audio...', 'generating');
      
      // Step 1: Check cache first (instant if available)
      const cachedAudio = await this.getCachedAudio(
        options.bookId, 
        options.chunkIndex, 
        options.cefrLevel, 
        options.voiceId
      );

      if (cachedAudio && cachedAudio.length > 0) {
        // Instant playback from cache
        this.audioQueue = cachedAudio;
        this.updateProgress(cachedAudio.length, cachedAudio.length, 'Ready from cache', 'ready');
        await this.startPlayback();
        return;
      }

      // Step 2: Split text into optimized sentences
      const sentences = this.splitIntoSentences(options.text);
      this.updateProgress(sentences.length, 0, 'Processing text...', 'generating');

      // Step 3: Generate first sentence immediately (priority)
      const firstSentence = await this.generateSentenceAudio(
        sentences[0], 
        options.voiceId, 
        options.bookId,
        options.chunkIndex,
        0
      );
      
      this.audioQueue = [firstSentence];
      this.updateProgress(sentences.length, 1, `Playing: ${sentences[0].substring(0, 50)}...`, 'ready');
      
      // Step 4: Start playback immediately (target <2 seconds)
      await this.startPlayback();

      // Step 5: Generate remaining sentences in background
      this.generateRemainingAudioInBackground(
        sentences.slice(1),
        options.voiceId,
        options.bookId,
        options.chunkIndex
      );

    } catch (error) {
      console.error('Progressive audio playback failed:', error);
      this.updateProgress(0, 0, 'Audio generation failed', 'error');
      throw error;
    }
  }

  /**
   * Split text into optimized sentences for audio generation
   * Target: 10-25 words per sentence for best audio performance
   */
  private splitIntoSentences(text: string): string[] {
    // Basic sentence splitting with smart handling
    const rawSentences = text
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .filter(s => s.trim().length > 0);

    const optimizedSentences: string[] = [];
    let currentChunk = '';

    for (const sentence of rawSentences) {
      const words = sentence.trim().split(' ');
      
      // If current chunk + new sentence is within optimal range
      if (currentChunk && (currentChunk + ' ' + sentence).split(' ').length <= 25) {
        currentChunk += ' ' + sentence;
      } else {
        // Save current chunk if it exists
        if (currentChunk) {
          optimizedSentences.push(currentChunk.trim());
        }
        
        // Start new chunk
        if (words.length > 30) {
          // Split very long sentences
          const midPoint = Math.floor(words.length / 2);
          optimizedSentences.push(words.slice(0, midPoint).join(' '));
          currentChunk = words.slice(midPoint).join(' ');
        } else {
          currentChunk = sentence;
        }
      }
    }
    
    // Add final chunk
    if (currentChunk) {
      optimizedSentences.push(currentChunk.trim());
    }

    return optimizedSentences.filter(s => s.length > 0);
  }

  /**
   * Generate audio for a single sentence with word timing
   */
  private async generateSentenceAudio(
    text: string, 
    voiceId: string, 
    bookId: string,
    chunkIndex: number,
    sentenceIndex: number
  ): Promise<SentenceAudio> {
    try {
      // Generate audio using existing TTS system
      const audioResponse = await this.callTTSAPI(text, voiceId);
      
      // Generate word timings
      const wordTimings = await this.generateWordTimings(text, audioResponse.audioUrl, voiceId);

      const sentenceAudio: SentenceAudio = {
        text,
        audioUrl: audioResponse.audioUrl,
        duration: audioResponse.duration,
        wordTimings,
        sentenceIndex
      };

      // Cache for future use
      await this.cacheAudioSentence(bookId, chunkIndex, sentenceAudio);

      return sentenceAudio;
    } catch (error) {
      console.error('Failed to generate sentence audio:', error);
      throw error;
    }
  }

  /**
   * Generate remaining sentences in background while first sentence plays
   */
  private async generateRemainingAudioInBackground(
    sentences: string[],
    voiceId: string,
    bookId: string,
    chunkIndex: number
  ): Promise<void> {
    // Generate sentences in background with slight delay to prioritize playback
    setTimeout(async () => {
      for (let i = 0; i < sentences.length; i++) {
        try {
          const sentenceAudio = await this.generateSentenceAudio(
            sentences[i],
            voiceId,
            bookId,
            chunkIndex,
            i + 1 // +1 because first sentence is index 0
          );
          
          this.audioQueue.push(sentenceAudio);
          this.updateProgress(
            sentences.length + 1, 
            this.audioQueue.length, 
            `Generated: ${sentences[i].substring(0, 50)}...`,
            'generating'
          );
          
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to generate sentence ${i}:`, error);
        }
      }
      
      this.updateProgress(
        sentences.length + 1,
        this.audioQueue.length,
        'All audio ready',
        'ready'
      );
    }, 500); // 500ms delay to let first sentence start playing
  }

  /**
   * Start actual audio playback
   */
  private async startPlayback(): Promise<void> {
    if (this.audioQueue.length === 0) {
      throw new Error('No audio in queue');
    }

    this.isPlaying = true;
    this.currentSentence = 0;
    
    // Load and play first audio segment
    const audio = this.audioElements[0];
    audio.src = this.audioQueue[0].audioUrl;
    
    try {
      await audio.play();
    } catch (error) {
      console.error('Audio playback failed:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  /**
   * Handle when current audio segment ends - seamlessly play next
   */
  private handleAudioEnded(): void {
    if (!this.isPlaying) return;

    this.currentSentence++;
    
    if (this.currentSentence >= this.audioQueue.length) {
      // All sentences complete
      this.isPlaying = false;
      this.chunkCompleteCallback?.();
      return;
    }

    // Play next sentence immediately
    this.playNextSentence();
  }

  /**
   * Play next sentence with zero gap
   */
  private async playNextSentence(): Promise<void> {
    if (this.currentSentence >= this.audioQueue.length) return;

    const nextAudio = this.audioElements[this.currentSentence % this.audioElements.length];
    nextAudio.src = this.audioQueue[this.currentSentence].audioUrl;

    try {
      await nextAudio.play();
    } catch (error) {
      console.error('Failed to play next sentence:', error);
      this.isPlaying = false;
    }
  }

  /**
   * Handle time updates for word highlighting
   */
  private handleTimeUpdate(event: Event): void {
    if (!this.isPlaying || !this.wordHighlightCallback) return;

    const audio = event.target as HTMLAudioElement;
    const currentTime = audio.currentTime;
    const currentSentenceAudio = this.audioQueue[this.currentSentence];
    
    if (!currentSentenceAudio) return;

    // Find current word based on timing
    const currentWord = currentSentenceAudio.wordTimings.find(timing =>
      currentTime >= timing.startTime && currentTime <= timing.endTime
    );

    if (currentWord) {
      this.wordHighlightCallback(currentWord.wordIndex);
    }
  }

  /**
   * Call TTS API using existing BookBridge TTS infrastructure
   */
  private async callTTSAPI(text: string, voiceId: string): Promise<{ audioUrl: string; duration: number }> {
    try {
      // Determine provider based on voiceId
      const isElevenLabs = voiceId.startsWith('eleven_');
      const isOpenAI = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(voiceId);
      
      if (isElevenLabs) {
        // Use ElevenLabs API
        const response = await fetch('/api/elevenlabs/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice_id: voiceId.replace('eleven_', ''),
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        });

        if (!response.ok) {
          throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Get actual audio duration
        const actualDuration = await this.getAudioDuration(audioUrl);
        
        return { audioUrl, duration: actualDuration };
        
      } else if (isOpenAI) {
        // Use OpenAI TTS API
        const response = await fetch('/api/openai/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: text,
            voice: voiceId,
            model: 'tts-1',
            response_format: 'mp3'
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI TTS failed: ${response.statusText}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Get actual audio duration
        const actualDuration = await this.getAudioDuration(audioUrl);
        
        return { audioUrl, duration: actualDuration };
        
      } else {
        // Fallback to Web Speech API for unsupported voices
        return new Promise((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(text);
          const voices = speechSynthesis.getVoices();
          const voice = voices.find(v => v.name === voiceId) || voices[0];
          
          if (voice) {
            utterance.voice = voice;
          }
          
          utterance.onend = () => {
            // For Web Speech API, we don't get a URL, so create a data URL placeholder
            const duration = text.split(' ').length * 0.6;
            resolve({
              audioUrl: `data:audio/wav;base64,web-speech-${Date.now()}`,
              duration
            });
          };
          
          utterance.onerror = (error) => {
            reject(new Error(`Web Speech API failed: ${error.error}`));
          };
          
          speechSynthesis.speak(utterance);
        });
      }
      
    } catch (error) {
      console.error('TTS API call failed:', error);
      
      // Fallback to mock data if all providers fail
      return {
        audioUrl: `data:audio/wav;base64,fallback-mock-${Date.now()}`,
        duration: text.split(' ').length * 0.5
      };
    }
  }

  /**
   * Get precise audio duration by loading the audio metadata
   */
  private async getAudioDuration(audioUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      const onLoadedMetadata = () => {
        const duration = audio.duration;
        cleanup();
        
        if (isNaN(duration) || duration === 0) {
          console.warn('Could not get audio duration, using estimation');
          resolve(3.0); // 3 second fallback
        } else {
          resolve(duration);
        }
      };
      
      const onError = () => {
        cleanup();
        console.warn('Audio loading failed, using estimated duration');
        resolve(2.5); // 2.5 second fallback
      };
      
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('error', onError);
        audio.src = '';
      };
      
      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('error', onError);
      
      // Set source and trigger loading
      audio.src = audioUrl;
      audio.preload = 'metadata';
      
      // Timeout fallback after 2 seconds
      setTimeout(() => {
        if (audio.readyState === 0) {
          cleanup();
          console.warn('Audio duration detection timeout, using estimation');
          resolve(3.0);
        }
      }, 2000);
    });
  }

  /**
   * Generate precise word timings using the word timing generator
   */
  private async generateWordTimings(text: string, audioUrl: string, voiceId: string): Promise<WordTiming[]> {
    try {
      // Import the word timing generator
      const { wordTimingGenerator, WordTimingGenerator } = await import('./word-timing-generator');
      
      // Determine the best timing method for this voice
      const provider = WordTimingGenerator.getBestTimingMethod(voiceId);
      
      // Generate precise timings
      const result = await wordTimingGenerator.generateWordTimings({
        text,
        voiceId,
        provider,
        audioUrl
      });
      
      return result.wordTimings;
      
    } catch (error) {
      console.error('Precise word timing generation failed, using estimated:', error);
      
      // Fallback to estimated timings
      const words = text.split(' ');
      const avgWordDuration = 0.5; // 500ms per word average
      
      return words.map((word, index) => ({
        word: word.replace(/[.,!?]/g, ''), // Clean word
        startTime: index * avgWordDuration,
        endTime: (index + 1) * avgWordDuration,
        wordIndex: index
      }));
    }
  }

  /**
   * Cache operations - database integration
   */
  private async getCachedAudio(
    bookId: string,
    chunkIndex: number,
    cefrLevel: string,
    voiceId: string
  ): Promise<SentenceAudio[] | null> {
    try {
      const response = await fetch(`/api/audio/cache?bookId=${bookId}&chunkIndex=${chunkIndex}&cefrLevel=${cefrLevel}&voiceId=${voiceId}`);
      if (response.ok) {
        const data = await response.json();
        return data.audioData || null;
      }
    } catch (error) {
      console.error('Failed to get cached audio:', error);
    }
    return null;
  }

  private async cacheAudioSentence(
    bookId: string,
    chunkIndex: number,
    sentenceAudio: SentenceAudio
  ): Promise<void> {
    try {
      await fetch('/api/audio/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          chunkIndex,
          sentenceAudio
        })
      });
    } catch (error) {
      console.error('Failed to cache audio:', error);
      // Non-critical error - don't throw
    }
  }

  /**
   * Prefetch next chunk for seamless auto-advance
   */
  public async prefetchNextChunk(
    bookId: string,
    currentChunk: number,
    cefrLevel: string,
    voiceId: string
  ): Promise<void> {
    // Background prefetch of next chunk - implementation depends on content API
    console.log(`Prefetching chunk ${currentChunk + 1} for ${bookId}`);
  }

  /**
   * Update progress callback
   */
  private updateProgress(
    total: number,
    completed: number,
    currentSentence: string,
    status: 'generating' | 'ready' | 'error'
  ): void {
    this.progressCallback?.({
      total,
      completed,
      currentSentence,
      status
    });
  }

  /**
   * Stop playback and cleanup
   */
  public stop(): void {
    this.isPlaying = false;
    this.audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  /**
   * Get current playback status
   */
  public getStatus(): {
    isPlaying: boolean;
    currentSentence: number;
    totalSentences: number;
    progress: number;
  } {
    return {
      isPlaying: this.isPlaying,
      currentSentence: this.currentSentence,
      totalSentences: this.audioQueue.length,
      progress: this.audioQueue.length > 0 ? this.currentSentence / this.audioQueue.length : 0
    };
  }
}

// Export singleton instance
export const progressiveAudioService = new ProgressiveAudioService();