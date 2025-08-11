import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// Display configuration from implementation guide
const DISPLAY_CONFIG = {
  A1: { wordsPerScreen: 75, fontSize: '19px', sessionMin: 12 },
  A2: { wordsPerScreen: 150, fontSize: '17px', sessionMin: 18 },
  B1: { wordsPerScreen: 250, fontSize: '17px', sessionMin: 22 },
  B2: { wordsPerScreen: 350, fontSize: '16px', sessionMin: 27 },
  C1: { wordsPerScreen: 400, fontSize: '16px', sessionMin: 30 },
  C2: { wordsPerScreen: 450, fontSize: '16px', sessionMin: 35 }
} as const

type CEFRLevel = keyof typeof DISPLAY_CONFIG

// Simple text chunking function
const chunkText = (text: string, cefrLevel: CEFRLevel): string[] => {
  const { wordsPerScreen } = DISPLAY_CONFIG[cefrLevel]
  const words = text.split(' ')
  const chunks = []
  
  for (let i = 0; i < words.length; i += wordsPerScreen) {
    chunks.push(words.slice(i, i + wordsPerScreen).join(' '))
  }
  return chunks
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('Text simplification request for book ID:', id)

    // Check if this is an external book
    const isExternalBook = id.includes('-') && !id.match(/^[0-9a-f-]{36}$/)
    
    if (!isExternalBook) {
      // Get user from Supabase auth (only for internal books)
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level') as CEFRLevel || 'B2'
    const chunkIndex = parseInt(searchParams.get('chunk') || '0')
    
    // Validate CEFR level
    if (!DISPLAY_CONFIG[level]) {
      return NextResponse.json(
        { error: `Invalid CEFR level: ${level}. Must be A1, A2, B1, B2, C1, or C2` },
        { status: 400 }
      )
    }

    // Check if we have cached simplification
    try {
      const cachedSimplification = await prisma.bookSimplification.findUnique({
        where: {
          bookId_targetLevel_chunkIndex: {
            bookId: id,
            targetLevel: level,
            chunkIndex: chunkIndex
          }
        }
      })

      if (cachedSimplification) {
        console.log(`Returning cached simplification for ${id}, level ${level}, chunk ${chunkIndex}`)
        return NextResponse.json({
          success: true,
          content: cachedSimplification.simplifiedText,
          level: level,
          chunkIndex: chunkIndex,
          source: 'cache',
          displayConfig: DISPLAY_CONFIG[level],
          stats: {
            originalLength: cachedSimplification.originalText.length,
            simplifiedLength: cachedSimplification.simplifiedText.length,
            compressionRatio: `${Math.round((cachedSimplification.simplifiedText.length / cachedSimplification.originalText.length) * 100)}%`
          }
        })
      }
    } catch (error) {
      console.warn('Error checking cached simplification:', error)
      // Continue with text chunking if cache lookup fails
    }

    // Get book content first
    const contentResponse = await fetch(`${request.nextUrl.origin}/api/books/${id}/content-fast`)
    if (!contentResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch book content' },
        { status: contentResponse.status }
      )
    }

    const bookData = await contentResponse.json()
    const fullText = bookData.context || bookData.content

    if (!fullText) {
      return NextResponse.json(
        { error: 'No content available for this book' },
        { status: 404 }
      )
    }

    // Chunk the text based on CEFR level
    const chunks = chunkText(fullText, level)
    
    if (chunkIndex >= chunks.length) {
      return NextResponse.json(
        { error: `Chunk index ${chunkIndex} out of range. Book has ${chunks.length} chunks at level ${level}` },
        { status: 400 }
      )
    }

    const requestedChunk = chunks[chunkIndex]

    // For now, we're just chunking the text - actual AI simplification would happen here
    // This is Step 1: Basic Text Chunking API
    console.log(`Generated chunk ${chunkIndex}/${chunks.length} for level ${level}`)

    // Cache the result for future requests
    try {
      await prisma.bookSimplification.create({
        data: {
          bookId: id,
          targetLevel: level,
          chunkIndex: chunkIndex,
          originalText: requestedChunk, // In real implementation, this would be the original chunk
          simplifiedText: requestedChunk, // For now, simplified = chunked
          vocabularyChanges: [],
          culturalAnnotations: [],
          qualityScore: 1.0 // Perfect score for chunking
        }
      })
      console.log(`Cached simplification for ${id}, level ${level}, chunk ${chunkIndex}`)
    } catch (cacheError) {
      console.warn('Failed to cache simplification:', cacheError)
      // Continue without caching
    }

    return NextResponse.json({
      success: true,
      content: requestedChunk,
      level: level,
      chunkIndex: chunkIndex,
      totalChunks: chunks.length,
      source: 'generated',
      displayConfig: DISPLAY_CONFIG[level],
      vocabularyChanges: [], // Empty for Step 1
      culturalAnnotations: [], // Empty for Step 1
      qualityScore: 1.0,
      stats: {
        originalLength: requestedChunk.length,
        simplifiedLength: requestedChunk.length,
        compressionRatio: '100%',
        wordsPerChunk: DISPLAY_CONFIG[level].wordsPerScreen
      }
    })

  } catch (error) {
    console.error('Error in text simplification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint for regenerating simplifications
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { level, chunkIndex, regenerate = false } = body

    if (regenerate) {
      // Clear cached version and regenerate
      try {
        await prisma.bookSimplification.delete({
          where: {
            bookId_targetLevel_chunkIndex: {
              bookId: id,
              targetLevel: level,
              chunkIndex: chunkIndex
            }
          }
        })
        console.log(`Cleared cached simplification for regeneration`)
      } catch (error) {
        console.warn('No cached version to clear:', error)
      }
    }

    // Redirect to GET with parameters
    const url = new URL(request.url)
    url.searchParams.set('level', level)
    url.searchParams.set('chunk', chunkIndex.toString())
    
    return GET(request, { params })

  } catch (error) {
    console.error('Error in simplification POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}