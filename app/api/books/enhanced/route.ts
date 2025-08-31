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
  'Sherlock Holmes': { genre: 'Mystery', cefrLevels: 'B2-C2', estimatedHours: 8 },
  'Dr. Jekyll': { genre: 'Gothic', cefrLevels: 'B2-C2', estimatedHours: 3 },
  'Yellow Wallpaper': { genre: 'Short Story', cefrLevels: 'B1-C1', estimatedHours: 1 }
};

// Map common Gutenberg book IDs to titles for orphaned simplifications
const GUTENBERG_TITLES: Record<string, { title: string; author: string }> = {
  'gutenberg-158': { title: 'Emma', author: 'Jane Austen' },
  'gutenberg-215': { title: 'The Call of the Wild', author: 'Jack London' },
  'gutenberg-64317': { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
  'gutenberg-43': { title: 'Dr. Jekyll and Mr. Hyde', author: 'Robert Louis Stevenson' },
  'gutenberg-844': { title: 'The Importance of Being Earnest', author: 'Oscar Wilde' },
  'gutenberg-1952': { title: 'The Yellow Wallpaper', author: 'Charlotte Perkins Gilman' },
  'gutenberg-174': { title: 'The Picture of Dorian Gray', author: 'Oscar Wilde' },
  'gutenberg-345': { title: 'Dracula', author: 'Bram Stoker' },
  'gutenberg-76': { title: 'Adventures of Huckleberry Finn', author: 'Mark Twain' },
  'gutenberg-74': { title: 'The Adventures of Tom Sawyer', author: 'Mark Twain' }
};

export async function GET() {
  try {
    console.log('🔍 Enhanced books API called');
    console.log('🔍 Environment:', process.env.NODE_ENV);
    console.log('🔍 Database URL configured:', !!process.env.DATABASE_URL);
    
    // Test basic database connectivity first
    try {
      console.log('🔍 Testing database connectivity...');
      const connectionTest = await prisma.$executeRaw`SELECT 1 as test`;
      console.log('✅ Database connection successful:', connectionTest);
    } catch (dbTestError) {
      console.error('❌ Database connection failed:', dbTestError);
      console.error('❌ Connection details:', {
        error: dbTestError instanceof Error ? dbTestError.message : 'Unknown error',
        stack: dbTestError instanceof Error ? dbTestError.stack : undefined
      });
      // Don't return here - continue with the main query to see the actual error
    }
    
    // Get all books with significant simplifications (50+ simplifications indicates real processing)
    console.log('🔍 Querying bookSimplification table...');
    const simplificationStats = await prisma.bookSimplification.groupBy({
      by: ['bookId'],
      _count: {
        id: true
      },
      having: {
        id: {
          _count: {
            gte: 50 // Only books with substantial processing
          }
        }
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    
    console.log('✅ Found simplification stats:', simplificationStats.length, 'books with 50+ simplifications');
    console.log('📊 Book IDs found:', simplificationStats.map(s => s.bookId));

    // Get detailed simplification data for these books
    console.log('🔍 Querying detailed simplifications...');
    const allSimplifications = await prisma.bookSimplification.findMany({
      where: {
        bookId: {
          in: simplificationStats.map(s => s.bookId)
        }
      },
      select: {
        bookId: true,
        targetLevel: true
      }
    });
    
    console.log('✅ Found detailed simplifications:', allSimplifications.length, 'entries');

    // Get book content for books that have it
    console.log('🔍 Querying book content...');
    const booksWithContent = await prisma.bookContent.findMany({
      where: {
        bookId: {
          in: simplificationStats.map(s => s.bookId)
        }
      }
    });
    
    console.log('✅ Found book content:', booksWithContent.length, 'books');
    console.log('📚 Books with content:', booksWithContent.map(b => `${b.bookId}: ${b.title}`));

    // Transform into enhanced books
    const enhancedBooks = simplificationStats.map(stat => {
      const bookId = stat.bookId;
      const simplificationCount = stat._count.id;
      
      // Try to get book content first
      const bookContent = booksWithContent.find(b => b.bookId === bookId);
      
      // If no book content, use Gutenberg mapping
      let title = 'Unknown Title';
      let author = 'Unknown Author';
      let totalChunks = 0;
      
      if (bookContent) {
        title = bookContent.title;
        author = bookContent.author;
        totalChunks = bookContent.totalChunks;
      } else if (GUTENBERG_TITLES[bookId]) {
        title = GUTENBERG_TITLES[bookId].title;
        author = GUTENBERG_TITLES[bookId].author;
        totalChunks = Math.floor(simplificationCount / 6); // Estimate chunks
      }

      // Find matching metadata
      let metadata = { genre: 'Classic', cefrLevels: 'B1-C2', estimatedHours: 5 };
      for (const [keyword, data] of Object.entries(GENRE_MAPPINGS)) {
        if (title.includes(keyword)) {
          metadata = data;
          break;
        }
      }

      // Get available levels for this book
      const bookSimplifications = allSimplifications.filter(s => s.bookId === bookId);
      const availableLevels = [...new Set(bookSimplifications.map(s => s.targetLevel))].sort();

      // Determine status based on available levels
      let status: 'enhanced' | 'processing' | 'planned' = 'enhanced';
      
      if (availableLevels.length === 0) {
        status = 'planned';
      } else if (availableLevels.length < 4) {
        status = 'processing';
      } else {
        status = 'enhanced';
      }

      return {
        id: bookId,
        title,
        author,
        description: `Enhanced ESL edition with ${availableLevels.length} difficulty levels available`,
        genre: metadata.genre,
        cefrLevels: metadata.cefrLevels,
        estimatedHours: metadata.estimatedHours,
        totalChunks,
        status,
        simplificationCount,
        availableLevels
      };
    });

    return NextResponse.json({
      books: enhancedBooks,
      total: enhancedBooks.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching enhanced books:', error);
    console.error('❌ Database error details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      databaseConfigured: !!process.env.DATABASE_URL
    });
    
    // Return fallback data when database is unavailable
    // FIXED: Use valid Gutenberg book IDs that definitely exist
    const fallbackBooks = [
      {
        id: 'gutenberg-158',
        title: 'Emma',
        author: 'Jane Austen',
        description: 'Enhanced ESL edition with 6 difficulty levels available',
        genre: 'Romance',
        cefrLevels: 'B2-C2',
        estimatedHours: 9,
        totalChunks: 305,
        status: 'enhanced' as const,
        simplificationCount: 1830,
        availableLevels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
      },
      {
        id: 'gutenberg-215',
        title: 'The Call of the Wild',
        author: 'Jack London',
        description: 'Enhanced ESL edition with 6 difficulty levels available',
        genre: 'Adventure',
        cefrLevels: 'B1-C2',
        estimatedHours: 3,
        totalChunks: 150,
        status: 'enhanced' as const,
        simplificationCount: 900,
        availableLevels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
      },
      {
        id: 'gutenberg-43',
        title: 'Dr. Jekyll and Mr. Hyde',
        author: 'Robert Louis Stevenson',
        description: 'Enhanced ESL edition with 6 difficulty levels available',
        genre: 'Gothic',
        cefrLevels: 'B2-C2',
        estimatedHours: 3,
        totalChunks: 172,
        status: 'enhanced' as const,
        simplificationCount: 1032,
        availableLevels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
      },
      {
        id: 'gutenberg-64317',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        description: 'Enhanced ESL edition with 6 difficulty levels available',
        genre: 'American Classic',
        cefrLevels: 'B2-C2',
        estimatedHours: 4,
        totalChunks: 90,
        status: 'enhanced' as const,
        simplificationCount: 540,
        availableLevels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
      }
    ];
    
    console.log('Returning fallback enhanced books data due to database connectivity issue');
    
    return NextResponse.json({
      books: fallbackBooks,
      total: fallbackBooks.length,
      lastUpdated: new Date().toISOString(),
      fallback: true
    });
  }
}