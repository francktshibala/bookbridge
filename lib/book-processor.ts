import { prisma } from './prisma'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { contentExtractor } from './content-extractor'
import { enhancedContentChunker } from './content-chunker-enhanced'
import { bookCacheService, CachedBookContent } from './book-cache'

export class BookProcessorService {
  private processing = new Set<string>()

  // Process a book and cache its chunks
  async processBook(bookId: string): Promise<CachedBookContent> {
    // Check if already processing
    if (this.processing.has(bookId)) {
      throw new Error(`Book ${bookId} is already being processed`)
    }

    // Check if already cached
    const cached = await bookCacheService.getCachedContent(bookId)
    if (cached) {
      console.log(`Book ${bookId} already cached`)
      return cached
    }

    this.processing.add(bookId)
    bookCacheService.setProcessingStatus(bookId, {
      status: 'processing',
      progress: 0,
      startedAt: new Date()
    })

    try {
      console.log(`Starting background processing for book: ${bookId}`)
      
      // Get book metadata
      bookCacheService.setProcessingStatus(bookId, { progress: 10 })
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: {
          id: true,
          title: true,
          author: true,
          filename: true,
          fileSize: true,
          language: true
        }
      })

      if (!book || !book.filename) {
        throw new Error(`Book ${bookId} not found or has no file`)
      }

      // Download file from storage
      bookCacheService.setProcessingStatus(bookId, { progress: 20 })
      const storageSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      console.log(`Downloading file: ${book.filename}`)
      const { data: fileData, error: downloadError } = await storageSupabase
        .storage
        .from('book-files')
        .download(book.filename)

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`)
      }

      // Extract content
      bookCacheService.setProcessingStatus(bookId, { progress: 40 })
      const fileType = book.filename.split('.').pop()?.toLowerCase() || 'txt'
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      console.log(`Extracting content from ${fileType} file`)
      const extractedContent = await contentExtractor.extract(buffer, fileType)
      
      // Create chunks and index
      bookCacheService.setProcessingStatus(bookId, { progress: 60 })
      console.log(`Creating chunks for book: ${book.title}`)
      const chunks = await enhancedContentChunker.chunkAndIndex(
        book.id,
        extractedContent.text,
        extractedContent.chapters
      )

      // Cache the processed content
      bookCacheService.setProcessingStatus(bookId, { progress: 80 })
      const cachedContent: CachedBookContent = {
        bookId: book.id,
        title: book.title,
        author: book.author || 'Unknown',
        chunks,
        totalChunks: chunks.length,
        metadata: {
          ...extractedContent.metadata,
          fileSize: book.fileSize,
          language: extractedContent.metadata?.language || book.language,
          fileType
        },
        lastProcessed: new Date(),
        indexed: true
      }

      await bookCacheService.cacheContent(cachedContent)
      
      bookCacheService.setProcessingStatus(bookId, {
        status: 'completed',
        progress: 100,
        completedAt: new Date()
      })

      console.log(`Book ${bookId} processed successfully. Created ${chunks.length} chunks.`)
      return cachedContent

    } catch (error) {
      console.error(`Error processing book ${bookId}:`, error)
      bookCacheService.setProcessingStatus(bookId, {
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    } finally {
      this.processing.delete(bookId)
    }
  }

  // Process book in background (non-blocking)
  async processBookBackground(bookId: string): Promise<void> {
    this.processBook(bookId).catch(error => {
      console.error(`Background processing failed for book ${bookId}:`, error)
    })
  }

  // Check if book needs processing
  async needsProcessing(bookId: string): Promise<boolean> {
    // Check if already cached
    const isCached = await bookCacheService.isBookCached(bookId)
    if (isCached) {
      return false
    }

    // Check if currently processing
    if (this.processing.has(bookId)) {
      return false
    }

    // Check processing status
    const status = bookCacheService.getProcessingStatus(bookId)
    if (status && status.status === 'processing') {
      return false
    }

    return true
  }

  // Get processing status for a book
  getProcessingStatus(bookId: string) {
    return bookCacheService.getProcessingStatus(bookId)
  }

  // Process all unprocessed books
  async processAllBooks(): Promise<void> {
    console.log('Starting bulk book processing...')
    
    try {
      // Get all books that don't have cache entries
      const books = await prisma.book.findMany({
        where: {
          filename: { not: null },
          bookCache: null // Books without cache entries
        },
        select: { id: true, title: true },
        take: 10 // Process max 10 at a time
      })

      console.log(`Found ${books.length} books to process`)

      // Process books sequentially to avoid overwhelming the system
      for (const book of books) {
        try {
          if (await this.needsProcessing(book.id)) {
            console.log(`Processing book: ${book.title}`)
            await this.processBook(book.id)
          }
        } catch (error) {
          console.error(`Failed to process book ${book.title}:`, error)
          // Continue with next book
        }
      }

      console.log('Bulk processing completed')
    } catch (error) {
      console.error('Error in bulk processing:', error)
    }
  }

  // Get current processing statistics
  getStats() {
    return {
      currentlyProcessing: Array.from(this.processing),
      cacheStats: bookCacheService.getCacheStats()
    }
  }
}

export const bookProcessorService = new BookProcessorService()