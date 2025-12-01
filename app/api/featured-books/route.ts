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
    themes: { name: string; count: number }[];
    moods: { name: string; count: number }[];
    readingTimes: { range: string; count: number }[];
  };
}

// Cache configuration (GPT-5 recommendation: explicit tags for invalidation)
export const revalidate = 300; // 5 minutes
export const dynamic = 'force-dynamic'; // Always run fresh (can be 'auto' if caching works)

export async function GET(request: NextRequest): Promise<NextResponse<CatalogResponse>> {
  const searchParams = request.nextUrl.searchParams;

  // Cursor-based pagination (GPT-5 recommendation)
  const cursor = searchParams.get('cursor'); // Base64 encoded cursor
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Cap at 50

  // Filters
  const collectionId = searchParams.get('collection');
  const genres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
  const themes = searchParams.get('themes')?.split(',').filter(Boolean) || [];
  const moods = searchParams.get('moods')?.split(',').filter(Boolean) || [];
  const region = searchParams.get('region');
  const readingTimeMax = searchParams.get('readingTimeMax');
  const search = searchParams.get('q');
  const sortBy = searchParams.get('sort') || 'popularityScore';

  // Build where clause
  // If filtering by collection OR searching, show all books (classic + modern)
  // Otherwise default to classics only for backwards compatibility
  const where: any = (collectionId || search) ? {} : { isClassic: true };

  if (collectionId) {
    where.collections = { some: { collectionId } };
  }

  if (genres.length > 0) {
    where.genres = { hasSome: genres };
  }

  if (themes.length > 0) {
    where.themes = { hasSome: themes };
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

    // Compute facets for filters (GPT-5: only from visible result set)
    const facets = computeFacetsFromBooks(books);

    // Generate cache tag for invalidation (GPT-5 recommendation)
    const cacheTag = collectionId
      ? `catalog:collection:${collectionId}`
      : 'catalog:search';

    return NextResponse.json({
      items: books,
      nextCursor: hasNext ? nextCursor : null, // Only include if more exists (GPT-5)
      totalApprox,
      facets
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
        'X-Cache-Tag': cacheTag
      }
    });
  } catch (error) {
    console.error('Error fetching featured books:', error);
    return NextResponse.json(
      {
        items: [],
        nextCursor: null,
        totalApprox: 0,
        facets: { genres: [], themes: [], moods: [], readingTimes: [] }
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

// Helper: Compute filter facet counts from visible books (GPT-5: no extra query)
function computeFacetsFromBooks(books: FeaturedBook[]) {
  // Fast path for empty results (GPT-5 recommendation)
  if (books.length === 0) {
      return {
        genres: [],
        themes: [],
        moods: [],
        readingTimes: []
      };
  }

  const genreCounts = new Map<string, number>();
  const themeCounts = new Map<string, number>();
  const moodCounts = new Map<string, number>();
  const timeCounts = { quick: 0, short: 0, deep: 0 };

  books.forEach(book => {
    // Count genres
    book.genres.forEach(genre => {
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    });

    // Count themes
    book.themes.forEach(theme => {
      themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    });

    // Count moods
    book.moods.forEach(mood => {
      moodCounts.set(mood, (moodCounts.get(mood) || 0) + 1);
    });

    // Count reading times
    if (book.readingTimeMinutes < 15) timeCounts.quick++;
    if (book.readingTimeMinutes < 45) timeCounts.short++;
    if (book.readingTimeMinutes < 120) timeCounts.deep++;
  });

  return {
    genres: Array.from(genreCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20), // Limit to top 20 (GPT-5: avoid huge facet lists)
    themes: Array.from(themeCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    moods: Array.from(moodCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    readingTimes: [
      { range: '< 15 min', count: timeCounts.quick },
      { range: '< 45 min', count: timeCounts.short },
      { range: '< 2 hours', count: timeCounts.deep }
    ]
  };
}
