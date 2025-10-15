#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugAPI() {
  try {
    console.log('🔍 Debugging Yellow Wallpaper A1 API data...\n');

    // Check BookContent
    const bookContent = await prisma.bookContent.findUnique({
      where: { bookId: 'gutenberg-1952-A1' }
    });
    console.log('📄 BookContent:', bookContent ? `Found: ${bookContent.title}` : 'Not found');

    // Check BookChunks with audio
    const chunksWithAudio = await prisma.bookChunk.findMany({
      where: {
        bookId: 'gutenberg-1952-A1',
        cefrLevel: 'A1',
        audioFilePath: { not: null }
      },
      orderBy: { chunkIndex: 'asc' }
    });
    console.log(`📦 Chunks with audio: ${chunksWithAudio.length}`);

    // Check all chunks (with and without audio)
    const allChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'gutenberg-1952-A1',
        cefrLevel: 'A1'
      },
      orderBy: { chunkIndex: 'asc' }
    });
    console.log(`📦 Total chunks: ${allChunks.length}`);

    if (chunksWithAudio.length > 0) {
      console.log('\n✅ Sample chunk with audio:');
      console.log(`  - chunkIndex: ${chunksWithAudio[0].chunkIndex}`);
      console.log(`  - audioFilePath: ${chunksWithAudio[0].audioFilePath}`);
      console.log(`  - audioProvider: ${chunksWithAudio[0].audioProvider}`);
    }

    if (allChunks.length > chunksWithAudio.length) {
      console.log(`\n⚠️  ${allChunks.length - chunksWithAudio.length} chunks missing audio`);
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAPI();
