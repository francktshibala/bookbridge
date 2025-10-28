export const runtime = 'nodejs';
export const revalidate = 3600;

import { NextRequest, NextResponse } from 'next/server';
import { BOOK_API_MAPPINGS, MULTI_LEVEL_BOOKS, SINGLE_LEVEL_BOOKS } from '@/lib/config/books';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');
    const level = searchParams.get('level');

    if (!bookId || !level) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'bookId and level are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    // Single-level books: only configured level is available
    if (SINGLE_LEVEL_BOOKS[bookId]) {
      const available = SINGLE_LEVEL_BOOKS[bookId] === level;
      return new NextResponse(
        JSON.stringify({ success: true, available }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
      );
    }

    // Multi-level: available if configured mapping exists
    const levels = MULTI_LEVEL_BOOKS[bookId];
    const available = Array.isArray(levels) ? levels.includes(level) : false;

    // If configured mapping exists (endpoint present), mark available.
    // This is a lightweight metadata check; heavy verification occurs on actual load.
    return new NextResponse(
      JSON.stringify({ success: true, available }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );

  } catch (error) {
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  }
}


