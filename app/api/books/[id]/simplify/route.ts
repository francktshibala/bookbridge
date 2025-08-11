import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { claudeService } from '@/lib/ai/claude-service'

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

// AI-powered text simplification with semantic similarity gate
const simplifyTextWithAI = async (text: string, cefrLevel: CEFRLevel, userId: string): Promise<{
  simplifiedText: string
  similarity: number
  quality: 'excellent' | 'good' | 'acceptable' | 'failed'
  retryAttempt: number
}> => {
  const SIMILARITY_THRESHOLD = 0.82
  const MAX_RETRIES = 2

  // CEFR-specific simplification prompts
  const simplificationPrompts = {
    A1: `Simplify this text for an A1 beginner English learner:
    - Use only the 500 most common English words
    - Use present tense only
    - Keep sentences to 5-8 words maximum
    - Replace difficult words with simple alternatives
    - Remove complex grammar structures
    - Keep the main meaning intact`,
    
    A2: `Simplify this text for an A2 elementary English learner:
    - Use only common 1000-word vocabulary
    - Use simple past and present tense
    - Keep sentences short (8-12 words)
    - Use basic connectors: and, but, because
    - Explain cultural references simply
    - Keep the essential meaning`,
    
    B1: `Simplify this text for a B1 intermediate English learner:
    - Use 1500-word vocabulary level
    - Use most common tenses (avoid complex forms)
    - Break long sentences into shorter ones
    - Explain difficult concepts with examples
    - Keep paragraph structure
    - Maintain the core meaning and details`,
    
    B2: `Simplify this text for a B2 upper-intermediate English learner:
    - Use 2500-word vocabulary level
    - Clarify complex grammar structures
    - Break down academic language
    - Explain cultural and historical references
    - Keep most original details
    - Maintain sophisticated ideas but make them clearer`,
    
    C1: `Refine this text for a C1 advanced English learner:
    - Use advanced but clear vocabulary (4000 words)
    - Simplify very complex sentence structures
    - Clarify implicit meanings
    - Explain subtle cultural nuances
    - Keep academic tone but improve clarity
    - Maintain all nuances and complexity`,
    
    C2: `Polish this text for a C2 near-native English learner:
    - Keep sophisticated vocabulary
    - Improve flow and coherence
    - Clarify any ambiguous expressions
    - Enhance readability while maintaining complexity
    - Keep all original meaning and style
    - Perfect for advanced learners`
  }

  let retryAttempt = 0
  let bestResult = { text: '', similarity: 0 }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    retryAttempt = attempt + 1
    
    try {
      // Add retry-specific instructions for conservative approaches
      const retryInstructions = attempt > 0 ? `
      
      IMPORTANT: This is retry attempt ${attempt + 1}. The previous simplification changed the meaning too much.
      Be MORE CONSERVATIVE this time:
      - Make smaller changes to vocabulary
      - Keep more of the original sentence structure
      - Only simplify the most difficult parts
      - Preserve all key information and meaning
      - Focus on clarity over simplicity` : ''

      const prompt = `${simplificationPrompts[cefrLevel]}${retryInstructions}

      Text to simplify:
      "${text}"

      Return only the simplified text with no additional explanation or formatting.`

      // Call Claude API for simplification
      const response = await claudeService.query(prompt, {
        userId,
        maxTokens: Math.min(1500, Math.max(300, text.length * 2)),
        temperature: 0.3, // Low temperature for consistent simplification
        responseMode: 'brief'
      })

      const simplifiedText = response.content.trim()

      // Calculate semantic similarity (simple heuristic for now)
      const similarity = calculateSemanticSimilarity(text, simplifiedText)
      
      console.log(`Simplification attempt ${retryAttempt}: similarity = ${similarity.toFixed(3)}`)

      // Store best result regardless of threshold
      if (similarity > bestResult.similarity) {
        bestResult = { text: simplifiedText, similarity }
      }

      // Check if similarity meets threshold
      if (similarity >= SIMILARITY_THRESHOLD) {
        const quality = similarity >= 0.95 ? 'excellent' : 
                       similarity >= 0.90 ? 'good' : 'acceptable'
        
        return { 
          simplifiedText, 
          similarity, 
          quality, 
          retryAttempt 
        }
      }

    } catch (error) {
      console.error(`Simplification attempt ${retryAttempt} failed:`, error)
      if (attempt === MAX_RETRIES) {
        // Return best result if all attempts fail
        break
      }
    }
  }

  // All attempts failed to meet threshold - return best result with failure flag
  return {
    simplifiedText: bestResult.text || text, // Fallback to original
    similarity: bestResult.similarity,
    quality: 'failed',
    retryAttempt
  }
}

