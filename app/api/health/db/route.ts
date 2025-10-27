export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Simple health check query
    await prisma.$queryRaw`SELECT 1 as ok`;

    return NextResponse.json({
      status: 'healthy',
      ok: true,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
