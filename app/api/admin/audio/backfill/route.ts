import { NextRequest, NextResponse } from 'next/server';
import { BookProcessor } from '@/lib/precompute/book-processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const bookId: string | undefined = body?.bookId;
    const levels: string[] | undefined = body?.levels;

    // If no bookId provided, run global BookProcessor backfill
    if (!bookId) {
      const processor = BookProcessor.getInstance();
      const result = await processor.generateAudioForExistingChunks();
      return NextResponse.json({ success: true, ...result });
    }

    // Use BookProcessor for scoped backfill (with or without levels filter)
    const processor = BookProcessor.getInstance();
    const result = await processor.generateAudioForExistingChunks(bookId, levels);
    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    console.error('Audio backfill error:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}