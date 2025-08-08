export interface CharacterTiming {
  character: string;
  startTime: number;
  duration: number;
}

export interface ElevenLabsStreamingOptions {
  text: string;
  voiceId: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  onAudioChunk?: (audioChunk: ArrayBuffer) => void;
  onCharacterTiming?: (timing: CharacterTiming) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export interface ElevenLabsWebSocketResponse {
  audio?: string; // base64 encoded audio
  alignment?: {
    character: string;
    start_time: number;
    duration: number;
  };
  isFinal?: boolean;
  normalizedAlignment?: {
    character: string;
    start_time: number;
    duration: number;
  };
}

export class ElevenLabsWebSocketService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private apiKey: string;
  private audioChunks: ArrayBuffer[] = [];
  private currentOptions: ElevenLabsStreamingOptions | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Connect to ElevenLabs WebSocket API and stream TTS with timing
   */
  async streamTTS(options: ElevenLabsStreamingOptions): Promise<void> {
    console.log('🎤 Starting ElevenLabs WebSocket TTS stream...');
    
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not provided');
    }

    this.currentOptions = options;
    this.audioChunks = [];

    try {
      await this.connect(options.voiceId);
      await this.sendTextForSynthesis(options);
    } catch (error) {
      console.error('🎤 ElevenLabs WebSocket error:', error);
      options.onError?.(`Failed to start TTS stream: ${error}`);
      throw error;
    }
  }

  /**
   * Establish WebSocket connection
   */
  private async connect(voiceId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_turbo_v2`;
      
      console.log('🎤 Connecting to ElevenLabs WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('🎤 ElevenLabs WebSocket connected');
        this.isConnected = true;
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (error) => {
        console.error('🎤 WebSocket error:', error);
        this.isConnected = false;
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = (event) => {
        console.log('🎤 WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
        
        if (event.code !== 1000) {
          this.currentOptions?.onError?.(`WebSocket closed unexpectedly: ${event.reason}`);
        }
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Send text and configuration for synthesis
   */
  private async sendTextForSynthesis(options: ElevenLabsStreamingOptions): Promise<void> {
    if (!this.ws || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    console.log('🔍 ELEVENLABS-INPUT: Original text to send:', `"${options.text}"`);
    console.log('🔍 ELEVENLABS-INPUT: Original text length:', options.text.length);

    // Send initial configuration
    const config = {
      text: " ", // Start with empty space
      voice_settings: {
        stability: options.stability ?? 0.5,
        similarity_boost: options.similarityBoost ?? 0.8,
        style: options.style ?? 0.0,
        use_speaker_boost: options.useSpeakerBoost ?? true
      },
      generation_config: {
        chunk_length_schedule: [120, 160, 250, 290]
      },
      xi_api_key: this.apiKey
    };

    console.log('🎤 Sending initial config to ElevenLabs');
    this.ws.send(JSON.stringify(config));

    // Send the actual text WITHOUT extra space to prevent character overflow
    const textMessage = {
      text: options.text, // Remove the extra space that was causing overflow
      try_trigger_generation: true
    };

    console.log('🔍 ELEVENLABS-INPUT: Text message to send:', `"${textMessage.text}"`);
    console.log('🔍 ELEVENLABS-INPUT: Text message length:', textMessage.text.length);
    console.log('🎤 Sending text for synthesis:', options.text.substring(0, 100) + (options.text.length > 100 ? '...' : ''));
    this.ws.send(JSON.stringify(textMessage));

    // Send end of sequence
    setTimeout(() => {
      if (this.ws && this.isConnected) {
        console.log('🎤 Sending end of sequence');
        this.ws.send(JSON.stringify({ text: "" }));
      }
    }, 100);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const response: ElevenLabsWebSocketResponse = JSON.parse(event.data);
      
      // Debug: Log message types to understand what ElevenLabs is sending
      const messageKeys = Object.keys(response).filter(k => k !== 'audio');
      if (messageKeys.length > 0) {
        console.log('🎤 WebSocket message type:', messageKeys.join(', '));
        
        // Log non-audio messages for debugging
        if (!response.audio && !response.isFinal) {
          console.log('🎤 WebSocket message content:', JSON.stringify(response, null, 2));
        }
      }
      
      // Handle audio chunk
      if (response.audio) {
        this.handleAudioChunk(response.audio);
      }

      // Handle character timing alignment
      if (response.alignment) {
        this.handleCharacterTiming(response.alignment);
      }

      // Handle normalized alignment (more accurate timing)
      if (response.normalizedAlignment) {
        this.handleCharacterTiming(response.normalizedAlignment);
      }

      // Handle completion
      if (response.isFinal) {
        console.log('🎤 ElevenLabs TTS stream completed');
        this.currentOptions?.onComplete?.();
        this.disconnect();
      }
    } catch (error) {
      console.error('🎤 Error parsing WebSocket message:', error);
      this.currentOptions?.onError?.('Failed to parse WebSocket response');
    }
  }

  /**
   * Process audio chunk from WebSocket
   */
  private handleAudioChunk(audioBase64: string): void {
    try {
      // Decode base64 audio
      const binaryString = atob(audioBase64);
      const audioBuffer = new ArrayBuffer(binaryString.length);
      const audioArray = new Uint8Array(audioBuffer);
      
      for (let i = 0; i < binaryString.length; i++) {
        audioArray[i] = binaryString.charCodeAt(i);
      }
      
      this.audioChunks.push(audioBuffer);
      
      console.log(`🎤 Received audio chunk: ${audioBuffer.byteLength} bytes`);
      this.currentOptions?.onAudioChunk?.(audioBuffer);
    } catch (error) {
      console.error('🎤 Error processing audio chunk:', error);
      this.currentOptions?.onError?.('Failed to process audio chunk');
    }
  }

  /**
   * Process character timing data
   */
  private handleCharacterTiming(alignment: any): void {
    console.log(`🎤 WEBSOCKET-ALIGNMENT: Processing character timing data`);
    
    // Log raw alignment data for debugging
    try {
      console.log(`🎤 WEBSOCKET-ALIGNMENT: Raw data type:`, typeof alignment);
      console.log(`🎤 WEBSOCKET-ALIGNMENT: Raw data:`, JSON.stringify(alignment, null, 2));
    } catch (e) {
      console.error(`🎤 WEBSOCKET-ALIGNMENT: Error logging alignment data:`, e);
    }
    
    if (!alignment) {
      console.warn(`🎤 WEBSOCKET-ALIGNMENT: No alignment data received`);
      return;
    }
    
    // Handle ElevenLabs WebSocket character timing format
    if (alignment.chars && alignment.charStartTimesMs && alignment.charDurationsMs) {
      const charCount = alignment.chars.length;
      console.log(`🎤 WEBSOCKET-ALIGNMENT: Processing ${charCount} characters`);
      
      // Validate array lengths match
      if (alignment.chars.length !== alignment.charStartTimesMs.length || 
          alignment.chars.length !== alignment.charDurationsMs.length) {
        console.error(`🎤 WEBSOCKET-ALIGNMENT: Array length mismatch - chars: ${alignment.chars.length}, times: ${alignment.charStartTimesMs.length}, durations: ${alignment.charDurationsMs.length}`);
        return;
      }
      
      console.log(`🎤 WEBSOCKET-ALIGNMENT: Character sequence preview:`, alignment.chars.slice(0, Math.min(10, charCount)).join(''));
      
      // Process each character with robust error handling
      for (let i = 0; i < alignment.chars.length; i++) {
        const character = alignment.chars[i];
        const startTimeMs = alignment.charStartTimesMs[i];
        const durationMs = alignment.charDurationsMs[i];
        
        // Validate timing data
        if (typeof startTimeMs !== 'number' || typeof durationMs !== 'number') {
          console.warn(`🎤 WEBSOCKET-ALIGNMENT: Invalid timing data for character ${i}: startTime=${startTimeMs}, duration=${durationMs}`);
          continue;
        }
        
        const timing: CharacterTiming = {
          character: character,
          startTime: startTimeMs / 1000, // Convert ms to seconds
          duration: durationMs / 1000    // Convert ms to seconds
        };
        
        console.log(`🎤 WEBSOCKET-ALIGNMENT: Character [${i}/${charCount}]: "${timing.character}" at ${timing.startTime.toFixed(3)}s (duration: ${timing.duration.toFixed(3)}s)`);
        
        // Send character timing to callback with error handling
        try {
          this.currentOptions?.onCharacterTiming?.(timing);
        } catch (error) {
          console.error(`🎤 WEBSOCKET-ALIGNMENT: Error in character timing callback for character ${i}:`, error);
        }
      }
      
      console.log(`🎤 WEBSOCKET-ALIGNMENT: Completed processing ${charCount} characters`);
      return;
    }
    
    // Handle alternative formats if needed
    console.warn(`🎤 WEBSOCKET-ALIGNMENT: Unknown or unsupported alignment format:`, Object.keys(alignment));
  }

  /**
   * Get all collected audio as a single buffer
   */
  getCompleteAudio(): ArrayBuffer | null {
    if (this.audioChunks.length === 0) {
      return null;
    }

    // Concatenate all audio chunks
    const totalLength = this.audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const completeAudio = new ArrayBuffer(totalLength);
    const completeArray = new Uint8Array(completeAudio);
    
    let offset = 0;
    for (const chunk of this.audioChunks) {
      completeArray.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    return completeAudio;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      console.log('🎤 Disconnecting ElevenLabs WebSocket');
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.currentOptions = null;
  }

  /**
   * Check if currently connected
   */
  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance (will be initialized with API key from environment)
let elevenLabsWebSocketService: ElevenLabsWebSocketService | null = null;

export const getElevenLabsWebSocketService = (apiKey?: string): ElevenLabsWebSocketService => {
  if (!elevenLabsWebSocketService) {
    if (!apiKey) {
      throw new Error('ElevenLabs API key required for first initialization');
    }
    elevenLabsWebSocketService = new ElevenLabsWebSocketService(apiKey);
  }
  return elevenLabsWebSocketService;
};