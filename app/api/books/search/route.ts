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
    // Cap query length (GPT-5: avoid slow plans)
    const sanitizedQuery = query.slice(0, 100);

    // Use PostgreSQL full-text search if available (GPT-5: with scoring)
    const books = await prisma.$queryRaw<any[]>`
      SELECT
        id, slug, title, author, description,
        sentences, bundles, gradient, abbreviation,
        genres, themes, moods, region, country,
        literary_movement, publication_year, era,
        reading_time_minutes, difficulty_score, popularity_score,
        is_classic, is_featured, is_new,
        total_reads, completion_rate, average_rating,
        facets, created_at, updated_at,
        ts_rank(search_vector, plainto_tsquery('english', ${sanitizedQuery})) as rank
      FROM "public"."featured_books"
      WHERE search_vector @@ plainto_tsquery('english', ${sanitizedQuery})
         OR title ILIKE ${'%' + sanitizedQuery + '%'}
         OR author ILIKE ${'%' + sanitizedQuery + '%'}
      ORDER BY
        rank DESC,           -- Primary: relevance score
        popularity_score DESC, -- Secondary: popularity
        created_at DESC      -- Tertiary: recency (tie-breaker, GPT-5)
      LIMIT ${limit}
    `;

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
