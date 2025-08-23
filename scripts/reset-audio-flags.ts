import { prisma } from '../lib/prisma';

async function resetAudioFlags() {
  try {
    console.log('Resetting audio flags for C1/C2 chunks...');
    
    const result = await prisma.bookChunk.updateMany({
      where: {
        bookId: 'gutenberg-1342',
        cefrLevel: {
          in: ['C1', 'C2']
        }
      },
      data: {
        audioFilePath: null,
        audioProvider: null,
        audioVoiceId: null
      }
    });
    
    console.log(`✅ Successfully reset audio flags for ${result.count} chunks`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAudioFlags();