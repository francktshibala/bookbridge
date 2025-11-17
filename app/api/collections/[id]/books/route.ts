import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Cache for 5 minutes
export const revalidate = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: collectionId } = await params;
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const skip = (page - 1) * limit;

  try {
    const [memberships, total] = await Promise.all([
      prisma.bookCollectionMembership.findMany({
        where: {
          collectionId
        },
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        include: {
          featuredBook: {
            include: {
              collections: {
                include: { collection: true }
              }
            }
          }
        }
      }),
      prisma.bookCollectionMembership.count({
        where: { collectionId }
      })
    ]);

    const books = memberships.map(m => m.featuredBook);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      books,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Error fetching collection books:', error);
    return NextResponse.json(
      {
        books: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        error: 'Failed to fetch collection books'
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}
