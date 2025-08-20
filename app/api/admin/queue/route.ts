import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Only show CEFR levels A1–C2 (exclude 'original')
    const jobs = await prisma.precomputeQueue.findMany({
      where: {
        cefrLevel: {
          in: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
        }
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200
    });

    return NextResponse.json({ jobs, isProcessing: true });
  } catch (error) {
    console.error('queue list error', error);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }
}


