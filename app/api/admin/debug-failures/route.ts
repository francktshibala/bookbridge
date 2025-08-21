import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const failedJobs = await prisma.precomputeQueue.findMany({
      where: {
        status: 'failed',
        cefrLevel: { in: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] }
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        bookId: true,
        cefrLevel: true,
        chunkIndex: true,
        status: true,
        attempts: true,
        lastError: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ failedJobs });
  } catch (error) {
    console.error('Debug failures error:', error);
    return NextResponse.json({ error: 'Failed to fetch failures' }, { status: 500 });
  }
}