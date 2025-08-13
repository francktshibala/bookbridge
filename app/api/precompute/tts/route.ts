import { NextRequest, NextResponse } from 'next/server';
import { TTSProcessor } from '../../../../lib/tts/tts-processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, cefrLevel, voiceService = 'openai', voiceId = 'alloy' } = body;

    if (!bookId || !cefrLevel) {
      return NextResponse.json(
        { error: 'bookId and cefrLevel are required' },
        { status: 400 }
      );
    }

    const ttsProcessor = TTSProcessor.getInstance();
    
    console.log(`🎵 Starting TTS generation for ${bookId} ${cefrLevel}...`);
    await ttsProcessor.queueTTSJobs(bookId, cefrLevel, voiceService);
    
    return NextResponse.json({
      success: true,
      message: `TTS jobs queued for ${bookId} ${cefrLevel}`,
      voiceService,
      voiceId
    });

  } catch (error) {
    console.error('❌ TTS queueing failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const cefrLevel = searchParams.get('cefrLevel');
    const chunkIndex = parseInt(searchParams.get('chunkIndex') || '0');
    const voiceId = searchParams.get('voiceId') || 'alloy';

    if (!bookId || !cefrLevel) {
      return NextResponse.json(
        { error: 'bookId and cefrLevel are required' },
        { status: 400 }
      );
    }

    const ttsProcessor = TTSProcessor.getInstance();
    const audioData = await ttsProcessor.getAudioForChunk(
      bookId,
      cefrLevel,
      chunkIndex,
      voiceId
    );

    if (!audioData) {
      return NextResponse.json(
        { error: 'Audio not found' },
        { status: 404 }
      );
    }

    // Return audio blob as response
    return new Response(audioData.audioBlob, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.audioBlob.length.toString(),
        'X-Duration': audioData.duration.toString(),
        'X-Word-Timings': JSON.stringify(audioData.wordTimings)
      }
    });

  } catch (error) {
    console.error('❌ Audio fetch failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}