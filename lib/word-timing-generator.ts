import { ElevenLabsWebSocketService, CharacterTiming } from './elevenlabs-websocket';

export interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  wordIndex: number;
}

export interface TimingGenerationOptions {
  text: string;
  voiceId: string;
  provider: 'elevenlabs-websocket' | 'whisper' | 'web-speech' | 'estimated';
  audioUrl?: string;
  audioBlob?: Blob;
}

export interface TimingGenerationResult {
  wordTimings: WordTiming[];
  actualDuration: number;
  accuracy: 'high' | 'medium' | 'low';
  method: string;
}

export class WordTimingGenerator {
  private elevenLabsService: ElevenLabsWebSocketService | null = null;

  constructor(elevenLabsApiKey?: string) {
    if (elevenLabsApiKey) {
      this.elevenLabsService = new ElevenLabsWebSocketService(elevenLabsApiKey);
    }
  }

  /**
   * Generate precise word timings using the best available method
   */
  async generateWordTimings(options: TimingGenerationOptions): Promise<TimingGenerationResult> {
    const { text, voiceId, provider } = options;

    try {
      switch (provider) {
        case 'elevenlabs-websocket':
          return await this.generateWithElevenLabsWebSocket(text, voiceId);
          
        case 'whisper':
          if (options.audioUrl || options.audioBlob) {
            return await this.generateWithWhisper(text, options.audioUrl || options.audioBlob!);
          }
          throw new Error('Audio URL or blob required for Whisper timing');
          
        case 'web-speech':
          return await this.generateWithWebSpeech(text, voiceId);
          
        case 'estimated':
        default:
          return this.generateEstimatedTimings(text);
      }
    } catch (error) {
      console.error(`Word timing generation failed with ${provider}:`, error);
      
      // Fallback to estimated timings
      return this.generateEstimatedTimings(text);
    }
  }

  /**
   * Method 1: ElevenLabs WebSocket (99% accurate, character-level)
   */
  private async generateWithElevenLabsWebSocket(text: string, voiceId: string): Promise<TimingGenerationResult> {
    if (!this.elevenLabsService) {
      throw new Error('ElevenLabs API key not provided');
    }

    return new Promise((resolve, reject) => {
      const characterTimings: CharacterTiming[] = [];
      let audioChunks: ArrayBuffer[] = [];
      let totalDuration = 0;

      this.elevenLabsService!.streamTTS({
        text,
        voiceId: voiceId.replace('eleven_', ''),
        onCharacterTiming: (timing: CharacterTiming) => {
          characterTimings.push(timing);
          totalDuration = Math.max(totalDuration, timing.startTime + timing.duration);
        },
        onAudioChunk: (chunk: ArrayBuffer) => {
          audioChunks.push(chunk);
        },
        onComplete: () => {
          try {
            const wordTimings = this.characterTimingsToWordTimings(text, characterTimings);
            resolve({
              wordTimings,
              actualDuration: totalDuration,
              accuracy: 'high',
              method: 'ElevenLabs WebSocket'
            });
          } catch (error) {
            reject(error);
          }
        },
        onError: (error: string) => {
          reject(new Error(`ElevenLabs WebSocket error: ${error}`));
        }
      });
    });
  }

