#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { AudioGenerator } from '../lib/services/audio-generator';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generatePrideAndPrejudiceAudio() {
  console.log('🎵 Generating audio for Pride and Prejudice (gutenberg-1342)...\n');
  
  // Step 1: Verify book is ready
  const contentCheck = await prisma.bookContent.findFirst({
    where: { bookId: 'gutenberg-1342' }
  });
  
  if (!contentCheck) {
    console.error('❌ ERROR: gutenberg-1342 has no book_content loaded!');
    console.error('Run content loading script first.');
    process.exit(1);
  }
  
  console.log(`📖 Ready to generate audio for: ${contentCheck.title}`);
  console.log(`📊 Total chunks: ${contentCheck.totalChunks}`);
  
  // Get all simplified chunks for Pride and Prejudice
  const chunks = await prisma.bookChunk.findMany({
    where: { 
      bookId: 'gutenberg-1342',
      isSimplified: true,
      cefrLevel: { not: 'original' }
    },
    select: { 
      id: true,
      cefrLevel: true, 
      chunkIndex: true, 
      chunkText: true,
      audioFilePath: true
    },
    orderBy: [
      { cefrLevel: 'asc' },
      { chunkIndex: 'asc' }
    ]
  });
  
  console.log(`📋 Found ${chunks.length} simplified chunks to process`);
  
  // Group by CEFR level
  const chunksByCefr = chunks.reduce((acc, chunk) => {
    if (!acc[chunk.cefrLevel]) acc[chunk.cefrLevel] = [];
    acc[chunk.cefrLevel].push(chunk);
    return acc;
  }, {} as Record<string, typeof chunks>);
  
  console.log('\n📊 Chunks by CEFR level:');
  Object.entries(chunksByCefr).forEach(([level, levelChunks]) => {
    console.log(`  ${level}: ${levelChunks.length} chunks`);
  });
  
  // Filter only chunks that need audio
  const chunksNeedingAudio = chunks.filter(chunk => !chunk.audioFilePath);
  console.log(`\n🎯 ${chunksNeedingAudio.length} chunks need audio generation`);
  
  if (chunksNeedingAudio.length === 0) {
    console.log('✅ All chunks already have audio!');
    return;
  }
  
  // Initialize audio generator
  const audioGenerator = new AudioGenerator();
  
  // Process chunks in batches by CEFR level
  for (const [cefrLevel, levelChunks] of Object.entries(chunksByCefr)) {
    const chunksToProcess = levelChunks.filter(chunk => !chunk.audioFilePath);
    
    if (chunksToProcess.length === 0) {
      console.log(`\n✅ ${cefrLevel}: All chunks already have audio`);
      continue;
    }
    
    console.log(`\n🔄 Processing ${cefrLevel}: ${chunksToProcess.length} chunks...`);
    
    for (let i = 0; i < chunksToProcess.length; i++) {
      const chunk = chunksToProcess[i];
      console.log(`  Processing chunk ${i + 1}/${chunksToProcess.length} (index: ${chunk.chunkIndex})`);
      
      try {
        // Generate audio
        const audioPath = await audioGenerator.generateAudio(
          chunk.chunkText,
          'alloy',
          'gutenberg-1342',
          chunk.chunkIndex,
          cefrLevel
        );
        
        // Read the generated file as buffer
        const audioBuffer = await fs.readFile(path.join(process.cwd(), 'public', audioPath));
        
        // ✅ CRITICAL: Use book-specific path following conflict prevention guide
        const fileName = `gutenberg-1342/${cefrLevel.toLowerCase()}/chunk_${chunk.chunkIndex}.mp3`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('audio-files')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mp3',
            cacheControl: '2592000', // 30 days
            upsert: true
          });
        
        if (error) {
          console.error(`    ❌ Failed to upload: ${error.message}`);
          continue;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('audio-files')
          .getPublicUrl(fileName);
        
        // Update database with audio path
        await prisma.bookChunk.update({
          where: { id: chunk.id },
          data: { 
            audioFilePath: publicUrl,
            audioProvider: 'openai',
            audioVoiceId: 'alloy'
          }
        });
        
        console.log(`    ✅ Generated and saved: ${fileName}`);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`    ❌ Error processing chunk ${chunk.chunkIndex}:`, error);
      }
    }
  }
  
  // Final summary
  const finalCheck = await prisma.bookChunk.count({
    where: {
      bookId: 'gutenberg-1342',
      audioFilePath: { not: null }
    }
  });
  
  console.log(`\n✅ Audio generation complete!`);
  console.log(`📊 Total chunks with audio: ${finalCheck}/${chunks.length}`);
  
  await prisma.$disconnect();
}

// Run the script
generatePrideAndPrejudiceAudio()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });