import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function loadLittleWomenContent() {
  console.log('📚 Loading content for Little Women (gutenberg-514)...\n');
  
  try {
    // First check current status
    const currentChunks = await prisma.bookChunk.findMany({
      where: { bookId: 'gutenberg-514' },
      select: {
        cefrLevel: true,
        chunkIndex: true,
        chunkText: true,
        isSimplified: true,
      },
      orderBy: [
        { cefrLevel: 'asc' },
        { chunkIndex: 'asc' }
      ]
    });
    
    console.log(`Current chunks in database: ${currentChunks.length}`);
    
    // Group by CEFR level
    const chunksByCefr = currentChunks.reduce((acc, chunk) => {
      if (!acc[chunk.cefrLevel]) acc[chunk.cefrLevel] = 0;
      acc[chunk.cefrLevel]++;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nChunks by CEFR level:');
    Object.entries(chunksByCefr).forEach(([level, count]) => {
      console.log(`  ${level}: ${count} chunks`);
    });
    
    // Check if we have the expected content
    const expectedLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const missingLevels = expectedLevels.filter(level => !chunksByCefr[level] || chunksByCefr[level] < 50);
    
    if (missingLevels.length > 0) {
      console.log(`\n⚠️ Missing or incomplete CEFR levels: ${missingLevels.join(', ')}`);
      console.log('\n🔄 Need to run text simplification for Little Women to generate content for all CEFR levels.');
      console.log('\nNext steps:');
      console.log('1. Run text simplification script to generate content for all CEFR levels');
      console.log('2. Verify all levels have adequate chunks (50+ per level)');
      console.log('3. Then proceed with audio generation');
    } else {
      console.log('\n✅ All CEFR levels have content loaded!');
      console.log('Ready for audio generation.');
    }
    
    // Check for audio paths
    const chunksWithAudio = await prisma.bookChunk.count({
      where: {
        bookId: 'gutenberg-514',
        audioFilePath: { not: null }
      }
    });
    
    console.log(`\n🎵 Chunks with audio: ${chunksWithAudio}/${currentChunks.length}`);
    
  } catch (error) {
    console.error('❌ Error checking Little Women content:', error);
  } finally {
    await prisma.$disconnect();
  }
}

loadLittleWomenContent().catch(console.error);