import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level') || 'B2'
    const chunkIndex = parseInt(searchParams.get('chunk') || '0')

    console.log(`Fetching cached simplification: ${id}, level=${level}, chunk=${chunkIndex}`)

    // Get cached simplification from database
    const cached = await prisma.$queryRaw`
      SELECT simplified_text, quality_score, original_text 
      FROM book_simplifications 
      WHERE book_id = ${id} AND target_level = ${level} AND chunk_index = ${chunkIndex}
      LIMIT 1
    `

    if (cached.length > 0) {
      const simplification = cached[0]
      console.log(`Found cached simplification with quality ${simplification.quality_score}`)
      
      return NextResponse.json({
        success: true,
        content: simplification.simplified_text,
        level: level,
        chunkIndex: chunkIndex,
        source: 'cached_database',
        qualityScore: simplification.quality_score,
        displayConfig: {
          wordsPerScreen: 400,
          fontSize: level === 'A1' ? '19px' : level === 'A2' ? '17px' : '16px'
        }
      })
    }

    // If no cached version, fall back to original text chunking
    console.log(`No cached simplification found for ${id} ${level} chunk ${chunkIndex}`)
    
    // Get original book content
    const bookResponse = await fetch(`${request.nextUrl.origin}/api/books/${id}/content-fast`)
    if (!bookResponse.ok) {
      throw new Error('Failed to fetch book content')
    }
    
    const bookData = await bookResponse.json()
    const fullText = bookData.context || bookData.content
    
    // Simple chunking (400 words per chunk)
    const words = fullText.split(' ')
    const wordsPerChunk = 400
    const startIndex = chunkIndex * wordsPerChunk
    const endIndex = Math.min(startIndex + wordsPerChunk, words.length)
    const chunkText = words.slice(startIndex, endIndex).join(' ')
    
    return NextResponse.json({
      success: true,
      content: chunkText,
      level: level,
      chunkIndex: chunkIndex,
      source: 'original_chunked',
      qualityScore: 1.0,
      displayConfig: {
        wordsPerScreen: 400,
        fontSize: level === 'A1' ? '19px' : level === 'A2' ? '17px' : '16px'
      },
      note: 'No cached simplification available - showing original text'
    })

  } catch (error) {
    console.error('Error fetching cached simplification:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}