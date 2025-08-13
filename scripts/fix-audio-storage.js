const { TTSProcessor } = require('../lib/tts/tts-processor.ts');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function fixAudioStorage() {
  console.log('🔧 Fixing audio storage by regenerating with proper blob storage...');
  
  try {
    const ttsProcessor = TTSProcessor.getInstance();
    
    // Get chunks 1-5 that we want to fix
    const chunks = await prisma.bookChunk.findMany({
      where: { 
        bookId: 'gutenberg-1342',
        cefrLevel: 'original',
        chunkIndex: {
          in: [1, 2, 3, 4, 5]
        }
      },
      orderBy: { chunkIndex: 'asc' }
    });
    
    console.log(`📚 Processing ${chunks.length} chunks...`);
    
    for (const chunk of chunks) {
      console.log(`\n📖 Processing chunk ${chunk.chunkIndex}...`);
      
      // Delete existing audio segment for this chunk
      await prisma.audioSegment.deleteMany({
        where: {
          bookId: chunk.bookId,
          chunkId: chunk.id
        }
      });
      
      // Regenerate TTS with proper storage
      const textToProcess = chunk.chunkText.substring(0, 400);
      console.log(`   🎵 Generating fresh TTS (${textToProcess.length} chars)...`);
      
      const result = await ttsProcessor.generateOpenAITTS(textToProcess, 'alloy');
      
      if (result && result.audioBlob) {
        // Find the BookAudio record
        let bookAudio = await prisma.bookAudio.findFirst({
          where: {
            bookId: 'gutenberg-1342',
            cefrLevel: 'original',
            voiceId: 'alloy'
          }
        });
        
        if (!bookAudio) {
          bookAudio = await prisma.bookAudio.create({
            data: {
              bookId: 'gutenberg-1342',
              cefrLevel: 'original',
              voiceId: 'alloy',
              format: 'mp3'
            }
          });
        }
        
        // Create new audio segment with BOTH blob and timings
        const audioSegment = await prisma.audioSegment.create({
          data: {
            bookId: chunk.bookId,
            audioId: bookAudio.id,
            chunkId: chunk.id,
            startTime: 0,
            endTime: result.duration,
            wordTimings: JSON.stringify(result.wordTimings || []),
            audioBlob: result.audioBlob // Now properly supported in schema
          }
        });
        
        console.log(`   ✅ Stored: ${result.duration}s, ${(result.audioBlob.length/1024).toFixed(1)}KB`);
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n🎉 Audio storage fixed!');
    console.log('✅ Now each chunk has its audio blob stored individually');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAudioStorage();