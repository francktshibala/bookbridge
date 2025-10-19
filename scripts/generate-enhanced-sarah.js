#!/usr/bin/env node

/**
 * Enhanced Sarah Audio Generation Script
 *
 * Generates enhanced Sarah audio files using GPT-5 refined settings
 * Implements post-processing enhancement with EQ, compression, de-esser
 *
 * CRITICAL: Uses validated enhanced settings with <5% drift
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// SARAH ENHANCED SETTINGS (GPT-5 Range - Quality Track)
const SARAH_ENHANCED_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah - M1 proven winner
  model_id: 'eleven_monolingual_v1',    // Same stable model
  voice_settings: {
    stability: 0.45,                     // GPT-5 range: 0.45-0.55 (enhanced clarity)
    similarity_boost: 0.8,               // GPT-5 range: 0.8-0.9 (enhanced presence)
    style: 0.1,                          // GPT-5 max: ≤0.15 (subtle style)
    use_speaker_boost: true
  },
  speed: 0.90,                           // Same speed for consistency
  output_format: 'mp3_44100_128',        // Same quality
  apply_text_normalization: 'auto'
};

// Demo content paths
const DEMO_CONTENT_PATH = path.join(process.cwd(), 'public/data/demo/pride-prejudice-demo.json');
const AUDIO_OUTPUT_DIR = path.join(process.cwd(), 'public/audio/demo');

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
 * Generate enhanced audio using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {string} level - CEFR level (B1)
 * @returns {Promise<Buffer>} Audio buffer
 */
