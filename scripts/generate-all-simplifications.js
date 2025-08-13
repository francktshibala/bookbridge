const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Our 5 priority books
const PRIORITY_BOOKS = [
  'gutenberg-1342', // Pride and Prejudice
  'gutenberg-11',   // Alice's Adventures in Wonderland
  'gutenberg-84',   // Frankenstein
  'gutenberg-514',  // Little Women
  'gutenberg-1513'  // Romeo and Juliet
];

// All CEFR levels to generate
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Configuration for each CEFR level (matching the display config)
const DISPLAY_CONFIG = {
  A1: { wordsPerScreen: 400, fontSize: '19px', sessionMin: 12 },
  A2: { wordsPerScreen: 400, fontSize: '17px', sessionMin: 18 },
  B1: { wordsPerScreen: 400, fontSize: '17px', sessionMin: 22 },
  B2: { wordsPerScreen: 400, fontSize: '16px', sessionMin: 27 },
  C1: { wordsPerScreen: 400, fontSize: '16px', sessionMin: 30 },
  C2: { wordsPerScreen: 400, fontSize: '16px', sessionMin: 35 }
};

// Simple text chunking function (same as in simplify API)
const chunkText = (text, cefrLevel) => {
  const { wordsPerScreen } = DISPLAY_CONFIG[cefrLevel];
  const words = text.split(' ');
  const chunks = [];
  
  for (let i = 0; i < words.length; i += wordsPerScreen) {
    chunks.push(words.slice(i, i + wordsPerScreen).join(' '));
  }
  return chunks;
};

async function generateSimplificationsForBook(bookId) {
  console.log(`\n=== GENERATING SIMPLIFICATIONS FOR ${bookId.toUpperCase()} ===`);
  
  try {
    // Get the stored book content
    const bookContent = await prisma.bookContent.findUnique({
      where: { bookId: bookId }
    });

    if (!bookContent) {
      console.log(`❌ Book ${bookId} not found in database`);
      return { success: false, reason: 'Book not found' };
    }

    console.log(`📚 Book: ${bookContent.title} by ${bookContent.author}`);
    console.log(`📄 Content: ${bookContent.wordCount} words, Era: ${bookContent.era}`);

    const results = {
      bookId,
      title: bookContent.title,
      levels: {},
      totalGenerated: 0,
      errors: []
    };

    // Generate simplifications for each CEFR level
    for (const level of CEFR_LEVELS) {
      console.log(`\n📝 Generating ${level} level simplifications...`);
      
      try {
        // Chunk the original text for this CEFR level
        const chunks = chunkText(bookContent.fullText, level);
        console.log(`   Created ${chunks.length} chunks for ${level} level`);
        
        // First, store original chunks if they don't exist
        const existingOriginalChunks = await prisma.bookChunk.count({
          where: {
            bookId: bookId,
            cefrLevel: 'original'
          }
        });

        if (existingOriginalChunks === 0) {
          console.log(`   Storing original chunks first...`);
          const originalChunkData = chunks.map((chunk, index) => ({
            bookId: bookId,
            cefrLevel: 'original',
            chunkIndex: index,
            chunkText: chunk,
            wordCount: chunk.split(' ').length,
            isSimplified: false
          }));

          await prisma.bookChunk.createMany({
            data: originalChunkData
          });
          console.log(`   ✅ Stored ${chunks.length} original chunks`);
        }

        // Check if this level already has simplifications
        const existingSimplifications = await prisma.bookChunk.count({
          where: {
            bookId: bookId,
            cefrLevel: level,
            isSimplified: true
          }
        });

        if (existingSimplifications > 0) {
          console.log(`   ⏭️  ${level} already has ${existingSimplifications} simplifications, skipping`);
          results.levels[level] = { 
            status: 'already_exists', 
            count: existingSimplifications 
          };
          continue;
        }

        // Generate simplifications by calling our simplify API
        let successCount = 0;
        let errorCount = 0;
        const levelErrors = [];

        for (let chunkIndex = 0; chunkIndex < Math.min(chunks.length, 10); chunkIndex++) {
          try {
            console.log(`   Processing chunk ${chunkIndex + 1}/${Math.min(chunks.length, 10)}...`);
            
            // Call the simplify API endpoint
            const apiUrl = `http://localhost:3003/api/books/${bookId}/simplify?level=${level}&chunk=${chunkIndex}&ai=true`;
            
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success && result.source === 'ai_simplified') {
              successCount++;
              console.log(`     ✅ Chunk ${chunkIndex}: ${result.aiMetadata?.quality || 'unknown'} quality`);
            } else if (result.success && result.source === 'fallback_chunked') {
              console.log(`     ⚠️  Chunk ${chunkIndex}: AI failed, using original`);
            } else {
              throw new Error(`Simplification failed: ${result.error || 'Unknown error'}`);
            }

            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (chunkError) {
            errorCount++;
            levelErrors.push(`Chunk ${chunkIndex}: ${chunkError.message}`);
            console.log(`     ❌ Chunk ${chunkIndex}: ${chunkError.message}`);
          }
        }

        results.levels[level] = {
          status: 'completed',
          successCount,
          errorCount,
          totalChunks: Math.min(chunks.length, 10),
          errors: levelErrors
        };
        results.totalGenerated += successCount;

        console.log(`   📊 ${level} Results: ${successCount} success, ${errorCount} errors`);

      } catch (levelError) {
        console.log(`   ❌ Failed to generate ${level} simplifications: ${levelError.message}`);
        results.levels[level] = {
          status: 'failed',
          error: levelError.message
        };
        results.errors.push(`${level}: ${levelError.message}`);
      }
    }

    console.log(`\n🎉 BOOK COMPLETE: ${bookContent.title}`);
    console.log(`📊 Total simplifications generated: ${results.totalGenerated}`);
    
    return { success: true, results };

  } catch (error) {
    console.error(`❌ Error processing book ${bookId}:`, error.message);
    return { success: false, reason: error.message };
  }
}

