const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupTheNecklace() {
  console.log('🗑️ Starting cleanup for The Necklace audiobook data...');
  console.log('⚠️ This will DELETE all audio bundles for the-necklace but preserve text data');

  try {
    // 1. First, check what we're about to delete (safety check)
    console.log('\n📊 Current necklace data:');

    const existingChunks = await prisma.bookChunk.findMany({
      where: { bookId: 'the-necklace' },
      select: {
        cefrLevel: true,
        chunkIndex: true,
        audioFilePath: true
      }
    });

    console.log(`   📦 Found ${existingChunks.length} BookChunk records for the-necklace`);

    if (existingChunks.length > 0) {
      const levels = [...new Set(existingChunks.map(c => c.cefrLevel))];
      console.log(`   🎯 Levels: ${levels.join(', ')}`);

      // Show sample paths to verify we're targeting right files
      const samplePaths = existingChunks.slice(0, 3).map(c => c.audioFilePath).filter(p => p);
      console.log(`   📂 Sample audio paths: ${samplePaths.join(', ')}`);
    }

    // 2. Delete audio files from Supabase storage for each level
    const levels = ['A1', 'A2', 'B1'];
    let totalFilesDeleted = 0;

    for (const level of levels) {
      console.log(`\n🗑️ Cleaning up the-necklace ${level} audio files...`);

      try {
        // List files in the-necklace/{level}/ folder
        const { data: files, error: listError } = await supabase.storage
          .from('audio-files')
          .list(`the-necklace/${level}`, { limit: 1000 });

        if (listError) {
          console.log(`   ℹ️ No audio files found for ${level}: ${listError.message}`);
          continue;
        }

        if (!files || files.length === 0) {
          console.log(`   ℹ️ No audio files found for ${level}`);
          continue;
        }

        console.log(`   📊 Found ${files.length} audio files for ${level}`);

        // Delete all files in the level folder
        const filePaths = files.map(file => `the-necklace/${level}/${file.name}`);

        const { data, error: deleteError } = await supabase.storage
          .from('audio-files')
          .remove(filePaths);

        if (deleteError) {
          console.error(`   ❌ Error deleting ${level} files:`, deleteError);
        } else {
          console.log(`   ✅ Deleted ${filePaths.length} audio files for ${level}`);
          totalFilesDeleted += filePaths.length;
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${level}:`, error.message);
      }
    }

    // 3. Delete BookChunk records from database
    console.log('\n🗑️ Deleting necklace BookChunk records from database...');

    const deleteResult = await prisma.bookChunk.deleteMany({
      where: {
        bookId: 'the-necklace' // EXACT match only
      }
    });

    console.log(`   ✅ Deleted ${deleteResult.count} BookChunk records`);

    // 4. Verification - check nothing remains
    console.log('\n🔍 Verification check...');

    const remainingChunks = await prisma.bookChunk.findMany({
      where: { bookId: 'the-necklace' }
    });

    if (remainingChunks.length === 0) {
      console.log('   ✅ No BookChunk records remain for the-necklace');
    } else {
      console.error(`   ❌ WARNING: ${remainingChunks.length} records still exist!`);
    }

    // 5. Check if text data is preserved (should still exist)
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: 'the-necklace' }
    });

    if (bookContent) {
      console.log('   ✅ BookContent preserved (text data safe)');
    } else {
      console.log('   ⚠️ No BookContent found (may need to be recreated)');
    }

    console.log('\n✅ Cleanup completed successfully!');
    console.log('📊 Summary:');
    console.log(`   🗑️ Audio files deleted: ${totalFilesDeleted}`);
    console.log(`   🗑️ Database records deleted: ${deleteResult.count}`);
    console.log(`   📚 Text data preserved: ${bookContent ? 'Yes' : 'Check needed'}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Check /featured-books page to verify necklace levels are gone');
    console.log('   2. Follow master mistakes prevention workflow from Phase 1');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  cleanupTheNecklace()
    .then(() => {
      console.log('\n🎉 The Necklace cleanup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupTheNecklace };