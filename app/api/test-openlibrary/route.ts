import { NextResponse } from 'next/server';
import { openLibraryAPI } from '@/lib/book-sources/openlibrary-api';

export async function GET() {
  const results: any = {
    searchTest: null,
    popularTest: null,
    errors: []
  };
  
  try {
    console.log('Testing Open Library API...');
    
    // Test 1: Search for a popular book
    try {
      const searchResults = await openLibraryAPI.searchBooksStandard('Pride and Prejudice', 1);
      results.searchTest = {
        query: 'Pride and Prejudice',
        totalFound: searchResults.totalCount,
        booksReturned: searchResults.books.length,
        firstBook: searchResults.books[0] || null
      };
    } catch (searchError) {
      results.errors.push({
        test: 'search',
        error: searchError instanceof Error ? searchError.message : 'Unknown search error'
      });
    }
    
    // Test 2: Get popular books
    try {
      const popularBooks = await openLibraryAPI.getPopularBooksStandard(1);
      results.popularTest = {
        totalFound: popularBooks.totalCount,
        booksReturned: popularBooks.books.length,
        firstThree: popularBooks.books.slice(0, 3).map(book => ({
          title: book.title,
          author: book.author,
          popularity: book.popularity,
          hasInternetArchive: book.downloadUrl?.includes('archive.org') || false
        }))
      };
    } catch (popularError) {
      results.errors.push({
        test: 'popular',
        error: popularError instanceof Error ? popularError.message : 'Unknown popular error'
      });
    }
    
    results.status = results.errors.length === 0 ? 'success' : 'partial';
    
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Error testing Open Library API:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'failed',
      results
    }, { status: 500 });
  }
}