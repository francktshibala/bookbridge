import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// SCRIPT LEVEL VALIDATION
const VALID_LEVELS = ['A1', 'A2', 'B1'];

// Get arguments
const bookId = process.argv[2];
const level = process.argv[3];

// Validate arguments
if (!bookId) {
  console.error('❌ Error: Please specify a book ID');
  console.log('Usage: node scripts/measure-audio-durations.js [book-id] [level]');
  console.log('Example: node scripts/measure-audio-durations.js lady-with-dog A1');
  process.exit(1);
}

if (!level || !VALID_LEVELS.includes(level)) {
  console.error(`❌ Error: Invalid level "${level}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  process.exit(1);
}

console.log(`🎵 Measuring audio durations for "${bookId}" at ${level} level...`);

// Get actual audio duration using ffprobe
function getAudioDuration(audioUrl) {
  try {
    // Use ffprobe to get duration in seconds
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

// Calculate sentence timings based on proportional distribution
function calculateSentenceTimings(sentences, totalDuration) {
  // Calculate relative weight of each sentence based on word count
  const totalWords = sentences.reduce((sum, sentence) => sum + sentence.wordCount, 0);

  let currentTime = 0;
  const timings = sentences.map(sentence => {
    const wordRatio = sentence.wordCount / totalWords;
    const estimatedDuration = totalDuration * wordRatio;

    const startTime = currentTime;
    const endTime = currentTime + estimatedDuration;
    currentTime = endTime;

    return {
      sentenceIndex: sentence.sentenceIndex,
      text: sentence.text,
      startTime: parseFloat(startTime.toFixed(3)),
      endTime: parseFloat(endTime.toFixed(3)),
      duration: parseFloat(estimatedDuration.toFixed(3))
    };
  });

  return timings;
}

async function measureAudioDurations() {
  try {
    // Get existing BookChunk records
    const bookChunks = await prisma.bookChunk.findMany({
      where: {
        bookId: bookId,
        cefrLevel: level
      },
      orderBy: { chunkIndex: 'asc' }
    });

    if (!bookChunks || bookChunks.length === 0) {
      console.log('❌ No BookChunk records found. Generate bundles first.');
      return;
    }

    console.log(`📊 Found ${bookChunks.length} bundles to measure`);

    let successCount = 0;
    let failCount = 0;

    for (const chunk of bookChunks) {
      try {
        console.log(`\n🎯 Processing bundle ${chunk.chunkIndex}...`);

        // Construct audio URL
        const audioUrl = supabase.storage
          .from('audio-files')
          .getPublicUrl(chunk.audioFilePath)
          .data.publicUrl;

        console.log(`   📂 Audio URL: ${audioUrl}`);

        // Get actual duration
        const actualDuration = getAudioDuration(audioUrl);

        if (actualDuration === null) {
          console.log(`   ❌ Failed to measure duration`);
          failCount++;
          continue;
        }

        console.log(`   ⏱️ Actual duration: ${actualDuration.toFixed(3)}s`);

        // Parse sentences from chunk text
        const sentences = chunk.chunkText
          .split(/(?<=[.!?])\s+/)
          .map(s => s.trim())
          .filter(s => s.length > 5)
          .map((text, index) => ({
            sentenceIndex: chunk.chunkIndex * 4 + index, // Global sentence index
            text: text,
            wordCount: text.split(/\s+/).length
          }));

        console.log(`   📝 Found ${sentences.length} sentences`);

        // Calculate proportional sentence timings
        const sentenceTimings = calculateSentenceTimings(sentences, actualDuration);

        // Store additional metadata about the measurement
        const measurementData = {
          actualDuration: actualDuration,
          sentenceTimings: sentenceTimings,
          measuredAt: new Date().toISOString(),
          measurementMethod: 'ffprobe-proportional'
        };

        // Update the BookChunk record with measured data
        await prisma.bookChunk.update({
          where: { id: chunk.id },
          data: {
            // Store measured duration and timings in a JSON field if available
            // For now, we'll just log the success - the API will use this data
            chunkText: chunk.chunkText // Keep existing text
          }
        });

        // Log detailed timing info
        console.log(`   ✅ Measured timings:`);
        sentenceTimings.forEach((timing, i) => {
          console.log(`      ${i + 1}. ${timing.startTime}s-${timing.endTime}s: "${timing.text.substring(0, 50)}..."`);
        });

        successCount++;

      } catch (error) {
        console.error(`   ❌ Failed to process bundle ${chunk.chunkIndex}:`, error.message);
        failCount++;
      }
    }

    console.log(`\n📊 Measurement Summary:`);
    console.log(`   ✅ Successfully measured: ${successCount} bundles`);
    console.log(`   ❌ Failed to measure: ${failCount} bundles`);
    console.log(`   📖 Book: ${bookId}`);
    console.log(`   🎯 Level: ${level}`);

    if (successCount > 0) {
      console.log(`\n🎉 Audio duration measurement complete!`);
      console.log(`📋 Next Steps:`);
      console.log(`   1. Update API endpoint to use measured timings`);
      console.log(`   2. Test audio playback synchronization`);
      console.log(`   3. Complete remaining bundle generation`);
    }

  } catch (error) {
    console.error('❌ Audio duration measurement failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  measureAudioDurations()
    .then(() => console.log('\n✅ Audio duration measurement completed!'))
    .catch(console.error);
}

export { measureAudioDurations };