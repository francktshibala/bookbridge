import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { text, voice = 'EXAVITQu4vr4xnSDxMaL', speed = 1.0 } = await request.json();
    
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('ElevenLabs API key not configured');
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }
    
    console.log('ElevenLabs TTS request:', {
      voice,
      textLength: text.length,
      speed,
      timestamp: new Date().toISOString()
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for production

    // Use full text for better user experience
    const truncatedText = text;
    
    let audioBuffer: ArrayBuffer;
    
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: truncatedText,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, errorText);
        
        // Check for specific permission error
        if (errorText.includes('missing_permissions')) {
          throw new Error('ElevenLabs API key missing text_to_speech permission. Please check your API key settings at https://elevenlabs.io/');
        }
        
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      audioBuffer = await response.arrayBuffer();
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`ElevenLabs TTS completed in ${processingTime}ms`);
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
        'X-Processing-Time': processingTime.toString(),
      },
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error('ElevenLabs TTS error:', error);
    console.error(`Failed after ${processingTime}ms`);
    
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 504 });
    }
    
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
  }
}