// Calculate semantic similarity between original and simplified text
const calculateSemanticSimilarity = (original: string, simplified: string): number => {
  // Simple heuristic-based similarity calculation
  // In production, this could use embeddings or more sophisticated NLP
  
  const originalWords = original.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const simplifiedWords = simplified.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  
  // Key concept preservation (important words retained)
  const importantWords = originalWords.filter(w => w.length > 4) // Longer words likely more important
  const preservedImportant = importantWords.filter(w => 
    simplifiedWords.some(sw => sw.includes(w) || w.includes(sw))
  )
  const conceptPreservation = preservedImportant.length / Math.max(importantWords.length, 1)
  
  // Length ratio (simplified shouldn't be too different in length)
  const lengthRatio = Math.min(simplified.length, original.length) / Math.max(simplified.length, original.length)
  
  // Word overlap ratio
  const commonWords = originalWords.filter(w => simplifiedWords.includes(w))
  const wordOverlap = commonWords.length / Math.max(originalWords.length, 1)
  
  // Structural similarity (sentence count shouldn't change dramatically)
  const originalSentences = original.split(/[.!?]+/).length
  const simplifiedSentences = simplified.split(/[.!?]+/).length
  const structuralRatio = Math.min(originalSentences, simplifiedSentences) / Math.max(originalSentences, simplifiedSentences)
  
  // Combined similarity score (weighted average)
  const similarity = (
    conceptPreservation * 0.4 +    // 40% weight on preserving key concepts
    wordOverlap * 0.25 +            // 25% weight on word overlap  
    lengthRatio * 0.20 +            // 20% weight on appropriate length
    structuralRatio * 0.15          // 15% weight on structural preservation
  )
  
  return Math.min(1.0, Math.max(0.0, similarity))
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
    const useAI = searchParams.get('ai') !== 'false' // Enable AI by default
    
    // Validate CEFR level
    if (!DISPLAY_CONFIG[level]) {
      return NextResponse.json(
        { error: `Invalid CEFR level: ${level}. Must be A1, A2, B1, B2, C1, or C2` },
        { status: 400 }
      )
    }

    // Get user ID for AI calls (required for Claude service)
    // For external books, we still need to check auth to enable AI features
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let userId = user?.id || 'anonymous'
    
    console.log(`🔐 Auth check: userId = ${userId}, user = ${user ? user.email : 'null'}, useAI = ${useAI}`)

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

    const originalChunk = chunks[chunkIndex]
    let finalContent = originalChunk
    let aiResult = null
    let source = 'chunked'

    // Apply AI simplification if enabled and user is authenticated
    console.log(`🤖 AI check: useAI=${useAI}, userId=${userId}, condition=${useAI && userId !== 'anonymous'}`)
    if (useAI && userId !== 'anonymous') {
      try {
        console.log(`Starting AI simplification for ${id}, level ${level}, chunk ${chunkIndex}`)
        aiResult = await simplifyTextWithAI(originalChunk, level, userId)
        
        // Check if AI simplification was successful (passed similarity gate)
        if (aiResult.quality !== 'failed') {
          finalContent = aiResult.simplifiedText
          source = 'ai_simplified'
          console.log(`AI simplification successful: quality=${aiResult.quality}, similarity=${aiResult.similarity.toFixed(3)}`)
        } else {
          console.log(`AI simplification failed similarity gate: ${aiResult.similarity.toFixed(3)} < 0.82, using original chunk`)
          source = 'fallback_chunked'
        }
      } catch (error) {
        console.error('AI simplification error:', error)
        // Fallback to chunked text
        source = 'fallback_chunked'
      }
    }

    // Cache the result for future requests
    try {
      const cacheData = {
        bookId: id,
        targetLevel: level,
        chunkIndex: chunkIndex,
        originalText: originalChunk,
        simplifiedText: finalContent,
        vocabularyChanges: [], // Could be enhanced with vocabulary analysis
        culturalAnnotations: [], // Could be enhanced with cultural context analysis
        qualityScore: aiResult?.similarity || 1.0
      }

      await prisma.bookSimplification.create({ data: cacheData })
      console.log(`Cached simplification for ${id}, level ${level}, chunk ${chunkIndex}`)
    } catch (cacheError) {
      console.warn('Failed to cache simplification:', cacheError)
      // Continue without caching
    }

    // Prepare response with similarity gate information
    const response: any = {
      success: true,
      content: finalContent,
      level: level,
      chunkIndex: chunkIndex,
      totalChunks: chunks.length,
      source: source,
      displayConfig: DISPLAY_CONFIG[level],
      vocabularyChanges: [],
      culturalAnnotations: [],
      qualityScore: aiResult?.similarity || 1.0,
      stats: {
        originalLength: originalChunk.length,
        simplifiedLength: finalContent.length,
        compressionRatio: `${Math.round((finalContent.length / originalChunk.length) * 100)}%`,
        wordsPerChunk: DISPLAY_CONFIG[level].wordsPerScreen
      }
    }

    // Add AI-specific metadata if available
    if (aiResult) {
      response.aiMetadata = {
        similarity: parseFloat(aiResult.similarity.toFixed(3)),
        quality: aiResult.quality,
        retryAttempts: aiResult.retryAttempt,
        passedSimilarityGate: aiResult.quality !== 'failed',
        similarityThreshold: 0.82
      }
    }

    // Add micro-hint for failed simplifications
    if (source === 'fallback_chunked' && aiResult) {
      response.microHint = 'Simplification unavailable - showing original text chunked for easier reading'
    }

    return NextResponse.json(response)

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