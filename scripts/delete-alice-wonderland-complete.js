#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function deleteAliceWonderlandComplete() {
  try {
    console.log('🗑️  Complete Alice in Wonderland deletion starting...\n');

    // Define all Alice in Wonderland book IDs
    const bookIds = ['gutenberg-11', 'gutenberg-11-A1'];

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

      // 3. Delete Book record
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

    // 4. Delete cache files
    console.log('\n📁 Deleting cache files...');
    const cacheFiles = [
      './cache/alice-wonderland.json',
      './cache/alice-wonderland-original.json',
      './cache/alice-wonderland-modernized.json',
      './cache/alice-wonderland-a1-bundles.json'
    ];

    for (const file of cacheFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`  ✅ Deleted ${file}`);
      }
    }

    // 5. Delete data directory
    const dataDir = './data/alice-wonderland';
    if (fs.existsSync(dataDir)) {
      fs.rmSync(dataDir, { recursive: true, force: true });
      console.log(`  ✅ Deleted data directory`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Alice in Wonderland deletion complete!');
    console.log(`📊 Total database records deleted: ${totalDeleted}`);
    console.log('='.repeat(60));

    // Verify deletion
    console.log('\n🔍 Verification:');
    const remainingChunks = await prisma.bookChunk.count({
      where: {
        OR: [
          { bookId: 'gutenberg-11' },
          { bookId: 'gutenberg-11-A1' }
        ]
      }
    });

    const remainingBooks = await prisma.book.count({
      where: {
        OR: [
          { id: 'gutenberg-11' },
          { id: 'gutenberg-11-A1' }
        ]
      }
    });

    if (remainingChunks === 0 && remainingBooks === 0) {
      console.log('✅ All Alice in Wonderland data successfully removed');
    } else {
      console.log(`⚠️  Found ${remainingChunks} chunks and ${remainingBooks} books still remaining`);
    }

    // Check other books are safe
    console.log('\n🛡️  Other books verification:');
    const otherBooks = await prisma.book.findMany({
      where: {
        NOT: {
          id: {
            contains: 'gutenberg-11'
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

deleteAliceWonderlandComplete();