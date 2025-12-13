import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// VALIDATED VOICE ID - Daniel (Podcast/Biography narrator)
const DANIEL_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'; // Daniel voice

// NOVEMBER 2025 PRODUCTION STANDARD - FFmpeg 0.85× Post-Processing
const TARGET_SPEED = 0.85;  // 18% slower, comfortable pace

// PRODUCTION VOICE SETTINGS - Daniel (Biography narration)
const DANIEL_VOICE_SETTINGS = {
  voice_id: DANIEL_VOICE_ID,
  model_id: 'eleven_monolingual_v1',
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.8,
    style: 0.05,
    use_speaker_boost: true
  },
  speed: 0.90,
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

const STORY_ID = 'immigrant-entrepreneur';

// Get target level from command line argument (excluding --pilot flag)
const args = process.argv.slice(2).filter(arg => arg !== '--pilot');
const targetLevel = args[0] || 'A1';
const VALID_LEVELS = ['A1', 'A2'];

if (!VALID_LEVELS.includes(targetLevel)) {
  console.error(`❌ Error: Invalid level "${targetLevel}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  console.log('Usage: node scripts/generate-immigrant-entrepreneur-bundles.js [A1|A2] [--pilot]');
  process.exit(1);
}

const CEFR_LEVEL = targetLevel;

// Get pilot mode from command line
const isPilot = process.argv.includes('--pilot');

console.log(`🎵 Generating bundles for "${STORY_ID}" at ${CEFR_LEVEL} level`);
console.log(`🗣️ Using voice: ${DANIEL_VOICE_ID} (Daniel)`);
console.log(`🔧 Timing: Enhanced Timing v3 (character-count + punctuation penalties)`);

if (isPilot) {
  console.log('🧪 PILOT MODE: Will generate only first 3 bundles (~$0.30 cost)');
}

/**
 * Enhanced Timing v3: Character-count proportion + punctuation penalties
 */
function calculateEnhancedTimingV3(sentences, totalDuration) {
  const totalCharacters = sentences.reduce((sum, sentence) => sum + sentence.length, 0);

  const sentencePenalties = sentences.map(sentence => {
    const commaCount = (sentence.match(/,/g) || []).length;
    const semicolonCount = (sentence.match(/;/g) || []).length;
    const colonCount = (sentence.match(/:/g) || []).length;
    const emdashCount = (sentence.match(/—/g) || []).length;
    const ellipsisCount = (sentence.match(/\.\.\./g) || []).length;

    let pausePenalty = (commaCount * 0.15) +
                       (semicolonCount * 0.25) +
                       (colonCount * 0.20) +
                       (emdashCount * 0.18) +
                       (ellipsisCount * 0.12);

    pausePenalty = Math.min(pausePenalty, 0.6);
    return { sentence, pausePenalty };
  });

  const totalPauseBudget = sentencePenalties.reduce((sum, item) => sum + item.pausePenalty, 0);
  let remainingDuration = totalDuration - totalPauseBudget;

  if (remainingDuration < 0) {
    const scaleFactor = totalDuration * 0.8 / totalPauseBudget;
    sentencePenalties.forEach(item => {
      item.pausePenalty *= scaleFactor;
    });
    remainingDuration = totalDuration * 0.2;
  }

  const timings = sentencePenalties.map((item, index) => {
    const characterRatio = item.sentence.length / totalCharacters;
    const baseDuration = remainingDuration * characterRatio;
    let adjustedDuration = baseDuration + item.pausePenalty;
    adjustedDuration = Math.max(adjustedDuration, 0.25);

    return { index, sentence: item.sentence, adjustedDuration };
  });

  const currentTotal = timings.reduce((sum, t) => sum + t.adjustedDuration, 0);
  const renormalizeFactor = totalDuration / currentTotal;

  if (Math.abs(renormalizeFactor - 1.0) > 0.001) {
    timings.forEach(t => {
      t.adjustedDuration *= renormalizeFactor;
    });
  }

  let currentTime = 0;
  const finalTimings = timings.map(t => {
    const startTime = currentTime;
    const endTime = currentTime + t.adjustedDuration;
    currentTime = endTime;

    return {
      startTime: parseFloat(startTime.toFixed(3)),
      endTime: parseFloat(endTime.toFixed(3)),
      duration: parseFloat(t.adjustedDuration.toFixed(3))
    };
  });

  const finalTotal = finalTimings[finalTimings.length - 1].endTime;
  if (Math.abs(finalTotal - totalDuration) > 0.01) {
    console.warn(`   ⚠️ Timing mismatch: ${finalTotal.toFixed(3)}s vs ${totalDuration.toFixed(3)}s`);
  }

  return finalTimings;
}

async function generateElevenLabsAudio(text, voiceSettings, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
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
          voice_settings: voiceSettings.voice_settings,
          speed: voiceSettings.speed,
          output_format: voiceSettings.output_format,
          apply_text_normalization: voiceSettings.apply_text_normalization
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = attempt * 1000;
        console.log(`   ⚠️ Retry ${attempt}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

async function applyFFmpegSlowdown(inputFile, outputFile) {
  try {
    execSync(`ffmpeg -i "${inputFile}" -filter:a "atempo=${TARGET_SPEED}" -y "${outputFile}"`, {
      stdio: 'inherit'
    });
    return true;
  } catch (error) {
    console.error(`   ❌ FFmpeg slowdown failed: ${error.message}`);
    return false;
  }
}

async function measureAudioDuration(audioFile) {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile}"`
    ).toString().trim();
    return parseFloat(output);
  } catch (error) {
    console.error(`   ❌ FFprobe measurement failed`);
    return null;
  }
}

