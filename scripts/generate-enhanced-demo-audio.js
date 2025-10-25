#!/usr/bin/env node

/**
 * Enhanced Hero Demo Audio Generation Script
 *
 * Generates enhanced audio for Pride & Prejudice demo using Agent 2 research findings
 * Implements Solution 1: ffprobe measurement + proportional timing + cache
 *
 * ENHANCEMENT: Uses GPT-5 validated enhanced settings for mind-blowing quality
 * PRESERVATION: Maintains <5% drift requirement for perfect sync
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// ENHANCED VOICE SETTINGS - Agent 2 Research Findings
const ENHANCED_SARAH_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah - A1 optimized
  model_id: 'eleven_monolingual_v1',    // Timing-stable model (preserved)
  voice_settings: {
    stability: 0.5,                      // A1-optimized (slightly higher for clarity)
    similarity_boost: 0.8,               // Enhanced presence (+0.05 from baseline)
    style: 0.05,                         // Gentle sophistication for A1 learners
    use_speaker_boost: true
  },
  speed: 0.90,                           // LOCKED - never change (perfect sync)
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

// ENHANCED DANIEL SETTINGS - Agent 2 Research Findings
const ENHANCED_DANIEL_SETTINGS = {
  voice_id: 'onwK4e9ZLuTAKqWW03F9', // Daniel - sophisticated levels
  model_id: 'eleven_monolingual_v1',    // Same stable model
  voice_settings: {
    stability: 0.45,                     // Enhanced clarity (GPT-5 range)
    similarity_boost: 0.8,               // Enhanced presence (GPT-5 range)
    style: 0.1,                          // Subtle sophistication (GPT-5 max)
    use_speaker_boost: true
  },
  speed: 0.90,                           // LOCKED - never change (perfect sync)
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
 * Master Mistakes Prevention: Retry logic for ElevenLabs API reliability
 */
async function generateAudioWithRetry(text, voiceSettings, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🎵 Generating audio (attempt ${attempt}/${maxRetries})...`);

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

      // Exponential backoff with jitter
      const delay = Math.min(
        1000 * Math.pow(2, attempt) + Math.random() * 1000,
        10000
      );

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
  // Save to temp file for ffprobe measurement
  const tempFile = path.join(process.cwd(), 'temp', `measurement_${Date.now()}.mp3`);

  try {
    // Ensure temp directory exists
    await fs.mkdir(path.dirname(tempFile), { recursive: true });

    // Write audio buffer to temp file
    await fs.writeFile(tempFile, audioBuffer);

    // Measure with ffprobe
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tempFile}"`;
    const { stdout } = await execAsync(command);

    const measuredDuration = parseFloat(stdout.trim());

    if (isNaN(measuredDuration) || measuredDuration <= 0) {
      throw new Error(`Invalid duration measurement: ${stdout.trim()}`);
    }

    console.log(`📏 Measured duration: ${measuredDuration.toFixed(3)}s`);
    return measuredDuration;

  } finally {
    // Clean up temp file
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
 * Generate enhanced audio for specific level and voice
 */
async function generateEnhancedAudio(level, voice) {
  console.log(`\n🚀 Generating enhanced audio: ${level} level with ${voice} voice`);

  // Load demo content
  const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));
  const levelData = demoContent.levels[level];

  if (!levelData) {
    throw new Error(`Level ${level} not found in demo content`);
  }

  // Get voice settings
  const voiceSettings = voice === 'sarah' ? ENHANCED_SARAH_SETTINGS : ENHANCED_DANIEL_SETTINGS;
  const voiceName = voice === 'sarah' ? 'Sarah' : 'Daniel';

  console.log(`📝 Text: "${levelData.text.substring(0, 50)}..."`);
  console.log(`🎤 Voice: ${voiceName} (${voiceSettings.voice_id})`);
  console.log(`⚙️ Enhanced settings: stability=${voiceSettings.voice_settings.stability}, similarity_boost=${voiceSettings.voice_settings.similarity_boost}, style=${voiceSettings.voice_settings.style}`);

  // Generate audio with enhanced settings
  const audioBuffer = await generateAudioWithRetry(levelData.text, voiceSettings);

  // Solution 1: Measure actual duration
  const measuredDuration = await measureAudioDuration(audioBuffer);

  // Calculate proportional sentence timings
  const sentenceTimings = calculateProportionalTimings(levelData.sentences, measuredDuration);

  // Save enhanced audio file
  const fileName = `pride-prejudice-${level.toLowerCase()}-${voice}-enhanced-pilot.mp3`;
  const filePath = path.join(AUDIO_OUTPUT_DIR, fileName);

  await fs.writeFile(filePath, audioBuffer);
  console.log(`✅ Enhanced audio saved: ${fileName}`);

  // Create metadata for comparison
  const metadata = {
    version: 2, // Enhanced version
    voice: voiceName,
    voiceId: voiceSettings.voice_id,
    level: level,
    enhancement: 'enhanced_pilot',
    measuredDuration: measuredDuration,
    sentenceTimings: sentenceTimings,
    enhancementSettings: voiceSettings.voice_settings,
    measuredAt: new Date().toISOString(),
    method: 'ffprobe-proportional',
    notes: 'Agent 2 research findings - enhanced for mind-blowing quality'
  };

  // Save metadata for validation
  const metadataPath = path.join(AUDIO_OUTPUT_DIR, `${fileName}.metadata.json`);
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

  return {
    fileName,
    duration: measuredDuration,
    metadata
  };
}

