import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    await prisma.precomputeQueue.deleteMany({ where: { status: 'failed' } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('clear failed error', error);
    return NextResponse.json({ error: 'Failed to clear failed' }, { status: 500 });
  }
}


