import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

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

// VOICE MAPPING: A1 → Sarah, A2/B1 → Daniel (per Master Mistakes Prevention)
function getVoiceForLevel(level) {
  const voiceMapping = {
    'A1': SARAH_VOICE_SETTINGS,
    'A2': DANIEL_VOICE_SETTINGS, // A2 uses Daniel (proven settings)
    'B1': DANIEL_VOICE_SETTINGS  // B1 uses Daniel
  };
  return voiceMapping[level] || DANIEL_VOICE_SETTINGS;
}

const BOOK_ID = 'the-devoted-friend';

// SCRIPT LEVEL VALIDATION - MANDATORY FIRST (prevents runtime failures)
const VALID_LEVELS = ['A1', 'A2', 'B1'];

// Get target level from command line argument
const targetLevel = process.argv[2];
const isPilot = process.argv.includes('--pilot');

// Validate level before proceeding
if (!targetLevel) {
  console.error('❌ Error: Please specify a CEFR level (A1, A2, or B1)');
  console.log('Usage: node scripts/generate-the-devoted-friend-bundles.js [A1|A2|B1] [--pilot]');
  process.exit(1);
}

if (!VALID_LEVELS.includes(targetLevel)) {
  console.error(`❌ Error: Invalid level "${targetLevel}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  process.exit(1);
}

const CEFR_LEVEL = targetLevel;
const voiceSettings = getVoiceForLevel(CEFR_LEVEL);

console.log(`🎵 Generating bundles for "${BOOK_ID}" at ${CEFR_LEVEL} level`);
console.log(`🗣️ Using voice: ${voiceSettings.voice_id} (${CEFR_LEVEL === 'A1' ? 'Sarah' : 'Daniel'})`);

if (isPilot) {
  console.log('🧪 PILOT MODE: Will generate only first 10 bundles (~$1.00 cost)');
}

// GPT-5 PROVEN TIMING FORMULA (Speed-aware + length penalty + safety tail)
function calculateSentenceTiming(words, voiceType, speed, cefrLevel) {
  // Base timing rates (proven M1 settings)
  const baseSecondsPerWord = voiceType === 'Sarah' ? 0.30 : 0.40;

  // Speed adjustment (CRITICAL for speed 0.90)
  const adjustedSecondsPerWord = baseSecondsPerWord / speed; // 0.30/0.90 = 0.33s for Sarah

  // CEFR-specific length penalties for complex sentences
  const lengthPenalties = {
    'A1': words > 12 ? (words - 12) * 0.03 : 0,
    'A2': words > 14 ? (words - 14) * 0.04 : 0,
    'B1': words > 15 ? (words - 15) * 0.05 : 0
  };

  // Safety tail prevents audio cutoffs
  const safetyTail = 0.12; // 120ms buffer

  return words * adjustedSecondsPerWord + lengthPenalties[cefrLevel] + safetyTail;
}

async function generateDevotedFriendBundles() {
  try {
    // Load simplified text from cache
    const cacheFile = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-simplified.json`);

    if (!fs.existsSync(cacheFile)) {
      throw new Error(`Simplified text cache not found: ${cacheFile}. Run simplification first.`);
    }

    const simplifiedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const sentences = simplifiedData.sentences;

    console.log(`📝 Loaded ${sentences.length} simplified sentences`);

    // Create 4-sentence bundles
    const bundles = [];
    for (let i = 0; i < sentences.length; i += 4) {
      const bundleSentences = sentences.slice(i, i + 4);
      bundles.push({
        index: bundles.length,
        sentences: bundleSentences
      });
    }

    console.log(`📦 Created ${bundles.length} bundles (4 sentences each)`);

    // Apply pilot mode limit
    const bundlesToProcess = isPilot ? bundles.slice(0, 10) : bundles;
    console.log(`🎯 Will process ${bundlesToProcess.length} bundles`);

    // Check for existing bundles in cache (resume capability)
    const existingIndices = new Set();
    for (let i = 0; i < bundlesToProcess.length; i++) {
      const bundleCacheFile = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-bundle-${i}.json`);
      if (fs.existsSync(bundleCacheFile)) {
        existingIndices.add(i);
      }
    }

    const newBundles = bundlesToProcess.filter(b => !existingIndices.has(b.index));

    console.log(`📊 Found ${existingIndices.size} existing bundles`);
    console.log(`🆕 Will generate ${newBundles.length} new bundles`);

    if (newBundles.length === 0) {
      console.log('✅ All bundles already exist. Audio generation complete!');
      return;
    }

    // Estimate cost
    const estimatedCost = newBundles.length * 0.10; // Rough estimate per bundle
    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(2)}`);

    // Generate audio for new bundles
    for (const bundle of newBundles) {
      console.log(`\n🎵 Generating bundle ${bundle.index + 1}/${bundlesToProcess.length}...`);

      try {
        // Combine sentences for audio generation
        const bundleText = bundle.sentences.map(s => s.text).join(' ');
        const wordCount = bundleText.split(/\s+/).length;

        console.log(`📝 Text: "${bundleText.substring(0, 100)}${bundleText.length > 100 ? '...' : ''}"`);
        console.log(`📊 Words: ${wordCount}`);

        // Generate audio using ElevenLabs
        const audioBuffer = await generateElevenLabsAudio(bundleText, voiceSettings);

        // Calculate timing using proven formula
        const voiceType = CEFR_LEVEL === 'A1' ? 'Sarah' : 'Daniel';
        const estimatedDuration = calculateSentenceTiming(wordCount, voiceType, 0.90, CEFR_LEVEL);

        console.log(`⏱️ Estimated duration: ${estimatedDuration.toFixed(2)}s`);

        // Upload to Supabase with book-specific path
        const audioFileName = `${BOOK_ID}/${CEFR_LEVEL}/${voiceSettings.voice_id}/bundle_${bundle.index}.mp3`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio-files')
          .upload(audioFileName, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true
          });

        if (uploadError) {
          throw new Error(`Audio upload failed: ${uploadError.message}`);
        }

        console.log(`☁️ Uploaded: ${audioFileName}`);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('audio-files')
          .getPublicUrl(audioFileName);

        // Calculate sentence timings within bundle
        const sentenceTimings = [];
        let currentTime = 0;

        for (const sentence of bundle.sentences) {
          const sentenceWords = sentence.text.split(/\s+/).length;
          const sentenceDuration = calculateSentenceTiming(sentenceWords, voiceType, 0.90, CEFR_LEVEL);

          sentenceTimings.push({
            sentenceIndex: sentence.sentenceIndex,
            startTime: currentTime,
            endTime: currentTime + sentenceDuration,
            text: sentence.text
          });

          currentTime += sentenceDuration;
        }

        // Save to bundle cache (proven working pattern)
        const bundleData = {
          index: bundle.index,
          sentences: bundle.sentences,
          audioUrl: urlData.publicUrl,
          audioFileName: audioFileName,
          duration: estimatedDuration,
          sentenceTimings: sentenceTimings,
          wordCount: wordCount,
          metadata: {
            voiceId: voiceSettings.voice_id,
            voiceSettings: voiceSettings.voice_settings,
            generatedAt: new Date().toISOString()
          }
        };

        // Save individual bundle to cache
        const bundleCacheFile = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-bundle-${bundle.index}.json`);
        fs.writeFileSync(bundleCacheFile, JSON.stringify(bundleData, null, 2));

        console.log(`💾 Saved bundle ${bundle.index} to cache`);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ Failed to generate bundle ${bundle.index}:`, error.message);
        console.log('🔄 You can resume by running the script again.');
        throw error;
      }
    }

    console.log(`\n✅ Audio generation complete!`);
    console.log(`📦 Generated ${newBundles.length} new bundles`);
    console.log(`🎵 Total bundles: ${bundlesToProcess.length}`);

    // Create consolidated bundle file (proven pattern)
    const allBundles = [];
    for (let i = 0; i < bundlesToProcess.length; i++) {
      const bundleCacheFile = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-bundle-${i}.json`);
      if (fs.existsSync(bundleCacheFile)) {
        const bundleData = JSON.parse(fs.readFileSync(bundleCacheFile, 'utf8'));
        allBundles.push(bundleData);
      }
    }

    // Save consolidated bundles file
    const consolidatedFile = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-bundles.json`);
    fs.writeFileSync(consolidatedFile, JSON.stringify(allBundles, null, 2));
    console.log(`📁 Consolidated bundles saved: ${consolidatedFile}`);

  } catch (error) {
    console.error('❌ Bundle generation failed:', error.message);
    throw error;
  }
}

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
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDevotedFriendBundles()
    .then(() => console.log(`\n🎉 The Devoted Friend bundles generated successfully!`))
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

export { generateDevotedFriendBundles };