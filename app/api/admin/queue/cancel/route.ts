import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    await prisma.precomputeQueue.delete({ where: { id: jobId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('cancel error', error);
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }
}


