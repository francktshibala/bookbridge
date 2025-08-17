import { NextRequest, NextResponse } from 'next/server';
import { googleBooksAPI } from '@/lib/book-sources/google-books-api';

interface RouteParams {
  params: Promise<{
    bookId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { bookId } = await params;
    
    // Remove googlebooks- prefix if present
    const cleanBookId = bookId.startsWith('googlebooks-') ? bookId.slice(12) : bookId;
    
    // Get preview content (metadata only for Google Books)
    const content = await googleBooksAPI.getPreviewContent(`googlebooks-${cleanBookId}`);
    
    if (!content) {
      return NextResponse.json(
        { error: 'Book content not available or not found' },
        { status: 404 }
      );
    }

    // Get book metadata for additional context
    const book = await googleBooksAPI.getBook(`googlebooks-${cleanBookId}`);
    
    const response = {
      bookId: `googlebooks-${cleanBookId}`,
      title: book?.title || 'Unknown Title',
      author: book?.author || 'Unknown Author',
      content: content,
      metadata: {
        source: 'googlebooks',
        contentType: 'preview',
        warning: 'Limited preview - metadata and description only',
        isPreviewOnly: true,
        publisher: book?.metadata?.publisher,
        publishedDate: book?.metadata?.publishedDate,
        pageCount: book?.metadata?.pageCount,
        averageRating: book?.metadata?.averageRating,
        ratingsCount: book?.metadata?.ratingsCount
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Google Books content fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Google Books preview content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}