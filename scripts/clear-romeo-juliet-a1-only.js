#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function clearRomeoJulietA1Only() {
  try {
    console.log('🗑️  Clearing only Romeo and Juliet A1 partial data...\n');

    // Delete only A1 bundles for Romeo and Juliet
    const deleted = await prisma.bookChunk.deleteMany({
      where: {
        bookId: 'gutenberg-1513-A1',
        cefrLevel: 'A1'
      }
    });
    console.log(`✅ Deleted ${deleted.count} A1 bundles`);

    // Delete A1 book content
    try {
      await prisma.bookContent.delete({
        where: { bookId: 'gutenberg-1513-A1' }
      });
      console.log(`✅ Deleted A1 book content`);
    } catch (e) {
      console.log(`ℹ️  No A1 book content found`);
    }

    // Delete A1 book record
    try {
      await prisma.book.delete({
        where: { id: 'gutenberg-1513-A1' }
      });
      console.log(`✅ Deleted A1 book record`);
    } catch (e) {
      console.log(`ℹ️  No A1 book record found`);
    }

    // Clear only A1 bundle cache
    const cacheFile = './cache/romeo-juliet-a1-bundles.json';
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
      console.log(`✅ Deleted A1 bundle cache`);
    }

    console.log('\n✅ Romeo and Juliet A1 data cleared, original and modernized data preserved');

    // Verify what remains
    const originalBook = await prisma.book.findUnique({
      where: { id: 'gutenberg-1513' }
    });
    console.log(`🛡️  Original Romeo and Juliet: ${originalBook ? 'PRESERVED' : 'MISSING'}`);

    const modernizedCache = fs.existsSync('./cache/romeo-juliet-modernized.json');
    console.log(`🛡️  Modernized cache: ${modernizedCache ? 'PRESERVED' : 'MISSING'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearRomeoJulietA1Only();
