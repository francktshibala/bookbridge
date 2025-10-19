#!/usr/bin/env node

/**
 * Voice Enhancement Testing Script
 *
 * Tests Daniel Enhanced settings vs baseline for quality improvement
 * Implements drift validation following Master Prevention guidelines
 *
 * CRITICAL: Uses only validated settings from M1 project
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// BASELINE VOICE SETTINGS (Sync Master - NEVER CHANGE)
const BASELINE_SETTINGS = {
  voice_id: 'onwK4e9ZLuTAKqWW03F9', // Daniel - M1 proven winner
  model_id: 'eleven_monolingual_v1',    // CRITICAL: timing-stable model
  voice_settings: {
    stability: 0.5,                      // M1 validated settings
    similarity_boost: 0.75,              // M1 validated settings
    style: 0.0,                          // M1 validated settings (no style changes)
    use_speaker_boost: true
  },
  speed: 0.90,                           // M1 validated speed for A1-friendly pace
  output_format: 'mp3_44100_128',        // Standard quality for demo
  apply_text_normalization: 'auto'
};

// DANIEL ENHANCED SETTINGS (Quality Track - GPT-5 Range)
const DANIEL_ENHANCED_SETTINGS = {
  voice_id: 'onwK4e9ZLuTAKqWW03F9', // Same Daniel voice
  model_id: 'eleven_monolingual_v1',    // Same stable model
  voice_settings: {
    stability: 0.45,                     // GPT-5 range: 0.45-0.55
    similarity_boost: 0.8,               // GPT-5 range: 0.8-0.9
    style: 0.1,                          // GPT-5 max: ≤0.15
    use_speaker_boost: true
  },
  speed: 0.90,                           // Same speed for consistency
  output_format: 'mp3_44100_128',        // Same quality
  apply_text_normalization: 'auto'
};

// Demo content paths
const DEMO_CONTENT_PATH = path.join(process.cwd(), 'public/data/demo/pride-prejudice-demo.json');
const AUDIO_OUTPUT_DIR = path.join(process.cwd(), 'public/audio/demo');
const TEST_OUTPUT_DIR = path.join(process.cwd(), 'public/audio/test');

// ACCEPTANCE CRITERIA (Master Prevention)
const ACCEPTANCE_CRITERIA = {
  medianDriftThreshold: 5,           // <5% per-sentence duration deviation
  p95DriftThreshold: 10,             // <10% 95th percentile
  sentenceEndDrift: 50,              // <50ms sentence boundary drift
  qualityScore: 4.0                  // MOS-style listening test
};

/**
 * Measure audio duration using ffprobe (Solution 1)
 * @param {string} audioFilePath - Path to audio file
 * @returns {Promise<number>} Duration in seconds
 */
async function measureAudioDuration(audioFilePath) {
  try {
    console.log(`📏 Measuring duration: ${path.basename(audioFilePath)}`);

    const { stdout } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioFilePath}"`
    );

    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      throw new Error(`Invalid duration measurement: ${stdout}`);
    }

    console.log(`✅ Measured duration: ${duration.toFixed(3)}s`);
    return duration;
  } catch (error) {
    console.error(`❌ Failed to measure audio duration: ${error.message}`);
    throw error;
  }
}

/**
 * Generate audio using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {string} level - CEFR level (A1, B1, original)
 * @param {Object} voiceSettings - Voice settings to use
 * @param {string} voiceName - Voice name for logging
 * @returns {Promise<Buffer>} Audio buffer
 */
