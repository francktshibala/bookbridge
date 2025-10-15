#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRomeoJuliet() {
  try {
    console.log('🔍 Checking Romeo and Juliet data...\n');

    // Find Romeo and Juliet books
    const books = await prisma.book.findMany({
      where: {
        OR: [
          { id: { contains: '1513' } },
          { title: { contains: 'Romeo' } },
          { title: { contains: 'Juliet' } }
        ]
      }
    });

    console.log('📚 Romeo and Juliet books found:');
    books.forEach(book => {
      console.log(`  ID: ${book.id}, Title: ${book.title}`);
    });

    // Check chunks for each book
    for (const book of books) {
      const chunks = await prisma.bookChunk.count({
        where: { bookId: book.id }
      });
      const withAudio = await prisma.bookChunk.count({
        where: { bookId: book.id, audioFilePath: { not: null } }
      });
      console.log(`  📦 ${chunks} chunks, ${withAudio} with audio`);
    }

    // Check simplified texts
    const simplified = await prisma.simplifiedText.count({
      where: { bookId: 'gutenberg-1513' }
    });
    console.log(`\n📝 Simplified texts: ${simplified}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRomeoJuliet();
