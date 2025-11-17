import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkStatus() {
  try {
    const bundles = await prisma.bookChunk.findMany({
      where: {
        bookId: 'the-necklace',
        cefrLevel: 'A1'
      },
      select: {
        chunkIndex: true,
        audioFilePath: true,
        audioDurationMetadata: true
      },
      orderBy: {
        chunkIndex: 'asc'
      }
    });

    const totalExpected = 71;
    const completed = bundles.length;
    const progress = ((completed / totalExpected) * 100).toFixed(1);
    
    console.log('\n📊 The Necklace A1 Generation Status:');
    console.log(`   ✅ Completed: ${completed}/${totalExpected} bundles (${progress}%)`);
    console.log(`   ⏳ Remaining: ${totalExpected - completed} bundles`);
    
    if (completed > 0) {
      const lastBundle = bundles[bundles.length - 1];
      console.log(`   📦 Last completed: Bundle ${lastBundle.chunkIndex}`);
      
      // Check if any bundles have audio metadata
      const withMetadata = bundles.filter(b => b.audioDurationMetadata).length;
      console.log(`   🎵 Bundles with audio metadata: ${withMetadata}/${completed}`);
    }
    
    if (completed === totalExpected) {
      console.log('\n🎉 GENERATION COMPLETE! All 71 bundles generated.');
    } else {
      console.log('\n⏳ Generation in progress...');
      console.log('   Run this command again to check progress:');
      console.log('   node scripts/check-necklace-status.js');
    }
    
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();

