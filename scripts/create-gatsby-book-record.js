#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createGatsbyBookRecord() {
  try {
    console.log('📚 Creating Great Gatsby book record...\n');

    // Create the missing Book record
    const book = await prisma.book.upsert({
      where: { id: 'great-gatsby-a2' },
      update: {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald'
      },
      create: {
        id: 'great-gatsby-a2',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        publishYear: 1925,
        genre: 'Classic Literature'
      }
    });

    console.log('✅ Created book record:', book);

    // Verify it exists
    const verification = await prisma.book.findUnique({
      where: { id: 'great-gatsby-a2' }
    });

    if (verification) {
      console.log('✅ Verification successful - book record exists');
    } else {
      console.log('❌ Verification failed - book record missing');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createGatsbyBookRecord();