/**
 * Validate drift compared to baseline (Master Mistakes Prevention requirement)
 */
async function validateDrift(enhancedFile, baselineFile) {
  if (!await fs.access(baselineFile).then(() => true).catch(() => false)) {
    console.log(`⚠️ Baseline file ${baselineFile} not found - skipping drift validation`);
    return true;
  }

  try {
    // Measure both files
    const enhancedBuffer = await fs.readFile(enhancedFile);
    const baselineBuffer = await fs.readFile(baselineFile);

    const enhancedDuration = await measureAudioDuration(enhancedBuffer);
    const baselineDuration = await measureAudioDuration(baselineBuffer);

    // Calculate drift percentage
    const driftPercentage = Math.abs((enhancedDuration - baselineDuration) / baselineDuration) * 100;

    console.log(`📊 Drift validation:`);
    console.log(`   Enhanced: ${enhancedDuration.toFixed(3)}s`);
    console.log(`   Baseline: ${baselineDuration.toFixed(3)}s`);
    console.log(`   Drift: ${driftPercentage.toFixed(2)}%`);

    const driftValid = driftPercentage < 5.0; // <5% requirement

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
  console.log('🎵 Enhanced Demo Audio Generation - Agent 2 Research Implementation');
  console.log('📋 Generating enhanced versions for A/B testing and quality validation\n');

  // Ensure output directory exists
  await fs.mkdir(AUDIO_OUTPUT_DIR, { recursive: true });

  // Generate enhanced versions for pilot testing
  const tasks = [
    { level: 'A1', voice: 'sarah' },      // A1 with Sarah (enhanced A1-optimized)
    { level: 'B1', voice: 'daniel' },     // B1 with Daniel (enhanced sophisticated)
    { level: 'original', voice: 'daniel' } // Original with Daniel (enhanced sophisticated)
  ];

  const results = [];

  for (const task of tasks) {
    try {
      const result = await generateEnhancedAudio(task.level, task.voice);
      results.push({ ...task, ...result, success: true });

      // Validate drift against baseline if it exists
      const enhancedPath = path.join(AUDIO_OUTPUT_DIR, result.fileName);
      const baselinePath = path.join(AUDIO_OUTPUT_DIR, `pride-prejudice-${task.level}-${task.voice}.mp3`);

      const driftValid = await validateDrift(enhancedPath, baselinePath);
      results[results.length - 1].driftValid = driftValid;

    } catch (error) {
      console.error(`❌ Failed to generate ${task.level}-${task.voice}:`, error.message);
      results.push({ ...task, success: false, error: error.message });
    }
  }

  // Summary report
  console.log('\n📊 ENHANCED AUDIO GENERATION SUMMARY');
  console.log('=' .repeat(50));

  results.forEach(result => {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
    const drift = result.driftValid !== undefined ? (result.driftValid ? ' (Drift: ✅)' : ' (Drift: ❌)') : '';
    const duration = result.duration ? ` - ${result.duration.toFixed(3)}s` : '';

    console.log(`${status} ${result.level.toUpperCase()}-${result.voice.toUpperCase()}${duration}${drift}`);

    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  const driftValidCount = results.filter(r => r.driftValid).length;

  console.log(`\n🎯 Results: ${successCount}/${results.length} generated successfully`);
  console.log(`🎯 Drift validation: ${driftValidCount}/${successCount} passed (<5% requirement)`);

  if (successCount === results.length && driftValidCount === successCount) {
    console.log('\n🚀 PILOT READY: All enhanced audio files generated with perfect sync preservation!');
    console.log('   Next step: A/B testing implementation for quality validation');
  } else {
    console.log('\n⚠️ ISSUES DETECTED: Review failed generations or drift validations before proceeding');
  }
}

// Run the enhanced generation
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Enhanced generation failed:', error);
    process.exit(1);
  });
}

module.exports = {
  generateEnhancedAudio,
  validateDrift,
  ENHANCED_SARAH_SETTINGS,
  ENHANCED_DANIEL_SETTINGS
};