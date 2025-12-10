#!/usr/bin/env npx tsx

/**
 * Remove José Hernández book from Modern Voices collection
 * This book was deleted but the card still appears, causing infinite loading
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BOOK_ID = 'jose-hernandez';

async function removeJoseHernandez() {
  console.log('🗑️  Removing José Hernández from Modern Voices collection...\n');

  try {
    // 1. Find the book
    const book = await prisma.featuredBook.findUnique({
      where: { slug: BOOK_ID }
    });

    if (!book) {
      console.log(`  ℹ️  Book "${BOOK_ID}" not found in database`);
      console.log('  ✅ Nothing to remove');
      return;
    }

    console.log(`  📚 Found book: ${book.title}`);

    // 2. Remove from Modern Voices collection membership
    const modernVoicesCollection = await prisma.bookCollection.findUnique({
      where: { slug: 'modern-voices' }
    });

    if (modernVoicesCollection) {
      const membership = await prisma.bookCollectionMembership.findUnique({
        where: {
          bookId_collectionId: {
            bookId: book.id,
            collectionId: modernVoicesCollection.id
          }
        }
      });

      if (membership) {
        await prisma.bookCollectionMembership.delete({
          where: {
            bookId_collectionId: {
              bookId: book.id,
              collectionId: modernVoicesCollection.id
            }
          }
        });
        console.log(`  ✅ Removed from Modern Voices collection`);
      } else {
        console.log(`  ℹ️  Not in Modern Voices collection`);
      }
    }

    // 3. Delete BookChunks (if any exist)
    const chunks = await prisma.bookChunk.deleteMany({
      where: { bookId: BOOK_ID }
    });
    if (chunks.count > 0) {
      console.log(`  ✅ Deleted ${chunks.count} book chunks`);
    }

    // 4. Delete BookContent (if exists)
    try {
      await prisma.bookContent.delete({
        where: { bookId: BOOK_ID }
      });
      console.log(`  ✅ Deleted book content`);
    } catch (e) {
      console.log(`  ℹ️  No book content found`);
    }

    // 5. Delete FeaturedBook record
    await prisma.featuredBook.delete({
      where: { slug: BOOK_ID }
    });
    console.log(`  ✅ Deleted FeaturedBook record`);

    console.log('\n🎉 José Hernández successfully removed from database!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run build: npm run build');
    console.log('   2. Push to GitHub: git push origin main');
    console.log('   3. Verify book card no longer appears in Modern Voices collection');

  } catch (error) {
    console.error('❌ Error removing José Hernández:', error);
    throw error;
  }
}

removeJoseHernandez()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

