#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function compareGreatGatsbyText() {
  try {
    console.log('🔍 Comparing Great Gatsby database text vs audio generation source...\n');

    // Get the first bundle with audio for Great Gatsby
    const bundle = await prisma.bookChunk.findFirst({
      where: {
        bookId: 'gutenberg-64317-A2',
        cefrLevel: 'A2',
        audioFilePath: { not: null }
      },
      orderBy: { chunkIndex: 'asc' }
    });

    if (!bundle) {
      console.log('❌ No Great Gatsby bundles with audio found');
      return;
    }

    console.log(`📦 Bundle ${bundle.chunkIndex} text in database:`);
    console.log(`"${bundle.chunkText}"`);
    console.log(`\n📝 Sentence count: ${bundle.chunkText.split(/(?<=[.!?])\s+/).filter(s => s.trim()).length}`);

    // Check what's in our Great Gatsby A2 bundles cache
    const cacheFile = './cache/great-gatsby-A2-simplified.json';

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

          // Show sentence-by-sentence comparison
          const dbSentences = bundle.chunkText.split(/(?<=[.!?])\s+/).filter(s => s.trim());
          const cacheSentences = cacheBundle.sentences.map(s => s.text);

          console.log(`\n📝 Detailed sentence comparison:`);
          for (let i = 0; i < Math.max(dbSentences.length, cacheSentences.length); i++) {
            const dbSent = dbSentences[i] || '[MISSING]';
            const cacheSent = cacheSentences[i] || '[MISSING]';
            const match = dbSent === cacheSent ? '✅' : '❌';
            console.log(`${match} Sentence ${i + 1}:`);
            console.log(`  DB:    "${dbSent}"`);
            console.log(`  Cache: "${cacheSent}"`);
          }
        }
      } else {
        console.log(`\n❌ Bundle ${bundle.chunkIndex} not found in cache`);
      }
    } else {
      console.log(`\n❌ Great Gatsby cache file not found: ${cacheFile}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareGreatGatsbyText();