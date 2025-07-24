import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { text, voice = 'alloy', speed = 1.0 } = await request.json();
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    console.log('OpenAI TTS request:', {
      voice,
      textLength: text.length,
      speed,
      timestamp: new Date().toISOString()
    });

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      speed: speed,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    
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
    
    return NextResponse.json({ 
      error: 'Failed to generate speech',
      details: error.message 
    }, { status: 500 });
  }
}