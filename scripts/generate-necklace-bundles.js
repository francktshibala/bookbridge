import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { execSync } from 'child_process';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// M1 PROVEN VOICE SETTINGS
const SARAH_VOICE_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL',  // Sarah voice ID
  model_id: 'eleven_monolingual_v1',  // M1 proven model (NOT eleven_flash_v2_5)
  voice_settings: {
    stability: 0.5,        // ElevenLabs default (M1 proven)
    similarity_boost: 0.75, // ElevenLabs default (M1 proven)
    style: 0.0,            // ElevenLabs default (M1 proven)
    speed: 0.90,           // M1 PROVEN SPEED for perfect sync
    use_speaker_boost: true
  }
};

const DANIEL_VOICE_SETTINGS = {
  voice_id: 'onwK4e9ZLuTAKqWW03F9',  // Daniel voice ID
  model_id: 'eleven_monolingual_v1',  // M1 proven model (NOT eleven_flash_v2_5)
  voice_settings: {
    stability: 0.5,        // ElevenLabs default (M1 proven)
    similarity_boost: 0.75, // ElevenLabs default (M1 proven)
    style: 0.0,            // ElevenLabs default (M1 proven)
    speed: 0.90,           // M1 PROVEN SPEED for perfect sync
    use_speaker_boost: true
  }
};

// VOICE MAPPING FOR NECKLACE: A1 → Daniel, A2 → Sarah (user requested), B1 → Daniel
// Updated: Using Daniel voice for A1 as requested
const DANIEL_VOICE_ID = 'TX3LPaxmHKxFdv7VOQHJ'; // Daniel voice for A1/B1

function getVoiceForLevel(level) {
  const voiceMapping = {
    'A1': {
      ...DANIEL_VOICE_SETTINGS,
      voice_id: DANIEL_VOICE_ID  // Use Daniel (TX3LPaxmHKxFdv7VOQHJ) for A1
    },
    'A2': SARAH_VOICE_SETTINGS,  // A2 uses Sarah (user request)
    'B1': {
      ...DANIEL_VOICE_SETTINGS,
      voice_id: DANIEL_VOICE_ID  // Use Daniel (TX3LPaxmHKxFdv7VOQHJ) for B1
    }
  };
  return voiceMapping[level] || DANIEL_VOICE_SETTINGS;
}

const BOOK_ID = 'the-necklace';

// SCRIPT LEVEL VALIDATION - MANDATORY FIRST (prevents runtime failures)
const VALID_LEVELS = ['A1', 'A2', 'B1'];

// Get target level from command line argument
const targetLevel = process.argv[2];
const isPilot = process.argv.includes('--pilot');

// Validate level before proceeding
if (!targetLevel) {
  console.error('❌ Error: Please specify a CEFR level (A1, A2, or B1)');
  console.log('Usage: node scripts/generate-necklace-bundles.js [A1|A2|B1] [--pilot]');
  process.exit(1);
}

if (!VALID_LEVELS.includes(targetLevel)) {
  console.error(`❌ Error: Invalid level "${targetLevel}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  process.exit(1);
}

const CEFR_LEVEL = targetLevel;
const voiceSettings = getVoiceForLevel(CEFR_LEVEL);

console.log(`🎵 Generating bundles for "${BOOK_ID}" at ${CEFR_LEVEL} level`);
const voiceName = CEFR_LEVEL === 'A2' ? 'Sarah' : 'Daniel';
console.log(`🗣️ Using voice: ${voiceSettings.voice_id} (${voiceName})`);

if (isPilot) {
  console.log('🧪 PILOT MODE: Will generate only first 3 bundles (~$0.30 cost)');
}

// IMPROVED TIMING FORMULA (Based on real measurement analysis)
function calculateSentenceTiming(words, voiceType, speed, cefrLevel) {
  // IMPROVED base timing rates (learned from ffprobe measurements)
  const baseSecondsPerWord = voiceType === 'Sarah' ? 0.35 : 0.40; // Increased from 0.30 to 0.35

  // Speed adjustment (CRITICAL for speed 0.90)
  const adjustedSecondsPerWord = baseSecondsPerWord / speed; // 0.35/0.90 = 0.39s for Sarah

  // CEFR-specific length penalties for complex sentences
  const lengthPenalties = {
    'A1': words > 12 ? (words - 12) * 0.03 : 0,
    'A2': words > 14 ? (words - 14) * 0.04 : 0,
    'B1': words > 15 ? (words - 15) * 0.05 : 0
  };

  // INCREASED safety buffer (prevents cutoffs)
  const safetyTail = 0.20; // Increased from 0.12 to 0.20 (200ms buffer)

  return words * adjustedSecondsPerWord + lengthPenalties[cefrLevel] + safetyTail;
}

// Generate TTS audio using ElevenLabs
async function generateElevenLabsAudio(text, voiceSettings) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceSettings.voice_id}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: text,
      model_id: voiceSettings.model_id,
      voice_settings: voiceSettings.voice_settings
    })
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
  }

  return await response.arrayBuffer();
}

// Upload to Supabase with retry logic
async function uploadToSupabase(audioBuffer, fileName, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false // Don't overwrite existing files
        });

      if (error) throw error;
      return { data, error: null };

    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) break;

      // Exponential backoff with jitter
      const delay = Math.min(
        1000 * Math.pow(2, attempt) + Math.random() * 1000,
        10000
      );

      console.log(`⏳ Upload failed (attempt ${attempt + 1}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

async function generateNecklaceBundles() {
  console.log(`\n📚 Starting bundle generation for "The Necklace" (${CEFR_LEVEL})...`);

  try {
    // Load simplified sentences from cache (TXT format for necklace)
    const cacheFile = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-simplified.txt`);

    if (!fs.existsSync(cacheFile)) {
      throw new Error(`Simplified cache not found: ${cacheFile}. Run simplify script first.`);
    }

    const simplifiedText = fs.readFileSync(cacheFile, 'utf8');
    const sentences = simplifiedText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 5);

    const simplifiedSentences = sentences.map((text, index) => ({
      sentenceIndex: index,
      simplifiedText: text.trim(),
      wordCount: text.trim().split(/\s+/).length
    }));

    console.log(`📖 Loaded ${simplifiedSentences.length} simplified sentences`);

    // Create bundles (4 sentences each)
    const BUNDLE_SIZE = 4;
    const bundles = [];

    for (let i = 0; i < simplifiedSentences.length; i += BUNDLE_SIZE) {
      const bundleSentences = simplifiedSentences.slice(i, i + BUNDLE_SIZE);

      bundles.push({
        index: Math.floor(i / BUNDLE_SIZE),
        sentences: bundleSentences.map(s => ({
          sentenceIndex: s.sentenceIndex,
          text: s.simplifiedText,
          wordCount: s.wordCount
        }))
      });
    }

    console.log(`📦 Created ${bundles.length} bundles of ${BUNDLE_SIZE} sentences each`);

    // Ensure BookContent record exists
    const totalText = simplifiedSentences.map(s => s.simplifiedText).join(' ');
    await prisma.bookContent.upsert({
      where: { bookId: BOOK_ID },
      update: {
        title: 'The Necklace',
        author: 'Guy de Maupassant',
        fullText: totalText,
        era: 'french-realist',
        wordCount: totalText.split(/\s+/).length,
        totalChunks: bundles.length
      },
      create: {
        bookId: BOOK_ID,
        title: 'The Necklace',
        author: 'Guy de Maupassant',
        fullText: totalText,
        era: 'french-realist',
        wordCount: totalText.split(/\s+/).length,
        totalChunks: bundles.length
      }
    });

    // Limit to pilot if requested (3 bundles max for cost control)
    const bundlesToProcess = isPilot ? bundles.slice(0, 3) : bundles;
    console.log(`🔄 Will process ${bundlesToProcess.length} bundles`);

    // Check for existing bundles to enable resume
    const existingBundles = await prisma.bookChunk.findMany({
      where: {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL
      },
      select: { chunkIndex: true }
    });

    const existingIndices = new Set(existingBundles.map(b => b.chunkIndex));
    const newBundles = bundlesToProcess.filter(b => !existingIndices.has(b.index));

    console.log(`📊 Resume capability: ${existingIndices.size} existing, ${newBundles.length} new bundles`);

    let processedCount = 0;
    const voiceType = CEFR_LEVEL === 'A1' ? 'Sarah' : 'Daniel';

    for (const bundle of newBundles) {
      try {
        console.log(`\n🎵 Processing bundle ${bundle.index}/${bundles.length - 1}...`);

        // Combine sentences for audio
        const bundleText = bundle.sentences.map(s => s.text).join(' ');
        const totalWords = bundle.sentences.reduce((sum, s) => sum + s.wordCount, 0);

        console.log(`   📝 Text: "${bundleText.substring(0, 100)}..."`);
        console.log(`   📊 ${totalWords} words, ${bundle.sentences.length} sentences`);

        // Generate audio
        console.log('   🎙️ Generating audio...');
        const audioBuffer = await generateElevenLabsAudio(bundleText, voiceSettings);

        // Book-specific CDN path (prevents audio collisions)
        const audioFileName = `${BOOK_ID}/${CEFR_LEVEL}/${voiceSettings.voice_id}/bundle_${bundle.index}.mp3`;

        console.log('   ☁️ Uploading to Supabase...');
        try {
          await uploadToSupabase(audioBuffer, audioFileName);
          console.log('   ✅ Upload successful');
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log('   📁 Audio file already exists, continuing...');
          } else {
            throw error;
          }
        }

        // MEASURE ACTUAL DURATION for perfect sync (SOLUTION 1 - CRITICAL!)
        // Save audio buffer to temp file for ffprobe measurement
        const tempFile = path.join(process.cwd(), 'temp', `bundle_${bundle.index}_temp.mp3`);

        // Ensure temp directory exists
        if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
          fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
        }

        // Write audio buffer to temp file
        fs.writeFileSync(tempFile, Buffer.from(audioBuffer));

        let measuredDuration = null;
        try {
          const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tempFile}"`;
          const result = execSync(command, { encoding: 'utf-8' }).trim();
          measuredDuration = parseFloat(result);
          console.log(`   ⏱️ MEASURED DURATION: ${measuredDuration.toFixed(3)}s (Solution 1 - exact)`);
        } catch (error) {
          console.error('   ❌ CRITICAL: Could not measure duration:', error.message);
          throw new Error('Solution 1 requires ffprobe measurement - cannot proceed without it');
        } finally {
          // Clean up temp file
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        }

        // SOLUTION 1: Always use measured duration (MANDATORY - no fallback)
        if (!measuredDuration) {
          throw new Error('Solution 1 requires measured duration - cannot proceed with estimation');
        }
        const finalDuration = measuredDuration;

        // Calculate proportional sentence timings
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

        // Prepare audio duration metadata for caching
        const audioDurationMetadata = measuredDuration ? {
          version: 1,
          measuredDuration: measuredDuration,
          sentenceTimings: sentenceTimings,
          measuredAt: new Date().toISOString(),
          method: 'ffprobe-proportional',
          // Note: audioHash and fileSize can be added later for full production
        } : null;

        // Save to database with cached duration metadata
        await prisma.bookChunk.create({
          data: {
            bookId: BOOK_ID,
            chunkIndex: bundle.index,
            cefrLevel: CEFR_LEVEL,
            chunkText: bundleText,
            wordCount: totalWords,
            isSimplified: true,
            audioFilePath: audioFileName, // Store only the relative path
            audioProvider: 'elevenlabs',
            audioVoiceId: voiceSettings.voice_id,
            audioDurationMetadata: audioDurationMetadata // Cache the measured duration
          }
        });

        processedCount++;
        console.log(`   ✅ Bundle ${bundle.index} completed (${processedCount}/${newBundles.length})`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ Failed to process bundle ${bundle.index}:`, error.message);
        throw error;
      }
    }

    console.log(`\n✅ Bundle generation complete!`);
    console.log(`📊 Summary:`);
    console.log(`   📦 Total bundles: ${bundles.length}`);
    console.log(`   🆕 New bundles processed: ${processedCount}`);
    console.log(`   🎯 CEFR Level: ${CEFR_LEVEL}`);
    console.log(`   🗣️ Voice: ${voiceType} (${voiceSettings.voice_id})`);

    if (isPilot) {
      console.log(`\n🧪 PILOT COMPLETE - Run without --pilot flag for full generation`);
    }

  } catch (error) {
    console.error('❌ Bundle generation failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateNecklaceBundles()
    .then(() => console.log('\n🎉 Bundle generation completed successfully!'))
    .catch(console.error);
}

export { generateNecklaceBundles };