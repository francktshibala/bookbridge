import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get counts by status
    const allowedLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as string[];
    const baseWhere = {
      taskType: 'audio',
      cefrLevel: { in: allowedLevels }
    } as const;

    const [pending, processing, completed, failed] = await Promise.all([
      prisma.precomputeQueue.count({ where: { ...baseWhere, status: 'pending' } }),
      prisma.precomputeQueue.count({ where: { ...baseWhere, status: 'processing' } }),
      prisma.precomputeQueue.count({ where: { ...baseWhere, status: 'completed' } }),
      prisma.precomputeQueue.count({ where: { ...baseWhere, status: 'failed' } })
    ]);

    // Get recent jobs with proper mapping
    const jobs = await prisma.precomputeQueue.findMany({
      where: {
        taskType: 'audio',
        cefrLevel: { in: allowedLevels }
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200
    });

    // Map to include proper fields for UI
    const mappedJobs = jobs.map(job => ({
      id: job.id,
      bookId: job.bookId,
      bookTitle: job.bookId, // We'll need to enhance this with actual titles later
      cefrLevel: job.cefrLevel,
      chunkIndex: job.chunkIndex,
      status: job.status,
      progress: job.status === 'completed' ? 100 : job.status === 'processing' ? 50 : 0,
      createdAt: job.createdAt,
      attempts: job.attempts,
      lastError: job.lastError
    }));

    return NextResponse.json({ 
      jobs: mappedJobs, 
      isProcessing: processing > 0,
      stats: {
        pending,
        processing,
        completed,
        failed,
        total: pending + processing + completed + failed
      }
    });
  } catch (error) {
    console.error('queue list error', error);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }
}


