import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Cache for 1 hour (collections change infrequently)
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type'); // Optional filter by type

  const where: any = {};
  if (type) where.type = type;

  try {
    const collections = await prisma.bookCollection.findMany({
      where,
      orderBy: [
        { isPrimary: 'desc' },
        { sortOrder: 'asc' }
      ],
      include: {
        books: {
          take: 10, // Preview books
          include: {
            featuredBook: true
          },
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: { books: true }
        }
      }
    });

    return NextResponse.json({ collections }, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { collections: [], error: 'Failed to fetch collections' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}
