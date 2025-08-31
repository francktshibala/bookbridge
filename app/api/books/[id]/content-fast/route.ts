import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Fast content fetch for book ID:', id)
    
    // Normalize possible ID variants (e.g., 'gutenberg-158' ↔ '158')
    const trimmedId = id.trim()
    const extractDigits = (value: string) => (value.match(/\d+/)?.[0] || '').replace(/^0+/, '')
    const numericId = extractDigits(trimmedId)
    const gutenbergId = numericId ? `gutenberg-${numericId}` : null
    const idVariants = Array.from(new Set([
      trimmedId,
      trimmedId.toLowerCase(),
      trimmedId.toUpperCase(),
      ...(numericId ? [numericId] : []),
      ...(gutenbergId ? [gutenbergId] : [])
    ].filter(Boolean))) as string[]
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    
    // FIRST: Always check database for any book, regardless of ID format
    try {
      console.log(`🔍 Checking database first for book: ${id}`)
      console.log('🔍 Environment check:', { 
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL_EXISTS: !!process.env.DATABASE_URL 
      })
      
      // Test database connection
      const connectionTest = await prisma.$executeRaw`SELECT 1 as test`
      console.log('✅ Database connection test:', connectionTest)
      
      // DEBUG: List all available book IDs in database
      const allBookContent = await prisma.bookContent.findMany({
        select: { bookId: true, title: true }
      })
      console.log('📚 Available bookContent IDs:', allBookContent.map(b => `${b.bookId}: ${b.title}`))
      
      const allSimplifications = await prisma.bookSimplification.findMany({
        select: { bookId: true },
        distinct: ['bookId']
      })
      console.log('📚 Available simplification IDs:', allSimplifications.map(s => s.bookId))
      
      // Try exact match first
      let storedContent = await prisma.bookContent.findUnique({
        where: { bookId: trimmedId }
      })

      // Fallbacks: variant list, and heuristic matches
      if (!storedContent) {
        storedContent = await prisma.bookContent.findFirst({
          where: {
            OR: [
              { bookId: { in: idVariants } },
              ...(numericId ? [
                { bookId: { endsWith: numericId } },
                { AND: [ { bookId: { startsWith: 'gutenberg-' } }, { bookId: { endsWith: numericId } } ] }
              ] : [])
            ]
          }
        })
      }

      if (storedContent) {
        console.log(`✅ Found book in database: ${storedContent.title}`)
        return NextResponse.json({
          id: storedContent.bookId,
          title: storedContent.title,
          author: storedContent.author,
          cached: false,
          external: false,
          stored: true,
          query,
          context: storedContent.fullText,
          content: storedContent.fullText,
          source: 'database',
          wordCount: storedContent.wordCount,
          characterCount: storedContent.fullText.length,
          totalChunks: storedContent.totalChunks,
          era: storedContent.era,
          message: 'Content loaded from database storage'
        })
      }

      // Check for enhanced book with simplifications
      console.log(`🔍 Checking for enhanced book with simplifications: ${id}`)
      let enhancedBook = await prisma.bookSimplification.findFirst({
        where: { bookId: trimmedId },
        select: { 
          bookId: true,
          originalText: true,
          chunkIndex: true
        },
        orderBy: { chunkIndex: 'asc' }
      })

      if (enhancedBook) {
        console.log(`✅ Found enhanced book with simplifications: ${id}`)
        
        const allChunks = await prisma.bookSimplification.findMany({
          where: { bookId: trimmedId },
          select: { 
            chunkIndex: true,
            originalText: true 
          },
          orderBy: { chunkIndex: 'asc' },
          distinct: ['chunkIndex']
        })

        const fullText = allChunks
          .sort((a, b) => a.chunkIndex - b.chunkIndex)
          .map(chunk => chunk.originalText)
          .join('\n\n')

        const titleMappings: Record<string, { title: string; author: string }> = {
          'gutenberg-158': { title: 'Emma', author: 'Jane Austen' },
          'gutenberg-215': { title: 'The Call of the Wild', author: 'Jack London' },
          'gutenberg-64317': { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
          'gutenberg-43': { title: 'Dr. Jekyll and Mr. Hyde', author: 'Robert Louis Stevenson' },
          'gutenberg-844': { title: 'The Importance of Being Earnest', author: 'Oscar Wilde' },
          'gutenberg-1952': { title: 'The Yellow Wallpaper', author: 'Charlotte Perkins Gilman' },
          'gutenberg-2701': { title: 'Moby Dick; Or, The Whale', author: 'Herman Melville' }
        }

        const bookInfo = titleMappings[id] || { title: 'Enhanced Book', author: 'Unknown Author' }
        
        return NextResponse.json({
          id: id,
          title: bookInfo.title,
          author: bookInfo.author,
          cached: false,
          external: false,
          stored: true,
          enhanced: true,
          query,
          context: fullText,
          content: fullText,
          source: 'enhanced_database',
          wordCount: fullText.split(' ').length,
          characterCount: fullText.length,
          totalChunks: allChunks.length,
          message: 'Enhanced book content loaded from simplifications'
        })
      }

      // If not found by exact ID, try variant-based lookup for simplifications
      console.log(`🔍 Fallback search for enhanced simplifications using variants: ${idVariants.join(', ')}`)
      enhancedBook = await prisma.bookSimplification.findFirst({
        where: {
          OR: [
            { bookId: { in: idVariants } },
            ...(numericId ? [
              { bookId: { endsWith: numericId } },
              { AND: [ { bookId: { startsWith: 'gutenberg-' } }, { bookId: { endsWith: numericId } } ] }
            ] : [])
          ]
        },
        select: { 
          bookId: true,
          originalText: true,
          chunkIndex: true
        },
        orderBy: { chunkIndex: 'asc' }
      })

      if (enhancedBook) {
        const enhancedId = enhancedBook.bookId
        console.log(`✅ Found enhanced book via variant match: ${enhancedId}`)
        const allChunks = await prisma.bookSimplification.findMany({
          where: { bookId: enhancedId },
          select: { 
            chunkIndex: true,
            originalText: true 
          },
          orderBy: { chunkIndex: 'asc' },
          distinct: ['chunkIndex']
        })

        const fullText = allChunks
          .sort((a, b) => a.chunkIndex - b.chunkIndex)
          .map(chunk => chunk.originalText)
          .join('\n\n')

        const titleMappings: Record<string, { title: string; author: string }> = {
          'gutenberg-158': { title: 'Emma', author: 'Jane Austen' },
          'gutenberg-215': { title: 'The Call of the Wild', author: 'Jack London' },
          'gutenberg-64317': { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
          'gutenberg-43': { title: 'Dr. Jekyll and Mr. Hyde', author: 'Robert Louis Stevenson' },
          'gutenberg-844': { title: 'The Importance of Being Earnest', author: 'Oscar Wilde' },
          'gutenberg-1952': { title: 'The Yellow Wallpaper', author: 'Charlotte Perkins Gilman' },
          'gutenberg-2701': { title: 'Moby Dick; Or, The Whale', author: 'Herman Melville' }
        }

        const bookInfo = titleMappings[enhancedId] || titleMappings[gutenbergId || ''] || { title: 'Enhanced Book', author: 'Unknown Author' }

        return NextResponse.json({
          id: enhancedId,
          title: bookInfo.title,
          author: bookInfo.author,
          cached: false,
          external: false,
          stored: true,
          enhanced: true,
          query,
          context: fullText,
          content: fullText,
          source: 'enhanced_database',
          wordCount: fullText.split(' ').length,
          characterCount: fullText.length,
          totalChunks: allChunks.length,
          message: 'Enhanced book content loaded from simplifications (variant match)'
        })
      }

      console.log(`❌ Book ${id} not found in database`)
    } catch (dbError) {
      console.error('Database lookup failed:', dbError)
    }

    // At this point, book not found in database - return 404 with diagnostics
    return NextResponse.json(
      { 
        error: 'Book not found',
        requestedId: trimmedId,
        numericId,
        gutenbergId,
        idVariants
      },
      { status: 404 }
    )

  } catch (error) {
    console.error('Error in fast content fetch:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        bookId: (await params).id
      },
      { status: 500 }
    )
  }
}