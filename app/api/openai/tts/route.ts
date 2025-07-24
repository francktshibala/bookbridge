import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { text, voice = 'alloy', speed = 1.0 } = await request.json();
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Limit text length for faster processing
    const truncatedText = text.substring(0, 500);
    
    console.log('OpenAI TTS request:', {
      voice,
      textLength: truncatedText.length,
      speed,
      timestamp: new Date().toISOString()
    });

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
    });

    // Race between API call and timeout
    const mp3 = await Promise.race([
      openai.audio.speech.create({
        model: 'tts-1',
        voice: voice as any, // alloy, echo, fable, onyx, nova, shimmer
        input: truncatedText,
        speed: speed,
      }),
      timeoutPromise
    ]);

    const buffer = Buffer.from(await (mp3 as any).arrayBuffer());
    
    const processingTime = Date.now() - startTime;
    console.log(`OpenAI TTS completed in ${processingTime}ms`);
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
        'X-Processing-Time': processingTime.toString(),
      },
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('OpenAI TTS error:', error);
    console.error(`Failed after ${processingTime}ms`);
    
    if (error.message === 'Request timeout') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 504 });
    }
    
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}