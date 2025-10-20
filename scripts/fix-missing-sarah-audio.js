#!/usr/bin/env node

/**
 * Fix Missing Sarah Audio Files for Hero Demo
 * Regenerates only A1 and Original Sarah audio files
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Sarah voice settings (proven M1 baseline)
const SARAH_VOICE_SETTINGS = {
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

// Demo content paths
const DEMO_CONTENT_PATH = path.join(process.cwd(), 'data/demo/pride-prejudice-demo-9sentences.json');
const AUDIO_OUTPUT_DIR = path.join(process.cwd(), 'public/audio/demo');

/**
 * Measure audio duration using ffprobe
 */
async function measureAudioDuration(audioFilePath) {
  try {
    console.log(`📏 Measuring duration: ${path.basename(audioFilePath)}`);
    const { stdout } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioFilePath}"`
    );
    const duration = parseFloat(stdout.trim());
    console.log(`✅ Measured duration: ${duration.toFixed(3)}s`);
    return duration;
  } catch (error) {
    console.error(`❌ Failed to measure audio duration: ${error.message}`);
    throw error;
  }
}

/**
 * Calculate proportional word timings from measured duration
 */
function calculateProportionalTimings(sentences, totalDuration) {
  console.log(`⏱️  Calculating proportional timings for ${totalDuration.toFixed(3)}s`);

  const totalText = sentences.map(s => s.text).join(' ');
  const totalChars = totalText.length;

  const wordTimings = {};
  let currentTime = 0;

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
  });

  console.log(`✅ Generated ${Object.keys(wordTimings).length} word timings`);
  return wordTimings;
}

/**
 * Generate audio using ElevenLabs API
 */
async function generateAudio(text, level) {
  console.log(`🎤 Generating ${level} audio with Sarah voice...`);

  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) {
    throw new Error('ELEVENLABS_API_KEY environment variable is required');
  }

  const requestBody = {
    text: text.trim(),
    model_id: SARAH_VOICE_SETTINGS.model_id,
    voice_settings: SARAH_VOICE_SETTINGS.voice_settings,
    output_format: SARAH_VOICE_SETTINGS.output_format,
    apply_text_normalization: SARAH_VOICE_SETTINGS.apply_text_normalization
  };

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${SARAH_VOICE_SETTINGS.voice_id}`,
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
    console.log(`✅ Generated ${level} Sarah audio: ${audioBuffer.length} bytes`);
    return audioBuffer;

  } catch (error) {
    console.error(`❌ Audio generation failed for ${level} Sarah:`, error.message);
    throw error;
  }
}

/**
 * Save audio file and return file info
 */
async function saveAudioFile(audioBuffer, level) {
  await fs.mkdir(AUDIO_OUTPUT_DIR, { recursive: true });

  const filename = `pride-prejudice-${level.toLowerCase()}-sarah.mp3`;
  const filePath = path.join(AUDIO_OUTPUT_DIR, filename);

  await fs.writeFile(filePath, audioBuffer);
  console.log(`💾 Saved: ${filePath}`);

  return {
    level,
    filename,
    filePath,
    size: audioBuffer.length
  };
}

/**
 * Update demo content with audio metadata
 */
async function updateDemoContent(audioFiles, allTimings) {
  console.log('📝 Updating demo content with Sarah audio metadata...');

  const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));

  // Add audio metadata for Sarah voice
  audioFiles.forEach(audioFile => {
    const level = audioFile.level;
    if (demoContent.levels[level]) {
      // Update existing audio metadata
      if (!demoContent.levels[level].audio) {
        demoContent.levels[level].audio = {};
      }

      demoContent.levels[level].audio = {
        ...demoContent.levels[level].audio,
        url: `/audio/demo/${audioFile.filename}`,
        filename: audioFile.filename,
        duration: audioFile.measuredDuration,
        size: audioFile.size,
        generatedAt: new Date().toISOString(),
        voice: SARAH_VOICE_SETTINGS.voice_id,
        settings: SARAH_VOICE_SETTINGS
      };

      // Add word timings for Sarah voice
      if (allTimings[level]) {
        demoContent.levels[level].wordTimings = allTimings[level];
      }
    }
  });

  // Save updated content
  await fs.writeFile(
    DEMO_CONTENT_PATH,
    JSON.stringify(demoContent, null, 2),
    'utf8'
  );

  console.log('✅ Demo content updated with Sarah audio metadata');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🎯 Fixing Missing Sarah Audio Files for Hero Demo');
  console.log('📋 Regenerating A1 and Original Sarah audio only');
  console.log('');

  try {
    // Load demo content
    console.log('📖 Loading demo content...');
    const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));

    const targetLevels = ['A1', 'original']; // Only missing levels
    const audioFiles = [];
    const allTimings = {};

    // Generate audio for missing Sarah files only
    for (const level of targetLevels) {
      console.log(`\n🔄 Processing ${level} level for Sarah voice...`);

      const levelData = demoContent.levels[level];
      if (!levelData || !levelData.sentences) {
        throw new Error(`Missing ${level} level data or sentences`);
      }

      // Combine sentences into single text
      const text = levelData.sentences.map(s => s.text).join(' ');
      console.log(`📝 Text (${text.length} chars): ${text.substring(0, 100)}...`);

      // Generate Sarah audio
      const audioBuffer = await generateAudio(text, level);

      // Save audio file
      const audioFile = await saveAudioFile(audioBuffer, level);

      // Measure duration
      const measuredDuration = await measureAudioDuration(audioFile.filePath);
      audioFile.measuredDuration = measuredDuration;

      // Calculate proportional timings
      const wordTimings = calculateProportionalTimings(levelData.sentences, measuredDuration);
      allTimings[level] = wordTimings;

      audioFiles.push(audioFile);

      console.log(`✅ Completed ${level} Sarah: ${measuredDuration.toFixed(3)}s, ${audioFile.size} bytes`);
    }

    // Update demo content with metadata
    await updateDemoContent(audioFiles, allTimings);

    console.log('\n🎉 Missing Sarah Audio Files Fixed!');
    console.log('');
    console.log('📊 Summary:');
    audioFiles.forEach(file => {
      console.log(`  ${file.level}: ${file.filename} (${file.measuredDuration.toFixed(3)}s, ${file.size} bytes)`);
    });
    console.log('');
    console.log('🔗 Next Steps:');
    console.log('  1. Commit and deploy the fixed audio files');
    console.log('  2. Test A1 and Original Sarah audio in demo');
    console.log('');

  } catch (error) {
    console.error('\n❌ Audio fix failed:', error.message);
    console.error('🔧 Troubleshooting:');
    console.error('  1. Check ELEVENLABS_API_KEY environment variable');
    console.error('  2. Verify ffmpeg is installed: brew install ffmpeg');
    console.error('  3. Check demo content file exists and is valid JSON');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}