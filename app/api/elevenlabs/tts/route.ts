import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'EXAVITQu4vr4xnSDxMaL', speed = 1.0 } = await request.json();
    
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }
    
    console.log('Using ElevenLabs voice:', voice);
    console.log('API Key exists:', !!process.env.ELEVENLABS_API_KEY);
    console.log('API Key length:', process.env.ELEVENLABS_API_KEY?.length);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      
      // Check for specific permission error
      if (errorText.includes('missing_permissions')) {
        throw new Error('ElevenLabs API key missing text_to_speech permission. Please check your API key settings at https://elevenlabs.io/');
      }
      
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}