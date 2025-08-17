/**
 * Scalable Multi-Book Processing System
 * Handles 20 books × 280 chunks × 6 CEFR levels = 33,840+ simplifications
 * 
 * Features:
 * - Era-aware batch processing
 * - Robust error recovery
 * - Progress tracking and resume capability
 * - Database optimization for large-scale operations
 * - Real-time monitoring and quality control
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

// Complete 20-book collection configuration
const COMPLETE_BOOK_COLLECTION = [
  // Phase 1: Already Stored (5 books)
  { id: 'gutenberg-1342', title: 'Pride and Prejudice', author: 'Jane Austen', status: 'stored', era: 'victorian', priority: 'high' },
  { id: 'gutenberg-11', title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll', status: 'stored', era: 'victorian', priority: 'high' },
  { id: 'gutenberg-84', title: 'Frankenstein', author: 'Mary Shelley', status: 'stored', era: 'victorian', priority: 'high' },
  { id: 'gutenberg-514', title: 'Little Women', author: 'Louisa May Alcott', status: 'stored', era: 'american-19c', priority: 'high' },
  { id: 'gutenberg-1513', title: 'Romeo and Juliet', author: 'William Shakespeare', status: 'stored', era: 'early-modern', priority: 'high' },

  // Phase 2: High-Priority Classics (8 books)
  { id: 'gutenberg-74', title: 'The Adventures of Tom Sawyer', author: 'Mark Twain', gutenbergNumber: 74, era: 'american-19c', priority: 'high' },
  { id: 'gutenberg-76', title: 'The Adventures of Huckleberry Finn', author: 'Mark Twain', gutenbergNumber: 76, era: 'american-19c', priority: 'high' },
  { id: 'gutenberg-2701', title: 'Moby Dick', author: 'Herman Melville', gutenbergNumber: 2701, era: 'american-19c', priority: 'high' },
  { id: 'gutenberg-1661', title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', gutenbergNumber: 1661, era: 'victorian', priority: 'high' },
  { id: 'gutenberg-43', title: 'Dr. Jekyll and Mr. Hyde', author: 'Robert Louis Stevenson', gutenbergNumber: 43, era: 'victorian', priority: 'high' },
  { id: 'gutenberg-174', title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', gutenbergNumber: 174, era: 'victorian', priority: 'high' },
  { id: 'gutenberg-55', title: 'The Wonderful Wizard of Oz', author: 'L. Frank Baum', gutenbergNumber: 55, era: 'modern', priority: 'high' },
  { id: 'gutenberg-35', title: 'The Time Machine', author: 'H. G. Wells', gutenbergNumber: 35, era: 'modern', priority: 'high' },

  // Phase 3: Additional Classics (7 books)
  { id: 'gutenberg-36', title: 'The War of the Worlds', author: 'H. G. Wells', gutenbergNumber: 36, era: 'modern', priority: 'medium' },
  { id: 'gutenberg-145', title: 'Middlemarch', author: 'George Eliot', gutenbergNumber: 145, era: 'victorian', priority: 'medium' },
  { id: 'gutenberg-2641', title: 'A Room with a View', author: 'E. M. Forster', gutenbergNumber: 2641, era: 'modern', priority: 'medium' },
  { id: 'gutenberg-394', title: 'Cranford', author: 'Elizabeth Gaskell', gutenbergNumber: 394, era: 'victorian', priority: 'medium' },
  { id: 'gutenberg-205', title: 'Walden', author: 'Henry David Thoreau', gutenbergNumber: 205, era: 'american-19c', priority: 'medium' },
  { id: 'gutenberg-16389', title: 'The Enchanted April', author: 'Elizabeth von Arnim', gutenbergNumber: 16389, era: 'modern', priority: 'medium' },
  { id: 'gutenberg-100', title: 'The Complete Works of Shakespeare', author: 'William Shakespeare', gutenbergNumber: 100, era: 'early-modern', priority: 'medium' }
];

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Era complexity factors for processing optimization
const ERA_COMPLEXITY_FACTORS = {
  'early-modern': 2.5,        // Highest complexity: archaic language
  'victorian': 2.0,           // High complexity: formal Victorian prose  
  'american-19c': 1.5,        // Medium complexity: vernacular + formal
  'modern': 1.0               // Base complexity: contemporary language
};

class ScalableBookProcessor {
  constructor() {
    this.sessionId = `processing_${Date.now()}`;
    this.startTime = Date.now();
    this.totalProcessed = 0;
    this.totalErrors = 0;
    this.currentState = {};
  }

  // ===== BOOK STORAGE METHODS =====

  async storeBook(bookConfig) {
    console.log(`\n=== STORING ${bookConfig.title.toUpperCase()} ===`);
    
    try {
      // Check if already stored
      const existing = await prisma.bookContent.findUnique({
        where: { bookId: bookConfig.id }
      });

      if (existing) {
        console.log('✅ Book already stored, skipping');
        return { success: true, status: 'already_exists' };
      }

      // Update book metadata in books table
      await prisma.book.upsert({
        where: { id: bookConfig.id },
        update: {
          title: bookConfig.title,
          author: bookConfig.author,
          publicDomain: true,
          language: 'English'
        },
        create: {
          id: bookConfig.id,
          title: bookConfig.title,
          author: bookConfig.author,
          publicDomain: true,
          language: 'English'
        }
      });

      // Fetch content from Project Gutenberg
      console.log('1. Fetching from Project Gutenberg...');
      const gutenbergUrl = `https://www.gutenberg.org/files/${bookConfig.gutenbergNumber}/${bookConfig.gutenbergNumber}-0.txt`;
      const response = await fetch(gutenbergUrl);
      
      if (!response.ok) {
        throw new Error(`Gutenberg fetch failed: ${response.status}`);
      }
      
      let fullText = await response.text();
      fullText = this.cleanProjectGutenbergText(fullText);
      
      console.log(`✅ Fetched: ${fullText.length} characters`);

      // Detect era and chunk text
      const detectedEra = this.detectEra(fullText);
      const chunks = this.chunkText(fullText);
      
      console.log(`✅ Era: ${detectedEra}, Chunks: ${chunks.length}`);

      // Store in database
      await prisma.bookContent.create({
        data: {
          bookId: bookConfig.id,
          title: bookConfig.title,
          author: bookConfig.author,
          fullText: fullText,
          era: detectedEra,
          wordCount: fullText.split(' ').length,
          totalChunks: chunks.length
        }
      });

      // Store chunks in batches
      await this.storeChunksInBatches(bookConfig.id, chunks);

      console.log(`✅ ${bookConfig.title} stored successfully`);
      return { success: true, status: 'stored', chunkCount: chunks.length };

    } catch (error) {
      console.error(`❌ Failed to store ${bookConfig.title}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async storeChunksInBatches(bookId, chunks) {
    const batchSize = 100;
    let totalInserted = 0;

    // Clear existing chunks
    await prisma.bookChunk.deleteMany({
      where: { bookId: bookId, cefrLevel: 'original' }
    });

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const chunkData = batch.map((chunk, index) => ({
        bookId: bookId,
        cefrLevel: 'original',
        chunkIndex: i + index,
        chunkText: chunk,
        wordCount: chunk.split(' ').length,
        isSimplified: false
      }));

      await prisma.bookChunk.createMany({
        data: chunkData
      });

      totalInserted += chunkData.length;
      console.log(`  Batch ${Math.floor(i/batchSize) + 1}: ${chunkData.length} chunks`);
    }

    console.log(`✅ Stored ${totalInserted} chunks total`);
  }

  // ===== BATCH PROCESSING METHODS =====

  async processBooksInBatches() {
    console.log('🚀 Starting scalable multi-book processing...');

    // Get books that need to be stored
    const booksToStore = COMPLETE_BOOK_COLLECTION.filter(book => 
      book.status !== 'stored' && book.gutenbergNumber
    );

    if (booksToStore.length === 0) {
      console.log('✅ All books already stored');
      return { success: true, message: 'All books already stored' };
    }

    // Group by era for optimal processing
    const byEra = this.groupByEra(booksToStore);
    const results = [];

    // Process by era (modern first, early-modern last)
    const eraOrder = ['modern', 'american-19c', 'victorian', 'early-modern'];
    
    for (const era of eraOrder) {
      if (!byEra[era] || byEra[era].length === 0) continue;

      console.log(`\n📚 Processing ${era} era books (${byEra[era].length} books)...`);
      
      // Determine batch size based on era complexity
      const batchSize = this.getBatchSizeForEra(era);
      const batches = this.chunkArray(byEra[era], batchSize);

      for (const [batchIndex, batch] of batches.entries()) {
        console.log(`\n📦 Batch ${batchIndex + 1}/${batches.length}: ${batch.map(b => b.title).join(', ')}`);

        // Process books in parallel within batch
        const batchPromises = batch.map(book => this.storeBook(book));
        const batchResults = await Promise.allSettled(batchPromises);

        results.push(...batchResults);

        // Brief pause between batches
        if (batchIndex < batches.length - 1) {
          console.log('⏱️  Pausing between batches...');
          await this.delay(2000);
        }
      }
    }

    return this.compileStorageReport(results, booksToStore);
  }

  // ===== SIMPLIFICATION GENERATION METHODS =====

  async generateAllSimplifications() {
    console.log('\n📝 Starting comprehensive simplification generation...');

    const gaps = await this.detectCoverageGaps();
    console.log(`🔍 Found ${gaps.length} coverage gaps to fill`);

    if (gaps.length === 0) {
      console.log('✅ All simplifications already generated');
      return { success: true, message: 'Complete coverage achieved' };
    }

    // Group gaps by book for efficient processing
    const gapsByBook = this.groupBy(gaps, 'bookId');
    const results = [];

    for (const [bookId, bookGaps] of Object.entries(gapsByBook)) {
      const bookInfo = COMPLETE_BOOK_COLLECTION.find(b => b.id === bookId);
      console.log(`\n📖 Processing ${bookInfo?.title || bookId}...`);
      console.log(`   Gaps to fill: ${bookGaps.map(g => `${g.level}(${g.needed})`).join(', ')}`);

      for (const gap of bookGaps) {
        const result = await this.fillCoverageGap(gap);
        results.push(result);
        
        // Save progress after each level
        await this.saveProcessingState();
      }

      // Pause between books to manage API limits
      console.log('⏱️  Brief pause between books...');
      await this.delay(3000);
    }

    return this.compileSimplificationReport(results);
  }

  async fillCoverageGap(gap) {
    const { bookId, level, existing, needed } = gap;
    console.log(`\n🔄 Filling ${bookId} ${level}: ${needed} simplifications needed`);

    const results = { bookId, level, success: 0, errors: 0, details: [] };

    // Process in smaller batches to manage API limits
    const batchSize = 10;
    const startChunk = existing; // Resume from where we left off
    
    for (let chunkStart = startChunk; chunkStart < startChunk + needed; chunkStart += batchSize) {
      const chunkEnd = Math.min(chunkStart + batchSize, startChunk + needed);
      
      console.log(`  Processing chunks ${chunkStart}-${chunkEnd-1}...`);

      // Process batch with controlled concurrency
      const batchPromises = [];
      for (let chunkIndex = chunkStart; chunkIndex < chunkEnd; chunkIndex++) {
        batchPromises.push(this.simplifyChunk(bookId, level, chunkIndex));
        
        // Limit concurrent API calls
        if (batchPromises.length >= 3) {
          const batchResults = await Promise.allSettled(batchPromises);
          this.processBatchResults(batchResults, results);
          batchPromises.length = 0;
          await this.delay(1000); // 1 second between API call batches
        }
      }

      // Process remaining items
      if (batchPromises.length > 0) {
        const batchResults = await Promise.allSettled(batchPromises);
        this.processBatchResults(batchResults, results);
      }

      // Progress update
      const completed = chunkEnd - startChunk;
      const progress = (completed / needed) * 100;
      console.log(`    ✅ Batch complete. ${level} progress: ${progress.toFixed(1)}%`);
    }

    console.log(`📊 ${level} Results: ${results.success} success, ${results.errors} errors`);
    return results;
  }

  async simplifyChunk(bookId, level, chunkIndex) {
    try {
      // Call the existing simplify API
      const apiUrl = `http://localhost:3003/api/books/${bookId}/simplify?level=${level}&chunk=${chunkIndex}&ai=true`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.totalProcessed++;
        return { success: true, quality: result.aiMetadata?.quality || 'unknown' };
      } else {
        throw new Error(result.error || 'Simplification failed');
      }

    } catch (error) {
      this.totalErrors++;
      return { success: false, error: error.message };
    }
  }

  // ===== PROGRESS TRACKING AND MONITORING =====

  async detectCoverageGaps() {
    const gaps = [];
    
    for (const book of COMPLETE_BOOK_COLLECTION) {
      const bookContent = await prisma.bookContent.findUnique({
        where: { bookId: book.id }
      });
      
      if (!bookContent) {
        // Book not stored yet
        continue;
      }
      
      for (const level of CEFR_LEVELS) {
        const existing = await prisma.bookSimplification.count({
          where: { bookId: book.id, targetLevel: level }
        });
        
        const expected = bookContent.totalChunks;
        if (existing < expected) {
          gaps.push({
            type: 'incomplete_level',
            bookId: book.id,
            title: book.title,
            level,
            existing,
            needed: expected - existing,
            expected
          });
        }
      }
    }
    
    return gaps;
  }

  async trackOverallProgress() {
    const stored = await prisma.bookContent.count();
    const totalBooks = COMPLETE_BOOK_COLLECTION.length;
    
    const totalSimplifications = await prisma.bookSimplification.count();
    
    // Calculate expected total (sum of all book chunks × 6 levels)
    const bookChunkCounts = await prisma.bookContent.findMany({
      select: { totalChunks: true }
    });
    const expectedSimplifications = bookChunkCounts.reduce((sum, book) => sum + (book.totalChunks * 6), 0);
    
    const progress = {
      booksStored: `${stored}/${totalBooks} (${Math.round((stored/totalBooks)*100)}%)`,
      simplificationsGenerated: `${totalSimplifications}/${expectedSimplifications} (${Math.round((totalSimplifications/expectedSimplifications)*100)}%)`,
      processingSpeed: this.calculateProcessingSpeed(),
      runtime: this.getFormattedRuntime(),
      errors: this.totalErrors
    };

    console.log('\n📊 OVERALL PROGRESS:');
    console.log(`📚 Books: ${progress.booksStored}`);
    console.log(`📝 Simplifications: ${progress.simplificationsGenerated}`);
    console.log(`⚡ Speed: ${progress.processingSpeed} simpl/min`);
    console.log(`⏱️  Runtime: ${progress.runtime}`);
    console.log(`❌ Errors: ${progress.errors}`);

    return progress;
  }

  async saveProcessingState() {
    this.currentState = {
      sessionId: this.sessionId,
      timestamp: new Date(),
      totalProcessed: this.totalProcessed,
      totalErrors: this.totalErrors,
      runtime: Date.now() - this.startTime
    };

    // Save to a simple JSON file for now
    const stateFile = path.join(__dirname, `processing_state_${this.sessionId}.json`);
    await fs.writeFile(stateFile, JSON.stringify(this.currentState, null, 2));
  }

  // ===== UTILITY METHODS =====

  detectEra(text) {
    const sample = text.slice(0, 1000).toLowerCase();
    
    // Early Modern English (Shakespeare, 1500-1700)
    if (/\b(thou|thee|thy|thine|hath|doth|art)\b/.test(sample) || 
        /-(est|eth)\b/.test(sample) || 
        /\b(wherefore|whence|whither|prithee)\b/.test(sample)) {
      return 'early-modern';
    }
    
    // Victorian/19th century (1800-1900)
    if (/\b(whilst|shall|entailment|chaperone|governess)\b/.test(sample) || 
        /\b(drawing-room|morning-room|upon|herewith)\b/.test(sample)) {
      return 'victorian';
    }
    
    // American 19th century vernacular
    if (/\b(ain't|reckon|y'all|mighty|heap)\b/.test(sample) || 
        /\b(warn't|hain't|'bout|'nough)\b/.test(sample)) {
      return 'american-19c';
    }
    
    return 'modern';
  }

  chunkText(text) {
    const words = text.split(' ');
    const chunks = [];
    const wordsPerChunk = 400;
    
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
    }
    return chunks;
  }

  cleanProjectGutenbergText(text) {
    const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
    const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
    
    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker);
    
    if (startIndex !== -1 && endIndex !== -1) {
      const contentStart = text.indexOf('\n', startIndex) + 1;
      text = text.substring(contentStart, endIndex).trim();
    }
    
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\[Illustration[^\]]*\]/g, '')
      .trim();
  }

  groupByEra(books) {
    const groups = {};
    for (const book of books) {
      if (!groups[book.era]) groups[book.era] = [];
      groups[book.era].push(book);
    }
    return groups;
  }

  groupBy(array, keyOrFn) {
    const groups = {};
    for (const item of array) {
      const key = typeof keyOrFn === 'function' ? keyOrFn(item) : item[keyOrFn];
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }

  getBatchSizeForEra(era) {
    return {
      'modern': 4,
      'american-19c': 3,
      'victorian': 2,
      'early-modern': 1
    }[era] || 2;
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  processBatchResults(results, accumulator) {
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        accumulator.success++;
        accumulator.details.push(`✅ Quality: ${result.value.quality}`);
      } else {
        accumulator.errors++;
        const error = result.status === 'rejected' ? result.reason.message : result.value.error;
        accumulator.details.push(`❌ ${error}`);
      }
    }
  }

  calculateProcessingSpeed() {
    const runtimeMinutes = (Date.now() - this.startTime) / (1000 * 60);
    return runtimeMinutes > 0 ? (this.totalProcessed / runtimeMinutes).toFixed(1) : '0.0';
  }

  getFormattedRuntime() {
    const seconds = Math.floor((Date.now() - this.startTime) / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }

  compileStorageReport(results, booksToStore) {
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success);

    console.log('\n🎉 BOOK STORAGE COMPLETE');
    console.log(`✅ Successfully stored: ${successful.length}/${booksToStore.length} books`);
    console.log(`❌ Failed: ${failed.length} books`);

    if (failed.length > 0) {
      console.log('\n❌ Failed books:');
      failed.forEach((result, index) => {
        const book = booksToStore[index];
        const error = result.status === 'rejected' ? result.reason.message : result.value.error;
        console.log(`  ${book?.title || 'unknown'}: ${error}`);
      });
    }

    return {
      success: failed.length === 0,
      successful: successful.length,
      failed: failed.length,
      total: booksToStore.length
    };
  }

  compileSimplificationReport(results) {
    const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

    console.log('\n🎉 SIMPLIFICATION GENERATION COMPLETE');
    console.log(`✅ Total successful: ${totalSuccess}`);
    console.log(`❌ Total errors: ${totalErrors}`);
    console.log(`📊 Success rate: ${((totalSuccess/(totalSuccess+totalErrors))*100).toFixed(1)}%`);

    return {
      success: totalErrors < totalSuccess,
      totalSuccess,
      totalErrors,
      successRate: (totalSuccess/(totalSuccess+totalErrors)*100).toFixed(1)
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== MAIN EXECUTION METHODS =====

  async executeFullProcessing() {
    try {
      console.log('🚀 STARTING SCALABLE MULTI-BOOK PROCESSING PIPELINE');
      console.log(`📚 Target: ${COMPLETE_BOOK_COLLECTION.length} books × 6 CEFR levels`);
      console.log(`🎯 Estimated total simplifications: ~33,840`);

      // Phase 1: Store all books
      console.log('\n📖 PHASE 1: BOOK STORAGE');
      const storageReport = await this.processBooksInBatches();
      
      // Phase 2: Generate simplifications
      console.log('\n📝 PHASE 2: SIMPLIFICATION GENERATION');
      const simplificationReport = await this.generateAllSimplifications();

      // Phase 3: Final progress report
      console.log('\n📊 PHASE 3: FINAL REPORT');
      await this.trackOverallProgress();

      console.log('\n🎉 SCALABLE PROCESSING PIPELINE COMPLETE!');
      console.log('📋 System ready for instant CEFR switching across all books');

      return {
        success: true,
        storage: storageReport,
        simplifications: simplificationReport
      };

    } catch (error) {
      console.error('❌ Critical error in processing pipeline:', error);
      await this.saveProcessingState();
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const processor = new ScalableBookProcessor();
  processor.executeFullProcessing()
    .then(report => {
      console.log('\n✅ Processing completed successfully');
      console.log('📋 Final report:', JSON.stringify(report, null, 2));
    })
    .catch(error => {
      console.error('\n❌ Processing failed:', error.message);
      process.exit(1);
    });
}

module.exports = ScalableBookProcessor;