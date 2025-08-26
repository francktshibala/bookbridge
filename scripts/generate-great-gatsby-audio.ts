#!/usr/bin/env npx tsx

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

async function generateGatsbyAudio() {
  console.log('🎬 GENERATING AUDIO FOR THE GREAT GATSBY (gutenberg-64317)...\n');
  console.log('📖 Book: The Great Gatsby by F. Scott Fitzgerald');
  console.log('🎯 Target: 656 chunks × 6 CEFR levels = 3,936 audio files');
  console.log('⚠️  Using book-specific paths to prevent conflicts\n');
  
  // Get all simplified chunks for The Great Gatsby
  const chunks = await prisma.bookChunk.findMany({
    where: { 
      bookId: 'gutenberg-64317',
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
    const existingAudio = levelChunks.filter(c => c.audioFilePath).length;
    console.log(`  ${level}: ${levelChunks.length} chunks (${existingAudio} already have audio)`);
  });
  
  console.log('\n🎵 Starting audio generation...');
  
  let totalProcessed = 0;
  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  // Process chunks in batches by CEFR level
  for (const [cefrLevel, levelChunks] of Object.entries(chunksByCefr)) {
    console.log(`\n🔄 Processing ${cefrLevel}: ${levelChunks.length} chunks...`);
    
    for (let i = 0; i < levelChunks.length; i++) {
      const chunk = levelChunks[i];
      const progress = `${i + 1}/${levelChunks.length}`;
      console.log(`  Processing chunk ${progress} (index: ${chunk.chunkIndex})`);
      totalProcessed++;
      
      // Skip if audio already exists
      if (chunk.audioFilePath) {
        console.log(`    ⏭️  Already has audio - skipping`);
        totalSkipped++;
        continue;
      }
      
      try {
        // Generate audio using OpenAI directly
        const ttsResponse = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'nova',
          input: chunk.chunkText,
          response_format: 'mp3'
        });
        
        // Convert response to buffer
        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        
        // ✅ CRITICAL: Use book-specific path following conflict prevention guide
        const fileName = `gutenberg-64317/${cefrLevel.toLowerCase()}/chunk_${chunk.chunkIndex}.mp3`;
        
        // Upload to Supabase Storage (upsert: true will overwrite if exists)
        const { data, error } = await supabase.storage
          .from('audio-files')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mp3',
            cacheControl: '2592000', // 30 days
            upsert: true // Force overwrite if exists
          });
        
        if (error) {
          console.error(`    ❌ Failed to upload: ${error.message}`);
          totalErrors++;
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
            audioVoiceId: 'nova'
          }
        });
        
        console.log(`    ✅ Generated and uploaded: ${fileName}`);
        totalGenerated++;
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error: any) {
        console.error(`    ❌ Error processing chunk ${chunk.chunkIndex}:`, error.message);
        totalErrors++;
      }
      
      // Progress update every 10 chunks
      if ((i + 1) % 10 === 0) {
        const percentage = Math.round(((i + 1) / levelChunks.length) * 100);
        console.log(`    📈 ${cefrLevel} progress: ${i + 1}/${levelChunks.length} (${percentage}%)`);
      }
    }
  }
  
  // Final summary
  const finalCheck = await prisma.bookChunk.count({
    where: {
      bookId: 'gutenberg-64317',
      audioFilePath: { not: null }
    }
  });
  
  console.log('\n🎉 THE GREAT GATSBY AUDIO GENERATION COMPLETE!');
  console.log('='.repeat(60));
  console.log(`📖 Book: The Great Gatsby`);
  console.log(`📊 Total chunks processed: ${totalProcessed}`);
  console.log(`✅ Audio files generated: ${totalGenerated}`);
  console.log(`⏭️  Chunks skipped (already had audio): ${totalSkipped}`);
  console.log(`❌ Errors encountered: ${totalErrors}`);
  console.log(`🎯 Final chunks with audio: ${finalCheck}/${chunks.length}`);
  console.log(`📈 Success rate: ${Math.round((finalCheck / chunks.length) * 100)}%`);
  console.log('\n🎯 All files uploaded to book-specific paths: gutenberg-64317/{level}/chunk_{index}.mp3');
  console.log('🚀 Ready for global deployment!');
  
  await prisma.$disconnect();
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n⏹️  Process interrupted. Cleaning up...');
  await prisma.$disconnect();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  generateGatsbyAudio()
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}