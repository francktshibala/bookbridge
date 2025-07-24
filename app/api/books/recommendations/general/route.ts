import { NextRequest, NextResponse } from 'next/server';
import { getPopularRecommendations } from '@/lib/recommendation-engine';
import { gutenbergAPI } from '@/lib/book-sources/gutenberg-api';
import { openLibraryAPI } from '@/lib/book-sources/openlibrary-api';
import { standardEbooksAPI } from '@/lib/book-sources/standardebooks-api';
import { googleBooksAPI } from '@/lib/book-sources/google-books-api';
import { ExternalBook } from '@/types/book-sources';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId = 'anonymous', userId, limit = 8 } = body;

    console.log('🏠 Generating general recommendations for homepage');

    // Get popular books from all sources
    const [gutenbergResults, openLibraryResults, standardEbooksResults] = await Promise.allSettled([
      gutenbergAPI.getPopularBooksStandard(1),
      openLibraryAPI.getPopularBooksStandard(1),
      standardEbooksAPI.getPopularBooksStandard(),
    ]);

    let allBooks: ExternalBook[] = [];

    // Add books from each source with error handling
    if (gutenbergResults.status === 'fulfilled') {
      allBooks.push(...gutenbergResults.value.books.slice(0, 50));
      console.log('📚 Added Gutenberg books:', gutenbergResults.value.books.length);
    } else {
      console.warn('⚠️ Gutenberg books failed:', gutenbergResults.reason);
    }

    if (openLibraryResults.status === 'fulfilled') {
      allBooks.push(...openLibraryResults.value.books.slice(0, 50));
      console.log('📚 Added Open Library books:', openLibraryResults.value.books.length);
    } else {
      console.warn('⚠️ Open Library books failed:', openLibraryResults.reason);
    }

    if (standardEbooksResults.status === 'fulfilled') {
      allBooks.push(...standardEbooksResults.value.books);
      console.log('📚 Added Standard Ebooks:', standardEbooksResults.value.books.length);
    } else {
      console.warn('⚠️ Standard Ebooks failed:', standardEbooksResults.reason);
    }

    // Try to add some curated Google Books for variety
    try {
      const popularSubjects = ['fiction', 'science fiction', 'mystery', 'romance', 'history'];
      const googleBooksPromises = popularSubjects.map(subject => 
        googleBooksAPI.searchBooks(`subject:"${subject}"`, 1, 10)
          .then(result => result.books)
          .catch(() => [])
      );
      
      const googleBooksResults = await Promise.all(googleBooksPromises);
      const googleBooks = googleBooksResults.flat().slice(0, 30); // Limit Google Books
      allBooks.push(...googleBooks);
      console.log('📚 Added Google Books:', googleBooks.length);
    } catch (error) {
      console.log('⚠️ Google Books not available for general recommendations:', error);
    }

    console.log(`📊 Total books available for general recommendations: ${allBooks.length}`);

    if (allBooks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No books available for recommendations',
        recommendations: [],
        metadata: {
          totalCandidates: 0,
          sessionId,
          generatedAt: new Date().toISOString()
        }
      });
    }

    // Get popular recommendations with enhanced scoring
    const recommendations = getPopularRecommendations(allBooks);
    
    // Enhance recommendations with diversity (different authors, sources, genres)
    const diverseRecommendations = [];
    const usedAuthors = new Set<string>();
    const usedSources = new Set<string>();
    
    for (const rec of recommendations) {
      const authorKey = rec.book.author.toLowerCase();
      const sourceKey = rec.book.source;
      
      // Prefer diverse authors and sources for better discovery
      if (diverseRecommendations.length < limit) {
        if (!usedAuthors.has(authorKey) || !usedSources.has(sourceKey) || diverseRecommendations.length < 4) {
          diverseRecommendations.push(rec);
          usedAuthors.add(authorKey);
          usedSources.add(sourceKey);
        }
      }
    }
    
    // Fill remaining slots if needed
    for (const rec of recommendations) {
      if (diverseRecommendations.length >= limit) break;
      if (!diverseRecommendations.some(existing => existing.book.id === rec.book.id)) {
        diverseRecommendations.push(rec);
      }
    }

    const finalRecommendations = diverseRecommendations.slice(0, limit);

    console.log(`✨ Generated ${finalRecommendations.length} diverse general recommendations`);

    return NextResponse.json({
      success: true,
      recommendations: finalRecommendations.map(rec => ({
        book: rec.book,
        score: Math.round(rec.score * 100) / 100,
        reason: rec.reason,
        confidence: Math.round(rec.confidence * 100) / 100
      })),
      metadata: {
        totalCandidates: allBooks.length,
        sessionId,
        diversityApplied: true,
        sourcesIncluded: Array.from(new Set(allBooks.map(book => book.source))),
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ General recommendation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate general recommendations', 
        details: error instanceof Error ? error.message : 'Unknown error',
        recommendations: []
      },
      { status: 500 }
    );
  }
}

// Also support GET requests for simpler usage
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId') || 'anonymous';
  const userId = searchParams.get('userId') || undefined;
  const limit = parseInt(searchParams.get('limit') || '8', 10);

  // Convert GET to POST format
  const mockRequest = {
    json: async () => ({ sessionId, userId, limit })
  };

  return POST(mockRequest as NextRequest);
}