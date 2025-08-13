const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function debugTextAlignment() {
  console.log('🔍 DEBUGGING TEXT ALIGNMENT BETWEEN DISPLAY AND AUDIO');
  
  try {
    // Get the book content structure
    const bookContent = await prisma.bookContent.findUnique({
      where: { bookId: 'gutenberg-1342' }
    });
    
    console.log(`📚 Book: ${bookContent?.title}`);
    console.log(`📄 Total chunks: ${bookContent?.totalChunks}`);
    
    // Check chunks 0-2 (where the mismatch might be)
    for (let i = 0; i <= 2; i++) {
      console.log(`\n--- CHUNK ${i} ---`);
      
      const chunk = await prisma.bookChunk.findUnique({
        where: {
          bookId_cefrLevel_chunkIndex: {
            bookId: 'gutenberg-1342',
            cefrLevel: 'original',
            chunkIndex: i
          }
        }
      });
      
      if (chunk) {
        console.log(`Chunk ${i} text (first 200 chars):`);
        console.log(`"${chunk.chunkText.substring(0, 200)}..."`);
        
        // Check if there's precomputed audio for this chunk
        const audioSegment = await prisma.audioSegment.findFirst({
          where: {
            bookId: 'gutenberg-1342',
            chunkId: chunk.id
          }
        });
        
        if (audioSegment) {
          console.log(`✅ Has precomputed audio (${audioSegment.endTime}s)`);
          
          // Get the text that was actually used for TTS
          const wordTimings = JSON.parse(audioSegment.wordTimings || '[]');
          if (wordTimings.length > 0) {
            const ttsWords = wordTimings.map(w => w.word).join(' ');
            console.log(`TTS text (reconstructed): "${ttsWords.substring(0, 200)}..."`);
            
            // Check if they match
            const chunkStart = chunk.chunkText.substring(0, 200).toLowerCase().replace(/[^\w\s]/g, '');
            const ttsStart = ttsWords.substring(0, 200).toLowerCase().replace(/[^\w\s]/g, '');
            
            if (chunkStart === ttsStart) {
              console.log(`✅ Text alignment: MATCH`);
            } else {
              console.log(`❌ Text alignment: MISMATCH!`);
              console.log(`   Chunk starts: "${chunkStart.substring(0, 50)}..."`);
              console.log(`   TTS starts:   "${ttsStart.substring(0, 50)}..."`);
            }
          }
        } else {
          console.log(`❌ No precomputed audio`);
        }
      } else {
        console.log(`❌ Chunk ${i} not found`);
      }
    }
    
    // Check what the reading interface receives
    console.log('\n--- READING INTERFACE CHECK ---');
    console.log('The reading interface should be passing:');
    console.log('1. currentContent = displayed text');
    console.log('2. chunkIndex = current chunk number');
    console.log('3. IntegratedAudioControls should use the SAME text');
    
    console.log('\nPossible causes of mismatch:');
    console.log('1. TTS was generated with different text than stored in chunk');
    console.log('2. Reading interface is passing wrong chunkIndex');
    console.log('3. Display text and chunk text are different sources');
    console.log('4. Text preprocessing differs between display and TTS');
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugTextAlignment();