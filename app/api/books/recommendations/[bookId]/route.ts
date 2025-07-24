import { NextRequest, NextResponse } from 'next/server';
import { getRecommendationsForBook, getPopularRecommendations } from '@/lib/recommendation-engine';
import { gutenbergAPI } from '@/lib/book-sources/gutenberg-api';
import { openLibraryAPI } from '@/lib/book-sources/openlibrary-api';
import { standardEbooksAPI } from '@/lib/book-sources/standardebooks-api';
import { googleBooksAPI } from '@/lib/book-sources/google-books-api';
import { ExternalBook } from '@/types/book-sources';

interface RouteParams {
  params: Promise<{
    bookId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { bookId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId') || 'anonymous';
    const userId = searchParams.get('userId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '8', 10);

    console.log('🎯 Generating recommendations for book:', bookId);

    // Find the target book from all sources
    let targetBook: ExternalBook | null = null;
    
    // Check which source this book is from based on ID prefix
    if (bookId.startsWith('gutenberg-')) {
      const bookNum = bookId.replace('gutenberg-', '');
      console.log('🔍 Looking for Gutenberg book ID:', bookNum);
      
      try {
        // Try to get the book via direct API call and convert it
        const response = await fetch(`https://gutendex.com/books/${bookNum}`);
        if (response.ok) {
          const bookData = await response.json();
          // Convert to our ExternalBook format
          targetBook = {
            id: bookId,
            title: bookData.title || 'Unknown Title',
            author: bookData.authors?.[0]?.name || 'Unknown Author',
            subjects: bookData.subjects || [],
            language: bookData.languages?.[0] || 'en',
            source: 'gutenberg',
            downloadUrl: bookData.formats?.['text/plain'] || bookData.formats?.['text/html'],
            popularity: bookData.download_count || 0,
            publicationYear: bookData.copyright ? undefined : 1900,
            description: bookData.subjects?.join(', ') || '',
            coverUrl: bookData.formats?.['image/jpeg']
          };
          console.log('✅ Found Gutenberg book via direct API:', targetBook.title);
        } else {
          console.log('📚 Direct API failed, trying search fallback...');
          // Fallback to search
          const searchResults = await gutenbergAPI.searchBooksStandard(bookNum, 1);
          targetBook = searchResults.books.find(book => book.id === bookId) || null;
        }
      } catch (error) {
        console.error('Error fetching Gutenberg book:', error);
        // Last resort: try search method
        try {
          const searchResults = await gutenbergAPI.searchBooksStandard(bookNum, 1);
          targetBook = searchResults.books.find(book => book.id === bookId) || null;
        } catch (searchError) {
          console.error('Search fallback also failed:', searchError);
        }
      }
    } else if (bookId.startsWith('openlibrary-')) {
      const olid = bookId.replace('openlibrary-', '');
      console.log('🔍 Looking for Open Library book:', olid);
      
      try {
        // Try searching with the OLID since the standard methods return ExternalBook
        const openLibraryBooks = await openLibraryAPI.searchBooksStandard(olid, 1);
        targetBook = openLibraryBooks.books.find(book => book.id === bookId) || null;
        
        if (targetBook) {
          console.log('✅ Found Open Library book via search:', targetBook.title);
        }
      } catch (error) {
        console.error('Error fetching Open Library book:', error);
      }
    } else if (bookId.startsWith('standardebooks-')) {
      console.log('🔍 Looking for Standard Ebooks book:', bookId);
      
      try {
        const standardEbooksBooks = await standardEbooksAPI.getPopularBooksStandard();
        targetBook = standardEbooksBooks.books.find(book => book.id === bookId) || null;
      } catch (error) {
        console.error('Error fetching Standard Ebooks:', error);
      }
    } else if (bookId.startsWith('googlebooks-')) {
      const googleId = bookId.replace('googlebooks-', '');
      console.log('🔍 Looking for Google Books book:', googleId);
      
      try {
        // Use getBook method to fetch specific book by ID
        targetBook = await googleBooksAPI.getBook(googleId);
        
        if (targetBook) {
          console.log('✅ Found Google Books book via getBook:', targetBook.title);
        }
      } catch (error) {
        console.error('Error fetching Google Books:', error);
      }
    }

    if (!targetBook) {
      return NextResponse.json(
        { error: 'Book not found', bookId },
        { status: 404 }
      );
    }

    // Get books from all sources for recommendations
    console.log('📚 Fetching books from all sources...');
    
    const [gutenbergResults, openLibraryResults, standardEbooksResults] = await Promise.allSettled([
      gutenbergAPI.getPopularBooksStandard(1),
      openLibraryAPI.getPopularBooksStandard(1),
      standardEbooksAPI.getPopularBooksStandard(),
    ]);

    let allBooks: ExternalBook[] = [];

    // Add Gutenberg books
    if (gutenbergResults.status === 'fulfilled') {
      allBooks.push(...gutenbergResults.value.books.slice(0, 100)); // Limit for performance
    }

    // Add Open Library books
    if (openLibraryResults.status === 'fulfilled') {
      allBooks.push(...openLibraryResults.value.books.slice(0, 100));
    }

    // Add Standard Ebooks
    if (standardEbooksResults.status === 'fulfilled') {
      allBooks.push(...standardEbooksResults.value.books);
    }

    // Try to add some Google Books (limited for performance)
    try {
      const googleSubject = targetBook.subjects[0] || 'fiction';
      const googleBooks = await googleBooksAPI.searchBooks(`subject:"${googleSubject}"`, 1, 50);
      allBooks.push(...googleBooks.books);
    } catch (error) {
      console.log('Google Books not available for recommendations:', error);
    }

    console.log(`📊 Total books available for recommendations: ${allBooks.length}`);

    // Generate recommendations
    const recommendations = getRecommendationsForBook(targetBook, allBooks, sessionId, userId);

    // If we don't have enough recommendations, add popular books
    if (recommendations.length < limit) {
      const popularBooks = getPopularRecommendations(allBooks);
      const additionalRecs = popularBooks
        .filter(rec => !recommendations.some(r => r.book.id === rec.book.id))
        .slice(0, limit - recommendations.length);
      
      recommendations.push(...additionalRecs);
    }

    // Limit to requested number
    const finalRecommendations = recommendations.slice(0, limit);

    console.log(`✨ Generated ${finalRecommendations.length} recommendations for "${targetBook.title}"`);

    return NextResponse.json({
      success: true,
      targetBook: {
        id: targetBook.id,
        title: targetBook.title,
        author: targetBook.author,
        subjects: targetBook.subjects
      },
      recommendations: finalRecommendations.map(rec => ({
        book: rec.book,
        score: Math.round(rec.score * 100) / 100, // Round to 2 decimal places
        reason: rec.reason,
        confidence: Math.round(rec.confidence * 100) / 100
      })),
      metadata: {
        totalCandidates: allBooks.length,
        sessionId,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Recommendation generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate recommendations', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Optional: Add a general recommendations endpoint for homepage
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

    if (gutenbergResults.status === 'fulfilled') {
      allBooks.push(...gutenbergResults.value.books.slice(0, 50));
    }
    if (openLibraryResults.status === 'fulfilled') {
      allBooks.push(...openLibraryResults.value.books.slice(0, 50));
    }
    if (standardEbooksResults.status === 'fulfilled') {
      allBooks.push(...standardEbooksResults.value.books);
    }

    // Get popular recommendations
    const recommendations = getPopularRecommendations(allBooks).slice(0, limit);

    return NextResponse.json({
      success: true,
      recommendations: recommendations.map(rec => ({
        book: rec.book,
        score: Math.round(rec.score * 100) / 100,
        reason: rec.reason,
        confidence: Math.round(rec.confidence * 100) / 100
      })),
      metadata: {
        totalCandidates: allBooks.length,
        sessionId,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ General recommendation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate general recommendations', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}