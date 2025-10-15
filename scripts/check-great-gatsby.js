#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGreatGatsby() {
  try {
    console.log('🔍 Searching for Great Gatsby records in database...\n');

    // Check Books table
    const books = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: 'Great Gatsby', mode: 'insensitive' } },
          { title: { contains: 'Gatsby', mode: 'insensitive' } },
          { author: { contains: 'Fitzgerald', mode: 'insensitive' } }
        ]
      }
    });

    console.log('📚 Books table:');
    books.forEach(book => {
      console.log(`  - ID: ${book.id}`);
      console.log(`  - Title: ${book.title}`);
      console.log(`  - Author: ${book.author}`);
      console.log(`  - Created: ${book.createdAt}`);
      console.log('');
    });

    if (books.length === 0) {
      console.log('  No Great Gatsby found in Books table\n');
    }

    // Check BookSimplification table
    for (const book of books) {
      const simplifications = await prisma.bookSimplification.findMany({
        where: { bookId: book.id }
      });

      console.log(`📝 Simplifications for "${book.title}" (${book.id}):`);
      if (simplifications.length > 0) {
        simplifications.forEach(simp => {
          console.log(`  - Level: ${simp.targetLevel}`);
          console.log(`  - Chunks: ${simp.chunkIndex}`);
          console.log(`  - Created: ${simp.createdAt}`);
        });
      } else {
        console.log('  No simplifications found');
      }
      console.log('');
    }

    // Check BookContent table
    for (const book of books) {
      const content = await prisma.bookContent.findUnique({
        where: { bookId: book.id }
      });

      console.log(`📖 Content for "${book.title}" (${book.id}):`);
      if (content) {
        console.log(`  - Word Count: ${content.wordCount}`);
        console.log(`  - Total Chunks: ${content.totalChunks}`);
        console.log(`  - Era: ${content.era}`);
      } else {
        console.log('  No content record found');
      }
      console.log('');
    }

    // Check BookCache table
    for (const book of books) {
      const cache = await prisma.bookCache.findUnique({
        where: { bookId: book.id }
      });

      console.log(`🗄️ Cache for "${book.title}" (${book.id}):`);
      if (cache) {
        console.log(`  - Total Chunks: ${cache.totalChunks}`);
        console.log(`  - Indexed: ${cache.indexed}`);
        console.log(`  - Last Processed: ${cache.lastProcessed}`);
      } else {
        console.log('  No cache record found');
      }
      console.log('');
    }

    console.log('✅ Great Gatsby database check complete');

  } catch (error) {
    console.error('❌ Error checking Great Gatsby:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGreatGatsby();