const { TTSProcessor } = require('../lib/tts/tts-processor.ts');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function generateChunk0Audio() {
  console.log('🎵 Generating audio for missing chunk 0...');
  
  try {
    const chunk = await prisma.bookChunk.findUnique({
      where: {
        bookId_cefrLevel_chunkIndex: {
          bookId: 'gutenberg-1342',
          cefrLevel: 'original',
          chunkIndex: 0
        }
      }
    });
    
    if (!chunk) {
      console.log('❌ Chunk 0 not found');
      return;
    }
    
    // Skip illustration text, find readable content
    let textToProcess = chunk.chunkText;
    
    // Look for "Chapter" or skip first 200 chars if all illustrations
    if (textToProcess.includes('Chapter')) {
      const chapterIndex = textToProcess.indexOf('Chapter');
      textToProcess = textToProcess.substring(chapterIndex);
    } else {
      textToProcess = textToProcess.substring(200);
    }
    
    textToProcess = textToProcess.substring(0, 400); // Limit to 400 chars like others
    console.log(`📖 Processing: ${textToProcess.substring(0, 100)}...`);
    
    const ttsProcessor = TTSProcessor.getInstance();
    const result = await ttsProcessor.generateOpenAITTS(textToProcess, 'alloy');
    
    if (result && result.audioBlob) {
      const bookAudio = await prisma.bookAudio.findFirst({
        where: {
          bookId: 'gutenberg-1342',
          cefrLevel: 'original',
          voiceId: 'alloy'
        }
      });
      
      const audioSegment = await prisma.audioSegment.create({
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
      
      console.log(`✅ Generated chunk 0 audio: ${result.duration}s, ${(result.audioBlob.length/1024).toFixed(1)}KB`);
      console.log('🎉 Now chunks 0-5 have precomputed audio!');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

generateChunk0Audio();