import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BOOK_ID = 'custom-story-500';

async function cleanupCustomStoryAudio() {
  console.log('🧹 Cleaning up Custom Story audio files and database records...');

  try {
    // 1. Delete audio assets from database
    console.log('📊 Deleting audio_assets records...');
    const { count: audioCount } = await supabase
      .from('audio_assets')
      .delete()
      .eq('book_id', BOOK_ID);

    console.log(`✅ Deleted ${audioCount || 0} audio asset records from database`);

    // 2. Delete audio files from Supabase storage
    console.log('🗂️ Deleting audio files from storage...');

    // List all files in the custom story folder
    const { data: files, error: listError } = await supabase.storage
      .from('audio-files')
      .list(BOOK_ID, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.warn(`⚠️ Could not list files: ${listError.message}`);
    } else if (files && files.length > 0) {
      // Delete files in batches
      const filesToDelete = files.map(file => `${BOOK_ID}/${file.name}`);

      console.log(`Found ${filesToDelete.length} files to delete`);

      const { data, error: deleteError } = await supabase.storage
        .from('audio-files')
        .remove(filesToDelete);

      if (deleteError) {
        console.error(`❌ Error deleting files: ${deleteError.message}`);
      } else {
        console.log(`✅ Deleted ${filesToDelete.length} audio files from storage`);
      }
    } else {
      console.log('ℹ️ No audio files found in storage');
    }

    // 3. Clean up temp directories
    console.log('📁 Cleaning up temp directories...');
    const tempDir = '/tmp/custom-story-500-bundles';
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`✅ Deleted temp directory: ${tempDir}`);
    } else {
      console.log('ℹ️ No temp directory found');
    }

    console.log('🎉 Custom Story audio cleanup complete!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Clear simplification cache: rm cache/custom-story-500-B1-simplified.json');
    console.log('2. Re-simplify expanded story: node scripts/simplify-custom-story-500.js B1');
    console.log('3. Generate new bundles: CEFR_LEVEL=B1 node scripts/generate-custom-story-bundles.js');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanupCustomStoryAudio()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());