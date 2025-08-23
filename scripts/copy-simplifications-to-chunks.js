// Script to copy simplified text from book_simplifications to book_chunks
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function copySimplificationsToChunks(bookId, cefrLevel) {
  console.log(`\n🔄 Copying ${cefrLevel} simplifications for ${bookId} to book_chunks...`);
  
  try {
    // Get all simplifications for this book and level
    const simplifications = await prisma.$queryRaw`
      SELECT chunk_index, simplified_text, quality_score, original_text
      FROM book_simplifications 
      WHERE book_id = ${bookId} AND target_level = ${cefrLevel}
      ORDER BY chunk_index ASC
    `;

    console.log(`📋 Found ${simplifications.length} ${cefrLevel} simplifications to copy`);

    if (simplifications.length === 0) {
      console.log(`❌ No simplifications found for ${bookId} ${cefrLevel}`);
      return { copied: 0, errors: [] };
    }

    let copied = 0;
    let errors = [];

    for (const simp of simplifications) {
      try {
        // Check if chunk already exists
        const existing = await prisma.bookChunk.findUnique({
          where: {
            bookId_cefrLevel_chunkIndex: {
              bookId: bookId,
              cefrLevel: cefrLevel,
              chunkIndex: simp.chunk_index
            }
          }
        });

        if (existing) {
          console.log(`⚠️  Chunk ${simp.chunk_index} already exists, skipping`);
          continue;
        }

        // Create new book chunk
        await prisma.bookChunk.create({
          data: {
            bookId: bookId,
            cefrLevel: cefrLevel,
            chunkIndex: simp.chunk_index,
            chunkText: simp.simplified_text,
            wordCount: simp.simplified_text.split(/\s+/).length,
            isSimplified: true,
            qualityScore: simp.quality_score,
            audioFilePath: null, // Will be filled by audio generation
            audioProvider: null,
            audioVoiceId: null
          }
        });

        copied++;
        console.log(`✅ Copied chunk ${simp.chunk_index} (${simp.simplified_text.substring(0, 50)}...)`);

      } catch (error) {
        const errorMsg = `Failed to copy chunk ${simp.chunk_index}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`\n🎯 Copying complete: ${copied} chunks copied, ${errors.length} errors`);
    return { copied, errors };

  } catch (error) {
    console.error('❌ Script failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const bookId = process.argv[2];
  const cefrLevel = process.argv[3];

  if (!bookId || !cefrLevel) {
    console.log('Usage: node copy-simplifications-to-chunks.js <bookId> <cefrLevel>');
    console.log('Example: node copy-simplifications-to-chunks.js gutenberg-1342 A1');
    process.exit(1);
  }

  try {
    const result = await copySimplificationsToChunks(bookId, cefrLevel);
    
    if (result.copied > 0) {
      console.log(`\n🎉 Success! Ready to generate audio for ${result.copied} chunks.`);
      console.log(`\nNext step: Run audio generation:`);
      console.log(`curl -X POST http://localhost:3000/api/admin/audio/backfill \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -d '{"bookId": "${bookId}", "levels": ["${cefrLevel}"]}'`);
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();