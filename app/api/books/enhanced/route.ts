import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Default metadata for genres based on book titles
const GENRE_MAPPINGS: Record<string, { genre: string; cefrLevels: string; estimatedHours: number }> = {
  'Pride and Prejudice': { genre: 'Romance', cefrLevels: 'B1-C2', estimatedHours: 8 },
  'Romeo and Juliet': { genre: 'Tragedy', cefrLevels: 'B1-C2', estimatedHours: 3 },
  'Alice': { genre: 'Fantasy', cefrLevels: 'A2-C1', estimatedHours: 2.5 },
  'Frankenstein': { genre: 'Gothic', cefrLevels: 'B2-C2', estimatedHours: 6 },
  'Little Women': { genre: 'Coming of Age', cefrLevels: 'A2-B2', estimatedHours: 10 },
  'Christmas Carol': { genre: 'Classic', cefrLevels: 'B1-C1', estimatedHours: 2 },
  'Great Gatsby': { genre: 'American Classic', cefrLevels: 'B2-C2', estimatedHours: 4 },
  'Emma': { genre: 'Romance', cefrLevels: 'B2-C2', estimatedHours: 9 },
  'Treasure Island': { genre: 'Adventure', cefrLevels: 'B1-C1', estimatedHours: 6 },
  'Peter Pan': { genre: 'Fantasy', cefrLevels: 'A2-B2', estimatedHours: 4 },
  'Wizard of Oz': { genre: 'Fantasy', cefrLevels: 'A2-B1', estimatedHours: 3 },
  'Call of the Wild': { genre: 'Adventure', cefrLevels: 'B1-C2', estimatedHours: 3 },
  'Jungle Book': { genre: 'Adventure', cefrLevels: 'A2-B2', estimatedHours: 4 },
  'Moby Dick': { genre: 'Adventure', cefrLevels: 'C1-C2', estimatedHours: 12 },
  'Sherlock Holmes': { genre: 'Mystery', cefrLevels: 'B2-C2', estimatedHours: 8 }
};

export async function GET() {
  try {
    // Get all books with simplifications
    const books = await prisma.bookContent.findMany({
      where: {
        simplifications: {
          some: {} // Has at least one simplification
        }
      },
      include: {
        simplifications: {
          select: {
            level: true
          },
          distinct: ['level']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform books into enhanced format
    const enhancedBooks = books.map(book => {
      // Find matching metadata
      let metadata = { genre: 'Classic', cefrLevels: 'B1-C2', estimatedHours: 5 };
      for (const [keyword, data] of Object.entries(GENRE_MAPPINGS)) {
        if (book.title.includes(keyword)) {
          metadata = data;
          break;
        }
      }

      // Determine status based on simplification count
      const simplificationCount = book.simplifications.length;
      let status: 'enhanced' | 'processing' | 'planned' = 'enhanced';
      
      if (simplificationCount === 0) {
        status = 'planned';
      } else if (simplificationCount < 3) {
        status = 'processing';
      }

      return {
        id: book.bookId,
        title: book.title,
        author: book.author,
        description: `Enhanced ESL edition with ${simplificationCount} difficulty levels available`,
        genre: metadata.genre,
        cefrLevels: metadata.cefrLevels,
        estimatedHours: metadata.estimatedHours,
        totalChunks: book.chunks?.length || 0,
        status,
        simplificationCount,
        availableLevels: book.simplifications.map(s => s.level).sort()
      };
    });

    return NextResponse.json({
      books: enhancedBooks,
      total: enhancedBooks.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching enhanced books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enhanced books' },
      { status: 500 }
    );
  }
}