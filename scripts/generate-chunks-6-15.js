const { TTSProcessor } = require('../lib/tts/tts-processor.ts');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function generateChunks6to15() {
  console.log('🎵 Expanding instant playback coverage - generating chunks 6-15...');
  console.log('🚀 This will transform 15-second delays into INSTANT playback!');
  
  try {
    const ttsProcessor = TTSProcessor.getInstance();
    
    // Get chunks 6-15 that need audio generation
    const chunks = await prisma.bookChunk.findMany({
      where: { 
        bookId: 'gutenberg-1342',
        cefrLevel: 'original',
        chunkIndex: {
          gte: 6,
          lte: 15
        }
      },
      orderBy: { chunkIndex: 'asc' }
    });
    
    console.log(`📚 Found ${chunks.length} chunks to process (6-15)...`);
    
    // Find existing BookAudio record
    let bookAudio = await prisma.bookAudio.findFirst({
      where: {
        bookId: 'gutenberg-1342',
        cefrLevel: 'original',
        voiceId: 'alloy'
      }
    });
    
    if (!bookAudio) {
      console.log('📝 Creating BookAudio record...');
      bookAudio = await prisma.bookAudio.create({
        data: {
          bookId: 'gutenberg-1342',
          cefrLevel: 'original',
          voiceId: 'alloy',
          format: 'mp3'
        }
      });
    }
    
    let successCount = 0;
    let totalDuration = 0;
    
    for (const chunk of chunks) {
      console.log(`\n📖 Processing chunk ${chunk.chunkIndex}...`);
      
      // Check if already exists
      const existing = await prisma.audioSegment.findFirst({
        where: {
          bookId: chunk.bookId,
          chunkId: chunk.id
        }
      });
      
      if (existing) {
        console.log(`   ✅ Already exists - skipping`);
        successCount++;
        continue;
      }
      
      try {
        // Generate TTS for first 400 chars (consistent with existing chunks)
        const textToProcess = chunk.chunkText.substring(0, 400);
        console.log(`   🎵 Generating OpenAI TTS (${textToProcess.length} chars)...`);
        console.log(`   Preview: "${textToProcess.substring(0, 50)}..."`);
        
        const result = await ttsProcessor.generateOpenAITTS(textToProcess, 'alloy');
        
        if (result && result.audioBlob) {
          // Store in database
          await prisma.audioSegment.create({
            data: {
              bookId: chunk.bookId,
              audioId: bookAudio.id,
              chunkId: chunk.id,
              startTime: 0,
              endTime: result.duration,
              wordTimings: JSON.stringify(result.wordTimings || []),
              audioBlob: result.audioBlob
            }
          });
          
          successCount++;
          totalDuration += result.duration;
          
          console.log(`   ✅ Success: ${result.duration.toFixed(1)}s, ${(result.audioBlob.length/1024).toFixed(1)}KB`);
          
          // Rate limiting - wait 2 seconds between API calls
          console.log(`   ⏳ Waiting 2s for rate limiting...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log(`   ❌ Failed - no audio blob returned`);
        }
        
      } catch (chunkError) {
        console.log(`   ❌ Error generating chunk ${chunk.chunkIndex}:`, chunkError.message);
        
        if (chunkError.message.includes('Unauthorized')) {
          console.log('   🔑 API key issue - stopping generation');
          break;
        }
      }
    }
    
    console.log(`\n🎉 INSTANT PLAYBACK EXPANSION COMPLETE!`);
    console.log(`✅ Generated: ${successCount}/${chunks.length} chunks`);
    console.log(`🎵 Total audio: ${totalDuration.toFixed(1)} seconds`);
    console.log(`📊 Coverage: Chunks 0-${Math.max(5, 5 + successCount)} now have INSTANT playback`);
    
    if (successCount > 0) {
      console.log(`\n🚀 RESULT: OpenAI voice will now play INSTANTLY on pages 7-${6 + successCount}!`);
      console.log(`   (Instead of 15-second delays)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

generateChunks6to15();