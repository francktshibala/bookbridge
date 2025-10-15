#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Configuration for all Featured Books
const BOOK_CONFIGS = {
  'gutenberg-1513': {
    name: 'Romeo & Juliet',
    audioPath: 'gutenberg-1513-A1/a1/chunk_', // Existing path format
    totalExpected: 749
  },
  'gutenberg-43': {
    name: 'Jekyll & Hyde',
    audioPath: 'jekyll-hyde/bundle_', // Existing path format
    totalExpected: 322
  },
  'sleepy-hollow-enhanced': {
    name: 'Sleepy Hollow',
    audioPath: 'sleepy-hollow/bundle_', // Existing path format
    totalExpected: 82
  },
  'great-gatsby-a2': {
    name: 'Great Gatsby',
    audioPath: 'great-gatsby/gatsby-bundle-', // Different format with padding
    totalExpected: 902,
    padIndex: 4 // Pads to 4 digits like 0020
  },
  'gutenberg-1952-A1': {
    name: 'Yellow Wallpaper',
    audioPath: 'gutenberg-1952-A1/a1/chunk_', // Existing path format
    totalExpected: 93
  }
};

// Generate audio with ElevenLabs
async function generateAudio(text) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// Check if audio file exists in Supabase
async function audioFileExists(path) {
  try {
    const { data, error } = await supabase.storage
      .from('audio-files')
      .list(path.split('/').slice(0, -1).join('/'), {
        limit: 1,
        search: path.split('/').pop()
      });

    return data && data.length > 0;
  } catch {
    return false;
  }
}

