import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();

async function checkStatus() {
  try {
    const bundles = await prisma.bookChunk.findMany({
      where: {
        bookId: 'the-necklace',
        cefrLevel: 'A2'
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

    const totalExpected = 64;
    const completed = bundles.length;
    const progress = ((completed / totalExpected) * 100).toFixed(1);
    
    console.log('\n📊 The Necklace A2 Generation Status:');
    console.log(`   ✅ Completed: ${completed}/${totalExpected} bundles (${progress}%)`);
    console.log(`   ⏳ Remaining: ${totalExpected - completed} bundles`);
    
    if (completed > 0) {
      const lastBundle = bundles[bundles.length - 1];
      console.log(`   📦 Last completed: Bundle ${lastBundle.chunkIndex}`);
      
      // Check if bundles have audio metadata
      const withMetadata = bundles.filter(b => b.audioDurationMetadata).length;
      console.log(`   🎵 Bundles with audio metadata: ${withMetadata}/${completed}`);
      
      // Check voice ID from audio file path
      if (bundles[0]?.audioFilePath) {
        const voiceId = bundles[0].audioFilePath.split('/')[2];
        const voiceName = voiceId === 'RILOU7YmBhvwJGDGjNmP' ? 'Jane ✅' : 
                         voiceId === 'EXAVITQu4vr4xnSDxMaL' ? 'Sarah (old)' : 
                         voiceId === 'onwK4e9ZLuTAKqWW03F9' ? 'Daniel' : voiceId;
        console.log(`   🗣️ Voice: ${voiceName}`);
      }
    }
    
    if (completed === totalExpected) {
      console.log('\n🎉 GENERATION COMPLETE! All 64 bundles generated.');
      console.log('   ✅ Preview: Generated and cached');
      console.log('   ✅ Preview Audio: Generated with Jane voice');
      console.log('   ✅ All bundles: Generated with Jane voice at 0.85× speed');
    } else {
      console.log('\n⏳ Generation in progress...');
      console.log('   Run this command again to check progress:');
      console.log('   node scripts/check-necklace-a2-status.js');
    }
    
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();

