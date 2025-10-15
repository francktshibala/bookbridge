import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Current algorithm version
const ALGORITHM_VERSION = 1;

// Get actual audio duration using ffprobe
function getAudioDuration(audioUrl) {
  try {
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioUrl}"`;
    const result = execSync(command, { encoding: 'utf-8' }).trim();
    const duration = parseFloat(result);

    if (isNaN(duration) || duration <= 0) {
      throw new Error(`Invalid duration: ${result}`);
    }

    return duration;
  } catch (error) {
    console.error(`Failed to get duration for ${audioUrl}:`, error.message);
    return null;
  }
}

// Calculate SHA-256 hash of audio file
async function getAudioHash(audioUrl) {
  try {
    const response = await fetch(audioUrl);
    const buffer = await response.arrayBuffer();
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(buffer));
    return hash.digest('hex');
  } catch (error) {
    console.error(`Failed to hash audio file:`, error.message);
    return null;
  }
}

// Get file size from URL
async function getFileSize(audioUrl) {
  try {
    const response = await fetch(audioUrl, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength) : null;
  } catch (error) {
    console.error(`Failed to get file size:`, error.message);
    return null;
  }
}

// Calculate proportional sentence timings
function calculateSentenceTimings(chunkText, totalDuration) {
  const sentences = chunkText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  const totalWords = sentences.reduce((sum, sentence) =>
    sum + sentence.split(/\s+/).length, 0
  );

  let currentTime = 0;
  const timings = sentences.map((text, index) => {
    const words = text.split(/\s+/).length;
    const wordRatio = words / totalWords;
    const estimatedDuration = totalDuration * wordRatio;

    const startTime = currentTime;
    const endTime = currentTime + estimatedDuration;
    currentTime = endTime;

    return {
      sentenceIndex: index,
      text: text,
      startTime: parseFloat(startTime.toFixed(3)),
      endTime: parseFloat(endTime.toFixed(3)),
      duration: parseFloat(estimatedDuration.toFixed(3))
    };
  });

  return timings;
}

async function backfillAudioDurations() {
  console.log('🔄 Starting audio duration backfill...');

  try {
    // Get all BookChunk records that don't have duration metadata using raw SQL
    // For now, just process lady-with-dog to test
    const chunks = await prisma.$queryRaw`
      SELECT id, book_id as "bookId", cefr_level as "cefrLevel", chunk_index as "chunkIndex",
             chunk_text as "chunkText", audio_file_path as "audioFilePath"
      FROM book_chunks
      WHERE audio_file_path IS NOT NULL
      AND (audio_duration_metadata IS NULL OR audio_duration_metadata::text = 'null')
      AND book_id = 'lady-with-dog'
      ORDER BY book_id, cefr_level, chunk_index
    `;

    if (chunks.length === 0) {
      console.log('✅ No chunks need backfilling');
      return;
    }

    console.log(`📊 Found ${chunks.length} chunks to backfill`);

    let successCount = 0;
    let failCount = 0;

    for (const chunk of chunks) {
      try {
        console.log(`\n🎯 Processing ${chunk.bookId} - ${chunk.cefrLevel} - Bundle ${chunk.chunkIndex}...`);

        // Construct audio URL
        const audioUrl = supabase.storage
          .from('audio-files')
          .getPublicUrl(chunk.audioFilePath)
          .data.publicUrl;

        console.log(`   📂 Audio URL: ${audioUrl}`);

        // Get actual duration
        const measuredDuration = getAudioDuration(audioUrl);

        if (!measuredDuration) {
          console.log(`   ❌ Failed to measure duration, skipping`);
          failCount++;
          continue;
        }

        console.log(`   ⏱️ Measured duration: ${measuredDuration.toFixed(3)}s`);

        // Get file metadata
        const [audioHash, fileSize] = await Promise.all([
          getAudioHash(audioUrl),
          getFileSize(audioUrl)
        ]);

        // Calculate sentence timings
        const sentenceTimings = calculateSentenceTimings(chunk.chunkText, measuredDuration);

        console.log(`   📝 Calculated timings for ${sentenceTimings.length} sentences`);

        // Create metadata object
        const metadata = {
          version: ALGORITHM_VERSION,
          measuredDuration: measuredDuration,
          sentenceTimings: sentenceTimings,
          measuredAt: new Date().toISOString(),
          audioHash: audioHash,
          fileSize: fileSize,
          method: 'ffprobe-proportional-backfill'
        };

        // Update database using raw SQL
        await prisma.$executeRaw`
          UPDATE book_chunks
          SET audio_duration_metadata = ${JSON.stringify(metadata)}::jsonb
          WHERE id = ${chunk.id}
        `;

        successCount++;
        console.log(`   ✅ Successfully backfilled metadata`);

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`   ❌ Failed to process chunk ${chunk.id}:`, error.message);
        failCount++;
      }
    }

    console.log(`\n📊 Backfill Summary:`);
    console.log(`   ✅ Successfully backfilled: ${successCount} chunks`);
    console.log(`   ❌ Failed: ${failCount} chunks`);
    console.log(`   📋 Total processed: ${successCount + failCount}/${chunks.length}`);

    if (successCount > 0) {
      console.log(`\n🎉 Backfill complete! API will now use cached durations.`);
      console.log(`   Expected load time: 2-3 seconds (down from 45 seconds)`);
    }

  } catch (error) {
    console.error('❌ Backfill failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backfillAudioDurations()
    .then(() => console.log('\n✅ Audio duration backfill completed!'))
    .catch(console.error);
}

export { backfillAudioDurations };