import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        success: false 
      }, { status: 500 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const originalText = formData.get('text') as string;
    
    if (!audioFile || !originalText) {
      return NextResponse.json({
        error: 'Audio file and text are required',
        success: false
      }, { status: 400 });
    }

    console.log('🎯 Starting Whisper alignment for audio with text:', originalText.substring(0, 100) + '...');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Use Whisper API with word-level timestamps
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
      language: 'en' // Specify language for better performance
    });

    const processingTime = Date.now() - startTime;
    console.log(`🎯 Whisper transcription completed in ${processingTime}ms`);

    // Extract word timestamps from Whisper response
    const wordTimestamps: WordTimestamp[] = [];
    
    if (transcription.words && Array.isArray(transcription.words)) {
      transcription.words.forEach((wordData: any) => {
        wordTimestamps.push({
          word: wordData.word.trim(),
          start: wordData.start,
          end: wordData.end,
          confidence: 1.0 // Whisper doesn't provide confidence, assume high
        });
      });
    }

    // Align Whisper words with original text words
    const alignedWords = alignWordsWithOriginalText(wordTimestamps, originalText);
    
    const duration = wordTimestamps.length > 0 
      ? wordTimestamps[wordTimestamps.length - 1].end 
      : 0;

    console.log(`🎯 Alignment successful: ${alignedWords.length} words aligned, ${duration.toFixed(1)}s duration`);
    
    const result: WhisperAlignmentResult = {
      words: alignedWords,
      duration,
      success: true
    };

    return NextResponse.json(result, {
      headers: {
        'X-Processing-Time': processingTime.toString(),
      },
    });

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`🎯 Whisper alignment failed after ${processingTime}ms:`, error);
    
    const result: WhisperAlignmentResult = {
      words: [],
      duration: 0,
      success: false,
      error: error.message || 'Unknown error during alignment'
    };

    return NextResponse.json(result, { status: 500 });
  }
}

/**
 * Aligns Whisper transcribed words with the original text
 * Handles cases where Whisper might have slight transcription differences
 */
function alignWordsWithOriginalText(
  whisperWords: WordTimestamp[], 
  originalText: string
): WordTimestamp[] {
  // Split original text into words (same as in the highlighting component)
  const originalWords = originalText
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word.trim());

  console.log(`🎯 Aligning ${whisperWords.length} Whisper words with ${originalWords.length} original words`);

  // If counts match perfectly, use direct mapping
  if (whisperWords.length === originalWords.length) {
    return whisperWords.map((whisperWord, index) => ({
      ...whisperWord,
      word: originalWords[index] // Use original word for exact matching
    }));
  }

  // If counts don't match, use smart alignment
  const aligned: WordTimestamp[] = [];
  let whisperIndex = 0;
  let originalIndex = 0;

  while (originalIndex < originalWords.length && whisperIndex < whisperWords.length) {
    const originalWord = originalWords[originalIndex].toLowerCase().replace(/[^\w]/g, '');
    const whisperWord = whisperWords[whisperIndex].word.toLowerCase().replace(/[^\w]/g, '');

    if (originalWord === whisperWord) {
      // Perfect match
      aligned.push({
        ...whisperWords[whisperIndex],
        word: originalWords[originalIndex]
      });
      originalIndex++;
      whisperIndex++;
    } else if (originalWord.includes(whisperWord) || whisperWord.includes(originalWord)) {
      // Partial match (handles contractions, punctuation differences)
      aligned.push({
        ...whisperWords[whisperIndex],
        word: originalWords[originalIndex]
      });
      originalIndex++;
      whisperIndex++;
    } else {
      // No match - advance the shorter word
      if (originalWord.length < whisperWord.length) {
        // Skip original word, estimate timing
        const prevTime = aligned.length > 0 ? aligned[aligned.length - 1].end : 0;
        const nextTime = whisperIndex < whisperWords.length ? whisperWords[whisperIndex].start : prevTime + 0.5;
        
        aligned.push({
          word: originalWords[originalIndex],
          start: prevTime,
          end: nextTime,
          confidence: 0.5 // Lower confidence for estimated timing
        });
        originalIndex++;
      } else {
        // Skip whisper word
        whisperIndex++;
      }
    }
  }

  // Handle remaining original words
  while (originalIndex < originalWords.length) {
    const prevTime = aligned.length > 0 ? aligned[aligned.length - 1].end : 0;
    aligned.push({
      word: originalWords[originalIndex],
      start: prevTime,
      end: prevTime + 0.5, // Estimate 0.5s per word
      confidence: 0.3
    });
    originalIndex++;
  }

  console.log(`🎯 Alignment complete: ${aligned.length} words aligned`);
  return aligned;
}