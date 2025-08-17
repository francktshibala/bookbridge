import { whisperAlignmentService, WhisperAlignmentResult } from './whisper-alignment';
import { VoiceProvider } from './voice-service';

export interface HighlightingOptions {
  provider: VoiceProvider;
  text: string;
  enableHighlighting: boolean;
  onWordHighlight: (wordIndex: number, totalWords: number) => void;
  onError?: (error: string) => void;
}

export interface HighlightingSession {
  id: string;
  provider: VoiceProvider;
  text: string;
  words: string[];
  alignmentResult?: WhisperAlignmentResult;
  isActive: boolean;
  trackingInterval?: NodeJS.Timeout;
}

export class HighlightingManager {
  private sessions: Map<string, HighlightingSession> = new Map();
  private currentSessionId: string | null = null;

  /**
   * Start a new highlighting session
   */
  async startSession(options: HighlightingOptions): Promise<string> {
    const sessionId = this.generateSessionId();
    console.log(`🎯 Starting highlighting session ${sessionId} with provider: ${options.provider}`);

    // Split text into words (consistent with AudioPlayerWithHighlighting)
    const words = options.text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.trim());

    const session: HighlightingSession = {
      id: sessionId,
      provider: options.provider,
      text: options.text,
      words,
      isActive: false
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    // For OpenAI provider, we need to prepare Whisper alignment
    if (options.provider === 'openai') {
      console.log(`🎯 OpenAI provider detected - Whisper alignment will be prepared when audio is ready`);
    }

    return sessionId;
  }