async function generateAllSimplifications() {
  console.log('=== GENERATING ALL PRECOMPUTED SIMPLIFICATIONS ===');
  console.log(`📚 Books: ${PRIORITY_BOOKS.length}`);
  console.log(`🎯 CEFR Levels: ${CEFR_LEVELS.join(', ')}`);
  console.log(`📊 Total combinations: ${PRIORITY_BOOKS.length * CEFR_LEVELS.length} simplification sets`);
  
  const allResults = [];
  let totalSuccess = 0;
  let totalErrors = 0;

  for (const bookId of PRIORITY_BOOKS) {
    const bookResult = await generateSimplificationsForBook(bookId);
    allResults.push(bookResult);
    
    if (bookResult.success) {
      totalSuccess += bookResult.results.totalGenerated;
      totalErrors += bookResult.results.errors.length;
    }

    // Brief pause between books
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n=== GENERATION COMPLETE ===');
  console.log(`✅ Total simplifications generated: ${totalSuccess}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  
  console.log('\n📊 Book-by-book results:');
  allResults.forEach(result => {
    if (result.success) {
      console.log(`  ${result.results.bookId}: ${result.results.totalGenerated} simplifications`);
      Object.entries(result.results.levels).forEach(([level, data]) => {
        if (data.status === 'completed') {
          console.log(`    ${level}: ${data.successCount}/${data.totalChunks} chunks`);
        } else if (data.status === 'already_exists') {
          console.log(`    ${level}: already exists (${data.count} chunks)`);
        } else {
          console.log(`    ${level}: ${data.status}`);
        }
      });
    } else {
      console.log(`  ${result.bookId || 'unknown'}: FAILED - ${result.reason}`);
    }
  });

  if (totalSuccess > 0) {
    console.log('\n🎉 READY FOR PHASE 3: TTS Audio Generation!');
    console.log('📋 Next step: Generate audio for all precomputed simplifications');
  } else {
    console.log('\n⚠️  No simplifications were generated. Check the errors above.');
  }

  await prisma.$disconnect();
}

// Run the generation
generateAllSimplifications().catch(console.error);