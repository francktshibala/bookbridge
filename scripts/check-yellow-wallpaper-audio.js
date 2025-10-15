#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkYellowWallpaperAudio() {
  try {
    console.log('🎵 Yellow Wallpaper Audio Status\n');

    const bundles = await prisma.bookChunk.findMany({
      where: {
        bookId: 'gutenberg-1952-A1',
        cefrLevel: 'A1'
      },
      orderBy: { chunkIndex: 'asc' },
      select: {
        chunkIndex: true,
        audioFilePath: true,
        chunkText: true
      }
    });

    console.log('Bundle Status:');
    bundles.forEach(bundle => {
      const status = bundle.audioFilePath ? '✅ HAS AUDIO' : '❌ NO AUDIO';
      const preview = bundle.chunkText.substring(0, 50) + '...';
      console.log(`Bundle ${bundle.chunkIndex}: ${status}`);
      if (bundle.audioFilePath) {
        console.log(`  Path: ${bundle.audioFilePath}`);
      }
      console.log(`  Text: "${preview}"`);
    });

    const withAudio = bundles.filter(b => b.audioFilePath).length;
    const withoutAudio = bundles.filter(b => !b.audioFilePath).length;

    console.log(`\nSummary: ${withAudio} with audio, ${withoutAudio} without audio`);
    console.log('\n⚠️  Only bundles 0-4 have audio generated (pilot mode)');
    console.log('Need to generate audio for bundles 5-14 to complete the book');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkYellowWallpaperAudio();
