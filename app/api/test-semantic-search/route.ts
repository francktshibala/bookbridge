import { NextResponse } from 'next/server'
import { vectorService } from '@/lib/vector/vector-service'
import { bookCacheService } from '@/lib/book-cache'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId') || 'gutenberg-2701'
    const query = searchParams.get('query') || 'whale'
    
    console.log(`Testing semantic search for book ${bookId} with query: "${query}"`)
    
    // Initialize vector service
    await vectorService.initialize()
    
    // Check if book is indexed
    const isIndexed = await vectorService.isBookIndexed(bookId)
    console.log(`Book ${bookId} indexed in Pinecone:`, isIndexed)
    
    // Try semantic search
    let semanticResults = []
    try {
      semanticResults = await vectorService.searchRelevantChunks(bookId, query, 5)
      console.log(`Found ${semanticResults.length} semantic results`)
    } catch (error) {
      console.error('Semantic search error:', error)
    }
    
    // Try hybrid search via book cache
    let hybridResults = []
    try {
      const cached = await bookCacheService.getCachedContent(bookId)
      if (cached) {
        hybridResults = await bookCacheService.findRelevantCachedChunks(bookId, query, 5)
        console.log(`Found ${hybridResults.length} hybrid results`)
      }
    } catch (error) {
      console.error('Hybrid search error:', error)
    }
    
    return NextResponse.json({
      success: true,
      bookId,
      query,
      isIndexed,
      semanticResultsCount: semanticResults.length,
      semanticResults: semanticResults.slice(0, 2).map(r => ({
        score: r.score,
        preview: r.chunk.content.substring(0, 200) + '...'
      })),
      hybridResultsCount: hybridResults.length,
      hybridResults: hybridResults.slice(0, 2).map(chunk => ({
        chapterId: chunk.id,
        preview: chunk.content.substring(0, 200) + '...'
      }))
    })
  } catch (error) {
    console.error('Test semantic search error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}