#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const A1_BOOK_ID = 'gutenberg-1952-A1';

async function cleanYellowWallpaperA1() {
  try {
    console.log('🧹 Cleaning Yellow Wallpaper A1 partial records...');

    // Delete BookChunks
    const deletedChunks = await prisma.bookChunk.deleteMany({
      where: { bookId: A1_BOOK_ID }
    });
    console.log(`✅ Deleted ${deletedChunks.count} A1 chunks`);

    // Delete BookContent
    const deletedContent = await prisma.bookContent.deleteMany({
      where: { bookId: A1_BOOK_ID }
    });
    console.log(`✅ Deleted ${deletedContent.count} A1 content records`);

    // Delete Book
    const deletedBook = await prisma.book.deleteMany({
      where: { id: A1_BOOK_ID }
    });
    console.log(`✅ Deleted ${deletedBook.count} A1 book records`);

    console.log('🎉 Clean slate ready for fresh A1 generation');

  } catch (error) {
    console.error('❌ Error cleaning:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanYellowWallpaperA1();
