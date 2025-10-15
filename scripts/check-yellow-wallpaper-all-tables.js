#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkYellowWallpaperAllTables() {
  try {
    console.log('🔍 Checking all tables for Yellow Wallpaper (gutenberg-1952)...\n');

    // Check Book table
    const book = await prisma.book.findUnique({
      where: { id: 'gutenberg-1952' }
    });
    console.log('📚 Book table:', book ? `Found: ${book.title} by ${book.author}` : 'Not found');

    // Check BookContent table
    const bookContent = await prisma.bookContent.findUnique({
      where: { bookId: 'gutenberg-1952' }
    });
    console.log('📄 BookContent table:', bookContent ? `Found: ${bookContent.title} by ${bookContent.author}` : 'Not found');

    // Check BookSimplification table
    const simplifications = await prisma.bookSimplification.count({
      where: { bookId: 'gutenberg-1952' }
    });
    console.log('📝 BookSimplification table:', `${simplifications} records`);

    // Check BookChunk table
    const chunks = await prisma.bookChunk.count({
      where: { bookId: 'gutenberg-1952' }
    });
    console.log('📦 BookChunk table:', `${chunks} records`);

    // Check BookAudio table
    const audio = await prisma.bookAudio.count({
      where: { bookId: 'gutenberg-1952' }
    });
    console.log('🎵 BookAudio table:', `${audio} records`);

    // Check BookCache table
    const cache = await prisma.bookCache.count({
      where: { bookId: 'gutenberg-1952' }
    });
    console.log('💾 BookCache table:', `${cache} records`);

    console.log('\n📊 Total records to delete:');
    console.log(`  - Book: ${book ? 1 : 0}`);
    console.log(`  - BookContent: ${bookContent ? 1 : 0}`);
    console.log(`  - BookSimplification: ${simplifications}`);
    console.log(`  - BookChunk: ${chunks}`);
    console.log(`  - BookAudio: ${audio}`);
    console.log(`  - BookCache: ${cache}`);

  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkYellowWallpaperAllTables();
