import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Only provide the API key if it exists
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ apiKey });
  } catch (error) {
    console.error('Error getting ElevenLabs API key:', error);
    return NextResponse.json(
      { error: 'Failed to get API key' },
      { status: 500 }
    );
  }
}