import { NextResponse } from 'next/server'
import { bookCacheService } from '@/lib/book-cache'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId')
    
    if (!bookId) {
      // Get a sample book
      const sampleBook = await prisma.book.findFirst({
        where: { filename: { not: null } },
        select: { id: true, title: true }
      })
      
      if (!sampleBook) {
        return NextResponse.json({ error: 'No books found in database' }, { status: 404 })
      }
      
      return NextResponse.json({
        message: 'Found sample book. Add ?bookId=' + sampleBook.id + ' to test indexing',
        book: sampleBook
      })
    }
    
    // Check if book is already cached
    const isCached = await bookCacheService.isBookCached(bookId)
    console.log(`Book ${bookId} cached:`, isCached)
    
    if (isCached) {
      // Clear cache to force re-indexing
      console.log('Clearing cache for book to force re-indexing...')
      await bookCacheService.clearBookCache(bookId)
    }
    
    // Check book cache entry in database
    const cacheEntry = await prisma.bookCache.findUnique({
      where: { bookId },
      select: { indexed: true, totalChunks: true }
    })
    
    return NextResponse.json({
      success: true,
      bookId,
      wasCached: isCached,
      cacheCleared: isCached,
      databaseEntry: cacheEntry,
      message: isCached 
        ? 'Cache cleared. Trigger book processing via /api/books/{id}/content-fast to test indexing'
        : 'Book not cached. Trigger processing via /api/books/{id}/content-fast to test indexing'
    })
  } catch (error) {
    console.error('Test indexing error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}