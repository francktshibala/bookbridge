#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function deleteYellowWallpaperComplete() {
  try {
    console.log('🗑️  Complete Yellow Wallpaper deletion starting...\n');

    // Define all Yellow Wallpaper book IDs
    const bookIds = ['gutenberg-1952', 'gutenberg-1952-A1'];

    let totalDeleted = 0;

    for (const bookId of bookIds) {
      console.log(`\n📚 Processing book ID: ${bookId}`);

      // 1. Delete BookChunks
      const chunks = await prisma.bookChunk.deleteMany({
        where: { bookId }
      });
      console.log(`  ✅ Deleted ${chunks.count} book chunks`);
      totalDeleted += chunks.count;

      // 2. Delete BookContent
      try {
        await prisma.bookContent.delete({
          where: { bookId }
        });
        console.log(`  ✅ Deleted book content`);
        totalDeleted++;
      } catch (e) {
        console.log(`  ℹ️  No book content found`);
      }

      // 3. Skip SimplifiedText (model doesn't exist in this schema)

      // 4. Delete Book record
      try {
        await prisma.book.delete({
          where: { id: bookId }
        });
        console.log(`  ✅ Deleted book record`);
        totalDeleted++;
      } catch (e) {
        console.log(`  ℹ️  No book record found`);
      }
    }

    // 5. Delete cache files
    console.log('\n📁 Deleting cache files...');
    const cacheFiles = [
      './cache/yellow-wallpaper.json',
      './cache/yellow-wallpaper-modernized.json',
      './cache/yellow-wallpaper-a1-bundles.json',
      './cache/yellow-wallpaper-mismatch-report.json'
    ];

    for (const file of cacheFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`  ✅ Deleted ${file}`);
      }
    }

    // 6. Delete data directory
    const dataDir = './data/yellow-wallpaper';
    if (fs.existsSync(dataDir)) {
      fs.rmSync(dataDir, { recursive: true, force: true });
      console.log(`  ✅ Deleted data directory`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Yellow Wallpaper deletion complete!');
    console.log(`📊 Total database records deleted: ${totalDeleted}`);
    console.log('='.repeat(60));

    // Verify deletion
    console.log('\n🔍 Verification:');
    const remainingChunks = await prisma.bookChunk.count({
      where: {
        OR: [
          { bookId: 'gutenberg-1952' },
          { bookId: 'gutenberg-1952-A1' }
        ]
      }
    });

    const remainingBooks = await prisma.book.count({
      where: {
        OR: [
          { id: 'gutenberg-1952' },
          { id: 'gutenberg-1952-A1' }
        ]
      }
    });

    if (remainingChunks === 0 && remainingBooks === 0) {
      console.log('✅ All Yellow Wallpaper data successfully removed');
    } else {
      console.log(`⚠️  Found ${remainingChunks} chunks and ${remainingBooks} books still remaining`);
    }

    // Check other books are safe
    console.log('\n🛡️  Other books verification:');
    const otherBooks = await prisma.book.findMany({
      where: {
        NOT: {
          id: {
            contains: '1952'
          }
        }
      },
      select: { id: true, title: true }
    });

    console.log(`✅ ${otherBooks.length} other books remain intact`);
    if (otherBooks.length > 0) {
      console.log('Sample intact books:', otherBooks.slice(0, 3).map(b => b.title).join(', '));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteYellowWallpaperComplete();