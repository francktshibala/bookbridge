import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Minimal HEAD handler to ensure the route is matched by Next.js routing
export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: { 'x-route': 'content-fast' } })
}

// OPTIONS handler for CORS/preflight visibility
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}

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
        where: { bookId: trimmedId },
        include: {
          chunks: {
            where: { cefrLevel: 'original' },
            orderBy: { chunkIndex: 'asc' }
          }
        }
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
          },
          include: {
            chunks: {
              where: { cefrLevel: 'original' },
              orderBy: { chunkIndex: 'asc' }
            }
          }
        })
      }

      if (storedContent) {
        console.log(`✅ Found book in database: ${storedContent.title}`)
        
        // Create chunks array from BookChunk relations if available
        const chunks = storedContent.chunks?.length > 0 
          ? storedContent.chunks.map(chunk => ({
              chunkIndex: chunk.chunkIndex,
              content: chunk.chunkText
            }))
          : null;
        
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
          chunks: chunks, // Include proper chunks structure
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

    // External fallback: try Project Gutenberg if a numeric ID is present
    if (numericId) {
      try {
        const candidates = [
          `https://www.gutenberg.org/cache/epub/${numericId}/pg${numericId}.txt.utf8`,
          `https://www.gutenberg.org/cache/epub/${numericId}/pg${numericId}.txt`,
          `https://www.gutenberg.org/files/${numericId}/${numericId}-0.txt`,
          `https://www.gutenberg.org/files/${numericId}/${numericId}.txt`
        ]

        let textContent: string | null = null
        let lastStatus = 0
        for (const url of candidates) {
          try {
            const resp = await fetch(url)
            lastStatus = resp.status
            if (resp.ok) {
              const raw = await resp.text()
              // Basic cleanup: strip Gutenberg header/footer
              const startIdx = raw.indexOf('*** START')
              const endIdx = raw.indexOf('*** END')
              const sliced = startIdx >= 0 && endIdx > startIdx ? raw.slice(startIdx, endIdx) : raw
              textContent = sliced.trim()
              console.log(`✅ Loaded external Gutenberg text from ${url}`)
              break
            }
          } catch (e) {
            console.warn(`Failed external fetch ${url}:`, e)
          }
        }

        if (textContent && textContent.length > 0) {
          // Heuristic title/author if possible
          const lines = textContent.split('\n').slice(0, 80)
          const titleLine = lines.find(l => /Title:\s*/i.test(l)) || lines.find(l => /\S+/.test(l)) || 'Unknown Title'
          const authorLine = lines.find(l => /Author:\s*/i.test(l)) || 'Unknown Author'
          const title = titleLine.replace(/^Title:\s*/i, '').trim().slice(0, 120) || 'Unknown Title'
          const author = authorLine.replace(/^Author:\s*/i, '').trim().slice(0, 120) || 'Unknown Author'

          return NextResponse.json({
            id: trimmedId,
            title,
            author,
            cached: false,
            external: true,
            stored: false,
            query,
            context: textContent,
            content: textContent,
            source: 'external_gutenberg',
            wordCount: textContent.split(/\s+/).length,
            characterCount: textContent.length,
            totalChunks: Math.ceil(textContent.length / 1500),
            message: 'Content loaded from Project Gutenberg'
          })
        } else {
          console.warn(`External Gutenberg fetch failed for ${numericId}, lastStatus=${lastStatus}`)
        }
      } catch (e) {
        console.warn('External content fetch error:', e)
      }
    }

    // At this point, book not found anywhere - return 404 with diagnostics
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