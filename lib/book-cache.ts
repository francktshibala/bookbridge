import { LRUCache } from 'lru-cache'
import { prisma } from './prisma'
import { ContentChunk } from './content-chunker'

export interface CachedBookContent {
  bookId: string
  title: string
  author: string
  chunks: ContentChunk[]
  totalChunks: number
  metadata: any
  lastProcessed: Date
  indexed: boolean
}

export interface ProcessingStatus {
  bookId: string
  status: 'processing' | 'completed' | 'failed'
  progress: number
  startedAt: Date
  completedAt?: Date
  error?: string
}

class BookCacheService {
  private contentCache = new LRUCache<string, CachedBookContent>({
    max: 50, // Cache up to 50 books
    ttl: 1000 * 60 * 60 * 24 * 7, // 1 week
    sizeCalculation: (value) => {
      // Rough size estimation based on chunks
      return value.chunks.length * 1000 // ~1KB per chunk
    },
    maxSize: 100 * 1024 * 1024 // 100MB max cache size
  })

  private processingStatus = new Map<string, ProcessingStatus>()

  // Check if book is cached and ready
  async isBookCached(bookId: string): Promise<boolean> {
    // First check memory cache
    if (this.contentCache.has(bookId)) {
      return true
    }

    // Check database cache
    try {
      const cached = await prisma.bookCache.findUnique({
        where: { bookId },
        select: { id: true, chunks: true }
      })
      return !!cached && !!cached.chunks && Array.isArray(cached.chunks) && cached.chunks.length > 0
    } catch (error) {
      console.error('Error checking book cache:', error)
      return false
    }
  }

  // Get cached book content
  async getCachedContent(bookId: string): Promise<CachedBookContent | null> {
    // Try memory cache first
    const memoryCache = this.contentCache.get(bookId)
    if (memoryCache) {
      console.log('Book content found in memory cache')
      return memoryCache
    }

    // Try database cache
    try {
      const dbCache = await prisma.bookCache.findUnique({
        where: { bookId },
        include: { book: true }
      })

      if (dbCache && dbCache.chunks) {
        const content: CachedBookContent = {
          bookId,
          title: dbCache.book.title,
          author: dbCache.book.author || 'Unknown',
          chunks: dbCache.chunks as unknown as ContentChunk[],
          totalChunks: Array.isArray(dbCache.chunks) ? dbCache.chunks.length : 0,
          metadata: dbCache.metadata as any || {},
          lastProcessed: dbCache.lastProcessed,
          indexed: dbCache.indexed
        }

        // Store in memory cache for next time
        this.contentCache.set(bookId, content)
        console.log('Book content loaded from database cache')
        return content
      }
    } catch (error) {
      console.error('Error loading from database cache:', error)
    }

    return null
  }

  // Cache book content
  async cacheContent(content: CachedBookContent): Promise<void> {
    try {
      // Store in memory cache
      this.contentCache.set(content.bookId, content)

      // Store in database cache
      await prisma.bookCache.upsert({
        where: { bookId: content.bookId },
        update: {
          chunks: content.chunks as any,
          totalChunks: content.totalChunks,
          metadata: content.metadata as any,
          lastProcessed: content.lastProcessed,
          indexed: content.indexed
        },
        create: {
          bookId: content.bookId,
          chunks: content.chunks as any,
          totalChunks: content.totalChunks,
          metadata: content.metadata as any,
          lastProcessed: content.lastProcessed,
          indexed: content.indexed
        }
      })

      console.log(`Book ${content.bookId} cached successfully with ${content.totalChunks} chunks`)
    } catch (error) {
      console.error('Error caching book content:', error)
      throw error
    }
  }

  // Check processing status
  getProcessingStatus(bookId: string): ProcessingStatus | null {
    return this.processingStatus.get(bookId) || null
  }

  // Set processing status
  setProcessingStatus(bookId: string, status: Partial<ProcessingStatus>): void {
    const existing = this.processingStatus.get(bookId)
    const updated: ProcessingStatus = {
      bookId,
      status: status.status || 'processing',
      progress: status.progress || 0,
      startedAt: status.startedAt || existing?.startedAt || new Date(),
      completedAt: status.completedAt,
      error: status.error
    }
    this.processingStatus.set(bookId, updated)
  }

  // Find relevant chunks from cached content
  async findRelevantCachedChunks(
    bookId: string,
    query: string,
    maxChunks: number = 5
  ): Promise<ContentChunk[]> {
    const content = await this.getCachedContent(bookId)
    if (!content) {
      throw new Error(`Book ${bookId} not found in cache`)
    }

    // Enhanced keyword-based relevance scoring
    const queryLower = query.toLowerCase()
    const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 1) // Include 2-letter words
    
    // Add semantic variations and synonyms for better matching
    const enhancedTerms = this.expandQueryTerms(queryTerms)
    
    const scoredChunks = content.chunks.map(chunk => {
      const chunkText = chunk.content.toLowerCase()
      let score = 0
      
      // Score based on query term frequency
      enhancedTerms.forEach(termGroup => {
        const primaryTerm = termGroup.primary
        const variations = termGroup.variations
        
        // Score primary term matches
        const escapedTerm = primaryTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const primaryMatches = (chunkText.match(new RegExp(`\\b${escapedTerm}\\b`, 'g')) || []).length
        score += primaryMatches * 15 // Increased weight for exact matches
        
        // Score variation matches (lower weight)
        variations.forEach(variation => {
          const escapedVariation = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const variationMatches = (chunkText.match(new RegExp(`\\b${escapedVariation}\\b`, 'g')) || []).length
          score += variationMatches * 8
        })
      })
      
      // Bonus for exact phrase matches (only once per chunk)
      if (chunkText.includes(queryLower)) {
        score += 75 // Increased bonus for exact phrase
      }
      
      // Bonus for partial phrase matches (consecutive terms)
      if (queryTerms.length > 1) {
        for (let i = 0; i < queryTerms.length - 1; i++) {
          const phrase = `${queryTerms[i]} ${queryTerms[i + 1]}`
          if (chunkText.includes(phrase)) {
            score += 30
          }
        }
      }
      
      // Bonus for chapter titles containing query terms
      if (chunk.chapterTitle) {
        const titleText = chunk.chapterTitle.toLowerCase()
        queryTerms.forEach(term => {
          if (titleText.includes(term)) {
            score += 25 // Increased title bonus
          }
        })
        
        // Extra bonus for exact query in title
        if (titleText.includes(queryLower)) {
          score += 100
        }
      }
      
      // Proximity bonus - terms appearing close together
      if (queryTerms.length > 1) {
        const proximityScore = this.calculateProximityScore(chunkText, queryTerms)
        score += proximityScore
      }

      return { chunk, score }
    })

    // Sort by relevance score and return top chunks, ensuring we get results
    const filteredChunks = scoredChunks.filter(item => item.score > 0)
    
    // If no scored matches, fall back to any chunks containing any query terms
    if (filteredChunks.length === 0) {
      const fallbackChunks = content.chunks
        .filter(chunk => {
          const chunkText = chunk.content.toLowerCase()
          return queryTerms.some(term => chunkText.includes(term))
        })
        .slice(0, maxChunks)
        .map(chunk => ({ chunk, score: 1 }))
      
      return fallbackChunks.map(item => item.chunk)
    }
    
    return filteredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks)
      .map(item => item.chunk)
  }

  // Expand query terms with semantic variations and synonyms
  private expandQueryTerms(queryTerms: string[]): Array<{ primary: string; variations: string[] }> {
    const synonymMap: Record<string, string[]> = {
      'controversial': ['scandalous', 'provocative', 'contentious', 'inflammatory', 'shocking'],
      'memoir': ['autobiography', 'memoirs', 'biography', 'life story', 'personal account'],
      'writing': ['prose', 'literature', 'text', 'composition', 'narrative'],
      'style': ['manner', 'approach', 'method', 'technique', 'way'],
      'love': ['romance', 'passion', 'affection', 'relationship', 'affair'],
      'death': ['dying', 'mortality', 'demise', 'passing', 'end'],
      'war': ['battle', 'conflict', 'warfare', 'fighting', 'combat'],
      'power': ['authority', 'control', 'influence', 'dominance', 'rule'],
      'religion': ['faith', 'belief', 'spiritual', 'religious', 'church'],
      'politics': ['political', 'government', 'democracy', 'republic', 'state'],
      'society': ['social', 'cultural', 'civilization', 'community', 'public'],
      'character': ['personality', 'individual', 'person', 'figure', 'nature'],
      'theme': ['motif', 'subject', 'topic', 'idea', 'concept'],
      'analysis': ['examination', 'study', 'interpretation', 'review', 'critique']
    }
    
    return queryTerms.map(term => ({
      primary: term,
      variations: synonymMap[term] || []
    }))
  }

  // Calculate proximity score for terms appearing near each other
  private calculateProximityScore(text: string, queryTerms: string[]): number {
    const words = text.split(/\s+/)
    let proximityScore = 0
    
    for (let i = 0; i < queryTerms.length - 1; i++) {
      const term1 = queryTerms[i]
      const term2 = queryTerms[i + 1]
      
      const positions1 = words.map((word, index) => word.includes(term1) ? index : -1).filter(pos => pos !== -1)
      const positions2 = words.map((word, index) => word.includes(term2) ? index : -1).filter(pos => pos !== -1)
      
      // Find closest positions
      for (const pos1 of positions1) {
        for (const pos2 of positions2) {
          const distance = Math.abs(pos1 - pos2)
          if (distance <= 10) { // Within 10 words
            proximityScore += Math.max(0, 20 - distance * 2) // Closer = higher score
          }
        }
      }
    }
    
    return proximityScore
  }

  // Create context from relevant chunks
  createContextFromChunks(chunks: ContentChunk[], maxWords: number = 3000): string {
    let context = ''
    let wordCount = 0

    for (const chunk of chunks) {
      const chunkWords = chunk.content.split(/\s+/).length
      if (wordCount + chunkWords > maxWords) {
        // Add partial chunk if it fits
        const remainingWords = maxWords - wordCount
        if (remainingWords > 50) { // Only add if we have at least 50 words left
          const words = chunk.content.split(/\s+/)
          const partialContent = words.slice(0, remainingWords).join(' ') + '...'
          context += `\n\n--- ${chunk.chapterTitle || `Chapter ${(chunk as any).chapterNumber || 'Unknown'}`} ---\n${partialContent}`
        }
        break
      }

      context += `\n\n--- ${chunk.chapterTitle || `Chapter ${(chunk as any).chapterNumber || 'Unknown'}`} ---\n${chunk.content}`
      wordCount += chunkWords
    }

    return context.trim()
  }

  // Get quick context for AI queries
  async getQuickContext(
    bookId: string,
    query: string,
    maxWords: number = 3000
  ): Promise<string | null> {
    try {
      const relevantChunks = await this.findRelevantCachedChunks(bookId, query, 5)
      if (relevantChunks.length === 0) {
        return null
      }
      return this.createContextFromChunks(relevantChunks, maxWords)
    } catch (error) {
      console.error('Error getting quick context:', error)
      return null
    }
  }

  // Clear cache for a specific book
  async clearBookCache(bookId: string): Promise<void> {
    this.contentCache.delete(bookId)
    this.processingStatus.delete(bookId)
    
    try {
      await prisma.bookCache.delete({
        where: { bookId }
      })
    } catch (error) {
      console.error('Error clearing database cache:', error)
    }
  }

  // Get cache statistics
  getCacheStats() {
    return {
      memoryCache: {
        size: this.contentCache.size,
        maxSize: this.contentCache.max,
        calculatedSize: this.contentCache.calculatedSize
      },
      processing: Array.from(this.processingStatus.values())
    }
  }
}

export const bookCacheService = new BookCacheService()