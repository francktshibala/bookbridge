const { TTSProcessor } = require('../lib/tts/tts-processor.ts');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function testTTSProper() {
  console.log('🧪 Testing TTS with proper database schema...');
  
  try {
    // Get one chunk to test
    const chunk = await prisma.bookChunk.findFirst({
      where: { 
        bookId: 'gutenberg-1342',
        chunkIndex: 1  // Skip chunk 0 which had illustration text
      }
    });
    
    if (!chunk) {
      console.log('❌ No chunk found');
      return;
    }
    
    console.log(`📖 Testing with chunk ${chunk.chunkIndex}: ${chunk.chunkText.substring(0, 100)}...`);
    
    const ttsProcessor = TTSProcessor.getInstance();
    
    // Test with first 300 characters for quick test
    const testText = chunk.chunkText.substring(0, 300);
    console.log(`🎵 Generating TTS for ${testText.length} characters...`);
    
    const result = await ttsProcessor.generateOpenAITTS(testText, 'alloy');
    
    if (result && result.audioBlob) {
      console.log('📊 TTS Success:', {
        audioSize: result.audioBlob.length,
        duration: result.duration,
        wordCount: result.wordTimings ? result.wordTimings.length : 0
      });
      
      // Create or find BookAudio record for this book+voice combination
      let bookAudio = await prisma.bookAudio.findFirst({
        where: {
          bookId: chunk.bookId,
          cefrLevel: 'original',
          voiceId: 'alloy'
        }
      });
      
      if (!bookAudio) {
        console.log('📝 Creating BookAudio record...');
        bookAudio = await prisma.bookAudio.create({
          data: {
            bookId: chunk.bookId,
            cefrLevel: 'original',
            voiceId: 'alloy',
            audioUrl: null, // We'll store individual chunks, not full audio
            audioBlob: null,
            duration: null, // Will be sum of all segments
            fileSize: null,
            format: 'mp3',
            createdAt: new Date()
          }
        });
        console.log(`✅ BookAudio created: ${bookAudio.id}`);
      }
      
      // Create AudioSegment for this specific chunk
      const audioSegment = await prisma.audioSegment.create({
        data: {
          bookId: chunk.bookId,
          audioId: bookAudio.id,
          chunkId: chunk.id,
          startTime: 0,
          endTime: result.duration,
          wordTimings: JSON.stringify(result.wordTimings || []),
          createdAt: new Date()
        }
      });
      
      console.log(`✅ AudioSegment saved: ${audioSegment.id}`);
      console.log('🎉 TTS generation and storage complete!');
      
    } else {
      console.log('❌ TTS generation failed - no audio data returned');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testTTSProper();