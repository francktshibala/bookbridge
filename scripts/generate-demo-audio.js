#!/usr/bin/env node

/**
 * Hero Demo Audio Generation Script
 *
 * Generates audio for Pride & Prejudice demo using proven M1 Sarah settings
 * Implements Solution 1: ffprobe measurement + proportional timing + cache
 *
 * CRITICAL: Uses only validated settings from M1 project
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// M1 PROVEN SETTINGS - NEVER CHANGE (Perfect Sync Validated)
const BASELINE_VOICE_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah - M1 validated
  model_id: 'eleven_monolingual_v1',    // CRITICAL: timing-stable model
  voice_settings: {
    stability: 0.5,                      // M1 proven settings
    similarity_boost: 0.75,              // M1 proven settings
    style: 0.0,                          // M1 proven settings (no style changes)
    use_speaker_boost: true
  },
  speed: 0.90,                           // M1 validated speed for A1-friendly pace
  output_format: 'mp3_44100_128',        // Standard quality for demo
  apply_text_normalization: 'auto'
};

// DANIEL VOICE SETTINGS - M1 Proven Winner for A/B Testing
const DANIEL_VOICE_SETTINGS = {
  voice_id: 'onwK4e9ZLuTAKqWW03F9', // Daniel - M1 proven winner
  model_id: 'eleven_monolingual_v1',    // Same stable model
  voice_settings: {
    stability: 0.5,                      // M1 validated settings
    similarity_boost: 0.75,              // M1 validated settings
    style: 0.0,                          // M1 validated settings
    use_speaker_boost: true
  },
  speed: 0.90,                           // Same speed for consistency
  output_format: 'mp3_44100_128',        // Same quality
  apply_text_normalization: 'auto'
};

// Demo content paths
const DEMO_CONTENT_PATH = path.join(process.cwd(), 'data/demo/pride-prejudice-demo-9sentences.json');
const AUDIO_OUTPUT_DIR = path.join(process.cwd(), 'public/audio/demo');
const CDN_PATH_PREFIX = 'pride-prejudice-demo'; // Demo-specific CDN path

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
 * Calculate proportional word timings from measured duration
 * @param {Array} sentences - Array of sentence objects with words
 * @param {number} totalDuration - Total measured audio duration
 * @returns {Object} Word timings object
 */
function calculateProportionalTimings(sentences, totalDuration) {
  console.log(`⏱️  Calculating proportional timings for ${totalDuration.toFixed(3)}s`);

  // Count total characters for proportional distribution
  const totalText = sentences.map(s => s.text).join(' ');
  const totalChars = totalText.length;

  const wordTimings = {};
  let currentTime = 0;
  let sentenceIndex = 0;

  sentences.forEach((sentence, sIdx) => {
    const words = sentence.text.split(/\s+/).filter(word => word.length > 0);
    const sentenceChars = sentence.text.length;
    const sentenceDuration = (sentenceChars / totalChars) * totalDuration;

    words.forEach((word, wIdx) => {
      const wordChars = word.length;
      const wordDuration = (wordChars / sentenceChars) * sentenceDuration;

      const wordKey = `sentence_${sIdx}_word_${wIdx}`;
      wordTimings[wordKey] = {
        word: word.replace(/[^\w]/g, ''), // Clean word
        start: currentTime,
        end: currentTime + wordDuration,
        duration: wordDuration,
        sentence: sIdx,
        wordIndex: wIdx
      };

      currentTime += wordDuration;
    });

    sentenceIndex++;
  });

  console.log(`✅ Generated ${Object.keys(wordTimings).length} word timings`);
  return wordTimings;
}

/**
 * Generate audio using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {string} level - CEFR level (A1, B1, original)
 * @param {Object} voiceSettings - Voice settings to use (BASELINE or DANIEL)
 * @param {string} voiceName - Voice name for logging
 * @returns {Promise<Buffer>} Audio buffer
 */
async function generateAudio(text, level, voiceSettings = BASELINE_VOICE_SETTINGS, voiceName = 'Sarah') {
  console.log(`🎤 Generating ${level} audio with ${voiceName} voice...`);

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
    console.log(`✅ Generated ${level} ${voiceName} audio: ${audioBuffer.length} bytes`);
    return audioBuffer;

  } catch (error) {
    console.error(`❌ Audio generation failed for ${level} ${voiceName}:`, error.message);
    throw error;
  }
}

/**
 * Save audio file and return file info
 * @param {Buffer} audioBuffer - Audio data
 * @param {string} level - CEFR level
 * @param {string} voiceName - Voice name (Sarah/Daniel)
 * @returns {Promise<Object>} File info with path and CDN URL
 */
async function saveAudioFile(audioBuffer, level, voiceName = 'sarah') {
  await fs.mkdir(AUDIO_OUTPUT_DIR, { recursive: true });

  const filename = `pride-prejudice-${level.toLowerCase()}-${voiceName.toLowerCase()}.mp3`;
  const filePath = path.join(AUDIO_OUTPUT_DIR, filename);
  const cdnUrl = `/audio/demo/${filename}`;

  await fs.writeFile(filePath, audioBuffer);
  console.log(`💾 Saved: ${filePath}`);

  return {
    level,
    voiceName,
    filename,
    filePath,
    cdnUrl,
    size: audioBuffer.length
  };
}

/**
 * Update demo content with audio metadata
 * @param {Object} demoContent - Original demo content
 * @param {Array} audioFiles - Generated audio file info
 * @param {Object} allTimings - Word timings for all levels
 * @returns {Promise<void>}
 */
async function updateDemoContent(demoContent, audioFiles, allTimings) {
  console.log('📝 Updating demo content with audio metadata...');

  // Add audio metadata to each level
  audioFiles.forEach(audioFile => {
    const level = audioFile.level;
    if (demoContent.levels[level]) {
      demoContent.levels[level].audio = {
        url: audioFile.cdnUrl,
        filename: audioFile.filename,
        duration: audioFile.measuredDuration,
        size: audioFile.size,
        generatedAt: new Date().toISOString(),
        voice: BASELINE_VOICE_SETTINGS.voice_id,
        settings: BASELINE_VOICE_SETTINGS
      };

      // Add word timings
      demoContent.levels[level].wordTimings = allTimings[level] || {};
    }
  });

  // Update metadata
  demoContent.metadata = {
    ...demoContent.metadata,
    audioGenerated: true,
    generatedAt: new Date().toISOString(),
    voice: 'Sarah',
    baseline: BASELINE_VOICE_SETTINGS,
    method: 'ffprobe-proportional',
    version: 1
  };

  // Save updated content
  await fs.writeFile(
    DEMO_CONTENT_PATH,
    JSON.stringify(demoContent, null, 2),
    'utf8'
  );

  console.log('✅ Demo content updated with audio metadata');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🎯 Starting Hero Demo Audio Generation');
  console.log('📋 Using M1 Validated Sarah Settings (Perfect Sync)');
  console.log('🔧 Method: Solution 1 (ffprobe + proportional timing + cache)');
  console.log('');

  try {
    // Load demo content
    console.log('📖 Loading demo content...');
    const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));

    const levels = ['A1', 'B1', 'original'];
    const voices = [
      { settings: BASELINE_VOICE_SETTINGS, name: 'Sarah' },
      { settings: DANIEL_VOICE_SETTINGS, name: 'Daniel' }
    ];
    const audioFiles = [];
    const allTimings = {};

    // Generate audio for each level and voice combination
    for (const level of levels) {
      console.log(`\n🔄 Processing ${level} level...`);

      const levelData = demoContent.levels[level];
      if (!levelData || !levelData.sentences) {
        throw new Error(`Missing ${level} level data or sentences`);
      }

      // Combine sentences into single text
      const text = levelData.sentences.map(s => s.text).join(' ');
      console.log(`📝 Text (${text.length} chars): ${text.substring(0, 100)}...`);

      for (const voice of voices) {
        console.log(`\n🎙️  Generating ${voice.name} voice for ${level} level...`);

        // Generate audio
        const audioBuffer = await generateAudio(text, level, voice.settings, voice.name);

        // Save audio file
        const audioFile = await saveAudioFile(audioBuffer, level, voice.name);

        // Measure duration (Solution 1)
        const measuredDuration = await measureAudioDuration(audioFile.filePath);
        audioFile.measuredDuration = measuredDuration;

        // Calculate proportional timings (only for baseline Sarah for now)
        if (voice.name === 'Sarah') {
          const wordTimings = calculateProportionalTimings(levelData.sentences, measuredDuration);
          allTimings[level] = wordTimings;
        }

        audioFiles.push(audioFile);

        console.log(`✅ Completed ${level} ${voice.name}: ${measuredDuration.toFixed(3)}s, ${audioFile.size} bytes`);
      }
    }

    // Update demo content with metadata
    await updateDemoContent(demoContent, audioFiles, allTimings);

    console.log('\n🎉 Hero Demo Audio Generation Complete!');
    console.log('');
    console.log('📊 Summary:');
    audioFiles.forEach(file => {
      console.log(`  ${file.level}: ${file.filename} (${file.measuredDuration.toFixed(3)}s, ${file.size} bytes)`);
    });
    console.log('');
    console.log('🔗 Next Steps:');
    console.log('  1. Test audio playback in demo component');
    console.log('  2. Verify word-level highlighting synchronization');
    console.log('  3. Test level switching functionality');
    console.log('');

  } catch (error) {
    console.error('\n❌ Audio generation failed:', error.message);
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
  generateAudio,
  measureAudioDuration,
  calculateProportionalTimings,
  BASELINE_VOICE_SETTINGS
};