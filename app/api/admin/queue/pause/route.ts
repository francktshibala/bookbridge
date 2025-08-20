import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    await prisma.precomputeQueue.update({ where: { id: jobId }, data: { status: 'pending' } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('pause error', error);
    return NextResponse.json({ error: 'Failed to pause' }, { status: 500 });
  }
}


