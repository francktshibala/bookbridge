#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function checkYellowWallpaperText() {
  try {
    console.log('🔍 Checking Yellow Wallpaper Bundle 0 text...\n');

    // Get bundle 0 from database
    const dbBundle = await prisma.bookChunk.findFirst({
      where: {
        bookId: 'gutenberg-1952-A1',
        cefrLevel: 'A1',
        chunkIndex: 0
      }
    });

    if (dbBundle) {
      console.log('📦 DATABASE Bundle 0 text:');
      console.log(`"${dbBundle.chunkText}"`);
      console.log(`\nSentences:`);
      const dbSentences = dbBundle.chunkText.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      dbSentences.forEach((s, i) => console.log(`  ${i+1}. ${s}`));
    }

    // Check cache file
    const cacheFile = './cache/yellow-wallpaper-a1-bundles.json';
    if (fs.existsSync(cacheFile)) {
      const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      const cacheBundle = cache.bundles[0];
      
      console.log('\n💾 CACHE Bundle 0 text (used for audio):');
      const cacheText = cacheBundle.sentences.map(s => s.text).join(' ');
      console.log(`"${cacheText}"`);
      console.log(`\nSentences:`);
      cacheBundle.sentences.forEach((s, i) => console.log(`  ${i+1}. ${s.text}`));

      console.log('\n🔍 COMPARISON:');
      console.log(`Text matches: ${dbBundle.chunkText === cacheText}`);
      
      if (dbBundle.chunkText !== cacheText) {
        console.log('\n❌ MISMATCH DETAILS:');
        for (let i = 0; i < 4; i++) {
          const dbSent = dbSentences[i] || '[missing]';
          const cacheSent = cacheBundle.sentences[i]?.text || '[missing]';
          const match = dbSent === cacheSent ? '✅' : '❌';
          console.log(`${match} Sentence ${i+1}:`);
          if (dbSent !== cacheSent) {
            console.log(`  DB:    "${dbSent}"`);
            console.log(`  Cache: "${cacheSent}"`);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkYellowWallpaperText();
