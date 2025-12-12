import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Cache for 1 hour (collections change infrequently)
// Temporarily set to 0 to force refresh after reorganization
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type'); // Optional filter by type

  const where: any = {
    isPrimary: true // Only show primary collections (excludes archived)
  };
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
          select: {
            books: true
          }
        }
      }
    });

    return NextResponse.json({ collections }, {
      headers: {
        'Cache-Control': 's-maxage=0, stale-while-revalidate=0' // Temporarily disable cache
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
