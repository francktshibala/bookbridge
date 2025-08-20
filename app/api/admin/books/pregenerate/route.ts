import { NextRequest, NextResponse } from 'next/server';
import { BookProcessor } from '@/lib/precompute/book-processor';

export async function POST(request: NextRequest) {
  try {
    const { bookId, priority = 'high', task = 'simplification' } = await request.json();
    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }

    const processor = BookProcessor.getInstance();

    // Ensure book content exists then queue jobs
    await processor.storeBookContent(bookId);
    if (task === 'simplification' || task === 'both') {
      await processor.queueSimplificationJobs(bookId, priority);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('pregenerate error', error);
    return NextResponse.json({ error: 'Failed to queue pre-generation' }, { status: 500 });
  }
}


