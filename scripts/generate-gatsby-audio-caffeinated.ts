#!/usr/bin/env npx tsx

/**
 * CAFFEINATED OVERNIGHT AUDIO GENERATION FOR THE GREAT GATSBY (gutenberg-64317)
 * 
 * ⚠️  CRITICAL: This script uses BOOK-SPECIFIC PATHS to prevent audio conflicts
 * ✅ Pattern: ${bookId}/${cefrLevel.toLowerCase()}/chunk_${chunkIndex}.mp3
 * ❌ NEVER: ${cefrLevel}/chunk_${chunkIndex}.mp3 (causes cross-book contamination)
 * 
 * Total work: 656 chunks × 6 levels = 3,936 audio files
 * Estimated time: 6-12 hours (with caffeinate to prevent sleep)
 * 
 * Usage: caffeinate -s npx tsx scripts/generate-gatsby-audio-caffeinated.ts
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Configuration
const BOOK_ID = 'gutenberg-64317';
const BOOK_TITLE = 'The Great Gatsby';
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const VOICE_ID = 'alloy'; // Consistent with other books
const CONCURRENT_JOBS = 3; // Prevent rate limiting
const RETRY_ATTEMPTS = 3;
const DELAY_BETWEEN_CHUNKS = 1000; // 1 second delay

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SimplificationItem {
  id: string;
  bookId: string;
  chunkIndex: number;
  targetLevel: string;
  originalText: string;
  simplifiedText: string;
}

interface GenerationStats {
  totalFiles: number;
  successful: number;
  failed: number;
  skipped: number;
  startTime: Date;
  errors: Array<{ chunk: number; level: string; error: string }>;
}

async function main() {
  console.log('🎬 STARTING CAFFEINATED GATSBY AUDIO GENERATION');
  console.log('☕ Keep computer awake: caffeinate command should be running');
  console.log('📖 Book:', BOOK_TITLE, '(' + BOOK_ID + ')');
  console.log('🎯 Target: 656 chunks × 6 levels = 3,936 audio files');
  console.log('⏰ Started at:', new Date().toLocaleString());
  console.log('');

  const stats: GenerationStats = {
    totalFiles: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    startTime: new Date(),
    errors: []
  };

  try {
    // Step 1: Verify prerequisites
    await verifyPrerequisites();
    
    // Step 2: Verify chunks are ready (already copied)
    await verifyChunksReady();
    
    // Step 3: Generate audio for all levels
    for (const level of CEFR_LEVELS) {
      console.log(`\n🎵 GENERATING AUDIO FOR LEVEL ${level}`);
      console.log('='.repeat(50));
      
      const levelStats = await generateAudioForLevel(level);
      
      stats.totalFiles += levelStats.totalFiles;
      stats.successful += levelStats.successful;
      stats.failed += levelStats.failed;
      stats.skipped += levelStats.skipped;
      stats.errors.push(...levelStats.errors);
      
      console.log(`✅ Level ${level} completed: ${levelStats.successful}/${levelStats.totalFiles} files`);
      
      // Progress update
      const completedLevels = CEFR_LEVELS.indexOf(level) + 1;
      const totalLevels = CEFR_LEVELS.length;
      const percentComplete = Math.round((completedLevels / totalLevels) * 100);
      
      console.log(`📊 Overall progress: ${completedLevels}/${totalLevels} levels (${percentComplete}%)`);
      console.log(`🎯 Files generated: ${stats.successful}/${stats.totalFiles * totalLevels / completedLevels}`);
    }
    
    // Step 4: Final report
    await printFinalReport(stats);
    
  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyPrerequisites() {
  console.log('🔍 VERIFYING PREREQUISITES...');
  
  // Check book content exists
  const bookContent = await prisma.bookContent.findFirst({
    where: { bookId: BOOK_ID }
  });
  
  if (!bookContent) {
    throw new Error(`❌ Book content not loaded for ${BOOK_ID}. Run: node scripts/load-gatsby-content.js`);
  }
  
  // Check simplifications exist
  const simplificationCount = await prisma.bookSimplification.count({
    where: { bookId: BOOK_ID }
  });
  
  if (simplificationCount === 0) {
    throw new Error(`❌ No simplifications found for ${BOOK_ID}. Generate simplifications first.`);
  }
  
  // Check environment variables
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('❌ OPENAI_API_KEY not found in environment');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('❌ Supabase credentials not found in environment');
  }
  
  console.log('✅ Prerequisites verified:');
  console.log(`   📚 Content loaded: ${bookContent.title}`);
  console.log(`   🎯 Simplifications: ${simplificationCount} chunks`);
  console.log(`   🔑 API keys: configured`);
}

async function verifyChunksReady() {
  console.log('\n📋 VERIFYING CHUNKS ARE READY...');
  
  const chunksCount = await prisma.bookChunk.count({
    where: {
      bookId: BOOK_ID,
      isSimplified: true
    }
  });
  
  const expectedTotal = 656; // 109-110 chunks per level × 6 levels
  
  if (chunksCount < expectedTotal) {
    throw new Error(`❌ Expected ${expectedTotal} chunks, found ${chunksCount}. Run simplification copying first.`);
  }
  
  console.log(`✅ Found ${chunksCount} simplified chunks ready for audio generation`);
  
  // Verify distribution across levels
  for (const level of CEFR_LEVELS) {
    const levelCount = await prisma.bookChunk.count({
      where: {
        bookId: BOOK_ID,
        cefrLevel: level,
        isSimplified: true
      }
    });
    console.log(`   ${level}: ${levelCount} chunks`);
  }
}

async function generateAudioForLevel(cefrLevel: string) {
  const levelStats: GenerationStats = {
    totalFiles: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    startTime: new Date(),
    errors: []
  };
  
  // Get all chunks for this level
  const chunks = await prisma.bookChunk.findMany({
    where: {
      bookId: BOOK_ID,
      cefrLevel: cefrLevel,
      isSimplified: true
    },
    orderBy: { chunkIndex: 'asc' }
  });
  
  levelStats.totalFiles = chunks.length;
  
  console.log(`📊 Found ${chunks.length} chunks for level ${cefrLevel}`);
  
  // Process chunks in batches
  const batchSize = CONCURRENT_JOBS;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const promises = batch.map(chunk => generateSingleAudioFile(chunk, levelStats));
    
    await Promise.allSettled(promises);
    
    // Progress update
    const processed = Math.min(i + batchSize, chunks.length);
    const percent = Math.round((processed / chunks.length) * 100);
    console.log(`📈 ${cefrLevel} progress: ${processed}/${chunks.length} (${percent}%)`);
    
    // Small delay to prevent API overload
    if (i + batchSize < chunks.length) {
      await sleep(DELAY_BETWEEN_CHUNKS);
    }
  }
  
  return levelStats;
}

async function generateSingleAudioFile(chunk: any, stats: GenerationStats): Promise<void> {
  const { chunkIndex, cefrLevel, simplifiedText } = chunk;
  
  // ✅ CRITICAL: Use book-specific path to prevent conflicts
  const fileName = `${BOOK_ID}/${cefrLevel.toLowerCase()}/chunk_${chunkIndex}.mp3`;
  
  try {
    // Check if audio already exists
    if (chunk.audioFilePath) {
      console.log(`⏭️  Chunk ${chunkIndex} (${cefrLevel}): already has audio`);
      stats.skipped++;
      return;
    }
    
    // Generate audio using OpenAI TTS
    const audioResponse = await fetch('http://localhost:3000/api/openai/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: simplifiedText,
        voice: VOICE_ID,
        response_format: 'mp3'
      })
    });
    
    if (!audioResponse.ok) {
      throw new Error(`TTS API error: ${audioResponse.status} ${audioResponse.statusText}`);
    }
    
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    
    // Upload to Supabase Storage with book-specific path
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mp3',
        cacheControl: '2592000', // 30 days
        upsert: true
      });
    
    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio-files')
      .getPublicUrl(fileName);
    
    // Update database with audio file path
    await prisma.bookChunk.update({
      where: { id: chunk.id },
      data: {
        audioFilePath: publicUrl,
        audioProvider: 'openai',
        audioVoiceId: VOICE_ID
      }
    });
    
    console.log(`✅ Chunk ${chunkIndex} (${cefrLevel}): generated successfully`);
    stats.successful++;
    
  } catch (error: any) {
    console.error(`❌ Chunk ${chunkIndex} (${cefrLevel}): ${error.message}`);
    stats.failed++;
    stats.errors.push({
      chunk: chunkIndex,
      level: cefrLevel,
      error: error.message
    });
    
    // Retry logic could be added here
  }
}

async function printFinalReport(stats: GenerationStats) {
  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - stats.startTime.getTime()) / 1000 / 60); // minutes
  
  console.log('\n🎉 GENERATION COMPLETE!');
  console.log('='.repeat(50));
  console.log(`📖 Book: ${BOOK_TITLE}`);
  console.log(`⏰ Duration: ${duration} minutes`);
  console.log(`✅ Successful: ${stats.successful} files`);
  console.log(`❌ Failed: ${stats.failed} files`);
  console.log(`⏭️  Skipped: ${stats.skipped} files`);
  console.log(`📊 Success rate: ${Math.round((stats.successful / (stats.successful + stats.failed)) * 100)}%`);
  
  if (stats.errors.length > 0) {
    console.log(`\n⚠️  ERRORS (${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach(error => {
      console.log(`   Chunk ${error.chunk} (${error.level}): ${error.error}`);
    });
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more errors`);
    }
  }
  
  console.log('\n🎯 Next steps:');
  console.log('   1. Test audio playback on a few random chunks');
  console.log('   2. Verify book-specific paths in Supabase Storage');
  console.log(`   3. Check reading page: http://localhost:3000/library/${BOOK_ID}/read`);
  console.log('   4. Deploy to Vercel for global access');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n⏹️  Process interrupted. Cleaning up...');
  await prisma.$disconnect();
  process.exit(0);
});

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}