import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { contentExtractor } from '../content-extractor';
import { PRIORITY_BOOKS } from '../../scripts/priority-books.js';
import { AudioGenerator } from '../services/audio-generator';


// Service role client for direct database/storage access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BookProcessingJob {
  bookId: string;
  cefrLevel: string;
  chunkIndex: number;
  priority: 'high' | 'normal' | 'background';
  taskType: 'simplification' | 'audio' | 'both';
}

export class BookProcessor {
  private static instance: BookProcessor;
  private processingQueue: Map<string, BookProcessingJob> = new Map();
  private isProcessing = false;
  private audioGenerator: AudioGenerator;

  constructor() {
    this.audioGenerator = new AudioGenerator();
  }

  static getInstance(): BookProcessor {
    if (!BookProcessor.instance) {
      BookProcessor.instance = new BookProcessor();
    }
    return BookProcessor.instance;
  }

  // Detect text era for processing strategy
  private detectEra(text: string): string {
    if (/thou|thee|thy|thine|-eth|-est|'tis|'twas|o'er|e'en|oft|nay/.test(text)) {
      return 'early-modern';
    }
    if (/entailment|chaperone|whilst|shall|endeavour|connexion|herewith/.test(text)) {
      return 'victorian';
    }
    if (/ain't|reckon|y'all|fixin'|warn't/.test(text)) {
      return 'american-19c';
    }
    return 'modern';
  }

