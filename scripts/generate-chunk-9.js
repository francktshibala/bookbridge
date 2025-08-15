const { TTSProcessor } = require('../lib/tts/tts-processor.ts');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function generateChunk9Audio() {
  console.log('🎵 Generating audio for chunk 9 to fix the delay...');
  
  try {
    const chunk = await prisma.bookChunk.findUnique({
      where: {
        bookId_cefrLevel_chunkIndex: {
          bookId: 'gutenberg-1342',
          cefrLevel: 'original',
          chunkIndex: 9
        }
      }
    });
    
    if (!chunk) {
      console.log('❌ Chunk 9 not found');
      return;
    }
    
    console.log(`📖 Processing chunk 9: ${chunk.chunkText.substring(0, 100)}...`);
    
    // Check if audio already exists
    const existing = await prisma.audioSegment.findFirst({
      where: {
        bookId: chunk.bookId,
        chunkId: chunk.id
      }
    });
    
    if (existing) {
      console.log('✅ Chunk 9 audio already exists!');
      return;
    }
    
    // Get or create BookAudio record
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
    
    // Try generating with a valid API key (user needs to provide)
    console.log('🔑 Note: You need to provide a valid OpenAI API key');
    console.log('Run with: OPENAI_API_KEY="your-key-here" node scripts/generate-chunk-9.js');
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-key-here') {
      console.log('⚠️ No valid OpenAI API key provided');
      console.log('Current status: Chunk 9 will continue using real-time generation (12+ sec delay)');
      return;
    }
    
    const ttsProcessor = TTSProcessor.getInstance();
    const textToProcess = chunk.chunkText.substring(0, 400);
    
    console.log('🎵 Generating TTS...');
    const result = await ttsProcessor.generateOpenAITTS(textToProcess, 'alloy');
    
    if (result && result.audioBlob) {
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
      
      console.log(`✅ Generated chunk 9 audio: ${result.duration}s, ${(result.audioBlob.length/1024).toFixed(1)}KB`);
      console.log('🚀 Page 10/12 will now play INSTANTLY!');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.message.includes('Unauthorized')) {
      console.log('🔑 API key issue - please provide a valid OpenAI API key');
    }
  } finally {
    await prisma.$disconnect();
  }
}

generateChunk9Audio();