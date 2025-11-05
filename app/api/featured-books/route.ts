import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { FeaturedBook } from '@prisma/client';

// Standardized response shape (GPT-5 recommendation)
interface CatalogResponse {
  items: FeaturedBook[];
  nextCursor: string | null;
  totalApprox?: number;
  facets?: {
    genres: { name: string; count: number }[];
    moods: { name: string; count: number }[];
    readingTimes: { range: string; count: number }[];
  };
}

// Cache for 5 minutes (GPT-5 recommendation)
export const revalidate = 300;

export async function GET(request: NextRequest): Promise<NextResponse<CatalogResponse>> {
  const searchParams = request.nextUrl.searchParams;

  // Cursor-based pagination (GPT-5 recommendation)
  const cursor = searchParams.get('cursor'); // Base64 encoded cursor
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Cap at 50

  // Filters
  const collectionId = searchParams.get('collection');
  const genres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
  const moods = searchParams.get('moods')?.split(',').filter(Boolean) || [];
  const region = searchParams.get('region');
  const readingTimeMax = searchParams.get('readingTimeMax');
  const search = searchParams.get('q');
  const sortBy = searchParams.get('sort') || 'popularityScore';

  // Build where clause
  const where: any = { isClassic: true };

  if (collectionId) {
    where.collections = { some: { collectionId } };
  }

  if (genres.length > 0) {
    where.genres = { hasSome: genres };
  }

  if (moods.length > 0) {
    where.moods = { hasSome: moods };
  }

  if (region) {
    where.region = region;
  }

  if (readingTimeMax) {
    where.readingTimeMinutes = { lte: parseInt(readingTimeMax) };
  }

  if (search && search.length >= 2) {
    // Use full-text search if available, otherwise fallback to contains
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { author: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Decode cursor (format: "sortValue:id")
  let cursorCondition = {};
  if (cursor) {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const [sortValue, id] = decoded.split(':');

      // Handle different sort field types
      const parsedSortValue = sortBy === 'title' || sortBy === 'author'
        ? sortValue
        : parseFloat(sortValue);

      cursorCondition = {
        OR: [
          { [sortBy]: { lt: parsedSortValue } },
          { [sortBy]: parsedSortValue, id: { gt: id } }
        ]
      };
    } catch (err) {
      console.error('Invalid cursor:', err);
    }
  }

  try {
    // Execute query with cursor pagination
    const [items, totalApprox] = await Promise.all([
      prisma.featuredBook.findMany({
        where: { ...where, ...cursorCondition },
        take: limit + 1, // Fetch one extra to determine if there's a next page
        orderBy: [
          { [sortBy]: 'desc' },
          { id: 'asc' } // Secondary sort for stable pagination
        ],
        include: {
          collections: {
            include: { collection: true }
          }
        }
      }),
      prisma.featuredBook.count({ where }) // Approximate count
    ]);

    // Determine next cursor
    const hasNext = items.length > limit;
    const books = hasNext ? items.slice(0, limit) : items;

    const nextCursor = hasNext && books.length > 0
      ? Buffer.from(`${books[books.length - 1][sortBy as keyof FeaturedBook]}:${books[books.length - 1].id}`).toString('base64')
      : null;

    // Compute facets for filters (GPT-5 recommendation)
    const facets = await computeFacets(where);

    return NextResponse.json({
      items: books,
      nextCursor,
      totalApprox,
      facets
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Error fetching featured books:', error);
    return NextResponse.json(
      {
        items: [],
        nextCursor: null,
        totalApprox: 0,
        facets: { genres: [], moods: [], readingTimes: [] }
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

// Helper: Compute filter facet counts
async function computeFacets(baseWhere: any) {
  try {
    // Use denormalized facets field for fast aggregation
    const books = await prisma.featuredBook.findMany({
      where: baseWhere,
      select: { facets: true, readingTimeMinutes: true }
    });

    // Aggregate facet counts
    const genreCounts = new Map<string, number>();
    const moodCounts = new Map<string, number>();
    const timeCounts = { quick: 0, short: 0, deep: 0 };

    books.forEach(book => {
      if (book.facets && typeof book.facets === 'object') {
        const facets = book.facets as any;

        facets.genres?.forEach((g: string) => {
          genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
        });

        facets.moods?.forEach((m: string) => {
          moodCounts.set(m, (moodCounts.get(m) || 0) + 1);
        });
      }

      // Count reading times
      if (book.readingTimeMinutes < 15) timeCounts.quick++;
      if (book.readingTimeMinutes < 45) timeCounts.short++;
      if (book.readingTimeMinutes < 120) timeCounts.deep++;
    });

    return {
      genres: Array.from(genreCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      moods: Array.from(moodCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      readingTimes: [
        { range: '< 15 min', count: timeCounts.quick },
        { range: '< 45 min', count: timeCounts.short },
        { range: '< 2 hours', count: timeCounts.deep }
      ]
    };
  } catch (error) {
    console.error('Error computing facets:', error);
    return {
      genres: [],
      moods: [],
      readingTimes: []
    };
  }
}
