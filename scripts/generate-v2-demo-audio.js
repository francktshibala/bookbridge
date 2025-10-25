#!/usr/bin/env node

/**
 * V2 Demo Audio Generation Script - GPT-5 Refined Approach
 *
 * Implements Technique 2: Moderate settings + minimal processing
 * Focus: "First 5 seconds of delight" with preserved micro-expressiveness
 *
 * CRITICAL: Maintains Solution 1 measured timing for perfect sync
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// GPT-5 REFINED VOICE SETTINGS - Moderate Approach
const V2_SARAH_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah - A1 optimized
  model_id: 'eleven_flash_v2_5',        // GPT-5 recommended for naturalness
  voice_settings: {
    stability: 0.42,                     // GPT-5 range: 0.40-0.45 (moderate)
    similarity_boost: 0.65,              // GPT-5 range: 0.6-0.7 (moderate vs 0.8 Phase 1)
    style: 0.25,                         // GPT-5 range: 0.2-0.3 (gentle sophistication)
    use_speaker_boost: true
  },
  speed: 0.90,                           // LOCKED for perfect sync
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

// Demo content paths
const DEMO_CONTENT_PATH = path.join(process.cwd(), 'data/demo/pride-prejudice-demo-9sentences.json');
const AUDIO_OUTPUT_DIR = path.join(process.cwd(), 'public/audio/demo');

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY environment variable is not set');
  process.exit(1);
}

/**
 * Enhanced SSML with "smile voice" and micro-pauses (GPT-5 recommended)
 */
function generateSmileVoiceSSML(text) {
  // Add subtle smile voice to opening clause and strategic micro-pauses
  const sentences = text.split(/(?<=[.!?])\s+/);

  let enhancedText = sentences.map((sentence, index) => {
    if (index === 0) {
      // "Smile voice" on opening sentence
      const firstComma = sentence.indexOf(',');
      if (firstComma > 0) {
        const firstClause = sentence.substring(0, firstComma);
        const rest = sentence.substring(firstComma);
        return `<prosody pitch="+0.5st" volume="soft"><emphasis level="moderate">${firstClause}</emphasis></prosody><break time="100ms"/>${rest}`;
      }
    }

    // Add micro-pauses at commas for natural flow
    return sentence.replace(/,/g, ',<break time="80ms"/>');
  }).join('<break time="150ms"/>'); // Natural sentence endings

  return `<speak>${enhancedText}</speak>`;
}

/**
 * Generate audio with retry logic (Master Mistakes Prevention)
 */
async function generateAudioWithRetry(text, voiceSettings, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🎵 Generating V2 audio (attempt ${attempt}/${maxRetries})...`);

      const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceSettings.voice_id}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: voiceSettings.model_id,
          voice_settings: voiceSettings.voice_settings,
          output_format: voiceSettings.output_format,
          apply_text_normalization: voiceSettings.apply_text_normalization
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      return Buffer.from(audioBuffer);

    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) break;

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Solution 1: ffprobe measurement for perfect sync (CRITICAL)
 */
async function measureAudioDuration(audioBuffer) {
  const tempFile = path.join(process.cwd(), 'temp', `v2_measurement_${Date.now()}.mp3`);

  try {
    await fs.mkdir(path.dirname(tempFile), { recursive: true });
    await fs.writeFile(tempFile, audioBuffer);

    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tempFile}"`;
    const { stdout } = await execAsync(command);
    const measuredDuration = parseFloat(stdout.trim());

    if (isNaN(measuredDuration) || measuredDuration <= 0) {
      throw new Error(`Invalid duration measurement: ${stdout.trim()}`);
    }

    console.log(`📏 V2 measured duration: ${measuredDuration.toFixed(3)}s`);
    return measuredDuration;

  } finally {
    try {
      await fs.unlink(tempFile);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Calculate proportional sentence timings (Solution 1)
 */
function calculateProportionalTimings(sentences, totalDuration) {
  const totalWords = sentences.reduce((sum, sentence) => sum + sentence.wordCount, 0);
  let currentTime = 0;

  return sentences.map((sentence, index) => {
    const wordRatio = sentence.wordCount / totalWords;
    const duration = totalDuration * wordRatio;
    const startTime = currentTime;
    const endTime = currentTime + duration;
    currentTime = endTime;

    return {
      sentenceIndex: index,
      text: sentence.text,
      startTime: parseFloat(startTime.toFixed(3)),
      endTime: parseFloat(endTime.toFixed(3)),
      duration: parseFloat(duration.toFixed(3)),
      wordCount: sentence.wordCount
    };
  });
}

/**
 * Generate V2 audio for B1 Sarah
 */
async function generateV2Audio() {
  console.log(`\n🚀 V2 Audio Generation: B1 level with Sarah voice`);
  console.log('📋 GPT-5 Refined Approach: eleven_flash_v2_5 + moderate settings\n');

  // Load demo content
  const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));
  const levelData = demoContent.levels['B1'];

  if (!levelData) {
    throw new Error('B1 level not found in demo content');
  }

  console.log(`📝 Text: "${levelData.text.substring(0, 50)}..."`);
  console.log(`🎤 Voice: Sarah (${V2_SARAH_SETTINGS.voice_id})`);
  console.log(`🔧 Model: ${V2_SARAH_SETTINGS.model_id} (vs eleven_monolingual_v1 Phase 1)`);
  console.log(`⚙️ V2 settings: stability=${V2_SARAH_SETTINGS.voice_settings.stability}, similarity_boost=${V2_SARAH_SETTINGS.voice_settings.similarity_boost}, style=${V2_SARAH_SETTINGS.voice_settings.style}`);

  // Generate enhanced SSML with smile voice
  const enhancedText = generateSmileVoiceSSML(levelData.text);
  console.log(`✨ Enhanced with: smile voice + micro-pauses`);

  // Generate audio with V2 settings
  const audioBuffer = await generateAudioWithRetry(enhancedText, V2_SARAH_SETTINGS);

  // Solution 1: Measure actual duration
  const measuredDuration = await measureAudioDuration(audioBuffer);

  // Calculate proportional sentence timings
  const sentenceTimings = calculateProportionalTimings(levelData.sentences, measuredDuration);

  // Save V2 audio file
  const fileName = `pride-prejudice-b1-sarah-v2.mp3`;
  const filePath = path.join(AUDIO_OUTPUT_DIR, fileName);

  await fs.writeFile(filePath, audioBuffer);
  console.log(`✅ V2 audio saved: ${fileName}`);

  // Create metadata
  const metadata = {
    version: 3, // V2 version
    voice: 'Sarah',
    voiceId: V2_SARAH_SETTINGS.voice_id,
    model: V2_SARAH_SETTINGS.model_id,
    level: 'B1',
    approach: 'v2_moderate_settings',
    measuredDuration: measuredDuration,
    sentenceTimings: sentenceTimings,
    voiceSettings: V2_SARAH_SETTINGS.voice_settings,
    enhancements: ['smile_voice', 'micro_pauses', 'eleven_flash_v2_5'],
    measuredAt: new Date().toISOString(),
    method: 'ffprobe-proportional',
    notes: 'GPT-5 refined approach - moderate settings for naturalness'
  };

  // Save metadata
  const metadataPath = path.join(AUDIO_OUTPUT_DIR, `${fileName}.metadata.json`);
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

  return {
    fileName,
    duration: measuredDuration,
    metadata
  };
}

