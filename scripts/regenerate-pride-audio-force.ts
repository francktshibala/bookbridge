#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function regeneratePrideAudio() {
  console.log('🔄 FORCE REGENERATING audio for Pride and Prejudice (gutenberg-1342)...\n');
  console.log('⚠️  This will regenerate ALL chunks to fix CDN path issues\n');
  
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
  
  console.log(`📋 Found ${chunks.length} simplified chunks to regenerate`);
  
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
  
  console.log('\n🎯 FORCING regeneration of ALL chunks to fix CDN paths...');
  
  // Process chunks in batches by CEFR level
  for (const [cefrLevel, levelChunks] of Object.entries(chunksByCefr)) {
    console.log(`\n🔄 Processing ${cefrLevel}: ${levelChunks.length} chunks...`);
    
    for (let i = 0; i < levelChunks.length; i++) {
      const chunk = levelChunks[i];
      console.log(`  Processing chunk ${i + 1}/${levelChunks.length} (index: ${chunk.chunkIndex})`);
      
      try {
        // Generate audio using OpenAI directly
        const ttsResponse = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'alloy',
          input: chunk.chunkText,
          response_format: 'mp3'
        });
        
        // Convert response to buffer
        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        
        // ✅ CRITICAL: Use book-specific path following conflict prevention guide
        const fileName = `gutenberg-1342/${cefrLevel.toLowerCase()}/chunk_${chunk.chunkIndex}.mp3`;
        
        // Upload to Supabase Storage (upsert: true will overwrite if exists)
        const { data, error } = await supabase.storage
          .from('audio-files')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mp3',
            cacheControl: '2592000', // 30 days
            upsert: true // Force overwrite
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
        
        console.log(`    ✅ Generated and uploaded: ${fileName}`);
        
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
  
  console.log(`\n✅ Audio regeneration complete!`);
  console.log(`📊 Total chunks with audio: ${finalCheck}/${chunks.length}`);
  console.log('\n🎯 All files now uploaded to correct book-specific paths!');
  
  await prisma.$disconnect();
}

// Run the script
regeneratePrideAudio()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });