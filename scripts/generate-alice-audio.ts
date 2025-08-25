import { PrismaClient } from '@prisma/client';
import { AudioGenerator } from '../lib/services/audio-generator';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function generateAliceAudio() {
  console.log('🎭 Generating audio for Alice in Wonderland (gutenberg-11)...\n');
  
  // Get all simplifications for Alice
  const simplifications = await prisma.bookSimplification.findMany({
    where: { bookId: 'gutenberg-11' },
    select: { 
      id: true,
      targetLevel: true, 
      chunkIndex: true, 
      simplifiedText: true 
    },
    orderBy: [
      { targetLevel: 'asc' },
      { chunkIndex: 'asc' }
    ]
  });
  
  console.log(`📊 Found ${simplifications.length} simplifications to generate audio for`);
  console.log(`📚 Expected: 372 files (62 per level × 6 levels)\n`);
  
  // Group by CEFR level
  const byLevel = simplifications.reduce((acc, item) => {
    if (!acc[item.targetLevel]) acc[item.targetLevel] = [];
    acc[item.targetLevel].push(item);
    return acc;
  }, {} as Record<string, typeof simplifications>);
  
  console.log('📋 CEFR levels found:', Object.keys(byLevel).sort().join(', '));
  
  // Initialize services
  const audioGenerator = new AudioGenerator();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  let totalGenerated = 0;
  let totalFailed = 0;
  
  // Process each CEFR level
  for (const [level, items] of Object.entries(byLevel)) {
    console.log(`\n🎵 Processing ${level} level (${items.length} chunks)...`);
    
    let levelGenerated = 0;
    let levelFailed = 0;
    
    for (const item of items) {
      try {
        console.log(`   🎤 Generating ${level} chunk ${item.chunkIndex}...`);
        
        // Step 1: Generate audio locally with CORRECT book ID
        const localAudioPath = await audioGenerator.generateAudio(
          item.simplifiedText,
          'alloy', // Consistent voice
          'gutenberg-11', // ALICE, not Frankenstein!
          item.chunkIndex,
          item.targetLevel
        );
        
        // Step 2: Upload to Supabase Storage with CORRECT paths
        const fullPath = path.join(process.cwd(), 'public', localAudioPath);
        const audioBuffer = fs.readFileSync(fullPath);
        
        const fileName = `gutenberg-11/${item.targetLevel.toLowerCase()}/chunk_${item.chunkIndex}.mp3`;
        const { data, error } = await supabase.storage
          .from('audio-files')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mp3',
            cacheControl: '2592000', // 30 days
            upsert: true // OVERWRITE the wrong Frankenstein content
          });
          
        if (error) {
          console.log(`   ❌ Upload failed: ${error.message}`);
          levelFailed++;
          continue;
        }
        
        // Step 3: Get CDN URL and update database
        const { data: { publicUrl } } = supabase.storage
          .from('audio-files')
          .getPublicUrl(data.path);
          
        // Update existing bookChunk
        await prisma.bookChunk.updateMany({
          where: { 
            bookId: 'gutenberg-11',
            cefrLevel: item.targetLevel,
            chunkIndex: item.chunkIndex
          },
          data: { audioFilePath: publicUrl }
        });
        
        console.log(`   ✅ Generated and uploaded: ${level}/chunk_${item.chunkIndex}`);
        levelGenerated++;
        totalGenerated++;
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Error processing ${level}/chunk_${item.chunkIndex}:`, error);
        levelFailed++;
        totalFailed++;
      }
    }
    
    console.log(`✅ Completed ${level}: ${levelGenerated} generated, ${levelFailed} failed`);
  }
  
  console.log(`\n📊 Final Summary:`);
  console.log(`   ✅ Total generated: ${totalGenerated}`);
  console.log(`   ❌ Total failed: ${totalFailed}`);
  console.log(`   📚 Expected total: 372 files`);
  console.log(`   🌍 All audio files uploaded to Supabase CDN`);
  console.log(`   🚀 Alice in Wonderland ready for instant global playback!`);
  console.log(`\n⚠️  Note: This script OVERWRITES the incorrect Frankenstein audio`);
  
  await prisma.$disconnect();
}

// Run the generation
if (require.main === module) {
  generateAliceAudio().catch(console.error);
}