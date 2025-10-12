import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from 'dotenv';
import { execSync } from 'child_process';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

const BOOK_ID = 'the-dead';
const VALID_LEVELS = ['A1', 'A2', 'B1'];

// Get target level from command line argument
const targetLevel = process.argv[2];

// Validate level before proceeding
if (!targetLevel) {
  console.error('❌ Error: Please specify a CEFR level (A1, A2, or B1)');
  console.log('Usage: node scripts/generate-the-dead-bundles-v2.js [A1|A2|B1]');
  process.exit(1);
}

if (!VALID_LEVELS.includes(targetLevel)) {
  console.error(`❌ Error: Invalid level "${targetLevel}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  process.exit(1);
}

const CEFR_LEVEL = targetLevel;

// VOICE MAPPING: Same as other books
const getVoiceId = (level) => {
  if (level === 'A1') return 'EXAVITQu4vr4xnSDxMaL'; // Sarah
  if (level === 'A2' || level === 'B1') return 'TX3LPaxmHKxFdv7VOQHJ'; // Daniel
  return 'EXAVITQu4vr4xnSDxMaL'; // Default to Sarah
};

// Universal timing formula (from master mistakes prevention)
function calculateSentenceTiming(words, voice, speed, cefrLevel) {
  const baseSecondsPerWord = voice === 'Sarah' ? 0.30 : 0.40;
  const speedMultiplier = 1.0 / speed;
  const lengthPenalty = words > 15 ? 0.1 * (words - 15) : 0;
  const safetyTail = 0.5;

  return (words * baseSecondsPerWord * speedMultiplier) + lengthPenalty + safetyTail;
}

// Helper function to get audio duration using ffprobe
function getAudioDuration(audioPath) {
  try {
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioPath}"`;
    const result = execSync(command, { encoding: 'utf-8' }).trim();
    return parseFloat(result);
  } catch (error) {
    console.error('Could not measure audio duration:', error.message);
    return null;
  }
}

async function generateTheDeadBundles() {
  console.log(`🎵 Generating bundles for "${BOOK_ID}" at ${CEFR_LEVEL} level`);

  const voiceId = getVoiceId(CEFR_LEVEL);
  const voiceName = CEFR_LEVEL === 'A1' ? 'Sarah' : 'Daniel';
  console.log(`🗣️ Using voice: ${voiceId} (${voiceName})`);

  // Load simplified sentences
  const cacheFile = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-simplified.json`);

  if (!fs.existsSync(cacheFile)) {
    throw new Error(`Simplified cache not found: ${cacheFile}. Run simplification first.`);
  }

  const simplifiedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const sentences = simplifiedData.sentences;

  console.log(`📖 Loaded ${sentences.length} simplified sentences`);

  // Create bundles of 4 sentences each (except final bundle can have 3)
  const bundles = [];
  for (let i = 0; i < sentences.length; i += 4) {
    const bundleSentences = sentences.slice(i, i + 4);

    bundles.push({
      index: Math.floor(i / 4),
      sentences: bundleSentences.map(sentence => ({
        sentenceIndex: sentence.sentenceIndex,
        text: sentence.simplifiedText,
        wordCount: sentence.wordCount
      }))
    });
  }

  console.log(`📦 Created ${bundles.length} bundles`);

  // Check for existing bundles to resume from
  const existingBundles = await prisma.bookChunk.findMany({
    where: {
      bookId: BOOK_ID,
      cefrLevel: CEFR_LEVEL
    },
    select: { chunkIndex: true }
  });

  const existingIndices = new Set(existingBundles.map(b => b.chunkIndex));
  const bundlesToProcess = bundles.filter(b => !existingIndices.has(b.index));

  console.log(`📊 Resume capability: ${existingBundles.length} existing, ${bundlesToProcess.length} new bundles`);

  if (bundlesToProcess.length === 0) {
    console.log('✅ All bundles already exist');
    return;
  }

  // Process each bundle
  let processedCount = 0;

  for (const bundle of bundlesToProcess) {
    try {
      console.log(`\n🎵 Processing bundle ${bundle.index}/${bundles.length - 1}...`);

      // GPT-5 VERIFICATION: Log exact TTS input and generate content hash
      const bundleText = bundle.sentences.map(s => s.text).join(' ');
      const textHash = crypto.createHash('sha256').update(bundleText).digest('hex').substring(0, 16);
      const sentenceCount = bundle.sentences.length;

      console.log(`   🔍 TTS Verification:`);
      console.log(`   📝 Exact text: "${bundleText}"`);
      console.log(`   📊 Text hash: ${textHash}`);
      console.log(`   📐 Sentence array count: ${sentenceCount} (expected: ${bundle.index === bundles.length - 1 ? '3 or 4' : '4'})`);

      // Flexible bundle size validation (allow 3-4 sentences in final bundle)
      const expectedSentences = bundle.index === bundles.length - 1 ? [3, 4] : [4];
      if (!expectedSentences.includes(bundle.sentences.length)) {
        throw new Error(`Bundle ${bundle.index}: Expected ${expectedSentences.join(' or ')} sentences, got ${bundle.sentences.length}`);
      }

      // Calculate total words for timing
      const totalWords = bundle.sentences.reduce((sum, s) => sum + s.wordCount, 0);
      console.log(`   📊 ${totalWords} words, ${sentenceCount} sentences`);

      // Generate audio using ElevenLabs
      console.log(`   🎙️ Generating audio...`);

      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: bundleText,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            speed: 0.90 // Optimal speed setting
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioData = Buffer.from(audioBuffer);

      // Upload to Supabase
      console.log(`   ☁️ Uploading to Supabase...`);

      const timestamp = Date.now();
      const fileName = `bundle_${bundle.index}_${timestamp}.mp3`;
      const filePath = `${BOOK_ID}/${CEFR_LEVEL}/${voiceId}/${fileName}`;

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(filePath, audioData, {
          contentType: 'audio/mpeg',
          cacheControl: '3600'
        });

      if (uploadError) {
        throw new Error(`Supabase upload error: ${uploadError.message}`);
      }

      console.log(`   ✅ Upload successful`);

      // Get public URL for duration measurement
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(filePath);

      // CRITICAL: Measure actual audio duration using ffprobe
      let measuredDuration = null;
      try {
        // Download audio temporarily for measurement
        const audioResponse = await fetch(publicUrl);
        const tempAudioBuffer = await audioResponse.arrayBuffer();
        const tempFile = `/tmp/temp_audio_${Date.now()}.mp3`;
        fs.writeFileSync(tempFile, Buffer.from(tempAudioBuffer));

        measuredDuration = getAudioDuration(tempFile);

        // Clean up temp file
        fs.unlinkSync(tempFile);

        if (measuredDuration) {
          console.log(`   ⏱️ Measured duration: ${measuredDuration.toFixed(3)}s`);
        }
      } catch (error) {
        console.log('   ⚠️ Could not measure duration, using estimation');
      }

      // Use measured duration or fall back to estimation
      const finalDuration = measuredDuration || calculateSentenceTiming(
        totalWords,
        voiceName,
        0.90,
        CEFR_LEVEL
      );

      // Calculate proportional sentence timings (EXACT LADY WITH THE DOG METHOD)
      let currentTime = 0;
      const sentenceTimings = bundle.sentences.map(sentence => {
        const wordRatio = sentence.wordCount / totalWords;
        const duration = finalDuration * wordRatio;
        const startTime = currentTime;
        const endTime = currentTime + duration;
        currentTime = endTime;

        return {
          sentenceIndex: sentence.sentenceIndex,
          text: sentence.text,
          startTime: parseFloat(startTime.toFixed(3)),
          endTime: parseFloat(endTime.toFixed(3)),
          duration: parseFloat(duration.toFixed(3))
        };
      });

      // Prepare audio duration metadata for caching (EXACT LADY WITH THE DOG FORMAT)
      const audioDurationMetadata = measuredDuration ? {
        version: 1,
        measuredDuration: measuredDuration,
        sentenceTimings: sentenceTimings,
        measuredAt: new Date().toISOString(),
        method: 'ffprobe-proportional',
      } : null;

      // Save to database with cached duration metadata
      await prisma.bookChunk.create({
        data: {
          bookId: BOOK_ID,
          chunkIndex: bundle.index,
          cefrLevel: CEFR_LEVEL,
          chunkText: bundleText,
          audioFilePath: filePath, // Store relative path like Lady with the Dog
          audioDurationMetadata: audioDurationMetadata, // CRITICAL: This enables fast loading
          createdAt: new Date(),
          wordCount: totalWords
        }
      });

      processedCount++;
      console.log(`   ✅ Bundle ${bundle.index} completed (${processedCount}/${bundlesToProcess.length})`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Failed to process bundle ${bundle.index}:`, error.message);
      throw error;
    }
  }

  console.log(`\n✅ Bundle generation complete!`);
  console.log(`📊 Summary:`);
  console.log(`   📦 Total bundles: ${bundles.length}`);
  console.log(`   🆕 New bundles processed: ${processedCount}`);
  console.log(`   🎯 CEFR Level: ${CEFR_LEVEL}`);
  console.log(`   🗣️ Voice: ${voiceName} (${voiceId})`);

  await prisma.$disconnect();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTheDeadBundles()
    .then(() => {
      console.log('\n🎉 Bundle generation completed successfully!');
    })
    .catch(console.error);
}

export { generateTheDeadBundles };