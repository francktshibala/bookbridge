#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function populateJekyllHydeAudioAssets() {
  console.log('🔧 Populating audio_assets for Jekyll & Hyde (gutenberg-43)...\n');
  
  // Get all chunks with audio files
  const chunks = await prisma.bookChunk.findMany({
    where: { 
      bookId: 'gutenberg-43',
      audioFilePath: { not: null },
      cefrLevel: { not: 'original' } // Skip original level
    },
    select: {
      cefrLevel: true,
      chunkIndex: true,
      audioFilePath: true
    }
  });
  
  console.log(`📊 Found ${chunks.length} audio files to add to audio_assets`);
  
  let created = 0;
  let skipped = 0;
  
  for (const chunk of chunks) {
    try {
      // Check if already exists
      const existing = await prisma.audioAsset.findFirst({
        where: {
          bookId: 'gutenberg-43',
          cefrLevel: chunk.cefrLevel,
          chunkIndex: chunk.chunkIndex,
          sentenceIndex: 0
        }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Create audio_assets entry
      await prisma.audioAsset.create({
        data: {
          bookId: 'gutenberg-43',
          cefrLevel: chunk.cefrLevel,
          chunkIndex: chunk.chunkIndex,
          sentenceIndex: 0, // Full chunk audio
          audioUrl: chunk.audioFilePath!,
          provider: 'openai',
          voiceId: 'alloy'
        }
      });
      
      created++;
      
    } catch (error) {
      console.error(`❌ Error processing ${chunk.cefrLevel}/chunk_${chunk.chunkIndex}:`, error);
    }
  }
  
  console.log(`\n✅ Complete: ${created} created, ${skipped} skipped`);
  await prisma.$disconnect();
}

if (require.main === module) {
  populateJekyllHydeAudioAssets().catch(console.error);
}