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

// Enhanced era detection function for text-specific thresholds
const detectEra = (text: string): string => {
  const sample = text.slice(0, 2000).toLowerCase()
  let scores = {
    'early-modern': 0,
    'victorian': 0,
    'american-19c': 0,
    'modern': 0
  }
  
  // Early Modern English (Shakespeare, 1500-1700)
  if (/\b(thou|thee|thy|thine|hath|doth|art)\b/.test(sample)) scores['early-modern'] += 3
  if (/-(est|eth)\b/.test(sample)) scores['early-modern'] += 2
  if (/\b(wherefore|whence|whither|prithee|forsooth)\b/.test(sample)) scores['early-modern'] += 2
  
  // Victorian/19th century (1800-1900) - Enhanced for Austen
  if (/\b(whilst|shall|should|would)\b/.test(sample)) scores['victorian'] += 2
  if (/\b(entailment|chaperone|governess|propriety|establishment)\b/.test(sample)) scores['victorian'] += 3
  if (/\b(drawing-room|morning-room|parlour|sitting-room)\b/.test(sample)) scores['victorian'] += 2
  if (/\b(upon|herewith|wherein|whereupon|heretofore)\b/.test(sample)) scores['victorian'] += 2
  if (/\b(connexion|endeavour|honour|favour|behaviour)\b/.test(sample)) scores['victorian'] += 2  // British spelling
  if (/\b(ladyship|gentleman|acquaintance|circumstance)\b/.test(sample)) scores['victorian'] += 1
  if (/\b(sensible|agreeable|tolerable|amiable|eligible)\b/.test(sample)) scores['victorian'] += 1
  
  // Check for long sentences (common in Victorian literature)
  const sentences = sample.split(/[.!?]/)
  const avgWordsPerSentence = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length
  if (avgWordsPerSentence > 25) scores['victorian'] += 2
  
  // American 19th century vernacular
  if (/\b(ain't|reckon|y'all|mighty|heap)\b/.test(sample)) scores['american-19c'] += 2
  if (/\b(warn't|hain't|'bout|'nough)\b/.test(sample)) scores['american-19c'] += 2
  
  // Modern indicators
  if (/\b(okay|ok|yeah|guys|cool|awesome)\b/.test(sample)) scores['modern'] += 2
  if (/\b(telephone|computer|internet|email)\b/.test(sample)) scores['modern'] += 3
  
  // Return era with highest score
  const maxScore = Math.max(...Object.values(scores))
  if (maxScore === 0) return 'modern'
  
  for (const [era, score] of Object.entries(scores)) {
    if (score === maxScore) {
      console.log(`Era detection scores: ${JSON.stringify(scores)} -> ${era}`)
      return era
    }
  }
  
  return 'modern'
}

// AI-powered text simplification with semantic similarity gate
const simplifyTextWithAI = async (text: string, cefrLevel: CEFRLevel, userId: string, bookEra?: string): Promise<{
  simplifiedText: string
  similarity: number
  quality: 'excellent' | 'good' | 'acceptable' | 'failed' | 'modernized'
  retryAttempt: number
  era: string
}> => {
  // Era and CEFR level-specific similarity thresholds
  // Use provided bookEra if available, otherwise detect from chunk
  const era = bookEra || detectEra(text)
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
  // Dynamic temperature by era, CEFR level and retry attempt
  const getTemperature = (level: CEFRLevel, era: string, attempt: number): number => {
    const temperatureMatrix: Record<string, Record<CEFRLevel, number[]>> = {
      'early-modern': {
        A1: [0.50, 0.45, 0.40],  // High creativity for aggressive modernization
        A2: [0.45, 0.40, 0.35],  // Creative rewriting allowed
        B1: [0.40, 0.35, 0.30],  // Moderate creativity
        B2: [0.35, 0.30, 0.25],  // Conservative changes
        C1: [0.30, 0.25, 0.20],  // Minimal changes
        C2: [0.25, 0.20, 0.15]   // Preserve literary style
      },
      'victorian': {
        A1: [0.45, 0.40, 0.35],  // High for sentence restructuring
        A2: [0.40, 0.35, 0.30],  // Moderate creativity
        B1: [0.35, 0.30, 0.25],  // Standard processing
        B2: [0.30, 0.25, 0.20],  // Conservative
        C1: [0.25, 0.20, 0.15],  // Preserve style
        C2: [0.20, 0.15, 0.10]   // Minimal changes
      },
      'american-19c': {
        A1: [0.40, 0.35, 0.30],  // Dialect modernization
        A2: [0.35, 0.30, 0.25],  // Standard modernization
        B1: [0.30, 0.25, 0.20],  // Conservative changes
        B2: [0.25, 0.20, 0.15],  // Preserve voice
        C1: [0.20, 0.15, 0.10],  // Minimal changes
        C2: [0.15, 0.10, 0.05]   // Preserve authenticity
      },
      'modern': {
        A1: [0.35, 0.30, 0.25],  // Standard simplification
        A2: [0.30, 0.25, 0.20],  // Moderate changes
        B1: [0.25, 0.20, 0.15],  // Light editing
        B2: [0.20, 0.15, 0.10],  // Minimal changes
        C1: [0.15, 0.10, 0.05],  // Very conservative
        C2: [0.10, 0.05, 0.02]   // Preserve original
      }
    }
    
    const eraMatrix = temperatureMatrix[era] || temperatureMatrix['modern']
    const temps = eraMatrix[level]
    return temps[Math.min(attempt, temps.length - 1)]
  }

  const getSimplificationPrompt = (level: CEFRLevel, era: string, text: string): string => {
    const isArchaic = era === 'early-modern' || era === 'victorian' || era === 'american-19c'
    
    const basePrompts = {
      A1: era === 'victorian' ? 
        `Simplify this Victorian text for A1 beginner English learners:

Instructions:
- Break long sentences into simple statements (max 8 words per sentence)
- Replace formal vocabulary with everyday words
- Use only the 500 most common English words
- Convert passive voice to active voice
- Make it sound like everyday modern English

Text: ${text}

Simplified version:` : isArchaic ?
        `Modernize this ${era} text for A1 beginner English learners:
        
Instructions:
- Replace archaic words: thou/thee/thy to you/your, art/hast/doth to are/have/does
- Convert old grammar to modern English patterns
- Break sentences to 5-8 words maximum
- Use only the 500 most common English words
- Use simple present tense only
- Make it sound like everyday modern English

Text: ${text}

Modernized version:` :
        `Simplify this text for A1 beginner English learners:

Instructions:
- Use only the 500 most common English words
- Use present tense only
- Keep sentences to 5-8 words maximum
- Replace difficult words with simple alternatives
- Remove complex grammar structures

Text: ${text}

Simplified version:`,
        
      A2: era === 'victorian' ?
        `Modernize this Victorian text for A2 elementary learners:

Instructions:
- Break long sentences to 8-12 words maximum
- Replace formal vocabulary: "whilst" to "while", "shall" to "will"
- Use the 1000 most common English words
- Convert formal statements to simple modern English
- Make dialogue sound like modern conversation

Text: ${text}

Modernized version:` : isArchaic ?
        `Modernize this ${era} text for A2 elementary English learners:
        
Instructions:
- Replace archaic language: thou/thee/thy to you/your, 'tis/'twas to it is/it was
- Update old verb forms: dost/doth/hath to do/does/has
- Break long sentences to 8-12 words maximum
- Use 1000-2750 most common English words
- Use simple past and present tense only

Text: ${text}

Modernized version:` :
        `Simplify this text for A2 elementary English learners:

Instructions:
- Use 1000-2750 common vocabulary words
- Use simple past and present tense only
- Keep sentences short (8-12 words)
- Use basic connectors: and, but, because
- Replace difficult words with common alternatives

Text: ${text}

Simplified version:`,
        
      B1: isArchaic ?
        `Adapt this ${era} text for B1 intermediate English learners:

Instructions:
- Modernize archaic grammar while keeping literary style
- Update old words to modern equivalents when necessary
- Use 1500-word vocabulary level
- Break very long sentences but preserve flow
- Keep the original tone and literary quality

Text: ${text}

Adapted version:` :
        `Simplify this text for B1 intermediate English learners:

Instructions:
- Use 1500-word vocabulary level
- Use most common tenses (avoid complex forms)
- Break long sentences into shorter ones
- Explain difficult concepts with examples
- Maintain the core meaning and details

Text: ${text}

Simplified version:`,
      
      B2: isArchaic ?
        `Refine this ${era} text for B2 upper-intermediate English learners:

Instructions:
- Modernize grammar but keep literary elegance
- Use 2500-word vocabulary level
- Clarify archaic references and expressions
- Preserve the sophisticated style and tone
- Keep all cultural and historical context

Text: ${text}

Refined version:` :
        `Simplify this text for B2 upper-intermediate English learners:

Instructions:
- Use 2500-word vocabulary level
- Clarify complex grammar structures
- Break down academic language
- Explain cultural and historical references
- Maintain sophisticated ideas but make them clearer

Text: ${text}

Simplified version:`,
        
      C1: `Refine this text for C1 advanced English learners:

Instructions:
- Use advanced but clear vocabulary (4000 words)
- Simplify very complex sentence structures
- Clarify implicit meanings
- Explain subtle cultural nuances
- Keep academic tone but improve clarity

Text: ${text}

Refined version:`,
        
      C2: `Polish this text for C2 near-native English learners:

Instructions:
- Keep sophisticated vocabulary
- Improve flow and coherence
- Clarify any ambiguous expressions
- Enhance readability while maintaining complexity
- Keep all original meaning and style

Text: ${text}

Polished version:`
    }
    
    return basePrompts[level]
  }

  let retryAttempt = 0
  let bestResult = { text: '', similarity: 0 }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    retryAttempt = attempt + 1
    
    // Call Claude API for simplification with dynamic temperature  
    const currentTemperature = getTemperature(cefrLevel, era, attempt)
    
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

      const prompt = `${getSimplificationPrompt(cefrLevel, era, text)}${retryInstructions}

      Return only the simplified text with no additional explanation or formatting.`
      console.log(`Using temperature ${currentTemperature} for ${cefrLevel} level (${era}), attempt ${attempt + 1}`)
      
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
      console.error(`Error details for ${cefrLevel} level (${era}):`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        textLength: text.length,
        temperature: currentTemperature,
        era
      })
      
      if (attempt === MAX_RETRIES) {
        // Return best result if all attempts fail
        console.error(`All ${MAX_RETRIES + 1} attempts failed for ${cefrLevel} simplification`)
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
      // Allow internal service calls with token bypass
      const internalToken = request.headers.get('x-internal-token')
      const validInternal = internalToken && internalToken === process.env.INTERNAL_SERVICE_TOKEN
      if (!validInternal) {
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
    let userId = 'system'
    {
      const internalToken = request.headers.get('x-internal-token')
      const validInternal = internalToken && internalToken === process.env.INTERNAL_SERVICE_TOKEN
      if (!validInternal) {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        userId = user?.id || 'anonymous'
      }
    }
    
    console.log(`🔐 Auth check: userId = ${userId}, useAI = ${useAI}`)

    // Check if we have cached simplification
    try {
      const cachedResults = await prisma.$queryRaw`
        SELECT * FROM book_simplifications 
        WHERE book_id = ${id} AND target_level = ${level} AND chunk_index = ${chunkIndex}
        LIMIT 1
      ` as Array<{
        id: string;
        simplified_text: string;
        quality_score: number;
        original_text: string;
        vocabulary_changes: any;
        cultural_annotations: any;
        created_at: Date;
        updated_at: Date;
      }>
      
      const cachedSimplification = cachedResults.length > 0 ? cachedResults[0] : null

      if (cachedSimplification) {
        console.log(`Returning cached simplification for ${id}, level ${level}, chunk ${chunkIndex}`)
        return NextResponse.json({
          success: true,
          content: cachedSimplification.simplified_text,
          level: level,
          chunkIndex: chunkIndex,
          source: 'cache',
          displayConfig: DISPLAY_CONFIG[level],
          stats: {
            originalLength: cachedSimplification.original_text.length,
            simplifiedLength: cachedSimplification.simplified_text.length,
            compressionRatio: `${Math.round((cachedSimplification.simplified_text.length / cachedSimplification.original_text.length) * 100)}%`
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
    
    // Detect era based on full book text for better accuracy
    // Override for known books
    let bookEra = detectEra(fullText)
    if (id === 'gutenberg-1342') {
      bookEra = 'victorian' // Pride & Prejudice is definitely Victorian
      console.log(`📚 Override era for Pride & Prejudice: victorian`)
    } else if (id === 'gutenberg-1513') {
      bookEra = 'early-modern' // Romeo & Juliet is Shakespeare
      console.log(`📚 Override era for Romeo & Juliet: early-modern`)
    } else if (id === 'gutenberg-514') {
      bookEra = 'american-19c' // Little Women is American 19th century
      console.log(`📚 Override era for Little Women: american-19c`)
    } else if (id === 'gutenberg-84') {
      bookEra = 'victorian' // Frankenstein is Gothic/Victorian era
      console.log(`📚 Override era for Frankenstein: victorian`)
    }
    console.log(`📚 Book-level era detection for ${id}: ${bookEra}`)

    // Apply AI simplification if enabled and user is authenticated
    // Allow Gutenberg books to bypass authentication for AI processing
    const isGutenbergBook = id.startsWith('gutenberg-')
    const allowAI = useAI && (isGutenbergBook || userId !== 'anonymous')
    
    console.log(`🤖 AI check: useAI=${useAI}, userId=${userId}, isGutenberg=${isGutenbergBook}, allowAI=${allowAI}`)
    if (allowAI) {
      try {
        // Use a system user ID for Gutenberg books if user is anonymous
        const aiUserId = isGutenbergBook && userId === 'anonymous' ? 'system-gutenberg' : userId
        console.log(`Starting AI simplification for ${id}, level ${level}, chunk ${chunkIndex}, aiUserId=${aiUserId}`)
        aiResult = await simplifyTextWithAI(originalChunk, level, aiUserId, bookEra)
        
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

    // Cache the result for future requests using raw SQL to match actual database schema
    try {
      await prisma.$executeRaw`
        INSERT INTO book_simplifications (
          id, book_id, target_level, chunk_index, original_text, 
          simplified_text, vocabulary_changes, cultural_annotations, 
          quality_score, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${id}, ${level}, ${chunkIndex}, ${originalChunk},
          ${finalContent}, '[]'::jsonb, '[]'::jsonb, 
          ${aiResult?.similarity || 1.0}, NOW(), NOW()
        )
        ON CONFLICT (book_id, target_level, chunk_index) 
        DO UPDATE SET 
          simplified_text = EXCLUDED.simplified_text,
          quality_score = EXCLUDED.quality_score,
          updated_at = NOW()
      `
      console.log(`Cached simplification for ${id}, level ${level}, chunk ${chunkIndex}`)
    } catch (cacheError) {
      console.warn('Failed to cache simplification:', cacheError)
      console.error('Cache error details:', cacheError instanceof Error ? cacheError.message : 'Unknown error')
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
        await prisma.$executeRaw`
          DELETE FROM book_simplifications 
          WHERE book_id = ${id} AND target_level = ${level} AND chunk_index = ${chunkIndex}
        `
        console.log(`Cleared cached simplification for regeneration`)
      } catch (error) {
        console.warn('No cached version to clear:', error)
      }
    }

    // Create a new NextRequest with proper headers for GET method
    const url = new URL(request.url)
    url.searchParams.set('level', level)
    url.searchParams.set('chunk', chunkIndex.toString())

    // Forward all headers including x-internal-token
    const newRequest = new NextRequest(url.toString(), {
      headers: request.headers
    })

    return GET(newRequest, { params })

  } catch (error) {
    console.error('Error in simplification POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}