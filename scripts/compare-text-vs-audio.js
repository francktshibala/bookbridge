#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function compareTextVsAudio() {
  try {
    console.log('🔍 Comparing database text vs audio generation source...\n');

    // Get the first bundle with audio
    const bundle = await prisma.bookChunk.findFirst({
      where: {
        bookId: 'gutenberg-1952-A1',
        cefrLevel: 'A1',
        audioFilePath: { not: null }
      },
      orderBy: { chunkIndex: 'asc' }
    });

    if (!bundle) {
      console.log('❌ No bundles with audio found');
      return;
    }

    console.log(`📦 Bundle ${bundle.chunkIndex} text in database:`);
    console.log(`"${bundle.chunkText}"`);
    console.log(`\n📝 Sentence count: ${bundle.chunkText.split(/(?<=[.!?])\s+/).filter(s => s.trim()).length}`);

    // Check what's in our A1 bundles cache
    const fs = await import('fs');
    const cacheFile = './cache/yellow-wallpaper-a1-bundles.json';
    
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      const cacheBundle = cached.bundles.find(b => b.bundleIndex === bundle.chunkIndex);
      
      if (cacheBundle) {
        console.log(`\n💾 Same bundle from cache (used for audio):`);
        const cacheText = cacheBundle.sentences.map(s => s.text).join(' ');
        console.log(`"${cacheText}"`);
        
        console.log(`\n🔍 COMPARISON:`);
        console.log(`Database text === Cache text: ${bundle.chunkText === cacheText}`);
        
        if (bundle.chunkText !== cacheText) {
          console.log(`\n❌ MISMATCH FOUND!`);
          console.log(`Database: "${bundle.chunkText.substring(0, 100)}..."`);
          console.log(`Cache:    "${cacheText.substring(0, 100)}..."`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareTextVsAudio();
