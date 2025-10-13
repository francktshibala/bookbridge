import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// GET /api/reading-position/recent - Get user's recently read books
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get recent reading positions
    const recentPositions = await prisma.readingPosition.findMany({
      where: {
        userId: user.id,
        currentSentenceIndex: {
          gt: 0 // Only include books where user has actually read something
        }
      },
      orderBy: {
        lastReadAt: 'desc'
      },
      take: limit,
      select: {
        bookId: true,
        currentSentenceIndex: true,
        currentBundleIndex: true,
        cefrLevel: true,
        playbackSpeed: true,
        contentMode: true,
        lastReadAt: true
      }
    });

    // Enrich with book metadata (you'll need to adapt this based on your book storage)
    const enrichedPositions = await Promise.all(
      recentPositions.map(async (position) => {
        // For featured books, we can use static metadata
        const featuredBooks = {
          'sleepy-hollow-enhanced': {
            title: 'The Legend of Sleepy Hollow',
            author: 'Washington Irving',
            totalSentences: 325
          },
          'great-gatsby-a2': {
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            totalSentences: 3605
          }
        };

        const bookMeta = featuredBooks[position.bookId as keyof typeof featuredBooks];

        return {
          ...position,
          bookTitle: bookMeta?.title || 'Unknown Book',
          bookAuthor: bookMeta?.author || 'Unknown Author',
          totalSentences: bookMeta?.totalSentences || 0,
          progressText: `Sentence ${position.currentSentenceIndex + 1}${bookMeta?.totalSentences ? ` of ${bookMeta.totalSentences}` : ''}`,
          readingTimeMinutes: 0 // TODO: Calculate from session data if needed
        };
      })
    );

    return NextResponse.json({
      success: true,
      recentBooks: enrichedPositions
    });

  } catch (error) {
    console.error('Error fetching recent reading positions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent books' },
      { status: 500 }
    );
  }
}