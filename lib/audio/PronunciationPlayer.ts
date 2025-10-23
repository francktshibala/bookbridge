// Pronunciation audio player for dictionary words
// Handles both API audio URLs and Text-to-Speech fallback

interface PronunciationOptions {
  word: string;
  audioUrl?: string;
  pronunciation?: string;
  language?: string;
}

class PronunciationPlayer {
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying = false;

  constructor() {
    // Initialize audio context on first user interaction
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      // Create audio context for better audio control
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.log('📢 Pronunciation: Audio context not available, using fallback');
    }
  }

  private resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Main method to play pronunciation
  async playPronunciation(options: PronunciationOptions): Promise<boolean> {
    const { word, audioUrl, pronunciation } = options;

    console.log('📢 Pronunciation: Playing audio for:', word);

    // Stop any currently playing audio
    this.stop();

    // Resume audio context if suspended
    this.resumeAudioContext();

    // Try audio URL first (from Free Dictionary API)
    if (audioUrl) {
      const success = await this.playFromUrl(audioUrl, word);
      if (success) return true;
    }

    // Fallback to browser Text-to-Speech
    return this.playWithTTS(word, pronunciation);
  }

  // Play audio from URL (Free Dictionary API)
  private async playFromUrl(audioUrl: string, word: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.currentAudio = new Audio(audioUrl);

        // Handle successful loading
        this.currentAudio.addEventListener('canplaythrough', () => {
          if (this.currentAudio) {
            this.isPlaying = true;
            this.currentAudio.play()
              .then(() => {
                console.log('📢 Pronunciation: API audio playing for:', word);
                resolve(true);
              })
              .catch((error) => {
                console.log('📢 Pronunciation: API audio play failed:', error);
                resolve(false);
              });
          }
        });

        // Handle loading errors
        this.currentAudio.addEventListener('error', (error) => {
          console.log('📢 Pronunciation: API audio load failed:', error);
          resolve(false);
        });

        // Handle playback end
        this.currentAudio.addEventListener('ended', () => {
          this.isPlaying = false;
          this.currentAudio = null;
        });

        // Set volume and load
        this.currentAudio.volume = 0.8;
        this.currentAudio.load();

        // Timeout after 3 seconds
        setTimeout(() => {
          if (!this.isPlaying) {
            console.log('📢 Pronunciation: API audio timeout');
            resolve(false);
          }
        }, 3000);

      } catch (error) {
        console.log('📢 Pronunciation: Error creating audio element:', error);
        resolve(false);
      }
    });
  }

  // Fallback Text-to-Speech using browser SpeechSynthesis
  private playWithTTS(word: string, pronunciation?: string): boolean {
    try {
      if (!('speechSynthesis' in window)) {
        console.log('📢 Pronunciation: TTS not supported');
        return false;
      }

      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word);

      // Configure TTS settings for better pronunciation
      utterance.rate = 0.8; // Slightly slower for learning
      utterance.pitch = 1.0;
      utterance.volume = 0.9;

      // Try to use English voice
      const voices = speechSynthesis.getVoices();
      const englishVoice = voices.find(voice =>
        voice.lang.startsWith('en') &&
        (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Alex'))
      );

      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      // Handle events
      utterance.onstart = () => {
        this.isPlaying = true;
        console.log('📢 Pronunciation: TTS playing for:', word);
      };

      utterance.onend = () => {
        this.isPlaying = false;
        console.log('📢 Pronunciation: TTS finished for:', word);
      };

      utterance.onerror = (error) => {
        this.isPlaying = false;
        console.log('📢 Pronunciation: TTS error:', error);
      };

      // Speak the word
      speechSynthesis.speak(utterance);

      return true;

    } catch (error) {
      console.log('📢 Pronunciation: TTS error:', error);
      return false;
    }
  }

  // Stop any currently playing audio
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    this.isPlaying = false;
  }

  // Check if audio is currently playing
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // Test method to check TTS availability
  testTTS(): boolean {
    if (!('speechSynthesis' in window)) {
      return false;
    }

    const voices = speechSynthesis.getVoices();
    const hasEnglishVoice = voices.some(voice => voice.lang.startsWith('en'));

    console.log('📢 Pronunciation: TTS test - Voices available:', voices.length, 'English voices:', hasEnglishVoice);

    return hasEnglishVoice;
  }

  // Get available voices for debugging
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!('speechSynthesis' in window)) {
      return [];
    }
    return speechSynthesis.getVoices();
  }
}

// Create singleton instance
export const pronunciationPlayer = new PronunciationPlayer();

// Export the class for testing
export { PronunciationPlayer };

// Utility function for components
export async function playWordPronunciation(
  word: string,
  audioUrl?: string,
  pronunciation?: string
): Promise<boolean> {
  return pronunciationPlayer.playPronunciation({
    word,
    audioUrl,
    pronunciation
  });
}