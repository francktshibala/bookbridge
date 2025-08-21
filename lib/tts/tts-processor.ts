import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';


// Service role client for storage access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface TTSResult {
  audioBlob: Buffer;
  duration: number;
  wordTimings?: WordTiming[];
}

export class TTSProcessor {
  private static instance: TTSProcessor;

  static getInstance(): TTSProcessor {
    if (!TTSProcessor.instance) {
      TTSProcessor.instance = new TTSProcessor();
    }
    return TTSProcessor.instance;
  }

  // Generate TTS with OpenAI (includes word-level timing)
  async generateOpenAITTS(text: string, voice: string = 'alloy'): Promise<TTSResult> {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voice,
          response_format: 'mp3',
          speed: 1.0
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI TTS failed: ${response.statusText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      // For now, estimate duration and word timings
      // TODO: Implement proper word-level timing extraction
      const estimatedDuration = this.estimateAudioDuration(text);
      const estimatedWordTimings = this.estimateWordTimings(text, estimatedDuration);

      return {
        audioBlob: audioBuffer,
        duration: estimatedDuration,
        wordTimings: estimatedWordTimings
      };

    } catch (error) {
      console.error('OpenAI TTS generation failed:', error);
      throw error;
    }
  }

  // Generate TTS with ElevenLabs (premium voices, better timing)
  async generateElevenLabsTTS(text: string, voiceId: string = 'pNInz6obpgDQGcFmaJgB'): Promise<TTSResult> {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      // Estimate duration and word timings for ElevenLabs
      const estimatedDuration = this.estimateAudioDuration(text);
      const estimatedWordTimings = this.estimateWordTimings(text, estimatedDuration);

      return {
        audioBlob: audioBuffer,
        duration: estimatedDuration,
        wordTimings: estimatedWordTimings
      };

    } catch (error) {
      console.error('ElevenLabs TTS generation failed:', error);
      throw error;
    }
  }

  // Estimate audio duration based on text length and reading speed
  private estimateAudioDuration(text: string): number {
    const words = text.split(/\s+/).length;
    const averageWPM = 150; // Average reading speed
    return (words / averageWPM) * 60; // Duration in seconds
  }

  // Estimate word-level timings
  private estimateWordTimings(text: string, totalDuration: number): WordTiming[] {
    const words = text.split(/\s+/);
    const wordTimings: WordTiming[] = [];
    
    let currentTime = 0;
    const averageWordDuration = totalDuration / words.length;

    for (const word of words) {
      // Adjust duration based on word length and punctuation
      let wordDuration = averageWordDuration;
      
      // Longer words take more time
      if (word.length > 6) wordDuration *= 1.2;
      if (word.length < 3) wordDuration *= 0.8;
      
      // Punctuation adds pause
      if (/[.!?]$/.test(word)) wordDuration *= 1.5;
      if (/[,;:]$/.test(word)) wordDuration *= 1.2;

      wordTimings.push({
        word: word.replace(/[^\w']/g, ''), // Clean word
        start: currentTime,
        end: currentTime + wordDuration
      });

      currentTime += wordDuration;
    }

    return wordTimings;
  }

  // Process TTS for a book chunk and store in database
  async processChunkTTS(
    bookId: string, 
    cefrLevel: string, 
    chunkIndex: number, 
    voiceService: 'openai' | 'elevenlabs' = 'openai',
    voiceId: string = 'alloy'
  ): Promise<void> {
    console.log(`🎵 Generating TTS: ${bookId} ${cefrLevel} chunk ${chunkIndex}`);

    try {
      // Get the chunk text
      const chunk = await prisma.bookChunk.findUnique({
        where: {
          bookId_cefrLevel_chunkIndex: {
            bookId,
            cefrLevel,
            chunkIndex
          }
        }
      });

      if (!chunk) {
        throw new Error(`Chunk not found: ${bookId} ${cefrLevel} chunk ${chunkIndex}`);
      }

      // Generate TTS
      let ttsResult: TTSResult;
      if (voiceService === 'elevenlabs') {
        ttsResult = await this.generateElevenLabsTTS(chunk.chunkText, voiceId);
      } else {
        ttsResult = await this.generateOpenAITTS(chunk.chunkText, voiceId);
      }

      // Store audio file in database
      const audioRecord = await prisma.bookAudio.create({
        data: {
          bookId,
          cefrLevel,
          voiceId,
          audioBlob: ttsResult.audioBlob,
          duration: ttsResult.duration,
          fileSize: ttsResult.audioBlob.length,
          format: 'mp3'
        }
      });

      // Store word timings as audio segment
      if (ttsResult.wordTimings) {
        await prisma.audioSegment.create({
          data: {
            bookId,
            audioId: audioRecord.id,
            chunkId: chunk.id,
            startTime: 0,
            endTime: ttsResult.duration,
            wordTimings: JSON.stringify(ttsResult.wordTimings)
          }
        });
      }

      console.log(`✅ TTS generated: ${bookId} ${cefrLevel} chunk ${chunkIndex} (${ttsResult.duration.toFixed(1)}s)`);

    } catch (error) {
      console.error(`❌ TTS generation failed: ${bookId} ${cefrLevel} chunk ${chunkIndex}:`, error);
      throw error;
    }
  }

  // Queue TTS jobs for a book at specific CEFR level
  async queueTTSJobs(
    bookId: string, 
    cefrLevel: string,
    voiceService: 'openai' | 'elevenlabs' = 'openai',
    priority: 'high' | 'normal' | 'background' = 'normal'
  ): Promise<void> {
    const bookContent = await prisma.bookContent.findUnique({
      where: { bookId }
    });

    if (!bookContent) {
      throw new Error(`Book content not found: ${bookId}`);
    }

    for (let chunkIndex = 0; chunkIndex < bookContent.totalChunks; chunkIndex++) {
      // Check if TTS job already exists
      const existing = await prisma.precomputeQueue.findUnique({
        where: {
          bookId_cefrLevel_chunkIndex_taskType: {
            bookId,
            cefrLevel,
            chunkIndex,
            taskType: 'audio'
          }
        }
      });

      if (!existing) {
        await prisma.precomputeQueue.create({
          data: {
            bookId,
            cefrLevel,
            chunkIndex,
            priority,
            taskType: 'audio',
            status: 'pending'
          }
        });
      }
    }

    console.log(`✅ Queued TTS jobs for ${bookId} ${cefrLevel} (${bookContent.totalChunks} chunks)`);
  }

  // Get audio for playback
  async getAudioForChunk(
    bookId: string,
    cefrLevel: string,
    chunkIndex: number,
    voiceId: string = 'alloy'
  ): Promise<{
    audioBlob: Buffer;
    duration: number;
    wordTimings: WordTiming[];
  } | null> {
    try {
      console.log(`🔍 Looking for precomputed audio: ${bookId} ${cefrLevel} chunk ${chunkIndex} voice ${voiceId}`);
      
      // Get the specific chunk for the requested CEFR level
      const chunk = await prisma.bookChunk.findUnique({
        where: {
          bookId_cefrLevel_chunkIndex: {
            bookId,
            cefrLevel, // use CEFR level, not 'original'
            chunkIndex
          }
        }
      });

      if (!chunk) {
        console.log(`❌ Chunk not found: ${bookId} ${cefrLevel} chunk ${chunkIndex}`);
        return null;
      }

      // Find BookAudio record for this book+voice+level combination
      const audioRecord = await prisma.bookAudio.findFirst({
        where: {
          bookId,
          cefrLevel,
          voiceId
        }
      });

      if (!audioRecord) {
        console.log(`❌ BookAudio not found: ${bookId} voice ${voiceId}`);
        return null;
      }

      // Find the specific audio segment for this chunk
      const audioSegment = await prisma.audioSegment.findFirst({
        where: {
          audioId: audioRecord.id,
          chunkId: chunk.id
        }
      });

      if (!audioSegment) {
        console.log(`❌ AudioSegment not found for chunk ${chunkIndex}`);
        return null;
      }

      console.log(`✅ Found precomputed audio segment: ${audioSegment.endTime}s duration`);

      // Check if we have the audio blob stored
      if (audioSegment.audioBlob) {
        console.log(`🎵 Using precomputed audio blob: ${(audioSegment.audioBlob.length/1024).toFixed(1)}KB`);
        
        const storedTimings = JSON.parse(audioSegment.wordTimings as string);
        
        return {
          audioBlob: Buffer.from(audioSegment.audioBlob),
          duration: audioSegment.endTime,
          wordTimings: storedTimings || []
        };
      } else {
        console.log(`⚠️ Audio segment exists but no blob stored, falling back to generation`);
        return null; // This will trigger fallback
      }
      
    } catch (error) {
      console.error('Error fetching precomputed audio:', error);
      return null;
    }
  }
}