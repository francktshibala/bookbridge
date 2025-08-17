const { TTSProcessor } = require('../lib/tts/tts-processor.ts');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function generateMultipleTTS() {
  console.log('🎵 Generating TTS for multiple chunks...');
  
  try {
    // Get first 5 chunks from Pride and Prejudice (skip chunk 0 with illustrations)
    const chunks = await prisma.bookChunk.findMany({
      where: { 
        bookId: 'gutenberg-1342',
        chunkIndex: {
          gte: 1,
          lte: 5
        }
      },
      orderBy: { chunkIndex: 'asc' }
    });
    
    console.log(`📚 Found ${chunks.length} chunks to process`);
    
    const ttsProcessor = TTSProcessor.getInstance();
    
    // Find or create BookAudio record
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
    
    console.log(`🎤 Using BookAudio: ${bookAudio.id}`);
    
    for (const chunk of chunks) {
      console.log(`\n📖 Processing chunk ${chunk.chunkIndex}...`);
      
      // Check if we already have audio for this chunk
      const existingSegment = await prisma.audioSegment.findFirst({
        where: {
          audioId: bookAudio.id,
          chunkId: chunk.id
        }
      });
      
      if (existingSegment) {
        console.log(`   ⏭️  Already exists, skipping...`);
        continue;
      }
      
      // Use first 400 characters for faster generation
      const textToProcess = chunk.chunkText.substring(0, 400);
      console.log(`   🎵 Generating audio (${textToProcess.length} chars)...`);
      
      try {
        const result = await ttsProcessor.generateOpenAITTS(textToProcess, 'alloy');
        
        if (result && result.audioBlob) {
          // Create AudioSegment
          const audioSegment = await prisma.audioSegment.create({
            data: {
              bookId: chunk.bookId,
              audioId: bookAudio.id,
              chunkId: chunk.id,
              startTime: 0,
              endTime: result.duration,
              wordTimings: JSON.stringify(result.wordTimings || [])
            }
          });
          
          console.log(`   ✅ Generated: ${result.duration}s, ${result.wordTimings?.length || 0} words`);
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }
    
    // Check final status
    const totalSegments = await prisma.audioSegment.count({
      where: { audioId: bookAudio.id }
    });
    
    console.log(`\n🎉 TTS Generation Complete!`);
    console.log(`📊 Total audio segments: ${totalSegments}`);
    console.log('✅ Ready to test precomputed audio playback!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

generateMultipleTTS();