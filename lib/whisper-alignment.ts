export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface WhisperAlignmentResult {
  words: WordTimestamp[];
  duration: number;
  success: boolean;
  error?: string;
}

export class WhisperAlignmentService {
  constructor() {
    // No OpenAI initialization needed - using API endpoint
  }

  /**
   * Takes audio data and original text, returns word-level timestamps
   */
  async alignAudioWithText(
    audioBuffer: ArrayBuffer, 
    originalText: string
  ): Promise<WhisperAlignmentResult> {
    const startTime = Date.now();
    
    try {
      console.log('🎯 Starting Whisper alignment for audio with text:', originalText.substring(0, 100) + '...');
      
      // Create FormData to send to API endpoint
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioFile = new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' });
      
      formData.append('audio', audioFile);
      formData.append('text', originalText);

      // Call our Whisper alignment API endpoint
      const response = await fetch('/api/whisper/align', {
        method: 'POST',
        body: formData
      });

      const result: WhisperAlignmentResult = await response.json();
      
      const processingTime = Date.now() - startTime;
      
      if (result.success) {
        console.log(`🎯 Whisper alignment successful in ${processingTime}ms: ${result.words.length} words aligned, ${result.duration.toFixed(1)}s duration`);
      } else {
        console.error(`🎯 Whisper alignment failed after ${processingTime}ms:`, result.error);
      }
      
      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`🎯 Whisper alignment failed after ${processingTime}ms:`, error);
      
      return {
        words: [],
        duration: 0,
        success: false,
        error: error.message || 'Unknown error during alignment'
      };
    }
  }


  /**
   * Get timing for a specific word index
   */
  getWordTiming(alignmentResult: WhisperAlignmentResult, wordIndex: number): WordTimestamp | null {
    if (!alignmentResult.success || wordIndex < 0 || wordIndex >= alignmentResult.words.length) {
      return null;
    }
    return alignmentResult.words[wordIndex];
  }

  /**
   * Get the word index that should be highlighted at a given time
   */
  getWordIndexAtTime(alignmentResult: WhisperAlignmentResult, currentTime: number): number {
    if (!alignmentResult.success) return -1;

    // Find the word that contains the current time
    for (let i = 0; i < alignmentResult.words.length; i++) {
      const word = alignmentResult.words[i];
      if (currentTime >= word.start && currentTime <= word.end) {
        return i;
      }
    }

    // If between words, find the next word to highlight
    for (let i = 0; i < alignmentResult.words.length; i++) {
      const word = alignmentResult.words[i];
      if (currentTime < word.start) {
        return Math.max(0, i - 1); // Highlight previous word
      }
    }

    // If past all words, highlight the last word
    return alignmentResult.words.length - 1;
  }
}

// Export singleton instance
export const whisperAlignmentService = new WhisperAlignmentService();