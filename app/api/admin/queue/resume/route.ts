import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BookProcessor } from '@/lib/precompute/book-processor';

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();
    if (jobId) {
      await prisma.precomputeQueue.update({ where: { id: jobId }, data: { status: 'pending' } });
    }
    // Kick the processor to work pending jobs
    const processor = BookProcessor.getInstance();
    await processor.processQueue();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('resume error', error);
    return NextResponse.json({ error: 'Failed to resume' }, { status: 500 });
  }
}


