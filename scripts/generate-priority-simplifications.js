const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Our 5 priority books
const PRIORITY_BOOKS = [
  { id: 'gutenberg-1342', title: 'Pride and Prejudice' },
  { id: 'gutenberg-11', title: "Alice's Adventures in Wonderland" },
  { id: 'gutenberg-84', title: 'Frankenstein' },
  { id: 'gutenberg-514', title: 'Little Women' },
  { id: 'gutenberg-1513', title: 'Romeo and Juliet' }
];

// CEFR levels
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

async function generateSimplificationsBatch() {
  console.log('=== GENERATING PRIORITY BOOK SIMPLIFICATIONS ===');
  console.log(`📚 Books: ${PRIORITY_BOOKS.length}`);
  console.log(`🎯 CEFR Levels: ${CEFR_LEVELS.length}`);
  console.log(`📊 Total target: ${PRIORITY_BOOKS.length * CEFR_LEVELS.length} simplification sets`);
  console.log(`⚡ Limited to 3 chunks per level for faster testing\n`);
  
  const results = {
    books: {},
    totalGenerated: 0,
    totalAttempted: 0,
    errors: []
  };

  for (const book of PRIORITY_BOOKS) {
    console.log(`\n=== ${book.title.toUpperCase()} ===`);
    
    // Verify book exists in database
    const bookContent = await prisma.bookContent.findUnique({
      where: { bookId: book.id }
    });

    if (!bookContent) {
      console.log(`❌ Book ${book.id} not found in database, skipping`);
      continue;
    }

    console.log(`📚 Processing: ${bookContent.title} by ${bookContent.author}`);
    console.log(`📄 Era: ${bookContent.era}, Words: ${bookContent.wordCount}`);

    results.books[book.id] = {
      title: book.title,
      levels: {},
      generated: 0,
      attempted: 0
    };

    for (const level of CEFR_LEVELS) {
      console.log(`\n  📝 Level ${level}:`);
      
      // Check existing simplifications for this level
      const existingCount = await prisma.bookSimplification.count({
        where: {
          bookId: book.id,
          targetLevel: level
        }
      });

      if (existingCount >= 3) {
        console.log(`    ⏭️  Already has ${existingCount} simplifications, skipping`);
        results.books[book.id].levels[level] = { status: 'exists', count: existingCount };
        continue;
      }

      let successCount = 0;
      let errorCount = 0;
      const levelErrors = [];

      // Generate simplifications for first 3 chunks
      for (let chunkIndex = 0; chunkIndex < 3; chunkIndex++) {
        try {
          console.log(`    Processing chunk ${chunkIndex + 1}/3...`);
          
          // Check if this specific chunk already exists
          const existingChunk = await prisma.bookSimplification.findUnique({
            where: {
              bookId_targetLevel_chunkIndex: {
                bookId: book.id,
                targetLevel: level,
                chunkIndex: chunkIndex
              }
            }
          });

          if (existingChunk) {
            console.log(`      ✅ Chunk ${chunkIndex} already exists`);
            successCount++;
            continue;
          }

          // Generate simplification via API
          const apiUrl = `http://localhost:3003/api/books/${book.id}/simplify?level=${level}&chunk=${chunkIndex}&ai=true`;
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
          }

          const result = await response.json();
          results.totalAttempted++;

          if (result.success) {
            successCount++;
            results.totalGenerated++;
            
            const quality = result.aiMetadata?.quality || 'unknown';
            const source = result.source;
            
            if (source === 'ai_simplified') {
              console.log(`      ✅ Chunk ${chunkIndex}: AI ${quality} quality`);
            } else if (source === 'cache') {
              console.log(`      ✅ Chunk ${chunkIndex}: From cache`);
            } else {
              console.log(`      ⚠️  Chunk ${chunkIndex}: Fallback (${source})`);
            }
          } else {
            throw new Error(result.error || 'Simplification failed');
          }

          // Small delay between chunks
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          errorCount++;
          levelErrors.push(`Chunk ${chunkIndex}: ${error.message}`);
          console.log(`      ❌ Chunk ${chunkIndex}: ${error.message}`);
        }
      }

      results.books[book.id].levels[level] = {
        status: 'completed',
        success: successCount,
        errors: errorCount,
        details: levelErrors
      };

      results.books[book.id].generated += successCount;
      results.books[book.id].attempted += 3;

      console.log(`    📊 ${level}: ${successCount}/3 successful`);
    }

    console.log(`  📈 Book total: ${results.books[book.id].generated}/${results.books[book.id].attempted} successful`);
    
    // Brief pause between books
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== GENERATION SUMMARY ===');
  console.log(`✅ Total successful: ${results.totalGenerated}/${results.totalAttempted}`);
  console.log(`📊 Success rate: ${Math.round((results.totalGenerated / Math.max(results.totalAttempted, 1)) * 100)}%`);

  console.log('\n📚 Book breakdown:');
  Object.entries(results.books).forEach(([bookId, data]) => {
    console.log(`  ${data.title}: ${data.generated}/${data.attempted} (${Math.round((data.generated / Math.max(data.attempted, 1)) * 100)}%)`);
    
    Object.entries(data.levels).forEach(([level, levelData]) => {
      if (levelData.status === 'completed') {
        console.log(`    ${level}: ${levelData.success}/3`);
      } else if (levelData.status === 'exists') {
        console.log(`    ${level}: already exists (${levelData.count})`);
      }
    });
  });

  // Final database verification
  console.log('\n📊 Database verification:');
  for (const book of PRIORITY_BOOKS) {
    const totalSimplifications = await prisma.bookSimplification.count({
      where: { bookId: book.id }
    });
    console.log(`  ${book.title}: ${totalSimplifications} total simplifications stored`);
  }

  if (results.totalGenerated > 0) {
    console.log('\n🎉 SUCCESS: Simplifications generated and ready for TTS!');
    console.log('📋 Next: Generate TTS audio for all simplifications');
  } else {
    console.log('\n⚠️  No new simplifications generated');
  }

  await prisma.$disconnect();
}

generateSimplificationsBatch().catch(console.error);