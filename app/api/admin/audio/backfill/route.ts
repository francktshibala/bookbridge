import { NextRequest, NextResponse } from 'next/server';
import { BookProcessor } from '@/lib/precompute/book-processor';

export async function POST(request: NextRequest) {
  try {
    const processor = BookProcessor.getInstance();
    
    const result = await processor.generateAudioForExistingChunks();
    
    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Audio backfill error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio for existing chunks' }, 
      { status: 500 }
    );
  }
}