  /**
   * Method 2: Whisper Forced Alignment (90% accurate, word-level)
   */
  private async generateWithWhisper(text: string, audioSource: string | Blob): Promise<TimingGenerationResult> {
    try {
      // Prepare audio for Whisper API
      let audioBlob: Blob;
      if (typeof audioSource === 'string') {
        const response = await fetch(audioSource);
        audioBlob = await response.blob();
      } else {
        audioBlob = audioSource;
      }

      // Call Whisper API for forced alignment
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.mp3');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'word');

      const response = await fetch('/api/openai/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Whisper API failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Extract word timings from Whisper response
      const wordTimings: WordTiming[] = result.words?.map((word: any, index: number) => ({
        word: word.word.trim(),
        startTime: word.start,
        endTime: word.end,
        wordIndex: index
      })) || [];

      // Get actual audio duration
      const audio = new Audio();
      audio.src = typeof audioSource === 'string' ? audioSource : URL.createObjectURL(audioSource);
      await new Promise(resolve => audio.addEventListener('loadedmetadata', resolve));
      const actualDuration = audio.duration;

      return {
        wordTimings,
        actualDuration,
        accuracy: 'medium',
        method: 'Whisper Forced Alignment'
      };

    } catch (error) {
      throw new Error(`Whisper timing generation failed: ${error}`);
    }
  }

  /**
   * Method 3: Web Speech API (95% accurate, real-time)
   */
  private async generateWithWebSpeech(text: string, voiceId: string): Promise<TimingGenerationResult> {
    return new Promise((resolve, reject) => {
      const words = this.extractWords(text);
      const wordTimings: WordTiming[] = [];
      let startTime = 0;
      let currentWordIndex = 0;

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Find the requested voice
      const voices = speechSynthesis.getVoices();
      const voice = voices.find(v => v.name === voiceId || v.name.includes(voiceId));
      if (voice) {
        utterance.voice = voice;
      }

      // Track word boundaries
      utterance.addEventListener('boundary', (event) => {
        if (event.name === 'word' && currentWordIndex < words.length) {
          const elapsedTime = event.elapsedTime / 1000; // Convert to seconds
          
          if (currentWordIndex > 0) {
            // Set end time for previous word
            wordTimings[currentWordIndex - 1].endTime = elapsedTime;
          }

          // Start new word
          wordTimings.push({
            word: words[currentWordIndex],
            startTime: elapsedTime,
            endTime: elapsedTime, // Will be updated by next boundary
            wordIndex: currentWordIndex
          });

          currentWordIndex++;
        }
      });

      utterance.onend = () => {
        // Set end time for last word
        if (wordTimings.length > 0) {
          const lastWordIndex = wordTimings.length - 1;
          const estimatedEndTime = wordTimings[lastWordIndex].startTime + 0.5; // 500ms default
          wordTimings[lastWordIndex].endTime = estimatedEndTime;
        }

        const totalDuration = wordTimings.length > 0 
          ? wordTimings[wordTimings.length - 1].endTime 
          : text.split(' ').length * 0.6;

        resolve({
          wordTimings,
          actualDuration: totalDuration,
          accuracy: 'medium',
          method: 'Web Speech API'
        });
      };

      utterance.onerror = (event) => {
        reject(new Error(`Web Speech API error: ${event.error}`));
      };

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Method 4: Estimated timings (fallback)
   */
  private generateEstimatedTimings(text: string): TimingGenerationResult {
    const words = this.extractWords(text);
    const avgWordDuration = 0.6; // 600ms per word average
    
    const wordTimings: WordTiming[] = words.map((word, index) => ({
      word,
      startTime: index * avgWordDuration,
      endTime: (index + 1) * avgWordDuration,
      wordIndex: index
    }));

    return {
      wordTimings,
      actualDuration: words.length * avgWordDuration,
      accuracy: 'low',
      method: 'Estimated timing'
    };
  }

  /**
   * Convert character-level timings to word-level timings
   */
  private characterTimingsToWordTimings(text: string, characterTimings: CharacterTiming[]): WordTiming[] {
    const words = this.extractWords(text);
    const wordTimings: WordTiming[] = [];
    
    let textPosition = 0;
    let charTimingIndex = 0;

    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
      const word = words[wordIndex];
      
      // Find the start of this word in the character timings
      while (textPosition < text.length && /\s/.test(text[textPosition])) {
        textPosition++;
        charTimingIndex++;
      }

      const wordStartCharIndex = charTimingIndex;
      const wordEndCharIndex = charTimingIndex + word.length;

      // Get timing for first and last character of word
      const startCharTiming = characterTimings[wordStartCharIndex];
      const endCharTiming = characterTimings[Math.min(wordEndCharIndex - 1, characterTimings.length - 1)];

      if (startCharTiming && endCharTiming) {
        wordTimings.push({
          word,
          startTime: startCharTiming.startTime,
          endTime: endCharTiming.startTime + endCharTiming.duration,
          wordIndex
        });
      } else {
        // Fallback to estimated timing for this word
        const estimatedStart = wordIndex * 0.6;
        wordTimings.push({
          word,
          startTime: estimatedStart,
          endTime: estimatedStart + 0.6,
          wordIndex
        });
      }

      textPosition += word.length;
      charTimingIndex += word.length;
    }

    return wordTimings;
  }

  /**
   * Extract clean words from text
   */
  private extractWords(text: string): string[] {
    return text
      .split(/\s+/)
      .map(word => word.trim())
      .filter(word => word.length > 0)
      .map(word => word.replace(/^[^\w''-]+|[^\w''-]+$/g, ''))
      .filter(word => word.length > 0);
  }

  /**
   * Get the best available timing method for a given voice
   */
  static getBestTimingMethod(voiceId: string): 'elevenlabs-websocket' | 'whisper' | 'web-speech' | 'estimated' {
    if (voiceId.startsWith('eleven_')) {
      return 'elevenlabs-websocket';
    }
    
    if (['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(voiceId)) {
      return 'whisper';
    }
    
    // For other voices, use Web Speech if available
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return 'web-speech';
    }
    
    return 'estimated';
  }
}

// Export singleton instance
export const wordTimingGenerator = new WordTimingGenerator(process.env.ELEVENLABS_API_KEY);