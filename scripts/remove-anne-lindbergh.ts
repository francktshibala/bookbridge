#!/usr/bin/env npx tsx

/**
 * Remove Anne Lindbergh from database
 * Deletes FeaturedBook record and CollectionMembership
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();

async function removeAnneLindbergh() {
  console.log('🗑️  Removing Anne Lindbergh from database...\n');

  try {
    // Find the book
    const book = await prisma.featuredBook.findUnique({
      where: { slug: 'anne-lindbergh' }
    });

    if (!book) {
      console.log('✅ Anne Lindbergh not found in database (already removed)');
      return;
    }

    console.log(`📚 Found: ${book.title}`);

    // Remove collection memberships
    const membershipCount = await prisma.bookCollectionMembership.count({
      where: { bookId: book.id }
    });
    if (membershipCount > 0) {
      console.log(`🔗 Removing ${membershipCount} collection memberships...`);
      await prisma.bookCollectionMembership.deleteMany({
        where: { bookId: book.id }
      });
      console.log('✅ Collection memberships removed');
    }

    // Remove BookChunk records
    const chunkCount = await prisma.bookChunk.count({
      where: { bookId: 'anne-lindbergh' }
    });
    if (chunkCount > 0) {
      console.log(`📦 Removing ${chunkCount} BookChunk records...`);
      await prisma.bookChunk.deleteMany({
        where: { bookId: 'anne-lindbergh' }
      });
      console.log('✅ BookChunk records removed');
    }

    // Remove BookContent record
    const contentCount = await prisma.bookContent.count({
      where: { bookId: 'anne-lindbergh' }
    });
    if (contentCount > 0) {
      console.log(`📖 Removing BookContent record...`);
      await prisma.bookContent.deleteMany({
        where: { bookId: 'anne-lindbergh' }
      });
      console.log('✅ BookContent record removed');
    }

    // Remove FeaturedBook record
    console.log(`📚 Removing FeaturedBook record...`);
    await prisma.featuredBook.delete({
      where: { slug: 'anne-lindbergh' }
    });
    console.log('✅ FeaturedBook record removed');

    console.log('\n🎉 Anne Lindbergh completely removed from database!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

removeAnneLindbergh();

