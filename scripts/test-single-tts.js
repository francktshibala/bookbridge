const { TTSProcessor } = require('../lib/tts/tts-processor.ts');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function testSingleTTS() {
  console.log('🧪 Testing single TTS generation...');
  
  try {
    // Get one chunk to test
    const chunk = await prisma.bookChunk.findFirst({
      where: { 
        bookId: 'gutenberg-1342',
        chunkIndex: 0  
      }
    });
    
    if (!chunk) {
      console.log('❌ No chunk found');
      return;
    }
    
    console.log(`📖 Testing with chunk 0: ${chunk.chunkText.substring(0, 100)}...`);
    
    const ttsProcessor = TTSProcessor.getInstance();
    
    // Test OpenAI TTS directly with a short text
    const testText = chunk.chunkText.substring(0, 200); // Short test
    console.log(`🎵 Generating TTS for: "${testText}"`);
    
    const result = await ttsProcessor.generateOpenAITTS(testText, 'alloy');
    
    console.log('✅ TTS Result:', result);
    
    if (result && result.audioBuffer) {
      console.log('📊 Audio Stats:', {
        audioSize: result.audioBuffer.length,
        duration: result.duration,
        wordCount: result.wordTimings ? result.wordTimings.length : 0
      });
    }
    
    // Save to database
    const audioRecord = await prisma.bookAudio.create({
      data: {
        bookId: chunk.bookId,
        cefrLevel: 'original',
        chunkIndex: chunk.chunkIndex,
        voiceId: 'alloy',
        duration: result.duration,
        audioBlob: result.audioBuffer,
        createdAt: new Date()
      }
    });
    
    console.log(`✅ Audio saved to database with ID: ${audioRecord.id}`);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testSingleTTS();