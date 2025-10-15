#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseYellowWallpaper() {
  try {
    console.log('🔍 Validating Yellow Wallpaper bundle sentence counts...\n');

    const bundles = await prisma.bookChunk.findMany({
      where: {
        bookId: 'gutenberg-1952-A1',
        cefrLevel: 'A1'
      },
      orderBy: { chunkIndex: 'asc' },
      take: 10 // Check first 10 bundles
    });

    console.log(`📦 Validating ${bundles.length} Yellow Wallpaper bundles:\n`);

    let validCount = 0;
    let invalidCount = 0;

    for (const bundle of bundles) {
      const sentences = bundle.chunkText.split(/(?<=[.!?])\s+/).filter(s => s.trim());
      
      if (sentences.length === 4) {
        console.log(`✅ Bundle ${bundle.chunkIndex}: ${sentences.length} sentences (VALID)`);
        validCount++;
      } else {
        console.log(`❌ Bundle ${bundle.chunkIndex}: ${sentences.length} sentences (INVALID - expected 4)`);
        console.log(`   Text: "${bundle.chunkText.substring(0, 80)}..."`);
        invalidCount++;
      }
    }

    console.log(`\n📊 Summary: ${validCount} valid, ${invalidCount} invalid bundles`);
    
    if (invalidCount === 0) {
      console.log('🎉 All bundles validated! Safe to generate audio.');
    } else {
      console.log('⚠️  Fix sentence count issues before audio generation!');
    }

  } catch (error) {
    console.error('❌ Diagnosis error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseYellowWallpaper();
