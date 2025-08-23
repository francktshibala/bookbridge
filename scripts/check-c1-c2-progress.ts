import { prisma } from '../lib/prisma';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkC1C2Progress() {
  try {
    console.log('🔍 Checking C1/C2 audio generation progress...\n');
    
    // Check C1 and C2 chunks status
    for (const level of ['C1', 'C2']) {
      const totalChunks = await prisma.bookChunk.count({
        where: {
          bookId: 'gutenberg-1342',
          cefrLevel: level
        }
      });
      
      const withAudio = await prisma.bookChunk.count({
        where: {
          bookId: 'gutenberg-1342',
          cefrLevel: level,
          audioFilePath: { not: null }
        }
      });
      
      const progress = totalChunks > 0 ? Math.round((withAudio / totalChunks) * 100) : 0;
      
      console.log(`📊 ${level} Level:`);
      console.log(`   Total chunks: ${totalChunks}`);
      console.log(`   With audio: ${withAudio}`);
      console.log(`   Progress: ${progress}% complete\n`);
    }
    
    // Check most recent audio generation
    const recentAudio = await prisma.bookChunk.findFirst({
      where: {
        bookId: 'gutenberg-1342',
        cefrLevel: { in: ['C1', 'C2'] },
        audioFilePath: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        cefrLevel: true,
        chunkIndex: true,
        audioFilePath: true,
        createdAt: true
      }
    });
    
    if (recentAudio) {
      console.log('🔥 Most recent audio generated:');
      console.log(`   Level: ${recentAudio.cefrLevel}`);
      console.log(`   Chunk: ${recentAudio.chunkIndex}`);
      console.log(`   Time: ${recentAudio.createdAt}`);
      console.log(`   File: ${recentAudio.audioFilePath?.substring(0, 100)}...`);
    } else {
      console.log('⚠️  No audio files found for C1/C2 levels yet');
    }
    
  } catch (error) {
    console.error('❌ Error checking progress:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  checkC1C2Progress();
}

export { checkC1C2Progress };