async function generateEnhancedAudio(text, level) {
  console.log(`🎤 Generating enhanced ${level} Sarah audio...`);

  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) {
    throw new Error('ELEVENLABS_API_KEY environment variable is required');
  }

  const requestBody = {
    text: text.trim(),
    model_id: SARAH_ENHANCED_SETTINGS.model_id,
    voice_settings: SARAH_ENHANCED_SETTINGS.voice_settings,
    output_format: SARAH_ENHANCED_SETTINGS.output_format,
    apply_text_normalization: SARAH_ENHANCED_SETTINGS.apply_text_normalization
  };

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${SARAH_ENHANCED_SETTINGS.voice_id}`,
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
    console.log(`✅ Generated enhanced ${level} Sarah audio: ${audioBuffer.length} bytes`);
    return audioBuffer;

  } catch (error) {
    console.error(`❌ Enhanced audio generation failed for ${level}:`, error.message);
    throw error;
  }
}

/**
 * Apply post-processing enhancement using ffmpeg
 * @param {string} inputPath - Input audio file path
 * @param {string} outputPath - Output audio file path
 * @returns {Promise<void>}
 */
async function applyPostProcessing(inputPath, outputPath) {
  console.log(`🎨 Applying post-processing enhancement...`);

  // Post-processing enhancement optimized for female voice (zero timing risk)
  const ffmpegCommand = [
    'ffmpeg -y',
    `-i "${inputPath}"`,
    '-af',
    '"' + [
      // EQ Enhancement tuned for Sarah's voice (warmth, presence, air)
      'equalizer=f=150:width_type=h:width=2:g=1.2',      // Low shelf (warmth for female voice)
      'equalizer=f=2800:width_type=h:width=2:g=1.8',     // Presence boost (clarity for female voice)
      'equalizer=f=10000:width_type=h:width=2:g=1.2',    // Air boost (brightness for female voice)
      // Dynamics Processing
      'compand=attacks=0.08:decays=0.25:points=-90/-90|-18/-12|-8/-4|0/-1.5', // Gentle compression (faster for female voice)
      'highpass=f=85',                                    // Remove rumble (higher for female voice)
      'lowpass=f=14000'                                   // Remove harsh highs (lower for female voice)
    ].join(',') + '"',
    '-c:a libmp3lame',
    '-b:a 128k',
    '-ar 44100',
    `"${outputPath}"`
  ].join(' ');

  try {
    await execAsync(ffmpegCommand);
    console.log(`✅ Post-processing complete: ${path.basename(outputPath)}`);
  } catch (error) {
    console.error(`❌ Post-processing failed:`, error.message);
    throw error;
  }
}

/**
 * Save enhanced audio file
 * @param {Buffer} audioBuffer - Audio data
 * @param {string} level - CEFR level
 * @returns {Promise<Object>} File info with path
 */
async function saveEnhancedAudioFile(audioBuffer, level) {
  await fs.mkdir(AUDIO_OUTPUT_DIR, { recursive: true });

  // Temporary file for post-processing
  const tempFilename = `pride-prejudice-${level.toLowerCase()}-sarah-temp.mp3`;
  const tempFilePath = path.join(AUDIO_OUTPUT_DIR, tempFilename);

  // Final enhanced file
  const enhancedFilename = `pride-prejudice-${level.toLowerCase()}-sarah-enhanced.mp3`;
  const enhancedFilePath = path.join(AUDIO_OUTPUT_DIR, enhancedFilename);

  // Save temporary file
  await fs.writeFile(tempFilePath, audioBuffer);
  console.log(`💾 Saved temp file: ${tempFilePath}`);

  // Apply post-processing
  await applyPostProcessing(tempFilePath, enhancedFilePath);

  // Remove temporary file
  await fs.unlink(tempFilePath);

  return {
    level,
    filename: enhancedFilename,
    filePath: enhancedFilePath,
    size: audioBuffer.length
  };
}

/**
 * Calculate drift between baseline and enhanced audio
 * @param {string} baselineFile - Path to baseline audio file
 * @param {string} enhancedFile - Path to enhanced audio file
 * @returns {Promise<number>} Drift percentage
 */
async function calculateDrift(baselineFile, enhancedFile) {
  const baselineDuration = await measureAudioDuration(baselineFile);
  const enhancedDuration = await measureAudioDuration(enhancedFile);

  const drift = Math.abs((enhancedDuration - baselineDuration) / baselineDuration) * 100;
  console.log(`📊 Drift: ${drift.toFixed(2)}% (${enhancedDuration.toFixed(3)}s vs ${baselineDuration.toFixed(3)}s)`);

  return drift;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🎯 Starting Enhanced Sarah Audio Generation');
  console.log('📋 Using GPT-5 Enhanced Settings (stability: 0.45, similarity: 0.8, style: 0.1)');
  console.log('🎨 Method: Enhanced generation + female-voice-optimized post-processing');
  console.log('');

  try {
    // Load demo content
    console.log('📖 Loading demo content...');
    const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));

    // Only generate for Sarah voice level (B1)
    const sarahLevel = 'B1';
    console.log(`\\n🔄 Processing ${sarahLevel} level...`);

    const levelData = demoContent.levels[sarahLevel];
    if (!levelData || !levelData.sentences) {
      throw new Error(`Missing ${sarahLevel} level data or sentences`);
    }

    // Combine sentences into single text
    const text = levelData.sentences.map(s => s.text).join(' ');
    console.log(`📝 Text (${text.length} chars): ${text.substring(0, 100)}...`);

    // Generate enhanced audio
    const audioBuffer = await generateEnhancedAudio(text, sarahLevel);

    // Save with post-processing
    const enhancedInfo = await saveEnhancedAudioFile(audioBuffer, sarahLevel);

    // Validate drift against baseline
    const baselineFile = path.join(AUDIO_OUTPUT_DIR, `pride-prejudice-${sarahLevel.toLowerCase()}-sarah.mp3`);
    let drift = 0;
    try {
      drift = await calculateDrift(baselineFile, enhancedInfo.filePath);

      if (drift > 5) {
        console.log(`⚠️  Warning: ${sarahLevel} drift (${drift.toFixed(2)}%) exceeds 5% threshold`);
      } else {
        console.log(`✅ ${sarahLevel} drift validation passed (${drift.toFixed(2)}% < 5%)`);
      }
    } catch (error) {
      console.log(`⚠️  Could not validate drift for ${sarahLevel}: ${error.message}`);
    }

    console.log(`✅ Completed enhanced ${sarahLevel}: ${enhancedInfo.filename}`);

    console.log('\\n🎉 Enhanced Sarah Audio Generation Complete!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`  ${enhancedInfo.level}: ${enhancedInfo.filename}`);

    if (drift > 0) {
      console.log('');
      console.log('📈 Drift Validation:');
      console.log(`  ${sarahLevel}: ${drift.toFixed(2)}% drift`);
    }

    console.log('');
    console.log('🔗 Next Steps:');
    console.log('  1. Update demo component to use enhanced Sarah files');
    console.log('  2. Test A/B comparison between baseline and enhanced Sarah audio');
    console.log('  3. Verify sentence highlighting sync is maintained');
    console.log('  4. Listen for improved female voice quality (warmth, presence, clarity)');
    console.log('');

  } catch (error) {
    console.error('\\n❌ Enhanced Sarah audio generation failed:', error.message);
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
  generateEnhancedAudio,
  measureAudioDuration,
  applyPostProcessing,
  SARAH_ENHANCED_SETTINGS
};