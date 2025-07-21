import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bookCacheService } from '@/lib/book-cache'
import { bookProcessorService } from '@/lib/book-processor'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Fast content fetch for book ID:', id)

    // Get user from Supabase auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const maxChunks = parseInt(searchParams.get('maxChunks') || '5')
    const maxWords = parseInt(searchParams.get('maxWords') || '3000')

    // Check if book is cached
    const isCached = await bookCacheService.isBookCached(id)
    
    if (!isCached) {
      console.log(`Book ${id} not cached, checking processing status...`)
      
      // Check if currently being processed
      const processingStatus = bookProcessorService.getProcessingStatus(id)
      
      if (processingStatus) {
        return NextResponse.json({
          cached: false,
          processing: true,
          status: processingStatus,
          message: 'Book is being processed. Please try again in a few moments.'
        })
      }

      // Check if book exists and trigger background processing
      const book = await prisma.book.findUnique({
        where: { id },
        select: { id: true, title: true, filename: true }
      })

      if (!book) {
        return NextResponse.json(
          { error: 'Book not found' },
          { status: 404 }
        )
      }

      if (!book.filename) {
        return NextResponse.json(
          { error: 'No file associated with this book' },
          { status: 404 }
        )
      }

      // Start background processing
      console.log(`Starting background processing for book: ${book.title}`)
      bookProcessorService.processBookBackground(id)

      return NextResponse.json({
        cached: false,
        processing: true,
        message: 'Book processing started. Please try again in a few moments.',
        bookTitle: book.title
      })
    }

    // Get cached content
    console.log(`Loading cached content for book ${id}`)
    const cachedContent = await bookCacheService.getCachedContent(id)
    
    if (!cachedContent) {
      return NextResponse.json(
        { error: 'Failed to load cached content' },
        { status: 500 }
      )
    }

    // If no query, return basic info
    if (!query) {
      return NextResponse.json({
        id: cachedContent.bookId,
        title: cachedContent.title,
        author: cachedContent.author,
        cached: true,
        totalChunks: cachedContent.totalChunks,
        lastProcessed: cachedContent.lastProcessed,
        metadata: cachedContent.metadata,
        chunks: cachedContent.chunks.slice(0, maxChunks)
      })
    }

    // Find relevant chunks for the query
    console.log(`Finding relevant chunks for query: "${query}"`)
    const relevantChunks = await bookCacheService.findRelevantCachedChunks(
      id,
      query,
      maxChunks
    )

    // Create context from relevant chunks
    const context = relevantChunks.length > 0 
      ? bookCacheService.createContextFromChunks(relevantChunks, maxWords)
      : null

    console.log(`Found ${relevantChunks.length} relevant chunks, context length: ${context?.length || 0}`)

    return NextResponse.json({
      id: cachedContent.bookId,
      title: cachedContent.title,
      author: cachedContent.author,
      cached: true,
      query,
      relevantChunks: relevantChunks.length,
      totalChunks: cachedContent.totalChunks,
      context,
      chunks: relevantChunks,
      lastProcessed: cachedContent.lastProcessed,
      metadata: cachedContent.metadata
    })

  } catch (error) {
    console.error('Error in fast content fetch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to trigger processing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { action } = await request.json()

    // Get user from Supabase auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    switch (action) {
      case 'process':
        // Force processing even if cached
        try {
          await bookProcessorService.processBook(id)
          return NextResponse.json({ 
            success: true, 
            message: 'Book processed successfully' 
          })
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Processing failed' },
            { status: 500 }
          )
        }

      case 'clear-cache':
        await bookCacheService.clearBookCache(id)
        return NextResponse.json({ 
          success: true, 
          message: 'Cache cleared successfully' 
        })

      case 'status':
        const status = bookProcessorService.getProcessingStatus(id)
        const isCached = await bookCacheService.isBookCached(id)
        return NextResponse.json({ 
          cached: isCached,
          processing: status,
          needsProcessing: await bookProcessorService.needsProcessing(id)
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in book processing action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}