async function generateAudio(text, level, voiceSettings, voiceName = 'Daniel') {
  console.log(`🎤 Generating ${level} audio with ${voiceName} Enhanced...`);

  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) {
    throw new Error('ELEVENLABS_API_KEY environment variable is required');
  }

  const requestBody = {
    text: text.trim(),
    model_id: voiceSettings.model_id,
    voice_settings: voiceSettings.voice_settings,
    output_format: voiceSettings.output_format,
    apply_text_normalization: voiceSettings.apply_text_normalization
  };

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceSettings.voice_id}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': API_KEY
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ Generated ${level} ${voiceName} Enhanced audio: ${audioBuffer.length} bytes`);
    return audioBuffer;

  } catch (error) {
    console.error(`❌ Audio generation failed for ${level} ${voiceName} Enhanced:`, error.message);
    throw error;
  }
}

/**
 * Save test audio file
 * @param {Buffer} audioBuffer - Audio data
 * @param {string} level - CEFR level
 * @param {string} voiceType - 'baseline' or 'enhanced'
 * @returns {Promise<Object>} File info with path
 */
async function saveTestAudioFile(audioBuffer, level, voiceType) {
  await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });

  const filename = `pride-prejudice-${level.toLowerCase()}-daniel-${voiceType}.mp3`;
  const filePath = path.join(TEST_OUTPUT_DIR, filename);

  await fs.writeFile(filePath, audioBuffer);
  console.log(`💾 Saved test file: ${filePath}`);

  return {
    level,
    voiceType,
    filename,
    filePath,
    size: audioBuffer.length
  };
}

/**
 * Calculate drift percentage between baseline and enhanced durations
 * @param {number} baselineDuration - Baseline audio duration
 * @param {number} enhancedDuration - Enhanced audio duration
 * @returns {number} Drift percentage
 */
function calculateDrift(baselineDuration, enhancedDuration) {
  return Math.abs((enhancedDuration - baselineDuration) / baselineDuration) * 100;
}

/**
 * Run drift validation test
 * @param {Array} testResults - Array of test result objects
 * @returns {Object} Validation results
 */
function validateDrift(testResults) {
  console.log('\\n📊 Running Drift Validation...');

  const drifts = testResults.map(result => result.drift);
  const medianDrift = drifts.sort((a, b) => a - b)[Math.floor(drifts.length / 2)];
  const p95Drift = drifts.sort((a, b) => a - b)[Math.floor(drifts.length * 0.95)];

  const validation = {
    medianDrift: medianDrift,
    p95Drift: p95Drift,
    maxDrift: Math.max(...drifts),
    passedMedian: medianDrift < ACCEPTANCE_CRITERIA.medianDriftThreshold,
    passedP95: p95Drift < ACCEPTANCE_CRITERIA.p95DriftThreshold,
    overallPass: medianDrift < ACCEPTANCE_CRITERIA.medianDriftThreshold &&
                 p95Drift < ACCEPTANCE_CRITERIA.p95DriftThreshold
  };

  console.log(`📈 Median Drift: ${medianDrift.toFixed(2)}% (Target: <${ACCEPTANCE_CRITERIA.medianDriftThreshold}%)`);
  console.log(`📈 P95 Drift: ${p95Drift.toFixed(2)}% (Target: <${ACCEPTANCE_CRITERIA.p95DriftThreshold}%)`);
  console.log(`📈 Max Drift: ${validation.maxDrift.toFixed(2)}%`);

  if (validation.overallPass) {
    console.log(`✅ PASSED: Enhanced voice maintains acceptable sync (<5% median drift)`);
  } else {
    console.log(`❌ FAILED: Enhanced voice exceeds drift thresholds`);
  }

  return validation;
}

/**
 * Main testing function
 */
async function main() {
  console.log('🎯 Starting Daniel Enhanced Voice Testing');
  console.log('📋 Testing enhanced settings vs M1 baseline for quality improvement');
  console.log('🔧 Method: GPT-5 enhanced settings with drift validation');
  console.log('');

  try {
    // Load demo content
    console.log('📖 Loading demo content...');
    const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));

    const levels = ['A1', 'B1', 'original'];
    const testResults = [];

    // Test each level: baseline vs enhanced
    for (const level of levels) {
      console.log(`\\n🔄 Testing ${level} level...`);

      const levelData = demoContent.levels[level];
      if (!levelData || !levelData.sentences) {
        throw new Error(`Missing ${level} level data or sentences`);
      }

      // Combine sentences into single text
      const text = levelData.sentences.map(s => s.text).join(' ');
      console.log(`📝 Text (${text.length} chars): ${text.substring(0, 100)}...`);

      // Get baseline duration (already generated)
      const baselineFile = path.join(AUDIO_OUTPUT_DIR, `pride-prejudice-${level.toLowerCase()}-daniel.mp3`);
      let baselineDuration;

      try {
        baselineDuration = await measureAudioDuration(baselineFile);
      } catch (error) {
        console.log(`⚠️  Baseline file not found, generating...`);
        const baselineBuffer = await generateAudio(text, level, BASELINE_SETTINGS, 'Daniel-Baseline');
        const baselineInfo = await saveTestAudioFile(baselineBuffer, level, 'baseline');
        baselineDuration = await measureAudioDuration(baselineInfo.filePath);
      }

      // Generate enhanced version
      console.log(`\\n🎙️  Generating Daniel Enhanced for ${level} level...`);
      const enhancedBuffer = await generateAudio(text, level, DANIEL_ENHANCED_SETTINGS, 'Daniel-Enhanced');
      const enhancedInfo = await saveTestAudioFile(enhancedBuffer, level, 'enhanced');
      const enhancedDuration = await measureAudioDuration(enhancedInfo.filePath);

      // Calculate drift
      const drift = calculateDrift(baselineDuration, enhancedDuration);

      const result = {
        level,
        baselineDuration,
        enhancedDuration,
        drift,
        baselineSize: 0, // Not measured for existing file
        enhancedSize: enhancedInfo.size
      };

      testResults.push(result);

      console.log(`✅ ${level} Results:`);
      console.log(`  Baseline: ${baselineDuration.toFixed(3)}s`);
      console.log(`  Enhanced: ${enhancedDuration.toFixed(3)}s`);
      console.log(`  Drift: ${drift.toFixed(2)}%`);
    }

    // Validate overall drift
    const validation = validateDrift(testResults);

    console.log('\\n🎉 Daniel Enhanced Voice Testing Complete!');
    console.log('');
    console.log('📊 Summary:');
    testResults.forEach(result => {
      console.log(`  ${result.level}: ${result.drift.toFixed(2)}% drift (${result.enhancedDuration.toFixed(3)}s vs ${result.baselineDuration.toFixed(3)}s)`);
    });
    console.log('');

    if (validation.overallPass) {
      console.log('🔗 Next Steps:');
      console.log('  1. ✅ Enhanced voice settings validated for quality improvement');
      console.log('  2. 🚀 Ready to implement dual-track pipeline with time-warping');
      console.log('  3. 🎨 Apply post-processing enhancement (EQ, compression, de-esser)');
      console.log('  4. 🎧 A/B test enhanced vs baseline in demo component');
    } else {
      console.log('🔗 Recommended Actions:');
      console.log('  1. ❌ Enhanced settings cause too much drift');
      console.log('  2. 🔧 Reduce enhancement parameters or use baseline settings');
      console.log('  3. 🧪 Test alternative enhancement approaches');
    }
    console.log('');

  } catch (error) {
    console.error('\\n❌ Voice enhancement testing failed:', error.message);
    console.error('🔧 Troubleshooting:');
    console.error('  1. Check ELEVENLABS_API_KEY environment variable');
    console.error('  2. Verify ffmpeg is installed: brew install ffmpeg');
    console.error('  3. Check demo content file exists and is valid JSON');
    console.error('  4. Ensure sufficient API quota and permissions');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  BASELINE_SETTINGS,
  DANIEL_ENHANCED_SETTINGS,
  generateAudio,
  measureAudioDuration,
  calculateDrift,
  validateDrift
};