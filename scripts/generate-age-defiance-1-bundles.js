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

// VALIDATED VOICE ID - Sarah (American soft news)
const SARAH_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

// NOVEMBER 2025 PRODUCTION STANDARD - FFmpeg 0.85× Post-Processing
const TARGET_SPEED = 0.85;  // 18% slower, comfortable pace

// PRODUCTION VOICE SETTINGS - Sarah (Age Defiance narration)
const SARAH_VOICE_SETTINGS = {
  voice_id: SARAH_VOICE_ID,
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

const STORY_ID = 'age-defiance-1';
const CEFR_LEVEL = 'A1';

// Get pilot mode from command line
const isPilot = process.argv.includes('--pilot');

console.log(`🎵 Generating bundles for "${STORY_ID}" at ${CEFR_LEVEL} level`);
console.log(`🗣️ Using voice: ${SARAH_VOICE_ID} (Sarah)`);
console.log(`🔧 Timing: Enhanced Timing v3 (character-count + punctuation penalties)`);

if (isPilot) {
  console.log('🧪 PILOT MODE: Will generate only first 10 bundles (~$1.00 cost)');
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

      const audioBuffer = await response.arrayBuffer();
      return Buffer.from(audioBuffer);
    } catch (error) {
      lastError = error;
      console.error(`   ❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
      if (attempt < maxRetries) {
        console.log(`   ⏳ Retrying in ${attempt * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      }
    }
  }
  throw lastError;
}

async function slowDownAudio(inputBuffer, targetSpeed) {
  const tempDir = path.join(process.cwd(), 'cache', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempInput = path.join(tempDir, `temp_input_${Date.now()}.mp3`);
  const tempOutput = path.join(tempDir, `temp_output_${Date.now()}.mp3`);

  try {
    fs.writeFileSync(tempInput, inputBuffer);

    const ffmpegCommand = `ffmpeg -i "${tempInput}" -filter:a "atempo=${targetSpeed}" -y "${tempOutput}"`;
    execSync(ffmpegCommand, { stdio: 'pipe' });

    const slowedBuffer = fs.readFileSync(tempOutput);
    fs.unlinkSync(tempInput);
    fs.unlinkSync(tempOutput);

    return slowedBuffer;
  } catch (error) {
    if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
    if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
    throw error;
  }
}

async function measureAudioDuration(audioBuffer) {
  const tempDir = path.join(process.cwd(), 'cache', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFile = path.join(tempDir, `measure_${Date.now()}.mp3`);

  try {
    fs.writeFileSync(tempFile, audioBuffer);
    const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFile}"`);
    fs.unlinkSync(tempFile);
    return parseFloat(stdout.trim());
  } catch (error) {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    throw error;
  }
}

async function generateBundles() {
  try {
    const storyFilePath = path.join(process.cwd(), 'cache', `${STORY_ID}-${CEFR_LEVEL}-simplified.txt`);

    if (!fs.existsSync(storyFilePath)) {
      console.error(`❌ Story file not found: ${storyFilePath}`);
      process.exit(1);
    }

    const storyText = fs.readFileSync(storyFilePath, 'utf-8');
    const allSentences = storyText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`\n📊 Story Stats:`);
    console.log(`   Total sentences: ${allSentences.length}`);
    console.log(`   Avg sentence length: ${Math.round(allSentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / allSentences.length)} words`);

    const SENTENCES_PER_BUNDLE = 5; // ~5 sentences per bundle for 194 sentences = ~40 bundles
    const bundles = [];

    for (let i = 0; i < allSentences.length; i += SENTENCES_PER_BUNDLE) {
      bundles.push({
        index: Math.floor(i / SENTENCES_PER_BUNDLE),
        sentences: allSentences.slice(i, i + SENTENCES_PER_BUNDLE)
      });
    }

    const totalBundles = bundles.length;
    const bundlesToGenerate = isPilot ? Math.min(10, totalBundles) : totalBundles;

    console.log(`\n🎬 Generating ${bundlesToGenerate} bundles (${SENTENCES_PER_BUNDLE} sentences each):`);

    const bundlesMetadata = [];

    for (let i = 0; i < bundlesToGenerate; i++) {
      const bundle = bundles[i];
      const bundleText = bundle.sentences.join(' ');

      console.log(`\n📦 Bundle ${bundle.index} (${bundle.sentences.length} sentences):`);
      console.log(`   Text preview: ${bundleText.substring(0, 80)}...`);

      console.log(`   🎤 Generating audio with ElevenLabs (Sarah voice)...`);
      const audioBuffer = await generateElevenLabsAudio(bundleText, SARAH_VOICE_SETTINGS);

      console.log(`   ⏱️  Measuring initial duration...`);
      const initialDuration = await measureAudioDuration(audioBuffer);
      console.log(`   Initial: ${initialDuration.toFixed(2)}s (0.90× speed from ElevenLabs)`);

      console.log(`   🔧 Applying FFmpeg slowdown (${TARGET_SPEED}×)...`);
      const slowedAudioBuffer = await slowDownAudio(audioBuffer, TARGET_SPEED);

      console.log(`   ⏱️  Measuring final duration...`);
      const finalDuration = await measureAudioDuration(slowedAudioBuffer);
      const effectiveSpeed = (0.90 * TARGET_SPEED).toFixed(3);
      console.log(`   Final: ${finalDuration.toFixed(2)}s (effective ${effectiveSpeed}× speed)`);

      console.log(`   ⏰ Calculating sentence timings (Enhanced Timing v3)...`);
      const sentenceTimings = calculateEnhancedTimingV3(bundle.sentences, finalDuration);

      const fileName = `${STORY_ID}/${CEFR_LEVEL}/bundle-${bundle.index}.mp3`;
      console.log(`   ☁️  Uploading to Supabase: ${fileName}...`);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, slowedAudioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Supabase upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName);

      console.log(`   ✅ Uploaded: ${publicUrl}`);

      const bundleMetadata = {
        bundleId: `b${bundle.index}`,
        bundleIndex: bundle.index,
        audioUrl: publicUrl,
        audioPath: fileName,
        sentences: bundle.sentences.map((text, idx) => ({
          text: text,
          startTime: sentenceTimings[idx].startTime,
          endTime: sentenceTimings[idx].endTime,
          duration: sentenceTimings[idx].duration,
          sentenceIndex: (bundle.index * SENTENCES_PER_BUNDLE) + idx  // Global sentence index
        })),
        totalDuration: finalDuration,
        measuredDuration: finalDuration
      };

      bundlesMetadata.push(bundleMetadata);
    }

    const outputFile = path.join(process.cwd(), 'cache', `${STORY_ID}-${CEFR_LEVEL}-bundles-metadata.json`);
    fs.writeFileSync(outputFile, JSON.stringify(bundlesMetadata, null, 2), 'utf-8');

    console.log(`\n✅ Bundle generation complete!`);
    console.log(`📊 Generated ${bundlesToGenerate}/${totalBundles} bundles`);
    console.log(`💾 Metadata saved to: ${outputFile}`);

    if (isPilot) {
      console.log(`\n🧪 PILOT COMPLETE - Review bundles before generating remaining ${totalBundles - bundlesToGenerate} bundles`);
      console.log(`   Run without --pilot flag to generate all bundles`);
    }

  } catch (error) {
    console.error('\n❌ Error generating bundles:', error);
    process.exit(1);
  }
}

generateBundles();

