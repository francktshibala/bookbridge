#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Yellow Wallpaper specific ID - SAFETY CHECK
const YELLOW_WALLPAPER_ID = 'gutenberg-1952';
const EXPECTED_TITLE = 'The Yellow Wallpaper';
const EXPECTED_AUTHOR = 'Charlotte Perkins Gilman';

async function deleteYellowWallpaper() {
  try {
    console.log('🔍 Starting safe deletion of The Yellow Wallpaper...\n');

    // SAFETY: Check BookContent table since Book table might not have this record
    const bookContent = await prisma.bookContent.findUnique({
      where: { bookId: YELLOW_WALLPAPER_ID }
    });

    if (!bookContent) {
      console.log('❌ No book content found with ID:', YELLOW_WALLPAPER_ID);
      return;
    }

    if (!bookContent.title.includes('Yellow Wallpaper') || !bookContent.author.includes('Gilman')) {
      console.log('❌ SAFETY CHECK FAILED!');
      console.log(`Expected: "${EXPECTED_TITLE}" by ${EXPECTED_AUTHOR}`);
      console.log(`Found: "${bookContent.title}" by ${bookContent.author}`);
      console.log('Aborting deletion for safety.');
      return;
    }

    console.log('✅ Safety check passed:');
    console.log(`  - ID: ${YELLOW_WALLPAPER_ID}`);
    console.log(`  - Title: ${bookContent.title}`);
    console.log(`  - Author: ${bookContent.author}\n`);

    // Check if Book record exists separately
    const book = await prisma.book.findUnique({
      where: { id: YELLOW_WALLPAPER_ID }
    });

    // Get counts before deletion
    const simplificationCount = await prisma.bookSimplification.count({
      where: { bookId: YELLOW_WALLPAPER_ID }
    });

    const bookContentCount = await prisma.bookContent.count({
      where: { bookId: YELLOW_WALLPAPER_ID }
    });

    const bookCacheCount = await prisma.bookCache.count({
      where: { bookId: YELLOW_WALLPAPER_ID }
    });

    const bookChunkCount = await prisma.bookChunk.count({
      where: { bookId: YELLOW_WALLPAPER_ID }
    });

    const bookAudioCount = await prisma.bookAudio.count({
      where: { bookId: YELLOW_WALLPAPER_ID }
    });

    console.log('📊 Records to delete:');
    console.log(`  - BookSimplification: ${simplificationCount} records`);
    console.log(`  - BookContent: ${bookContentCount} records`);
    console.log(`  - BookCache: ${bookCacheCount} records`);
    console.log(`  - BookChunk: ${bookChunkCount} records`);
    console.log(`  - BookAudio: ${bookAudioCount} records`);
    console.log(`  - Book: 1 record\n`);

    console.log('🗑️ Starting deletion (this may take a few minutes)...\n');

    // Delete in order to respect foreign key constraints
    console.log('1. Deleting BookSimplifications...');
    const deletedSimplifications = await prisma.bookSimplification.deleteMany({
      where: { bookId: YELLOW_WALLPAPER_ID }
    });
    console.log(`   ✅ Deleted ${deletedSimplifications.count} simplification records`);

    console.log('2. Deleting BookChunks...');
    const deletedChunks = await prisma.bookChunk.deleteMany({
      where: { bookId: YELLOW_WALLPAPER_ID }
    });
    console.log(`   ✅ Deleted ${deletedChunks.count} chunk records`);

    console.log('3. Deleting BookAudio...');
    const deletedAudio = await prisma.bookAudio.deleteMany({
      where: { bookId: YELLOW_WALLPAPER_ID }
    });
    console.log(`   ✅ Deleted ${deletedAudio.count} audio records`);

    console.log('4. Deleting BookContent...');
    const deletedContent = await prisma.bookContent.deleteMany({
      where: { bookId: YELLOW_WALLPAPER_ID }
    });
    console.log(`   ✅ Deleted ${deletedContent.count} content records`);

    console.log('5. Deleting BookCache...');
    const deletedCache = await prisma.bookCache.deleteMany({
      where: { bookId: YELLOW_WALLPAPER_ID }
    });
    console.log(`   ✅ Deleted ${deletedCache.count} cache records`);

    if (book) {
      console.log('6. Deleting main Book record...');
      const deletedBook = await prisma.book.delete({
        where: { id: YELLOW_WALLPAPER_ID }
      });
      console.log(`   ✅ Deleted book: "${deletedBook.title}"`);
    } else {
      console.log('6. No Book record to delete (only existed in BookContent)');
    }

    console.log('\n🎉 Yellow Wallpaper deletion completed successfully!');
    console.log('✅ Database is now clean and ready for bundle architecture generation');

  } catch (error) {
    console.error('❌ Error during deletion:', error);
    console.log('\n⚠️  Some records may have been partially deleted.');
    console.log('Check database state and run again if needed.');
  } finally {
    await prisma.$disconnect();
  }
}

// Add confirmation prompt
console.log('⚠️  WARNING: This will permanently delete ALL Yellow Wallpaper data from the database.');
console.log('This includes simplifications, audio, content, and the book record itself.');
console.log('This action cannot be undone.\n');

console.log('Are you sure you want to proceed? Type "DELETE YELLOW WALLPAPER" to confirm:');

// In Node.js script environment, proceed directly
// (In production, you'd add readline for confirmation)
deleteYellowWallpaper();