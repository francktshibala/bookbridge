import { prisma } from '../lib/prisma';

async function checkB2Status() {
  try {
    // Check if B2 chunks exist
    const b2Count = await prisma.bookChunk.count({
      where: {
        bookId: 'pride-and-prejudice',
        cefrLevel: 'B2'
      }
    });
    
    console.log(`B2 chunks in database: ${b2Count}`);
    
    // Check how many have audio
    const withAudio = await prisma.bookChunk.count({
      where: {
        bookId: 'pride-and-prejudice',
        cefrLevel: 'B2',
        audioFilePath: { not: null }
      }
    });
    
    console.log(`B2 chunks with audio: ${withAudio}`);
    
    // Sample a few chunks
    const samples = await prisma.bookChunk.findMany({
      where: {
        bookId: 'pride-and-prejudice',
        cefrLevel: 'B2'
      },
      take: 5,
      orderBy: { chunkIndex: 'asc' }
    });
    
    console.log('\nFirst 5 B2 chunks:');
    samples.forEach(chunk => {
      console.log(`  Chunk ${chunk.chunkIndex}: ${chunk.audioFilePath || 'NO AUDIO'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkB2Status();