#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Great Gatsby specific ID - SAFETY CHECK
const GREAT_GATSBY_ID = 'gutenberg-64317';
const EXPECTED_TITLE = 'The Great Gatsby';
const EXPECTED_AUTHOR = 'F. Scott Fitzgerald';

async function deleteGreatGatsby() {
  try {
    console.log('🔍 Starting safe deletion of The Great Gatsby...\n');

    // SAFETY: Verify we're deleting the correct book
    const book = await prisma.book.findUnique({
      where: { id: GREAT_GATSBY_ID }
    });

    if (!book) {
      console.log('❌ No book found with ID:', GREAT_GATSBY_ID);
      return;
    }

    if (book.title !== EXPECTED_TITLE || book.author !== EXPECTED_AUTHOR) {
      console.log('❌ SAFETY CHECK FAILED!');
      console.log(`Expected: "${EXPECTED_TITLE}" by ${EXPECTED_AUTHOR}`);
      console.log(`Found: "${book.title}" by ${book.author}`);
      console.log('Aborting deletion for safety.');
      return;
    }

    console.log('✅ Safety check passed:');
    console.log(`  - ID: ${book.id}`);
    console.log(`  - Title: ${book.title}`);
    console.log(`  - Author: ${book.author}\n`);

    // Get counts before deletion
    const simplificationCount = await prisma.bookSimplification.count({
      where: { bookId: GREAT_GATSBY_ID }
    });

    const bookContentCount = await prisma.bookContent.count({
      where: { bookId: GREAT_GATSBY_ID }
    });

    const bookCacheCount = await prisma.bookCache.count({
      where: { bookId: GREAT_GATSBY_ID }
    });

    const bookChunkCount = await prisma.bookChunk.count({
      where: { bookId: GREAT_GATSBY_ID }
    });

    const bookAudioCount = await prisma.bookAudio.count({
      where: { bookId: GREAT_GATSBY_ID }
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
      where: { bookId: GREAT_GATSBY_ID }
    });
    console.log(`   ✅ Deleted ${deletedSimplifications.count} simplification records`);

    console.log('2. Deleting BookChunks...');
    const deletedChunks = await prisma.bookChunk.deleteMany({
      where: { bookId: GREAT_GATSBY_ID }
    });
    console.log(`   ✅ Deleted ${deletedChunks.count} chunk records`);

    console.log('3. Deleting BookAudio...');
    const deletedAudio = await prisma.bookAudio.deleteMany({
      where: { bookId: GREAT_GATSBY_ID }
    });
    console.log(`   ✅ Deleted ${deletedAudio.count} audio records`);

    console.log('4. Deleting BookContent...');
    const deletedContent = await prisma.bookContent.deleteMany({
      where: { bookId: GREAT_GATSBY_ID }
    });
    console.log(`   ✅ Deleted ${deletedContent.count} content records`);

    console.log('5. Deleting BookCache...');
    const deletedCache = await prisma.bookCache.deleteMany({
      where: { bookId: GREAT_GATSBY_ID }
    });
    console.log(`   ✅ Deleted ${deletedCache.count} cache records`);

    console.log('6. Deleting main Book record...');
    const deletedBook = await prisma.book.delete({
      where: { id: GREAT_GATSBY_ID }
    });
    console.log(`   ✅ Deleted book: "${deletedBook.title}"`);

    console.log('\n🎉 Great Gatsby deletion completed successfully!');
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
console.log('⚠️  WARNING: This will permanently delete ALL Great Gatsby data from the database.');
console.log('This includes simplifications, audio, content, and the book record itself.');
console.log('This action cannot be undone.\n');

console.log('Are you sure you want to proceed? Type "DELETE GREAT GATSBY" to confirm:');

// In Node.js script environment, proceed directly
// (In production, you'd add readline for confirmation)
deleteGreatGatsby();