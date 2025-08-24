import { PrismaClient } from '@prisma/client';
import { AudioGenerator } from '../lib/services/audio-generator';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function fixMismatchedRomeoAudio() {
  console.log('🔧 Checking for mismatched Romeo & Juliet audio...\n');
  
  // Initialize services
  const audioGenerator = new AudioGenerator();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Check first 10 chunks across all levels for mismatches
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  let totalFixed = 0;
  
  for (const level of levels) {
    console.log(`\n🎵 Checking ${level} level (first 10 chunks)...`);
    
    const chunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'gutenberg-1513',
        cefrLevel: level,
        chunkIndex: { lte: 9 }
      },
      select: {
        id: true,
        chunkIndex: true,
        chunkText: true,
        audioFilePath: true
      },
      orderBy: { chunkIndex: 'asc' }
    });
    
    for (const chunk of chunks) {
      // Check if text mentions Pride & Prejudice content (common words)
      const isPrideAndPrejudice = chunk.chunkText.toLowerCase().includes('elizabeth') ||
                                  chunk.chunkText.toLowerCase().includes('darcy') ||
                                  chunk.chunkText.toLowerCase().includes('bennet') ||
                                  chunk.chunkText.toLowerCase().includes('bingley');
      
      // Check if text is Romeo & Juliet content
      const isRomeoJuliet = chunk.chunkText.toLowerCase().includes('romeo') ||
                           chunk.chunkText.toLowerCase().includes('juliet') ||
                           chunk.chunkText.toLowerCase().includes('capulet') ||
                           chunk.chunkText.toLowerCase().includes('montague') ||
                           chunk.chunkText.toLowerCase().includes('verona') ||
                           chunk.chunkText.toLowerCase().includes('tybalt');
      
      // If it's Pride & Prejudice text in Romeo & Juliet book, skip (wrong data)
      if (isPrideAndPrejudice) {
        console.log(`   ⚠️  Chunk ${chunk.chunkIndex} contains Pride & Prejudice text - skipping`);
        continue;
      }
      
      // If it's Romeo & Juliet text, regenerate audio
      if (isRomeoJuliet || chunk.chunkText.includes('Here\'s the modernized')) {
        try {
          console.log(`   🎤 Regenerating audio for ${level} chunk ${chunk.chunkIndex}...`);
          
          // Step 1: Generate new audio
          const localAudioPath = await audioGenerator.generateAudio(
            chunk.chunkText,
            'alloy',
            'gutenberg-1513',
            chunk.chunkIndex,
            level
          );
          
          // Step 2: Upload to Supabase (overwrite existing)
          const fullPath = path.join(process.cwd(), 'public', localAudioPath);
          const audioBuffer = fs.readFileSync(fullPath);
          
          const fileName = `${level.toLowerCase()}/chunk_${chunk.chunkIndex}.mp3`;
          const { data, error } = await supabase.storage
            .from('audio-files')
            .upload(fileName, audioBuffer, {
              contentType: 'audio/mp3',
              cacheControl: '2592000',
              upsert: true // Overwrite existing
            });
            
          if (error) {
            console.log(`   ❌ Upload failed: ${error.message}`);
            continue;
          }
          
          console.log(`   ✅ Fixed: ${level}/chunk_${chunk.chunkIndex}`);
          totalFixed++;
          
          // Small delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`   ❌ Error fixing ${level}/chunk_${chunk.chunkIndex}:`, error);
        }
      }
    }
  }
  
  console.log(`\n📊 Summary: Fixed ${totalFixed} mismatched audio files`);
  console.log(`🚀 Romeo & Juliet audio should now match the text!`);
  
  await prisma.$disconnect();
}

// Run the fix
if (require.main === module) {
  fixMismatchedRomeoAudio().catch(console.error);
}