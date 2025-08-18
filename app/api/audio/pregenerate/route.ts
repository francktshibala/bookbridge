import { NextRequest, NextResponse } from 'next/server';
import { audioPreGenerationService } from '@/lib/audio-pregeneration-service';

/**
 * POST /api/audio/pregenerate
 * Initialize pre-generation for a book
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, totalChunks } = body;

    if (!bookId || !totalChunks) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, totalChunks' },
        { status: 400 }
      );
    }

    console.log(`🚀 Starting pre-generation for ${bookId} with ${totalChunks} chunks`);

    // Initialize pre-generation
    await audioPreGenerationService.initializeBookPreGeneration(bookId, totalChunks);

    // Start processing queue
    setTimeout(() => {
      audioPreGenerationService.processQueue();
    }, 1000);

    return NextResponse.json({
      success: true,
      message: `Pre-generation initialized for ${bookId}`,
      bookId,
      totalChunks,
      estimatedTime: `${Math.ceil(totalChunks * 36 / 60)} minutes`, // ~36 combinations per chunk
      status: 'Processing will begin in background'
    });

  } catch (error) {
    console.error('Pre-generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to initialize pre-generation',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audio/pregenerate/status
 * Get pre-generation status for a book
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json(
        { error: 'Missing bookId parameter' },
        { status: 400 }
      );
    }

    // TODO: Implement status check
    return NextResponse.json({
      bookId,
      status: 'pending',
      progress: 0,
      message: 'Status check not yet implemented'
    });

  } catch (error) {
    console.error('Status check error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}