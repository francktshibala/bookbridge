import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { claudeService } from '@/lib/ai/claude-service'

// Display configuration - UNIFIED 400 WORDS FOR CONTENT CONSISTENCY
const DISPLAY_CONFIG = {
  A1: { wordsPerScreen: 400, fontSize: '19px', sessionMin: 12 },
  A2: { wordsPerScreen: 400, fontSize: '17px', sessionMin: 18 },
  B1: { wordsPerScreen: 400, fontSize: '17px', sessionMin: 22 },
  B2: { wordsPerScreen: 400, fontSize: '16px', sessionMin: 27 },
  C1: { wordsPerScreen: 400, fontSize: '16px', sessionMin: 30 },
  C2: { wordsPerScreen: 400, fontSize: '16px', sessionMin: 35 }
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

// Era detection function for text-specific thresholds
const detectEra = (text: string): string => {
  const sample = text.slice(0, 1000).toLowerCase()
  
  // Early Modern English (Shakespeare, 1500-1700)
  if (/\b(thou|thee|thy|thine|hath|doth|art)\b/.test(sample) || 
      /-(est|eth)\b/.test(sample) || 
      /\b(wherefore|whence|whither|prithee)\b/.test(sample)) {
    return 'early-modern'
  }
  
  // Victorian/19th century (1800-1900)
  if (/\b(whilst|shall|entailment|chaperone|governess)\b/.test(sample) || 
      /\b(drawing-room|morning-room|upon|herewith)\b/.test(sample)) {
    return 'victorian'
  }
  
  // American 19th century vernacular
  if (/\b(ain't|reckon|y'all|mighty|heap)\b/.test(sample) || 
      /\b(warn't|hain't|'bout|'nough)\b/.test(sample)) {
    return 'american-19c'
  }
  
  return 'modern'
}

// AI-powered text simplification with semantic similarity gate
const simplifyTextWithAI = async (text: string, cefrLevel: CEFRLevel, userId: string): Promise<{
  simplifiedText: string
  similarity: number
  quality: 'excellent' | 'good' | 'acceptable' | 'failed' | 'modernized'
  retryAttempt: number
  era: string
}> => {
  // Era and CEFR level-specific similarity thresholds
  const era = detectEra(text)
  const isArchaic = era === 'early-modern' || era === 'victorian' || era === 'american-19c'
  const isBasicLevel = cefrLevel === 'A1' || cefrLevel === 'A2' || cefrLevel === 'B1'
  
  // Base thresholds by era
  const BASE_THRESHOLDS = {
    'early-modern': 0.65,  // Shakespeare - more lenient
    'victorian': 0.70,     // Austen, Dickens - moderate
    'american-19c': 0.75,  // Twain - slightly lenient  
    'modern': 0.82         // Contemporary - strict
  }
  
  // Tiered threshold reduction for archaic text
  const baseThreshold = BASE_THRESHOLDS[era as keyof typeof BASE_THRESHOLDS] || 0.82
  let SIMILARITY_THRESHOLD = baseThreshold
  
  if (isArchaic) {
    if (cefrLevel === 'A1') {
      SIMILARITY_THRESHOLD = baseThreshold * 0.75  // Most lenient for A1
    } else if (cefrLevel === 'A2') {
      SIMILARITY_THRESHOLD = baseThreshold * 0.80  // Very lenient for A2  
    } else if (cefrLevel === 'B1') {
      SIMILARITY_THRESHOLD = baseThreshold * 0.85  // Moderate for B1
    }
    // B2+ uses baseThreshold (no reduction)
  }
  const MAX_RETRIES = 2
  
  const reductionNote = isArchaic && SIMILARITY_THRESHOLD < baseThreshold ? 
    ` (reduced from ${baseThreshold})` : ''
  console.log(`Detected era: ${era}, CEFR: ${cefrLevel}, using threshold: ${SIMILARITY_THRESHOLD}${reductionNote}`)

  // Era-aware CEFR-specific simplification prompts
  // Dynamic temperature by CEFR level and retry attempt
  const getTemperature = (level: CEFRLevel, attempt: number): number => {
    const temperatureMatrix = {
      A1: [0.45, 0.40, 0.35], // Start high for creative rewriting
      A2: [0.40, 0.35, 0.30], // Moderate creativity
      B1: [0.35, 0.30, 0.25], // Balanced approach
      B2: [0.30, 0.25, 0.20], // More conservative
      C1: [0.25, 0.20, 0.15], // Minimal changes
      C2: [0.20, 0.15, 0.10]  // Very conservative
    }
    return temperatureMatrix[level]?.[Math.min(attempt, 2)] || 0.25
  }

  const getSimplificationPrompt = (level: CEFRLevel, era: string): string => {
    const isArchaic = era === 'early-modern' || era === 'victorian' || era === 'american-19c'
    
    const basePrompts = {
      A1: isArchaic ? 
        `COMPLETELY MODERNIZE this ${era} text for A1 beginner English learners:
        - Replace ALL archaic words immediately: thou/thee/thy→you/your, art/hast/doth→are/have/does
        - Convert ALL old grammar to modern English patterns
        - Break EVERY sentence to 5-8 words maximum
        - Use ONLY the 500 most common English words
        - Don't preserve poetic structure - clarity is the ONLY priority
        - Completely rewrite if needed for understanding
        - Use simple present tense only
        - Make it sound like everyday modern English` :
        `Aggressively simplify this text for an A1 beginner English learner:
        - Use only the 500 most common English words
        - Use present tense only
        - Keep sentences to 5-8 words maximum
        - Replace ALL difficult words with simple alternatives
        - Remove ALL complex grammar structures
        - Rewrite completely if needed for clarity`,
        
      A2: isArchaic ?
        `AGGRESSIVELY MODERNIZE this ${era} text for A2 elementary English learners:
        - Replace ALL archaic language: thou/thee/thy→you/your, 'tis/'twas→it is/it was
        - Update ALL old verb forms: dost/doth/hath→do/does/has
        - Break long sentences to 8-12 words maximum
        - Use ONLY 1000-2750 most common English words
        - Prioritize understanding over literary style
        - Rewrite complex structures completely
        - Use simple past and present tense only
        - Make it readable for elementary learners` :
        `Strongly simplify this text for an A2 elementary English learner:
        - Use only 1000-2750 common vocabulary words
        - Use simple past and present tense only
        - Keep sentences short (8-12 words)
        - Use basic connectors: and, but, because
        - Replace ALL difficult words with common alternatives
        - Rewrite complex sentences completely`,
        
      B1: isArchaic ?
        `Adapt this ${era} text for a B1 intermediate English learner:
        - Modernize archaic grammar while keeping the literary style
        - Update old words to modern equivalents when necessary
        - Use 1500-word vocabulary level
        - Break very long sentences but preserve flow
        - KEEP the original tone and literary quality
        - Maintain all plot details and character development` :
        `Simplify this text for a B1 intermediate English learner:
        - Use 1500-word vocabulary level
        - Use most common tenses (avoid complex forms)
        - Break long sentences into shorter ones
        - Explain difficult concepts with examples
        - Keep paragraph structure
        - Maintain the core meaning and details`,
      
      B2: isArchaic ?
        `Refine this ${era} text for a B2 upper-intermediate English learner:
        - Modernize grammar but keep literary elegance
        - Use 2500-word vocabulary level
        - Clarify archaic references and expressions
        - PRESERVE the sophisticated style and tone
        - Keep all cultural and historical context
        - Maintain the author's voice and literary devices` :
        `Simplify this text for a B2 upper-intermediate English learner:
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
    
    return basePrompts[level]
  }

  let retryAttempt = 0
  let bestResult = { text: '', similarity: 0 }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    retryAttempt = attempt + 1
    
    try {
      // Add retry-specific instructions for conservative approaches
      const retryInstructions = attempt > 0 ? `
      
      IMPORTANT: This is retry attempt ${attempt + 1}. The previous simplification didn't simplify ENOUGH.
      Be MORE AGGRESSIVE this time:
      - Make BIGGER changes to vocabulary
      - COMPLETELY rewrite complex sentences
      - Prioritize clarity over preservation
      - Use simpler words from the allowed vocabulary level
      - Focus on making it EASIER to understand, not preserving style` : ''

      const prompt = `${getSimplificationPrompt(cefrLevel, era)}${retryInstructions}

      Text to simplify:
      "${text}"

      Return only the simplified text with no additional explanation or formatting.`

      // Call Claude API for simplification with dynamic temperature
      const currentTemperature = getTemperature(cefrLevel, retryAttempt)
      console.log(`Using temperature ${currentTemperature} for ${cefrLevel} level, attempt ${retryAttempt + 1}`)
      
      const response = await claudeService.query(prompt, {
        userId,
        maxTokens: Math.min(1500, Math.max(300, text.length * 2)),
        temperature: currentTemperature, // Dynamic temperature by level and attempt
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

      // Skip similarity validation for archaic texts - trust AI simplification completely
      const isArchaicText = era === 'early-modern' || era === 'victorian' || era === 'american-19c'
      if (isArchaicText) {
        console.log(`Archaic text detected (${era}) - skipping similarity gate, trusting AI simplification`)
        const quality = 'modernized' // New quality type for archaic text
        
        return { 
          simplifiedText, 
          similarity, 
          quality, 
          retryAttempt,
          era
        }
      }

      // Check if similarity meets threshold (modern text only)
      if (similarity >= SIMILARITY_THRESHOLD) {
        const quality = similarity >= 0.95 ? 'excellent' : 
                       similarity >= 0.90 ? 'good' : 'acceptable'
        
        return { 
          simplifiedText, 
          similarity, 
          quality, 
          retryAttempt,
          era
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
    retryAttempt,
    era
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
      console.warn(`Chunk index ${chunkIndex} out of range for book ${id} at level ${level}. Available: 0-${chunks.length - 1}`);
      return NextResponse.json(
        { 
          error: `Chunk index ${chunkIndex} out of range. Book has ${chunks.length} chunks at level ${level}`,
          availableChunks: chunks.length,
          validRange: `0-${chunks.length - 1}`,
          suggestedChunk: 0,
          bookId: id,
          level: level
        },
        { status: 400 }
      )
    }

    // Also validate negative chunk indices
    if (chunkIndex < 0) {
      console.warn(`Invalid negative chunk index ${chunkIndex} for book ${id}`);
      return NextResponse.json(
        { 
          error: `Invalid chunk index ${chunkIndex}. Must be 0 or greater`,
          availableChunks: chunks.length,
          validRange: `0-${chunks.length - 1}`,
          suggestedChunk: 0,
          bookId: id,
          level: level
        },
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
          // Calculate the same threshold logic for logging
          const baseThreshold = aiResult.era === 'early-modern' ? 0.65 : 
                               aiResult.era === 'victorian' ? 0.70 : 
                               aiResult.era === 'american-19c' ? 0.75 : 0.82
          const isArchaic = ['early-modern', 'victorian', 'american-19c'].includes(aiResult.era)
          let threshold = baseThreshold
          
          if (isArchaic) {
            if (level === 'A1') {
              threshold = baseThreshold * 0.75
            } else if (level === 'A2') {
              threshold = baseThreshold * 0.80
            } else if (level === 'B1') {
              threshold = baseThreshold * 0.85
            }
          }
          
          console.log(`AI simplification failed similarity gate: ${aiResult.similarity.toFixed(3)} < ${threshold.toFixed(3)} (${aiResult.era} ${level}), using original chunk`)
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
      // Calculate the actual threshold used (same logic as in simplification)
      const baseThreshold = aiResult.era === 'early-modern' ? 0.65 : 
                           aiResult.era === 'victorian' ? 0.70 : 
                           aiResult.era === 'american-19c' ? 0.75 : 0.82
      const isArchaic = ['early-modern', 'victorian', 'american-19c'].includes(aiResult.era)
      let actualThreshold = baseThreshold
      
      if (isArchaic) {
        if (level === 'A1') {
          actualThreshold = baseThreshold * 0.75
        } else if (level === 'A2') {
          actualThreshold = baseThreshold * 0.80
        } else if (level === 'B1') {
          actualThreshold = baseThreshold * 0.85
        }
      }
                       
      response.aiMetadata = {
        similarity: parseFloat(aiResult.similarity.toFixed(3)),
        quality: aiResult.quality,
        retryAttempts: aiResult.retryAttempt,
        passedSimilarityGate: aiResult.quality !== 'failed',
        similarityThreshold: parseFloat(actualThreshold.toFixed(3)),
        detectedEra: aiResult.era,
        isArchaicText: isArchaic,
        thresholdReduced: actualThreshold < baseThreshold,
        cefrLevel: level
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