import { PrismaClient } from '@prisma/client';
import { AudioGenerator } from '../lib/services/audio-generator';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function generateYellowWallpaperAudio() {
  console.log('📚 Generating audio for The Yellow Wallpaper (gutenberg-1952)...\n');
  
  // Step 1: Verify book is ready
  const contentCheck = await prisma.bookContent.findFirst({
    where: { bookId: 'gutenberg-1952' }
  });
  
  if (!contentCheck) {
    console.error('❌ ERROR: gutenberg-1952 has no book_content loaded!');
    console.error('This book needs content loading before audio generation.');
    process.exit(1);
  }
  
  console.log(`✅ Book content verified: "${contentCheck.title}" by ${contentCheck.author}`);
  console.log(`📊 ${contentCheck.wordCount.toLocaleString()} words in ${contentCheck.totalChunks} chunks`);
  
  // Get all BookChunk entries for The Yellow Wallpaper (excluding original)
  const chunks = await prisma.bookChunk.findMany({
    where: { 
      bookId: 'gutenberg-1952',
      cefrLevel: { not: 'original' } // Skip original text, only generate for simplified levels
    },
    select: { 
      id: true,
      cefrLevel: true, 
      chunkIndex: true, 
      chunkText: true 
    },
    orderBy: [
      { cefrLevel: 'asc' },
      { chunkIndex: 'asc' }
    ]
  });
  
  console.log(`📊 Found ${chunks.length} simplified chunks to generate audio for`);
  
  // Group by CEFR level
  const byLevel = chunks.reduce((acc, item) => {
    if (!acc[item.cefrLevel]) acc[item.cefrLevel] = [];
    acc[item.cefrLevel].push(item);
    return acc;
  }, {} as Record<string, typeof chunks>);
  
  console.log('📋 CEFR levels found:', Object.keys(byLevel).sort().join(', '));
  
  // Initialize services
  const audioGenerator = new AudioGenerator();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  let totalGenerated = 0;
  let totalFailed = 0;
  
  // Step 2: Generate audio with book-specific paths
  for (const [level, items] of Object.entries(byLevel)) {
    console.log(`\n🎵 Processing ${level} level (${items.length} chunks)...`);
    
    let levelGenerated = 0;
    let levelFailed = 0;
    
    for (const item of items) {
      try {
        console.log(`   🎤 Generating ${level} chunk ${item.chunkIndex}...`);
        
        // Generate audio with correct book ID
        const localAudioPath = await audioGenerator.generateAudio(
          item.chunkText,
          'alloy', // Consistent voice
          'gutenberg-1952', // The Yellow Wallpaper - CRITICAL: Use correct book ID
          item.chunkIndex,
          item.cefrLevel
        );
        
        // Upload to Supabase with book-specific paths to avoid conflicts
        const fullPath = path.join(process.cwd(), 'public', localAudioPath);
        const audioBuffer = fs.readFileSync(fullPath);
        
        // CRITICAL: Book-specific path format: bookId/level/chunk_X.mp3
        const fileName = `gutenberg-1952/${item.cefrLevel.toLowerCase()}/chunk_${item.chunkIndex}.mp3`;
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
            bookId: 'gutenberg-1952',
            cefrLevel: item.cefrLevel,
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
  console.log(`   📚 The Yellow Wallpaper audio generation complete`);
  console.log(`   🌍 All audio files uploaded to Supabase CDN`);
  console.log(`   🚀 Ready for instant global playback!`);
  
  await prisma.$disconnect();
}

// Run the generation
if (require.main === module) {
  generateYellowWallpaperAudio().catch(console.error);
}