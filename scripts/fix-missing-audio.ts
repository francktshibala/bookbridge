import { PrismaClient } from '@prisma/client';
import { AudioGenerator } from '../lib/services/audio-generator';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function fixMissingAudio() {
  console.log('🔧 Fixing missing audio files...\n');
  
  // Get missing chunks
  const missingChunks = await prisma.bookChunk.findMany({
    where: { 
      bookId: 'gutenberg-1342',
      audioFilePath: { startsWith: '/audio/' }
    },
    select: { cefrLevel: true, chunkIndex: true, id: true, chunkText: true },
    orderBy: [{ cefrLevel: 'asc' }, { chunkIndex: 'asc' }]
  });

  console.log(`📊 Found ${missingChunks.length} missing chunks to fix`);
  
  // Initialize services
  const audioGenerator = new AudioGenerator();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  let successful = 0;
  let failed = 0;
  
  for (const chunk of missingChunks) {
    try {
      console.log(`\n🎵 Processing ${chunk.cefrLevel} chunk ${chunk.chunkIndex}...`);
      
      // Step 1: Generate audio locally first
      const localAudioPath = await audioGenerator.generateAudio(
        chunk.chunkText,
        'alloy', // Using consistent voice
        'gutenberg-1342',
        chunk.chunkIndex,
        chunk.cefrLevel
      );
      
      console.log(`   ✅ Generated locally: ${localAudioPath}`);
      
      // Step 2: Read the generated file
      const fullPath = path.join(process.cwd(), 'public', localAudioPath);
      const audioBuffer = fs.readFileSync(fullPath);
      
      // Step 3: Upload to Supabase Storage
      const fileName = `${chunk.cefrLevel.toLowerCase()}/chunk_${chunk.chunkIndex}.mp3`;
      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mp3',
          cacheControl: '2592000', // 30 days cache
          upsert: true // Allow overwrite
        });
        
      if (error) {
        console.log(`   ❌ Supabase upload failed: ${error.message}`);
        failed++;
        continue;
      }
      
      // Step 4: Get CDN URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(data.path);
        
      // Step 5: Update database with Supabase URL
      await prisma.bookChunk.update({
        where: { id: chunk.id },
        data: { audioFilePath: publicUrl }
      });
      
      console.log(`   ✅ Uploaded to CDN: ${publicUrl.substring(0, 80)}...`);
      successful++;
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`   ❌ Error processing ${chunk.cefrLevel}/chunk_${chunk.chunkIndex}:`, error);
      failed++;
    }
  }
  
  console.log(`\n📊 Fix Summary:`);
  console.log(`   ✅ Successfully fixed: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('\n🎉 Missing audio fix completed!');
  
  await prisma.$disconnect();
}

// Run the fix
if (require.main === module) {
  fixMissingAudio().catch(console.error);
}