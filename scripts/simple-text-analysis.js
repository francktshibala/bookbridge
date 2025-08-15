const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function analyzeTextMismatch() {
  console.log('🔍 TEXT MISMATCH ANALYSIS');
  
  try {
    console.log('\n1. CHECKING DATABASE CHUNKS (what audio uses)');
    const dbChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'gutenberg-1342',
        cefrLevel: 'original'
      },
      orderBy: { chunkIndex: 'asc' },
      select: {
        chunkIndex: true,
        chunkText: true
      },
      take: 3
    });
    
    console.log(`Found ${dbChunks.length} database chunks`);
    
    dbChunks.forEach((chunk, i) => {
      console.log(`\nDB Chunk ${chunk.chunkIndex}:`);
      console.log(`Length: ${chunk.chunkText.length} chars`);
      console.log(`Text: "${chunk.chunkText.substring(0, 100)}..."`);
      
      // Check what was actually used for TTS generation
      if (chunk.chunkText.length > 400) {
        const ttsText = chunk.chunkText.substring(0, 400);
        console.log(`TTS used (first 400 chars): "${ttsText.substring(0, 80)}..."`);
      }
    });
    
    console.log('\n2. ROOT CAUSE ANALYSIS');
    console.log('The issue is likely one of:');
    console.log('A. Reading interface splits text differently than database chunks');
    console.log('B. TTS generation used only first 400 chars of each chunk');
    console.log('C. Display text comes from different API than chunk storage');
    
    console.log('\n3. SOLUTION');
    console.log('We need to make audio match exactly what\'s displayed.');
    console.log('Since display chunks are created dynamically (1500 chars each),');
    console.log('the simplest fix is to generate TTS from the actual displayed text');
    console.log('instead of relying on precomputed database chunks.');
    
    console.log('\n4. IMMEDIATE FIX RECOMMENDATION:');
    console.log('Modify IntegratedAudioControls to:');
    console.log('- Use the currentContent prop directly for TTS');
    console.log('- Only fall back to precomputed if text exactly matches');
    console.log('- This ensures audio always matches displayed text');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeTextMismatch();