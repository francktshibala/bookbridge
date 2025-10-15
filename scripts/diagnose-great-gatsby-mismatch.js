#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseGreatGatsby() {
  try {
    console.log('🔍 Diagnosing Great Gatsby audio-text mismatch...\n');

    // Check a few bundles around the problem area
    const bundles = await prisma.bookChunk.findMany({
      where: {
        bookId: 'great-gatsby-a2',
        cefrLevel: 'A2',
        audioFilePath: { not: null }
      },
      orderBy: { chunkIndex: 'asc' },
      take: 10 // Check first 10 bundles
    });

    console.log(`📦 Checking ${bundles.length} Great Gatsby bundles:\n`);

    for (const bundle of bundles) {
      const sentences = bundle.chunkText.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      
      console.log(`Bundle ${bundle.chunkIndex}:`);
      console.log(`  - Stored sentences: ${sentences.length}`);
      console.log(`  - Audio path: ${bundle.audioFilePath}`);
      console.log(`  - Text preview: "${bundle.chunkText.substring(0, 80)}..."`);
      
      if (sentences.length !== 4) {
        console.log(`  ⚠️  MISMATCH: Expected 4 sentences, found ${sentences.length}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Diagnosis error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseGreatGatsby();
