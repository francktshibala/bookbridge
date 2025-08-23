import { prisma } from '../lib/prisma';

async function checkC1Status() {
  try {
    // Check if C1 chunks exist for gutenberg-1342
    const c1Count = await prisma.bookChunk.count({
      where: {
        bookId: 'gutenberg-1342',
        cefrLevel: 'C1'
      }
    });
    
    console.log(`C1 chunks in database: ${c1Count}`);
    
    // Check how many have audio
    const withAudio = await prisma.bookChunk.count({
      where: {
        bookId: 'gutenberg-1342',
        cefrLevel: 'C1',
        audioFilePath: { not: null }
      }
    });
    
    console.log(`C1 chunks with audio: ${withAudio}`);
    console.log(`C1 chunks without audio: ${c1Count - withAudio}`);
    
    // Sample a few chunks to see their content
    const samples = await prisma.bookChunk.findMany({
      where: {
        bookId: 'gutenberg-1342',
        cefrLevel: 'C1'
      },
      take: 3,
      orderBy: { chunkIndex: 'asc' },
      select: {
        chunkIndex: true,
        audioFilePath: true,
        chunkText: true
      }
    });
    
    console.log('\nFirst 3 C1 chunks:');
    samples.forEach(chunk => {
      const hasAudio = chunk.audioFilePath ? '✅' : '❌';
      const textPreview = chunk.chunkText.substring(0, 100) + '...';
      console.log(`  Chunk ${chunk.chunkIndex}: ${hasAudio} Audio | Text: ${textPreview}`);
    });
    
    // Check C2 status as well since it had fewer chunks
    const c2Count = await prisma.bookChunk.count({
      where: {
        bookId: 'gutenberg-1342',
        cefrLevel: 'C2'
      }
    });
    
    const c2WithAudio = await prisma.bookChunk.count({
      where: {
        bookId: 'gutenberg-1342',
        cefrLevel: 'C2',
        audioFilePath: { not: null }
      }
    });
    
    console.log(`\nC2 chunks in database: ${c2Count}`);
    console.log(`C2 chunks with audio: ${c2WithAudio}`);
    console.log(`C2 chunks without audio: ${c2Count - c2WithAudio}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkC1Status();