/**
 * Compare with baseline for drift validation
 */
async function validateDrift(v2File, baselineFile) {
  if (!await fs.access(baselineFile).then(() => true).catch(() => false)) {
    console.log(`⚠️ Baseline file ${baselineFile} not found - skipping drift validation`);
    return true;
  }

  try {
    const v2Buffer = await fs.readFile(v2File);
    const baselineBuffer = await fs.readFile(baselineFile);

    const v2Duration = await measureAudioDuration(v2Buffer);
    const baselineDuration = await measureAudioDuration(baselineBuffer);

    const driftPercentage = Math.abs((v2Duration - baselineDuration) / baselineDuration) * 100;

    console.log(`📊 Drift validation:`);
    console.log(`   V2 (flash_v2_5): ${v2Duration.toFixed(3)}s`);
    console.log(`   Baseline: ${baselineDuration.toFixed(3)}s`);
    console.log(`   Drift: ${driftPercentage.toFixed(2)}%`);

    const driftValid = driftPercentage < 5.0;

    if (driftValid) {
      console.log(`✅ Drift validation PASSED: ${driftPercentage.toFixed(2)}% < 5%`);
    } else {
      console.log(`❌ Drift validation FAILED: ${driftPercentage.toFixed(2)}% >= 5%`);
    }

    return driftValid;

  } catch (error) {
    console.warn(`⚠️ Drift validation error:`, error.message);
    return false;
  }
}

/**
 * Main generation workflow
 */
async function main() {
  console.log('🎵 V2 Demo Audio Generation - GPT-5 Refined Approach');
  console.log('📋 Focus: First 5 seconds of delight with preserved micro-expressiveness\n');

  await fs.mkdir(AUDIO_OUTPUT_DIR, { recursive: true });

  try {
    const result = await generateV2Audio();

    // Validate drift against current B1 audio
    const v2Path = path.join(AUDIO_OUTPUT_DIR, result.fileName);
    const baselinePaths = [
      path.join(AUDIO_OUTPUT_DIR, 'pride-prejudice-b1-daniel-enhanced.mp3'),
      path.join(AUDIO_OUTPUT_DIR, 'pride-prejudice-b1-sarah-enhanced.mp3')
    ];

    for (const baselinePath of baselinePaths) {
      if (await fs.access(baselinePath).then(() => true).catch(() => false)) {
        await validateDrift(v2Path, baselinePath);
        break;
      }
    }

    console.log('\n📊 V2 GENERATION SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ SUCCESS B1-SARAH-V2 - ${result.duration.toFixed(3)}s`);
    console.log(`🔧 Model: eleven_flash_v2_5 (GPT-5 recommended)`);
    console.log(`⚙️ Settings: Moderate approach for naturalness`);
    console.log(`✨ Enhancements: Smile voice + micro-pauses`);
    console.log(`🎯 Ready for quality comparison testing!`);

  } catch (error) {
    console.error(`❌ V2 generation failed:`, error.message);
    process.exit(1);
  }
}

// Run V2 generation
if (require.main === module) {
  main().catch(error => {
    console.error('💥 V2 generation failed:', error);
    process.exit(1);
  });
}

module.exports = {
  generateV2Audio,
  validateDrift,
  V2_SARAH_SETTINGS
};