// Generate missing audio for a specific book
async function generateMissingAudioForBook(bookId, options = {}) {
  const config = BOOK_CONFIGS[bookId];
  if (!config) {
    console.error(`❌ Book ${bookId} not configured`);
    return;
  }

  console.log(`\n📚 Processing ${config.name} (${bookId})...`);

  // Get all chunks from database
  const chunks = await prisma.bookChunk.findMany({
    where: {
      bookId,
      cefrLevel: 'A1' // Most books use A1, except Gatsby (A2)
    },
    orderBy: { chunkIndex: 'asc' }
  });

  // Special handling for Great Gatsby A2
  if (bookId === 'great-gatsby-a2') {
    const a2Chunks = await prisma.bookChunk.findMany({
      where: {
        bookId,
        cefrLevel: 'A2'
      },
      orderBy: { chunkIndex: 'asc' }
    });
    if (a2Chunks.length > 0) chunks.push(...a2Chunks);
  }

  console.log(`📊 Found ${chunks.length} chunks in database`);

  if (chunks.length === 0) {
    console.log(`⚠️ No chunks found for ${config.name}. Skipping...`);
    return;
  }

  // Identify missing audio files
  const missingChunks = [];

  for (const chunk of chunks) {
    // Build the expected file path based on book config
    let fileName;
    if (config.padIndex) {
      // Special padding for books like Great Gatsby
      const paddedIndex = String(chunk.chunkIndex).padStart(config.padIndex, '0');
      fileName = `${config.audioPath}${paddedIndex}.mp3`;
    } else {
      fileName = `${config.audioPath}${chunk.chunkIndex}.mp3`;
    }

    // Check if file exists in Supabase
    const exists = await audioFileExists(fileName);

    if (!exists) {
      missingChunks.push({ chunk, fileName });
    }
  }

  console.log(`🔍 Status: ${chunks.length - missingChunks.length}/${config.totalExpected} audio files exist`);
  console.log(`⚠️ Missing: ${missingChunks.length} audio files`);

  if (missingChunks.length === 0) {
    console.log(`✅ ${config.name} is complete! All audio files exist.`);
    return;
  }

  // Ask for confirmation if not in auto mode
  if (!options.auto && missingChunks.length > 20) {
    console.log(`\n⚠️ This will generate ${missingChunks.length} audio files (~$${(missingChunks.length * 0.01).toFixed(2)})`);
    console.log('Use --auto flag to skip this confirmation');

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Continue? (y/n): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('Skipping...');
      return;
    }
  }

  // Generate missing audio files
  console.log(`\n🎵 Generating ${missingChunks.length} missing audio files...`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < missingChunks.length; i++) {
    const { chunk, fileName } = missingChunks[i];

    try {
      console.log(`[${i + 1}/${missingChunks.length}] Generating chunk ${chunk.chunkIndex}...`);

      // Generate audio
      const audioBuffer = await generateAudio(chunk.chunkText);

      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mp3',
          cacheControl: '2592000',
          upsert: false // Don't overwrite existing files
        });

      if (uploadError) {
        // If file exists error, skip it
        if (uploadError.message.includes('already exists')) {
          console.log(`⏭️ File already exists: ${fileName}`);
          continue;
        }
        throw uploadError;
      }

      successCount++;
      console.log(`✅ Generated: ${fileName}`);

      // Rate limiting (0.5 second delay)
      if (i < missingChunks.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }

    } catch (error) {
      errorCount++;
      const errorMsg = `Chunk ${chunk.chunkIndex}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);

      // Continue with next chunk
      continue;
    }
  }

  // Summary
  console.log(`\n📊 ${config.name} Generation Summary:`);
  console.log(`   ✅ Successfully generated: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📁 Total files now: ${chunks.length - missingChunks.length + successCount}/${config.totalExpected}`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors encountered:`);
    errors.slice(0, 10).forEach(e => console.log(`   • ${e}`));
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more`);
    }
  }

  return { successCount, errorCount, total: missingChunks.length };
}

// Main function
async function main() {
  try {
    console.log('🎵 Smart Missing Audio Generator for Featured Books');
    console.log('================================================\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const auto = args.includes('--auto');
    const bookId = args.find(arg => !arg.startsWith('--'));

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not found in environment');
    }

    // If specific book requested
    if (bookId) {
      if (!BOOK_CONFIGS[bookId]) {
        console.error(`❌ Unknown book ID: ${bookId}`);
        console.log('\nAvailable books:');
        Object.entries(BOOK_CONFIGS).forEach(([id, config]) => {
          console.log(`  • ${id}: ${config.name}`);
        });
        return;
      }

      await generateMissingAudioForBook(bookId, { auto });
    } else {
      // Process all books
      console.log('Checking all Featured Books for missing audio...\n');

      const results = {};
      for (const [bookId, config] of Object.entries(BOOK_CONFIGS)) {
        const result = await generateMissingAudioForBook(bookId, { auto });
        if (result) {
          results[config.name] = result;
        }
      }

      // Final summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 FINAL SUMMARY');
      console.log('='.repeat(60));

      Object.entries(results).forEach(([name, result]) => {
        console.log(`${name}:`);
        console.log(`  • Generated: ${result.successCount}/${result.total}`);
        console.log(`  • Errors: ${result.errorCount}`);
      });
    }

    console.log('\n✅ Script complete!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Usage help
if (process.argv.includes('--help')) {
  console.log(`
Usage: node generate-missing-audio-smart.js [book-id] [options]

Options:
  --auto    Skip confirmation prompts
  --help    Show this help message

Book IDs:
  gutenberg-1513          Romeo & Juliet
  gutenberg-43            Jekyll & Hyde
  sleepy-hollow-enhanced  Sleepy Hollow
  great-gatsby-a2         Great Gatsby
  gutenberg-1952-A1       Yellow Wallpaper

Examples:
  node generate-missing-audio-smart.js                    # Check all books
  node generate-missing-audio-smart.js gutenberg-1513     # Only Romeo & Juliet
  node generate-missing-audio-smart.js --auto             # All books, no prompts
`);
  process.exit(0);
}

// Run the script
main().catch(console.error);