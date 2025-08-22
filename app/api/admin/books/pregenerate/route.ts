import { NextRequest, NextResponse } from 'next/server';
import { BookProcessor } from '@/lib/precompute/book-processor';

export async function POST(request: NextRequest) {
  try {
    const { bookId, task = 'audio', levels } = await request.json();
    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }

    // Audio-only pathway: delegate to audio backfill behavior and reject simplification
    if (task !== 'audio') {
      return NextResponse.json({
        error: 'Only audio generation is supported from admin. Use task="audio" or call /api/admin/audio/backfill.'
      }, { status: 400 });
    }

    const processor = BookProcessor.getInstance();
    // Generate audio for existing simplified chunks for this book (and optional levels)
    const result = await processor.generateAudioForExistingChunks({ bookId, levels });

    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    console.error('pregenerate error', error);
    return NextResponse.json({ error: 'Failed to trigger audio generation' }, { status: 500 });
  }
}


