#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGatsbyA2() {
  try {
    console.log('🔍 Checking for great-gatsby-a2 specifically...\n');

    // Check if the book exists
    const book = await prisma.book.findUnique({
      where: { id: 'great-gatsby-a2' }
    });

    if (book) {
      console.log('✅ Book found:', book);
      
      // Check chunks
      const chunks = await prisma.bookChunk.findMany({
        where: { bookId: 'great-gatsby-a2' },
        take: 5
      });
      console.log(`📦 Found ${chunks.length} chunks`);
      
    } else {
      console.log('❌ Book great-gatsby-a2 not found');
    }

    // Check book content
    const content = await prisma.bookContent.findUnique({
      where: { bookId: 'great-gatsby-a2' }
    });

    if (content) {
      console.log('✅ Book content found');
    } else {
      console.log('❌ Book content not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGatsbyA2();
