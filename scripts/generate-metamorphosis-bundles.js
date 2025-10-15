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

// M1 PROVEN VOICE SETTINGS (Following The Necklace pattern)
const SARAH_VOICE_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL',  // Sarah voice ID for A1
  model_id: 'eleven_monolingual_v1',  // M1 proven model (NOT eleven_flash_v2_5)
  voice_settings: {
    stability: 0.5,        // ElevenLabs default (M1 proven)
    similarity_boost: 0.75, // ElevenLabs default (M1 proven)
    style: 0.0,            // ElevenLabs default (M1 proven)
    speed: 0.90,           // M1 PROVEN SPEED for perfect sync
    use_speaker_boost: true
  }
};

// VOICE MAPPING FOR METAMORPHOSIS: A1 → Sarah (following proven pattern)
function getVoiceForLevel(level) {
  const voiceMapping = {
    'A1': SARAH_VOICE_SETTINGS
  };
  return voiceMapping[level] || SARAH_VOICE_SETTINGS;
}

const BOOK_ID = 'the-metamorphosis';

// SCRIPT LEVEL VALIDATION - MANDATORY FIRST (prevents runtime failures)
const VALID_LEVELS = ['A1'];

// Get target level from command line argument
const targetLevel = process.argv[2];
const isPilot = process.argv.includes('--pilot');

// Validate level before proceeding
if (!targetLevel) {
  console.error('❌ Error: Please specify a CEFR level (A1)');
  console.log('Usage: node scripts/generate-metamorphosis-bundles.js A1 [--pilot]');
  process.exit(1);
}