async function generateBundles() {
  const inputFile = path.join(process.cwd(), 'cache', `${STORY_ID}-A1-simplified.txt`);
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }

  const fullText = fs.readFileSync(inputFile, 'utf8');
  
  const sentences = fullText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  console.log(`\n📖 Loaded ${sentences.length} sentences from A1 simplified text`);

  const bundles = [];
  const BUNDLE_SIZE = 4;
  
  for (let i = 0; i < sentences.length; i += BUNDLE_SIZE) {
    const bundleSentences = sentences.slice(i, i + BUNDLE_SIZE);
    bundles.push({
      bundleIndex: Math.floor(i / BUNDLE_SIZE),
      startSentenceIndex: i,
      endSentenceIndex: Math.min(i + BUNDLE_SIZE - 1, sentences.length - 1),
      sentences: bundleSentences,
      text: bundleSentences.join(' ')
    });
  }

  console.log(`📦 Created ${bundles.length} bundles (${BUNDLE_SIZE} sentences each)`);
  console.log(`💰 Estimated cost: ~$${Math.ceil((bundles.length * 150) / 1000 * 0.30)}`);

  const tempDir = path.join(process.cwd(), 'cache', 'temp');
  fs.mkdirSync(tempDir, { recursive: true });

  const bundlesToProcess = isPilot ? bundles.slice(0, 3) : bundles;
  const metadata = [];

  console.log(`\n🎬 Starting audio generation for ${bundlesToProcess.length} bundles...\n`);

  for (let i = 0; i < bundlesToProcess.length; i++) {
    const bundle = bundlesToProcess[i];
    const progress = `${i + 1}/${bundlesToProcess.length}`;

    console.log(`📦 Bundle ${progress} (sentences ${bundle.startSentenceIndex}-${bundle.endSentenceIndex})`);
    console.log(`   📝 "${bundle.text.substring(0, 60)}..."`);

    try {
      console.log(`   🎙️ Generating audio with Daniel voice...`);
      const audioBuffer = await generateElevenLabsAudio(bundle.text, DANIEL_VOICE_SETTINGS);

      const tempFile = path.join(tempDir, `${STORY_ID}-${CEFR_LEVEL}-bundle-${bundle.bundleIndex}-temp.mp3`);
      fs.writeFileSync(tempFile, Buffer.from(audioBuffer));

      const slowedFile = path.join(tempDir, `${STORY_ID}-${CEFR_LEVEL}-bundle-${bundle.bundleIndex}-slowed.mp3`);
      console.log(`   ⚡ Applying FFmpeg 0.85× slowdown...`);
      const slowdownSuccess = await applyFFmpegSlowdown(tempFile, slowedFile);

      if (!slowdownSuccess) {
        throw new Error('FFmpeg slowdown failed');
      }

      console.log(`   ⏱️ Measuring duration...`);
      const duration = await measureAudioDuration(slowedFile);

      if (duration === null) {
        throw new Error('Failed to measure audio duration');
      }

      console.log(`   ⏱️ Duration: ${duration.toFixed(2)}s`);

      console.log(`   🔧 Calculating Enhanced Timing v3...`);
      const sentenceTimings = calculateEnhancedTimingV3(bundle.sentences, duration);

      console.log(`   ☁️ Uploading to Supabase...`);
      const fileName = `${STORY_ID}/${CEFR_LEVEL}/bundle_${bundle.bundleIndex}.mp3`;
      const slowedBuffer = fs.readFileSync(slowedFile);

      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(fileName, slowedBuffer, {
          contentType: 'audio/mpeg',
          cacheControl: '2592000',
          upsert: true
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      const publicUrl = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName).data.publicUrl;

      console.log(`   ✅ Uploaded: ${fileName}`);

      const sentenceTimingsWithIndex = bundle.sentences.map((sentence, idx) => ({
        text: sentence,
        startTime: sentenceTimings[idx].startTime,
        endTime: sentenceTimings[idx].endTime,
        duration: sentenceTimings[idx].duration,
        sentenceIndex: bundle.startSentenceIndex + idx
      }));

      metadata.push({
        bundleIndex: bundle.bundleIndex,
        startSentenceIndex: bundle.startSentenceIndex,
        endSentenceIndex: bundle.endSentenceIndex,
        text: bundle.text,
        sentences: bundle.sentences,
        audioUrl: publicUrl,
        duration: duration,
        voiceId: DANIEL_VOICE_SETTINGS.voice_id,
        voiceName: 'Daniel',
        speed: TARGET_SPEED,
        sentenceTimings: sentenceTimingsWithIndex
      });

      fs.unlinkSync(tempFile);
      fs.unlinkSync(slowedFile);

      // Small delay between bundles
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`   ❌ Error processing bundle ${progress}:`, error.message);
    }
  }

  console.log(`\n📈 Progress: ${metadata.length}/${bundlesToProcess.length} (100%)\n`);

  const outputPath = path.join(process.cwd(), `cache/${STORY_ID}-${CEFR_LEVEL}-bundles-metadata.json`);
  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
  console.log(`\n🎉 AUDIO GENERATION COMPLETE!`);
  console.log(`=`.repeat(60));
  console.log(`📦 Total bundles: ${metadata.length}`);
  console.log(`✅ Success rate: ${((metadata.length / bundlesToProcess.length) * 100).toFixed(0)}%`);
  console.log(`💾 Metadata: ${outputPath}`);
  console.log(`🗣️ Voice: Daniel (${DANIEL_VOICE_ID})`);
  console.log(`⚡ Speed: ${TARGET_SPEED}×`);
  console.log(`🔧 Timing: Enhanced Timing v3`);
  console.log(`\n🚀 Ready for database integration`);
}

generateBundles()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(`\n💥 Fatal error:`, error);
    process.exit(1);
  });

