#!/usr/bin/env npx tsx

// Based on BOOKBRIDGE AUDIO GENERATION MASTER GUIDE
// Following scripts/regenerate-pride-audio-force.ts template

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// BOOK CONFIGURATION
const BOOK_ID = 'gutenberg-844';
const BOOK_TITLE = 'The Mysterious Affair at Styles';
const VOICE_ID = 'nova'; // Female voice for Agatha Christie

async function generateBook844Audio() {
  console.log(`🎬 GENERATING AUDIO FOR ${BOOK_TITLE.toUpperCase()} (${BOOK_ID})...\n`);
  console.log('📖 Book:', BOOK_TITLE, 'by Agatha Christie');
  console.log('🎤 Voice:', VOICE_ID);
  console.log('⚠️  Using book-specific paths to prevent conflicts\n');
  
  const chunks = await prisma.bookChunk.findMany({
    where: { 
      bookId: BOOK_ID,
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
  
  const chunksByCefr = chunks.reduce((acc, chunk) => {
    if (!acc[chunk.cefrLevel]) acc[chunk.cefrLevel] = [];
    acc[chunk.cefrLevel].push(chunk);
    return acc;
  }, {} as Record<string, typeof chunks>);
  
  console.log('\n📊 Chunks by CEFR level:');
  Object.entries(chunksByCefr).forEach(([level, levelChunks]) => {
    console.log(`  ${level}: ${levelChunks.length} chunks`);
  });
  
  console.log('\n🎵 Starting audio generation...');
  
  let totalProcessed = 0;
  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  for (const [cefrLevel, levelChunks] of Object.entries(chunksByCefr)) {
    console.log(`\n🔄 Processing ${cefrLevel}: ${levelChunks.length} chunks...`);
    
    for (let i = 0; i < levelChunks.length; i++) {
      const chunk = levelChunks[i];
      console.log(`  Processing chunk ${i + 1}/${levelChunks.length} (index: ${chunk.chunkIndex})`);
      totalProcessed++;
      
      if (chunk.audioFilePath) {
        console.log(`    ⏭️  Already has audio - skipping`);
        totalSkipped++;
        continue;
      }
      
      try {
        const ttsResponse = await openai.audio.speech.create({
          model: 'tts-1',
          voice: VOICE_ID as any,
          input: chunk.chunkText,
          response_format: 'mp3'
        });
        
        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        
        // ✅ CRITICAL: Book-specific path (following master guide)
        const fileName = `${BOOK_ID}/${cefrLevel.toLowerCase()}/chunk_${chunk.chunkIndex}.mp3`;
        
        const { data, error } = await supabase.storage
          .from('audio-files')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mp3',
            cacheControl: '2592000',
            upsert: true
          });
        
        if (error) {
          console.error(`    ❌ Failed to upload: ${error.message}`);
          totalErrors++;
          continue;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('audio-files')
          .getPublicUrl(fileName);
        
        await prisma.bookChunk.update({
          where: { id: chunk.id },
          data: { 
            audioFilePath: publicUrl,
            audioProvider: 'openai',
            audioVoiceId: VOICE_ID
          }
        });
        
        console.log(`    ✅ Generated and uploaded: ${fileName}`);
        totalGenerated++;
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error: any) {
        console.error(`    ❌ Error processing chunk ${chunk.chunkIndex}:`, error.message);
        totalErrors++;
      }
      
      if ((i + 1) % 10 === 0) {
        const percentage = Math.round(((i + 1) / levelChunks.length) * 100);
        console.log(`    📈 ${cefrLevel} progress: ${percentage}%`);
      }
    }
  }
  
  const finalCheck = await prisma.bookChunk.count({
    where: {
      bookId: BOOK_ID,
      audioFilePath: { not: null }
    }
  });
  
  console.log(`\n✅ ${BOOK_TITLE.toUpperCase()} AUDIO GENERATION COMPLETE!`);
  console.log('='.repeat(60));
  console.log(`📖 Book: ${BOOK_TITLE}`);
  console.log(`📊 Total chunks processed: ${totalProcessed}`);
  console.log(`✅ Audio files generated: ${totalGenerated}`);
  console.log(`⏭️  Chunks skipped: ${totalSkipped}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log(`🎯 Final chunks with audio: ${finalCheck}/${chunks.length}`);
  console.log(`📈 Success rate: ${Math.round((finalCheck / chunks.length) * 100)}%`);
  console.log(`\n🎯 All files uploaded to: ${BOOK_ID}/{level}/chunk_{index}.mp3`);
  
  await prisma.$disconnect();
}

process.on('SIGINT', async () => {
  console.log('\n⏹️  Process interrupted. Cleaning up...');
  await prisma.$disconnect();
  process.exit(0);
});

if (require.main === module) {
  generateBook844Audio()
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}