  // Chunk text into 400-word segments for consistent content across CEFR levels
  private chunkText(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    const wordsPerChunk = 400;

    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunk = words.slice(i, i + wordsPerChunk).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  // Fetch content directly from Project Gutenberg
  private async fetchFromGutenberg(gutenbergId: string): Promise<string> {
    const urls = [
      `https://www.gutenberg.org/files/${gutenbergId}/${gutenbergId}-0.txt`,
      `https://www.gutenberg.org/files/${gutenbergId}/${gutenbergId}.txt`,
      `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const text = await response.text();
          if (text && text.length > 1000) { // Basic content validation
            console.log(`✅ Fetched from: ${url}`);
            return text;
          }
        }
      } catch (error) {
        console.log(`❌ Failed to fetch from ${url}:`, error);
      }
    }

    throw new Error(`Could not fetch content from Project Gutenberg for ID: ${gutenbergId}`);
  }

  // Store book content in database
  async storeBookContent(bookId: string): Promise<void> {
    console.log(`📚 Processing book content: ${bookId}`);

    // Check if already stored
    const existing = await prisma.bookContent.findUnique({
      where: { bookId }
    });

    if (existing) {
      console.log(`✅ Book ${bookId} already stored`);
      return;
    }

    try {
      // Extract Gutenberg ID from bookId
      const gutenbergId = bookId.replace('gutenberg-', '');
      
      // Find book metadata from priority list
      const bookInfo = PRIORITY_BOOKS.find(b => b.id === bookId);
      if (!bookInfo) {
        throw new Error(`Book info not found in priority list: ${bookId}`);
      }

      // Fetch content directly from Project Gutenberg
      console.log(`Fetching from Project Gutenberg: ${gutenbergId}`);
      const fullText = await this.fetchFromGutenberg(gutenbergId);

      if (!fullText || fullText.trim().length === 0) {
        throw new Error('No content fetched from Project Gutenberg');
      }

      // Clean up the text (remove Gutenberg header/footer)
      const cleanedText = this.cleanGutenbergText(fullText);

      const title = bookInfo.title;
      const author = bookInfo.author;
      const era = bookInfo.era || this.detectEra(cleanedText);

      // Chunk the text
      const chunks = this.chunkText(cleanedText);
      const wordCount = cleanedText.split(/\s+/).length;

      // Store in database
      await prisma.bookContent.create({
        data: {
          bookId,
          title,
          author,
          fullText: cleanedText,
          era,
          wordCount,
          totalChunks: chunks.length
        }
      });

      // Store original chunks
      for (let i = 0; i < chunks.length; i++) {
        await prisma.bookChunk.create({
          data: {
            bookId,
            cefrLevel: 'original',
            chunkIndex: i,
            chunkText: chunks[i],
            wordCount: chunks[i].split(/\s+/).length,
            isSimplified: false
          }
        });
      }

      console.log(`✅ Stored ${bookId}: ${chunks.length} chunks, ${wordCount} words, era: ${era}`);

    } catch (error) {
      console.error(`❌ Error processing ${bookId}:`, error);
      throw error;
    }
  }

  // Clean Project Gutenberg text by removing headers/footers
  private cleanGutenbergText(text: string): string {
    let cleaned = text;

    // Remove Gutenberg header (everything before "*** START OF")
    const startMarker = /\*\*\* START OF (THE|THIS) PROJECT GUTENBERG EBOOK .+ \*\*\*/i;
    const startMatch = cleaned.match(startMarker);
    if (startMatch) {
      cleaned = cleaned.substring(cleaned.indexOf(startMatch[0]) + startMatch[0].length);
    }

    // Remove Gutenberg footer (everything after "*** END OF")
    const endMarker = /\*\*\* END OF (THE|THIS) PROJECT GUTENBERG EBOOK .+ \*\*\*/i;
    const endMatch = cleaned.match(endMarker);
    if (endMatch) {
      cleaned = cleaned.substring(0, cleaned.indexOf(endMatch[0]));
    }

    // Clean up extra whitespace and normalize line breaks
    cleaned = cleaned
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return cleaned;
  }

  // Queue simplification jobs for all CEFR levels
  async queueSimplificationJobs(bookId: string, priority: 'high' | 'normal' | 'background' = 'normal'): Promise<void> {
    const bookContent = await prisma.bookContent.findUnique({
      where: { bookId }
    });

    if (!bookContent) {
      throw new Error(`Book content not found: ${bookId}`);
    }

    const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    for (const cefrLevel of cefrLevels) {
      for (let chunkIndex = 0; chunkIndex < bookContent.totalChunks; chunkIndex++) {
        // Check if already exists
        const existing = await prisma.precomputeQueue.findUnique({
          where: {
            bookId_cefrLevel_chunkIndex_taskType: {
              bookId,
              cefrLevel,
              chunkIndex,
              taskType: 'simplification'
            }
          }
        });

        if (!existing) {
          await prisma.precomputeQueue.create({
            data: {
              bookId,
              cefrLevel,
              chunkIndex,
              priority,
              taskType: 'simplification',
              status: 'pending'
            }
          });
        }
      }
    }

    console.log(`✅ Queued simplification jobs for ${bookId} (${bookContent.totalChunks} chunks × 6 levels)`);
  }

  // Process a single simplification job
  async processSimplificationJob(job: BookProcessingJob): Promise<void> {
    const { bookId, cefrLevel, chunkIndex } = job;

    try {
      // Update status to processing
      await prisma.precomputeQueue.update({
        where: {
          bookId_cefrLevel_chunkIndex_taskType: {
            bookId,
            cefrLevel,
            chunkIndex,
            taskType: 'simplification'
          }
        },
        data: { status: 'processing' }
      });

      // Get original chunk
      const originalChunk = await prisma.bookChunk.findUnique({
        where: {
          bookId_cefrLevel_chunkIndex: {
            bookId,
            cefrLevel: 'original',
            chunkIndex
          }
        }
      });

      if (!originalChunk) {
        throw new Error(`Original chunk not found: ${bookId} chunk ${chunkIndex}`);
      }

      // Call existing simplification API (use proper base URL)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/books/${bookId}/simplify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '' },
        body: JSON.stringify({
          level: cefrLevel,
          chunkIndex
        })
      });

      if (!response.ok) {
        throw new Error(`Simplification API failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Validate response has content
      if (!result.content) {
        throw new Error(`Invalid API response: missing content field`);
      }

      // Generate audio for the simplified text
      let audioFilePath: string | null = null;
      let audioProvider: string | null = null;
      let audioVoiceId: string | null = null;

      try {
        audioFilePath = await this.audioGenerator.generateAudio(
          result.content,
          'alloy',
          bookId,
          chunkIndex,
          cefrLevel
        );
        audioProvider = 'openai';
        audioVoiceId = 'alloy';
        console.log(`🎵 Generated audio: ${audioFilePath}`);
      } catch (audioError) {
        console.error(`⚠️ Audio generation failed for ${bookId} ${cefrLevel} chunk ${chunkIndex}:`, audioError);
        // Continue without audio - don't fail the whole job
      }

      // Store simplified chunk with audio info
      await prisma.bookChunk.create({
        data: {
          bookId,
          cefrLevel,
          chunkIndex,
          chunkText: result.content,
          wordCount: result.content.split(/\s+/).length,
          isSimplified: true,
          qualityScore: result.qualityScore || null,
          audioFilePath,
          audioProvider,
          audioVoiceId
        }
      });

      // Mark job as completed
      await prisma.precomputeQueue.update({
        where: {
          bookId_cefrLevel_chunkIndex_taskType: {
            bookId,
            cefrLevel,
            chunkIndex,
            taskType: 'simplification'
          }
        },
        data: { 
          status: 'completed',
          completedAt: new Date()
        }
      });

      console.log(`✅ Completed: ${bookId} ${cefrLevel} chunk ${chunkIndex}`);

    } catch (error) {
      console.error(`❌ Failed: ${bookId} ${cefrLevel} chunk ${chunkIndex}:`, error);

      // Mark as failed and increment attempts
      await prisma.precomputeQueue.update({
        where: {
          bookId_cefrLevel_chunkIndex_taskType: {
            bookId,
            cefrLevel,
            chunkIndex,
            taskType: 'simplification'
          }
        },
        data: {
          status: 'failed',
          attempts: { increment: 1 },
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  // Process pending jobs in queue
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('🔄 Already processing queue...');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Starting queue processing...');

    try {
      // Get pending jobs ordered by priority
      const jobs = await prisma.precomputeQueue.findMany({
        where: { 
          status: 'pending',
          attempts: { lt: 3 } // Max 3 attempts
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ],
        take: 10 // Process 10 jobs at a time
      });

      console.log(`📋 Found ${jobs.length} pending jobs`);

      for (const dbJob of jobs) {
        const job: BookProcessingJob = {
          bookId: dbJob.bookId,
          cefrLevel: dbJob.cefrLevel,
          chunkIndex: dbJob.chunkIndex,
          priority: dbJob.priority as any,
          taskType: dbJob.taskType as any
        };

        if (job.taskType === 'simplification') {
          await this.processSimplificationJob(job);
        }
        
        // Small delay between jobs to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('❌ Queue processing error:', error);
    } finally {
      this.isProcessing = false;
      console.log('✅ Queue processing completed');
    }
  }

  // Initialize precomputing for all priority books
  async initializePriorityBooks(): Promise<void> {
    console.log('🚀 Initializing priority books precomputing...');

    for (const book of PRIORITY_BOOKS.slice(0, 5)) { // Start with first 5 books
      try {
        console.log(`📚 Processing: ${book.title}`);
        
        // Store book content
        await this.storeBookContent(book.id);
        
        // Queue simplification jobs
        await this.queueSimplificationJobs(book.id, 'background');
        
      } catch (error) {
        console.error(`❌ Failed to initialize ${book.title}:`, error);
      }
    }

    console.log('✅ Priority books initialization completed');
  }

  // Generate audio for existing simplified chunks (backfill operation)
  async generateAudioForExistingChunks(
    bookId?: string,
    levels?: string[]
  ): Promise<{ 
    processed: number; 
    succeeded: number; 
    failed: number; 
    errors: string[] 
  }> {
    console.log('🎵 Starting audio generation for existing simplified chunks...');
    if (bookId) {
      console.log(`📚 Filtering by bookId: ${bookId}`);
      if (levels && levels.length > 0) {
        console.log(`📊 Filtering by levels: ${levels.join(', ')}`);
      }
    }
    
    // Build where clause based on filters
    const whereClause: any = {
      isSimplified: true,
      audioFilePath: null,
      cefrLevel: { not: 'original' }
    };
    
    if (bookId) {
      whereClause.bookId = bookId;
    }
    
    if (levels && levels.length > 0) {
      whereClause.cefrLevel = { in: levels };
    }
    
    // Find all simplified chunks without audio
    const chunksNeedingAudio = await prisma.bookChunk.findMany({
      where: whereClause,
      orderBy: [
        { bookId: 'asc' },
        { cefrLevel: 'asc' }, 
        { chunkIndex: 'asc' }
      ]
    });

    console.log(`📋 Found ${chunksNeedingAudio.length} chunks needing audio generation`);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process chunks with concurrency control
    const CONCURRENCY = 3;
    const DELAY_BETWEEN_JOBS = 1500; // 1.5 seconds
    const MAX_RETRIES = 3;
    
    // Helper function to process a single chunk with retry
    const processChunkWithRetry = async (chunk: any, attemptNum = 1): Promise<boolean> => {
      try {
        console.log(`🎵 Processing ${chunk.bookId} ${chunk.cefrLevel} chunk ${chunk.chunkIndex} (attempt ${attemptNum})`);

        // Generate audio
        const audioFilePath = await this.audioGenerator.generateAudio(
          chunk.chunkText,
          'alloy',
          chunk.bookId,
          chunk.chunkIndex,
          chunk.cefrLevel
        );

        // Update chunk with audio info
        await prisma.bookChunk.update({
          where: { id: chunk.id },
          data: {
            audioFilePath,
            audioProvider: 'openai',
            audioVoiceId: 'alloy'
          }
        });

        console.log(`✅ Generated audio: ${audioFilePath}`);
        return true;

      } catch (error) {
        const errorMsg = `Failed ${chunk.bookId} ${chunk.cefrLevel} chunk ${chunk.chunkIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        
        if (attemptNum < MAX_RETRIES) {
          // Exponential backoff: 2^attempt seconds
          const backoffDelay = Math.pow(2, attemptNum) * 1000;
          console.log(`⚠️ ${errorMsg} - Retrying in ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return processChunkWithRetry(chunk, attemptNum + 1);
        } else {
          console.error(`❌ ${errorMsg} - Max retries exceeded`);
          errors.push(errorMsg);
          return false;
        }
      }
    };
    
    // Process chunks in batches
    for (let i = 0; i < chunksNeedingAudio.length; i += CONCURRENCY) {
      const batch = chunksNeedingAudio.slice(i, i + CONCURRENCY);
      const batchPromises = batch.map(chunk => processChunkWithRetry(chunk));
      
      const results = await Promise.all(batchPromises);
      
      processed += batch.length;
      succeeded += results.filter(r => r).length;
      failed += results.filter(r => !r).length;
      
      console.log(`📊 Progress: ${processed}/${chunksNeedingAudio.length} chunks processed (${succeeded} succeeded, ${failed} failed)`);
      
      // Delay between batches (except for the last batch)
      if (i + CONCURRENCY < chunksNeedingAudio.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_JOBS));
      }
    }

    console.log(`🎵 Audio generation completed: ${succeeded} succeeded, ${failed} failed out of ${processed} processed`);
    return { processed, succeeded, failed, errors };
  }

  // Get processing statistics
  async getProcessingStats(): Promise<{
    totalJobs: number;
    pendingJobs: number;
    completedJobs: number;
    failedJobs: number;
  }> {
    const [totalJobs, pendingJobs, completedJobs, failedJobs] = await Promise.all([
      prisma.precomputeQueue.count(),
      prisma.precomputeQueue.count({ where: { status: 'pending' } }),
      prisma.precomputeQueue.count({ where: { status: 'completed' } }),
      prisma.precomputeQueue.count({ where: { status: 'failed' } })
    ]);

    return { totalJobs, pendingJobs, completedJobs, failedJobs };
  }
}