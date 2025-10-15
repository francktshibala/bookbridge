import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function cleanupComplete() {
  console.log('🧹 Complete cleanup for Jane Eyre A1...');

  try {
    // 1. Delete from bookSimplification table
    const deleted1 = await prisma.bookSimplification.deleteMany({
      where: {
        bookId: 'jane-eyre-scale-test-001',
        targetLevel: 'A1'
      }
    });
    console.log(`✅ Deleted ${deleted1.count} simplification records`);

    // 2. Delete from audio_assets table
    const { error } = await supabase
      .from('audio_assets')
      .delete()
      .eq('book_id', 'jane-eyre-scale-test-001')
      .eq('cefr_level', 'A1');

    if (error) {
      console.error('Error cleaning audio_assets:', error);
    } else {
      console.log('✅ Cleaned audio_assets');
    }

    // 3. Clear cache files
    const cacheFile = './cache/jane-eyre-A1-simplified.json';
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
      console.log('✅ Deleted cache file');
    }

    console.log('🎯 Complete cleanup done - ready for fresh start!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupComplete();