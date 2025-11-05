import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Cache for 5 minutes
export const revalidate = 300;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

  if (!query || query.length < 2) {
    return NextResponse.json({ books: [] });
  }

  try {
    const books = await prisma.featuredBook.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { author: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { genres: { hasSome: [query] } },
          { themes: { hasSome: [query] } }
        ]
      },
      take: limit,
      orderBy: { popularityScore: 'desc' }
    });

    return NextResponse.json({ books }, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' // 5 min cache
      }
    });
  } catch (error) {
    console.error('Error searching books:', error);
    return NextResponse.json(
      { books: [], error: 'Failed to search books' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}
