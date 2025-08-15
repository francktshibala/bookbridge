import { NextRequest, NextResponse } from 'next/server';
import { googleBooksAPI } from '@/lib/book-sources/google-books-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '40', 10);

    const results = await googleBooksAPI.searchBooks(query, page, limit);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Google Books search error:', error);
    return NextResponse.json(
      { error: 'Failed to search Google Books', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}