  /**
   * Prepare alignment data for OpenAI TTS audio
   */
  async prepareAlignment(sessionId: string, audioBuffer: ArrayBuffer): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(`🎯 Session ${sessionId} not found`);
      return false;
    }

    if (session.provider !== 'openai') {
      console.log(`🎯 Skipping alignment for provider: ${session.provider}`);
      return true; // Not needed for other providers
    }

    console.log(`🎯 Preparing Whisper alignment for session ${sessionId}`);
    
    try {
      const alignmentResult = await whisperAlignmentService.alignAudioWithText(
        audioBuffer, 
        session.text
      );

      if (alignmentResult.success) {
        session.alignmentResult = alignmentResult;
        console.log(`🎯 Whisper alignment prepared: ${alignmentResult.words.length} words, ${alignmentResult.duration.toFixed(1)}s`);
        return true;
      } else {
        console.error(`🎯 Whisper alignment failed:`, alignmentResult.error);
        return false;
      }
    } catch (error) {
      console.error(`🎯 Error preparing alignment:`, error);
      return false;
    }
  }

  /**
   * Get debug info about sessions
   */
  getSessionInfo(): { sessionIds: string[], currentSessionId: string | null } {
    return {
      sessionIds: Array.from(this.sessions.keys()),
      currentSessionId: this.currentSessionId
    };
  }

  /**
   * Start highlighting for the current session
   */
  startHighlighting(sessionId: string, audioElement: HTMLAudioElement, onWordHighlight: (wordIndex: number) => void): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(`🎯 Session ${sessionId} not found`);
      console.error(`🎯 Available sessions:`, Array.from(this.sessions.keys()));
      console.error(`🎯 Current session ID:`, this.currentSessionId);
      return false;
    }

    if (session.isActive) {
      console.log(`🎯 Session ${sessionId} already active`);
      return true;
    }

    session.isActive = true;
    console.log(`🎯 Starting highlighting for session ${sessionId} with provider: ${session.provider}`);

    // Web Speech uses boundary events (handled externally)
    if (session.provider === 'web-speech') {
      console.log(`🎯 Web Speech highlighting ready - boundary events will be handled externally`);
      return true;
    }

    // OpenAI uses Whisper alignment
    if (session.provider === 'openai') {
      return this.startOpenAIHighlighting(session, audioElement, onWordHighlight);
    }

    // ElevenLabs WebSocket uses character-level timing (precise sync)
    if (session.provider === 'elevenlabs-websocket') {
      console.log(`🎯 ElevenLabs WebSocket highlighting ready - character timing events will be handled externally`);
      return true;
    }

    // ElevenLabs falls back to time-based estimation (can be improved later)
    if (session.provider === 'elevenlabs') {
      return this.startTimeBasedHighlighting(session, audioElement, onWordHighlight);
    }

    return false;
  }

  /**
   * Handle Web Speech boundary events
   */
  handleWebSpeechBoundary(sessionId: string, wordIndex: number, onWordHighlight: (wordIndex: number) => void): void {
    console.log(`🎯 handleWebSpeechBoundary called:`, { sessionId, wordIndex });
    
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log(`🎯 Session ${sessionId} not found`);
      return;
    }
    
    if (!session.isActive) {
      console.log(`🎯 Session ${sessionId} not active`);
      return;
    }
    
    if (session.provider !== 'web-speech') {
      console.log(`🎯 Session ${sessionId} wrong provider: ${session.provider}`);
      return;
    }

    const clampedIndex = Math.max(0, Math.min(wordIndex, session.words.length - 1));
    console.log(`🎯 Web Speech boundary: word ${clampedIndex} "${session.words[clampedIndex]}" - calling onWordHighlight`);
    onWordHighlight(clampedIndex);
  }

  /**
   * Handle ElevenLabs WebSocket character boundary events
   */
  handleElevenLabsWebSocketBoundary(sessionId: string, wordIndex: number, onWordHighlight: (wordIndex: number) => void): void {
    console.log(`🎯 handleElevenLabsWebSocketBoundary called:`, { sessionId, wordIndex });
    
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log(`🎯 Session ${sessionId} not found`);
      return;
    }
    
    if (!session.isActive) {
      console.log(`🎯 Session ${sessionId} not active`);
      return;
    }
    
    if (session.provider !== 'elevenlabs-websocket') {
      console.log(`🎯 Session ${sessionId} wrong provider: ${session.provider}`);
      return;
    }

    // Validate word index bounds
    if (wordIndex < 0 || wordIndex >= session.words.length) {
      console.warn(`🎯 ElevenLabs WebSocket: Invalid word index ${wordIndex}, session has ${session.words.length} words`);
      return;
    }

    console.log(`🎯 ElevenLabs WebSocket boundary: word ${wordIndex} "${session.words[wordIndex]}" - calling onWordHighlight`);
    onWordHighlight(wordIndex);
  }

  /**
   * Start OpenAI highlighting using Whisper alignment (with fallback)
   */
  private startOpenAIHighlighting(
    session: HighlightingSession, 
    audioElement: HTMLAudioElement, 
    onWordHighlight: (wordIndex: number) => void
  ): boolean {
    console.log(`🎯 Starting OpenAI highlighting...`);

    const trackProgress = () => {
      if (!audioElement || audioElement.duration === 0) {
        return;
      }
      // Remove paused check as it's unreliable - audio timing will handle this

      const currentTime = audioElement.currentTime;

      // If Whisper alignment is ready, use it for perfect sync
      if (session.alignmentResult && session.alignmentResult.success) {
        const wordIndex = whisperAlignmentService.getWordIndexAtTime(
          session.alignmentResult, 
          currentTime
        );

        if (wordIndex >= 0 && wordIndex < session.words.length) {
          const word = session.words[wordIndex];
          console.log(`🎯 OpenAI Whisper sync: ${currentTime.toFixed(2)}s → word ${wordIndex} "${word}"`);
          onWordHighlight(wordIndex);
        }
      } else {
        // Fallback to improved time-based estimation while waiting for Whisper
        const progress = currentTime / audioElement.duration;
        
        // Apply timing adjustments for OpenAI (similar to old implementation but improved)
        const adjustedProgress = progress < 0.1 ? progress * 0.7 : 
                                 progress < 0.85 ? 0.07 + ((progress - 0.1) * 1.2 * 0.78) :
                                 0.801 + ((progress - 0.85) * 0.199 / 0.15);
        
        const wordIndex = Math.floor(adjustedProgress * session.words.length);
        const clampedIndex = Math.max(0, Math.min(wordIndex, session.words.length - 1));
        
        if (clampedIndex >= 0) {
          console.log(`🎯 OpenAI fallback sync: ${currentTime.toFixed(2)}s (${(progress*100).toFixed(1)}% → ${(adjustedProgress*100).toFixed(1)}%) → word ${clampedIndex}/${session.words.length}`);
          onWordHighlight(clampedIndex);
        }
      }
    };

    // Track every 50ms for smooth highlighting
    session.trackingInterval = setInterval(trackProgress, 50);
    return true;
  }

  /**
   * Start time-based highlighting for ElevenLabs (fallback)
   */
  private startTimeBasedHighlighting(
    session: HighlightingSession, 
    audioElement: HTMLAudioElement, 
    onWordHighlight: (wordIndex: number) => void
  ): boolean {
    console.log(`🎯 Starting time-based highlighting for ElevenLabs (fallback method)`);

    // Add initial delay to sync with voice start
    let initialDelay = true;
    let lastHighlightedIndex = -1;
    
    const trackProgress = () => {
      if (!audioElement || audioElement.duration === 0) {
        return;
      }
      // Remove paused check as it's unreliable - audio timing will handle this

      const currentTime = audioElement.currentTime;
      
      // Skip highlighting for the first 200ms to sync with voice
      if (initialDelay && currentTime < 0.2) {
        return;
      }
      initialDelay = false;
      
      const progress = currentTime / audioElement.duration;
      
      // Apply timing adjustments for ElevenLabs
      const adjustedProgress = progress < 0.05 ? progress * 0.8 : 
                              progress < 0.9 ? 0.04 + ((progress - 0.05) * 1.15 * 0.85) :
                              0.866 + ((progress - 0.9) * 0.134 / 0.1);
      
      const wordIndex = Math.floor(adjustedProgress * session.words.length);
      const clampedIndex = Math.max(0, Math.min(wordIndex, session.words.length - 1));
      
      // Only highlight if we've moved to a new word
      if (clampedIndex !== lastHighlightedIndex) {
        console.log(`🎯 ElevenLabs sync: ${currentTime.toFixed(2)}s (${(progress*100).toFixed(1)}% → ${(adjustedProgress*100).toFixed(1)}%) → word ${clampedIndex}/${session.words.length}`);
        onWordHighlight(clampedIndex);
        lastHighlightedIndex = clampedIndex;
      }
    };

    session.trackingInterval = setInterval(trackProgress, 100);
    return true;
  }

  /**
   * Stop highlighting for a session
   */
  stopHighlighting(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`🎯 Stopping highlighting for session ${sessionId}`);
    
    session.isActive = false;
    
    if (session.trackingInterval) {
      clearInterval(session.trackingInterval);
      session.trackingInterval = undefined;
    }
  }

  /**
   * Clean up a session
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`🎯 Ending session ${sessionId}`);
    
    this.stopHighlighting(sessionId);
    this.sessions.delete(sessionId);
    
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }

  /**
   * Get current session info
   */
  getCurrentSession(): HighlightingSession | null {
    if (!this.currentSessionId) return null;
    return this.sessions.get(this.currentSessionId) || null;
  }

  /**
   * Clean up all sessions
   */
  cleanup(): void {
    console.log(`🎯 Cleaning up ${this.sessions.size} highlighting sessions`);
    
    for (const [sessionId] of this.sessions) {
      this.endSession(sessionId);
    }
  }

  private generateSessionId(): string {
    return `highlight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const highlightingManager = new HighlightingManager();