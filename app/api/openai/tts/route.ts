import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { text, voice = 'alloy', speed = 1.0 } = body;
    
    // Validate required fields
    if (!text || typeof text !== 'string') {
      console.error('Invalid text parameter:', text);
      return NextResponse.json({ error: 'Text parameter is required and must be a string' }, { status: 400 });
    }
    
    // Validate text length (OpenAI has a 4096 character limit)
    if (text.length > 4000) {
      console.error('Text too long:', text.length, 'characters');
      return NextResponse.json({ error: 'Text must be less than 4000 characters' }, { status: 400 });
    }
    
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
    
    // Handle specific OpenAI errors
    if (error?.status === 429) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.',
        details: 'OpenAI API rate limit reached' 
      }, { status: 429 });
    }
    
    if (error?.status === 401) {
      return NextResponse.json({ 
        error: 'API authentication failed',
        details: 'Invalid OpenAI API key' 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate speech',
      details: error.message || 'Unknown error occurred',
      status: error?.status || 500
    }, { status: 500 });
  }
}