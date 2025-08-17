const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BOOK_ID = 'gutenberg-1342';
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

async function generateCompleteSimplifications() {
  console.log('=== COMPLETING PRIDE & PREJUDICE SIMPLIFICATIONS ===');
  console.log('🎯 Goal: Generate ALL missing simplifications for instant CEFR switching\n');
  
  try {
    // Get book info
    const bookContent = await prisma.bookContent.findUnique({
      where: { bookId: BOOK_ID }
    });

    if (!bookContent) {
      console.log('❌ Pride & Prejudice not found in database');
      return;
    }

    console.log(`📚 Book: ${bookContent.title}`);
    console.log(`📊 Total chunks: ${bookContent.totalChunks}`);
    console.log(`🎯 Target: ${bookContent.totalChunks * CEFR_LEVELS.length} total simplifications\n`);

    const results = {
      levels: {},
      totalGenerated: 0,
      totalSkipped: 0,
      totalErrors: 0,
      startTime: Date.now()
    };

    // Process each CEFR level
    for (const level of CEFR_LEVELS) {
      console.log(`\n=== PROCESSING ${level} LEVEL ===`);
      
      // Check existing simplifications
      const existing = await prisma.bookSimplification.count({
        where: {
          bookId: BOOK_ID,
          targetLevel: level
        }
      });

      console.log(`📊 Existing ${level} simplifications: ${existing}/${bookContent.totalChunks}`);
      
      if (existing >= bookContent.totalChunks) {
        console.log(`✅ ${level} already complete, skipping`);
        results.levels[level] = { status: 'complete', generated: 0, skipped: existing };
        results.totalSkipped += existing;
        continue;
      }

      // Find missing chunk indices
      const existingChunks = await prisma.bookSimplification.findMany({
        where: {
          bookId: BOOK_ID,
          targetLevel: level
        },
        select: { chunkIndex: true }
      });

      const existingIndices = new Set(existingChunks.map(c => c.chunkIndex));
      const missingIndices = [];
      
      for (let i = 0; i < bookContent.totalChunks; i++) {
        if (!existingIndices.has(i)) {
          missingIndices.push(i);
        }
      }

      console.log(`🔍 Missing ${level} chunks: ${missingIndices.length}`);
      
      results.levels[level] = {
        status: 'processing',
        generated: 0,
        errors: 0,
        skipped: existing
      };

      // Process missing chunks in batches
      const BATCH_SIZE = 10; // Process 10 chunks at a time
      const MAX_CHUNKS = 50;  // Limit for initial testing
      
      const chunksToProcess = missingIndices.slice(0, MAX_CHUNKS);
      console.log(`⚡ Processing first ${chunksToProcess.length} chunks for ${level}`);

      for (let i = 0; i < chunksToProcess.length; i += BATCH_SIZE) {
        const batch = chunksToProcess.slice(i, i + BATCH_SIZE);
        
        console.log(`\n  📦 Batch ${Math.floor(i/BATCH_SIZE) + 1}: Chunks ${batch[0]}-${batch[batch.length-1]}`);
        
        // Process batch concurrently (but with delays to avoid rate limits)
        const batchPromises = batch.map(async (chunkIndex, batchPosition) => {
          try {
            // Add delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, batchPosition * 1000));
            
            console.log(`    Processing ${level} chunk ${chunkIndex}...`);
            
            // Call the simplify API
            const apiUrl = `http://localhost:3003/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${chunkIndex}&ai=true`;
            
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
              throw new Error(`API returned ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();
            
            if (result.success) {
              const quality = result.aiMetadata?.quality || 'unknown';
              const source = result.source;
              
              if (source === 'ai_simplified') {
                console.log(`      ✅ ${level} chunk ${chunkIndex}: AI ${quality} quality`);
              } else if (source === 'cache') {
                console.log(`      ✅ ${level} chunk ${chunkIndex}: From cache`);
              } else {
                console.log(`      ⚠️  ${level} chunk ${chunkIndex}: ${source}`);
              }
              
              results.levels[level].generated++;
              results.totalGenerated++;
              
              return { success: true, chunkIndex, source, quality };
            } else {
              throw new Error(result.error || 'Simplification failed');
            }

          } catch (error) {
            console.log(`      ❌ ${level} chunk ${chunkIndex}: ${error.message}`);
            results.levels[level].errors++;
            results.totalErrors++;
            
            return { success: false, chunkIndex, error: error.message };
          }
        });

        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        const batchSuccess = batchResults.filter(r => r.success).length;
        const batchErrors = batchResults.filter(r => !r.success).length;
        
        console.log(`  📊 Batch complete: ${batchSuccess} success, ${batchErrors} errors`);
        
        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      results.levels[level].status = 'completed';
      console.log(`\n✅ ${level} processing complete: ${results.levels[level].generated} generated, ${results.levels[level].errors} errors`);
    }

    // Final summary
    const totalTime = Math.round((Date.now() - results.startTime) / 1000);
    
    console.log('\n=== GENERATION COMPLETE ===');
    console.log(`⏱️  Total time: ${Math.floor(totalTime/60)}m ${totalTime%60}s`);
    console.log(`✅ Generated: ${results.totalGenerated}`);
    console.log(`⏭️  Skipped: ${results.totalSkipped}`);
    console.log(`❌ Errors: ${results.totalErrors}`);
    
    console.log('\n📊 Level breakdown:');
    CEFR_LEVELS.forEach(level => {
      const data = results.levels[level];
      if (data) {
        console.log(`  ${level}: +${data.generated} generated, ${data.skipped} existing, ${data.errors} errors`);
      }
    });

    // Verify final coverage
    console.log('\n🔍 Final coverage verification:');
    for (const level of CEFR_LEVELS) {
      const finalCount = await prisma.bookSimplification.count({
        where: {
          bookId: BOOK_ID,
          targetLevel: level
        }
      });
      
      const coverage = Math.round((finalCount / bookContent.totalChunks) * 100);
      const status = coverage >= 95 ? '🎉' : coverage >= 75 ? '👍' : '⚠️';
      
      console.log(`  ${level}: ${status} ${finalCount}/${bookContent.totalChunks} (${coverage}%)`);
    }

    const totalFinal = await prisma.bookSimplification.count({
      where: { bookId: BOOK_ID }
    });
    
    const overallCoverage = Math.round((totalFinal / (bookContent.totalChunks * CEFR_LEVELS.length)) * 100);
    
    console.log(`\n📊 Overall coverage: ${totalFinal}/${bookContent.totalChunks * CEFR_LEVELS.length} (${overallCoverage}%)`);
    
    if (overallCoverage >= 95) {
      console.log('\n🎉 SUCCESS: Pride & Prejudice is ready for instant CEFR switching!');
      console.log('💡 Next step: Test all 6 levels for instant switching performance');
    } else {
      console.log('\n📋 Next step: Continue generating remaining simplifications');
      console.log(`💡 Focus on levels with <95% coverage`);
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

generateCompleteSimplifications();