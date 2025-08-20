import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const result = await prisma.precomputeQueue.deleteMany({ where: { cefrLevel: 'original' } });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error('purge original error', error);
    return NextResponse.json({ error: 'Failed to purge original jobs' }, { status: 500 });
  }
}


