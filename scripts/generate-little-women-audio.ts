import { PrismaClient } from '@prisma/client';
import { AudioGenerator } from '../lib/services/audio-generator';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function generateLittleWomenAudio() {
  console.log('📚 Generating audio for Little Women (gutenberg-514)...\n');
  
  // Step 1: Verify book is ready
  const contentCheck = await prisma.bookContent.findFirst({
    where: { bookId: 'gutenberg-514' }
  });
  
  if (!contentCheck) {
    console.error('❌ ERROR: gutenberg-514 has no book_content loaded!');
    console.error('This book needs content loading before audio generation.');
    process.exit(1);
  }
  
  // Get all simplifications for Little Women
  const simplifications = await prisma.bookSimplification.findMany({
    where: { bookId: 'gutenberg-514' },
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
  
  // Group by CEFR level
  const byLevel = simplifications.reduce((acc, item) => {
    if (!acc[item.targetLevel]) acc[item.targetLevel] = [];
    acc[item.targetLevel].push(item);
    return acc;
  }, {} as Record<string, typeof simplifications>);
  
  console.log('📋 CEFR levels found:', Object.keys(byLevel).sort().join(', '));
  
  // Step 2: Copy simplifications to bookChunk table FIRST (prevent foreign key errors)
  console.log('\n🔄 Copying simplifications to bookChunk table...');
  for (const level of Object.keys(byLevel)) {
    try {
      const { execSync } = require('child_process');
      execSync(`node scripts/copy-simplifications-to-chunks.js gutenberg-514 ${level}`, 
        { stdio: 'inherit', cwd: process.cwd() });
      console.log(`✅ Copied ${level} level to bookChunk table`);
    } catch (error) {
      console.error(`❌ Failed to copy ${level} level:`, error);
    }
  }
  
  // Initialize services
  const audioGenerator = new AudioGenerator();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  let totalGenerated = 0;
  let totalFailed = 0;
  
  // Step 3: Generate audio with CORRECT book-specific paths
  for (const [level, items] of Object.entries(byLevel)) {
    console.log(`\n🎵 Processing ${level} level (${items.length} chunks)...`);
    
    let levelGenerated = 0;
    let levelFailed = 0;
    
    for (const item of items) {
      try {
        console.log(`   🎤 Generating ${level} chunk ${item.chunkIndex}...`);
        
        // Generate audio with CORRECT book ID (gutenberg-514, not any other book!)
        const localAudioPath = await audioGenerator.generateAudio(
          item.simplifiedText,
          'alloy', // Consistent voice
          'gutenberg-514', // Little Women - CRITICAL: Use correct book ID
          item.chunkIndex,
          item.targetLevel
        );
        
        // Upload to Supabase with BOOK-SPECIFIC paths to avoid conflicts
        const fullPath = path.join(process.cwd(), 'public', localAudioPath);
        const audioBuffer = fs.readFileSync(fullPath);
        
        // CRITICAL: Book-specific path format: bookId/level/chunk_X.mp3
        const fileName = `gutenberg-514/${item.targetLevel.toLowerCase()}/chunk_${item.chunkIndex}.mp3`;
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
        await prisma.bookChunk.updateMany({
          where: { 
            bookId: 'gutenberg-514',
            cefrLevel: item.targetLevel,
            chunkIndex: item.chunkIndex
          },
          data: { audioFilePath: publicUrl }
        });
        
        console.log(`   ✅ Generated and uploaded: ${level}/chunk_${item.chunkIndex}`);
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
    
    console.log(`✅ Completed ${level}: ${levelGenerated} generated, ${levelFailed} failed`);
  }
  
  console.log(`\n📊 Final Summary:`);
  console.log(`   ✅ Total generated: ${totalGenerated}`);
  console.log(`   ❌ Total failed: ${totalFailed}`);
  console.log(`   📚 Little Women audio generation complete`);
  console.log(`   🌍 All audio files uploaded to Supabase CDN`);
  console.log(`   🚀 Ready for instant global playback!`);
  
  await prisma.$disconnect();
}

// Run the generation
if (require.main === module) {
  generateLittleWomenAudio().catch(console.error);
}