if (!VALID_LEVELS.includes(targetLevel)) {
  console.error(`❌ Error: Invalid level "${targetLevel}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  process.exit(1);
}

const CEFR_LEVEL = targetLevel;
const voiceSettings = getVoiceForLevel(CEFR_LEVEL);

console.log(`🐛 Generating bundles for "${BOOK_ID}" at ${CEFR_LEVEL} level`);
console.log(`🗣️ Using voice: ${voiceSettings.voice_id} (Sarah)`);

if (isPilot) {
  console.log('🧪 PILOT MODE: Will generate approximately 70 bundles (~$7-8 cost)');
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

// Get audio duration using ffprobe (SOLUTION 1)
function getAudioDuration(tempFile) {
  try {
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tempFile}"`;
    const result = execSync(command, { encoding: 'utf-8' }).trim();
    return parseFloat(result);
  } catch (error) {
    throw new Error(`Failed to get audio duration: ${error.message}`);
  }
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

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
      console.log(`⏳ Upload failed (attempt ${attempt + 1}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

async function generateBundles() {
  try {
    console.log(`🔄 Starting bundle generation for ${BOOK_ID} - ${CEFR_LEVEL}`);

    // Load simplified text
    const inputPath = path.join(process.cwd(), 'cache', `the-metamorphosis-${CEFR_LEVEL}-simplified.txt`);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Simplified text not found: ${inputPath}. Run simplify-metamorphosis.js first.`);
    }

    const simplifiedText = fs.readFileSync(inputPath, 'utf-8');
    const sentences = simplifiedText.match(/[^.!?]*[.!?]/g) || [];

    console.log(`📝 Loaded ${sentences.length} sentences`);

    // Create bundles (4 sentences each)
    const bundles = [];
    for (let i = 0; i < sentences.length; i += 4) {
      const bundleSentences = sentences.slice(i, Math.min(i + 4, sentences.length));
      const bundle = {
        index: bundles.length,
        sentences: bundleSentences.map((sentence, idx) => ({
          sentenceIndex: i + idx,
          text: sentence.trim(),
          wordCount: sentence.trim().split(/\s+/).length
        }))
      };
      bundles.push(bundle);
    }

    console.log(`📦 Created ${bundles.length} bundles`);

    // Determine how many bundles to process
    const maxBundles = isPilot ? 70 : bundles.length; // Generate 70 bundles in pilot mode
    const bundlesToProcess = bundles.slice(0, Math.min(maxBundles, bundles.length));

    console.log(`🎯 Will process ${bundlesToProcess.length} bundles`);

    // Create temp directory for ffprobe
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Process bundles
    for (const bundle of bundlesToProcess) {
      console.log(`🔊 Processing bundle ${bundle.index + 1}/${bundlesToProcess.length}`);

      try {
        // Check if bundle already exists
        const existingBundle = await prisma.bookChunk.findFirst({
          where: {
            bookId: BOOK_ID,
            cefrLevel: CEFR_LEVEL,
            chunkIndex: bundle.index
          }
        });

        if (existingBundle) {
          console.log(`   ⏭️ Bundle ${bundle.index} already exists, skipping`);
          continue;
        }

        // Generate bundle text
        const bundleText = bundle.sentences.map(s => s.text).join(' ');
        const totalWords = bundle.sentences.reduce((sum, s) => sum + s.wordCount, 0);
        const wordCount = bundleText.split(/\s+/).filter(word => word.length > 0).length;

        console.log(`   📝 Text: "${bundleText.substring(0, 50)}..."`);
        console.log(`   📊 ${bundle.sentences.length} sentences, ${totalWords} words`);

        // Generate audio
        const audioBuffer = await generateElevenLabsAudio(bundleText, voiceSettings);
        console.log(`   🎵 Generated audio: ${audioBuffer.byteLength} bytes`);

        // Save to temp file for ffprobe measurement (SOLUTION 1)
        const tempFile = path.join(tempDir, `bundle_${bundle.index}_temp.mp3`);
        fs.writeFileSync(tempFile, Buffer.from(audioBuffer));

        // Measure actual duration with ffprobe
        const measuredDuration = getAudioDuration(tempFile);
        console.log(`   ⏱️ Measured duration: ${measuredDuration.toFixed(3)}s`);

        // Calculate proportional sentence timings (SOLUTION 1)
        let currentTime = 0;
        const sentenceTimings = bundle.sentences.map(sentence => {
          const wordRatio = sentence.wordCount / totalWords;
          const duration = measuredDuration * wordRatio;
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

        // Upload to Supabase
        const filePath = `${BOOK_ID}/${CEFR_LEVEL}/${voiceSettings.voice_id}/bundle_${bundle.index}.mp3`;
        try {
          await uploadToSupabase(audioBuffer, filePath);
          console.log(`   ☁️ Uploaded to: ${filePath}`);
        } catch (uploadError) {
          if (uploadError.message && uploadError.message.includes('already exists')) {
            console.log(`   ☁️ File already exists: ${filePath}`);
          } else {
            throw uploadError;
          }
        }

        // Create audioDurationMetadata (SOLUTION 1)
        const audioDurationMetadata = {
          version: 1,
          measuredDuration: measuredDuration,
          sentenceTimings: sentenceTimings,
          measuredAt: new Date().toISOString(),
          method: 'ffprobe-proportional'
        };

        // Save to database
        await prisma.bookChunk.create({
          data: {
            bookId: BOOK_ID,
            cefrLevel: CEFR_LEVEL,
            chunkIndex: bundle.index,
            chunkText: bundleText,
            wordCount: wordCount, // Add required wordCount field
            audioFilePath: filePath, // Relative path only
            audioDurationMetadata: audioDurationMetadata // Solution 1 cached data
          }
        });

        console.log(`   💾 Saved bundle ${bundle.index} to database`);

        // Clean up temp file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error processing bundle ${bundle.index}: ${error.message}`);
        break;
      }
    }

    console.log(`✅ Bundle generation complete!`);
    console.log(`📊 Processed ${bundlesToProcess.length} bundles`);
    console.log(`🎯 Ready for Phase 4: API & Database Integration`);

  } catch (error) {
    console.error('❌ Error during bundle generation:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateBundles();
}

export { generateBundles };