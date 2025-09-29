#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBundle45() {
  try {
    console.log('🔍 Checking bundle 45 issue...\n');

    const bundle = await prisma.bookChunk.findFirst({
      where: {
        bookId: 'gutenberg-1952-A1',
        cefrLevel: 'A1',
        chunkIndex: 45
      }
    });

    if (bundle) {
      console.log(`📦 Bundle 45 text: "${bundle.chunkText}"`);
      
      const sentences = bundle.chunkText.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      console.log(`\n📝 Sentence count: ${sentences.length}`);
      console.log('Sentences:');
      sentences.forEach((s, i) => console.log(`  ${i+1}. ${s}`));
      
      console.log(`\n🎵 Audio status: ${bundle.audioFilePath ? 'HAS AUDIO' : 'NO AUDIO'}`);
      
      // Check neighboring bundles
      const bundle44 = await prisma.bookChunk.findFirst({
        where: { bookId: 'gutenberg-1952-A1', chunkIndex: 44 }
      });
      const bundle46 = await prisma.bookChunk.findFirst({
        where: { bookId: 'gutenberg-1952-A1', chunkIndex: 46 }
      });
      
      console.log(`\n📊 Bundle 44: ${bundle44?.chunkText.split(/(?<=[.!?])\s+/).filter(s => s.trim()).length || 0} sentences`);
      console.log(`📊 Bundle 46: ${bundle46?.chunkText.split(/(?<=[.!?])\s+/).filter(s => s.trim()).length || 0} sentences`);
    } else {
      console.log('❌ Bundle 45 not found');
    }

    // Check total bundles
    const totalBundles = await prisma.bookChunk.count({
      where: { bookId: 'gutenberg-1952-A1' }
    });
    const bundlesWithAudio = await prisma.bookChunk.count({
      where: { bookId: 'gutenberg-1952-A1', audioFilePath: { not: null } }
    });
    
    console.log(`\n📊 Total: ${totalBundles} bundles, ${bundlesWithAudio} with audio`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBundle45();
