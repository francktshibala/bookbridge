import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Environment info
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      SUPABASE_URL_EXISTS: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SERVICE_ROLE_EXISTS: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }

    // Database connection test
    let connectionTest: unknown = null
    try {
      connectionTest = await prisma.$executeRaw`SELECT 1 as test`
    } catch (e) {
      connectionTest = { error: e instanceof Error ? e.message : 'Unknown error' }
    }

    // Query all BookContent IDs and titles
    let contentIds: Array<{ bookId: string; title: string }> = []
    let simplificationIds: string[] = []

    try {
      const results = await prisma.bookContent.findMany({
        select: { bookId: true, title: true },
        orderBy: { bookId: 'asc' }
      })
      contentIds = results.map(r => ({ bookId: r.bookId, title: r.title }))
    } catch (e) {
      contentIds = []
    }

    try {
      const simplResults = await prisma.bookSimplification.findMany({
        select: { bookId: true },
        distinct: ['bookId'],
        orderBy: { bookId: 'asc' }
      })
      simplificationIds = simplResults.map(r => r.bookId)
    } catch (e) {
      simplificationIds = []
    }

    return NextResponse.json({
      envInfo,
      connectionTest,
      counts: {
        bookContent: contentIds.length,
        bookSimplification: simplificationIds.length
      },
      bookContentIds: contentIds,
      simplificationBookIds: simplificationIds
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch debug book IDs',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


