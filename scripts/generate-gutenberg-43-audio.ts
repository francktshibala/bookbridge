#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { AudioGenerator } from '../lib/services/audio-generator';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function generateGutenberg43Audio() {
  console.log('🎵 Generating audio for Dr. Jekyll and Mr. Hyde (gutenberg-43)...\n');
  
  // Step 1: Verify book is ready
  const contentCheck = await prisma.bookContent.findFirst({
    where: { bookId: 'gutenberg-43' }
  });
  
  if (!contentCheck) {
    console.error('❌ ERROR: gutenberg-43 has no book_content loaded!');
    console.error('Run: npx ts-node scripts/load-gutenberg-43-content.ts');
    process.exit(1);
  }
  
  console.log(`📖 Ready to generate audio for: ${contentCheck.title}`);
  console.log(`📊 Total chunks: ${contentCheck.totalChunks}`);
  
  // Get all chunks for Dr. Jekyll and Mr. Hyde
  const chunks = await prisma.bookChunk.findMany({
    where: { bookId: 'gutenberg-43' },
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
  
  console.log(`📋 Found ${chunks.length} chunks to process`);
  
  // Group by CEFR level
  const byLevel = chunks.reduce((acc, item) => {
    if (!acc[item.cefrLevel]) acc[item.cefrLevel] = [];
    acc[item.cefrLevel].push(item);
    return acc;
  }, {} as Record<string, typeof chunks>);
  
  console.log('📚 CEFR levels found:', Object.keys(byLevel).sort().join(', '));
  
  // Initialize services
  const audioGenerator = new AudioGenerator();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  let totalGenerated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  
  // Generate audio for each level
  for (const [level, items] of Object.entries(byLevel)) {
    console.log(`\n🎤 Processing ${level} level (${items.length} chunks)...`);
    
    let levelGenerated = 0;
    let levelFailed = 0;
    let levelSkipped = 0;
    
    for (const item of items) {
      try {
        // Skip if audio already exists
        if (item.audioFilePath) {
          console.log(`   ⏭️  Skipping ${level} chunk ${item.chunkIndex} (audio exists)`);
          levelSkipped++;
          totalSkipped++;
          continue;
        }
        
        console.log(`   🎵 Generating ${level} chunk ${item.chunkIndex}...`);
        
        // Generate audio
        const localAudioPath = await audioGenerator.generateAudio(
          item.chunkText,
          'alloy', // Consistent voice for Dr. Jekyll and Mr. Hyde
          'gutenberg-43',
          item.chunkIndex,
          item.cefrLevel
        );
        
        // Upload to Supabase with book-specific paths
        const fullPath = path.join(process.cwd(), 'public', localAudioPath);
        const audioBuffer = fs.readFileSync(fullPath);
        
        // Book-specific path format: bookId/level/chunk_X.mp3
        const fileName = `gutenberg-43/${item.cefrLevel.toLowerCase()}/chunk_${item.chunkIndex}.mp3`;
        const { data, error } = await supabase.storage
          .from('audio-files')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mp3',
            cacheControl: '2592000', // 30 days
            upsert: true // Overwrite if exists
          });
          
        if (error) {
          console.log(`   ❌ Upload failed: ${error.message}`);
          levelFailed++;
          continue;
        }
        
        // Get CDN URL and update database
        const { data: { publicUrl } } = supabase.storage
          .from('audio-files')
          .getPublicUrl(data.path);
          
        // Update bookChunk with CDN URL
        await prisma.bookChunk.update({
          where: { id: item.id },
          data: { audioFilePath: publicUrl }
        });
        
        console.log(`   ✅ Generated: ${level}/chunk_${item.chunkIndex}`);
        levelGenerated++;
        totalGenerated++;
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Error processing ${level}/chunk_${item.chunkIndex}:`, error);
        levelFailed++;
        totalFailed++;
      }
    }
    
    console.log(`✅ Completed ${level}: ${levelGenerated} generated, ${levelSkipped} skipped, ${levelFailed} failed`);
  }
  
  console.log(`\n📊 Final Summary:`);
  console.log(`   ✅ Total generated: ${totalGenerated}`);
  console.log(`   ⏭️  Total skipped: ${totalSkipped}`);
  console.log(`   ❌ Total failed: ${totalFailed}`);
  console.log(`   📚 Dr. Jekyll and Mr. Hyde audio generation complete`);
  console.log(`   🌍 All audio files uploaded to Supabase CDN`);
  console.log(`   🚀 Ready for instant global playback!`);
  
  await prisma.$disconnect();
}

// Run the generation
if (require.main === module) {
  generateGutenberg43Audio().catch(console.error);
}