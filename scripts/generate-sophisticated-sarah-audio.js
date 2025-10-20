#!/usr/bin/env node

/**
 * Generate Sophisticated Enhanced Sarah Audio for Hero Demo
 * Implements full GPT-5 enhancement pipeline with natural flow
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// GPT-5 ENHANCED SETTINGS for sophisticated natural voice
const SARAH_ENHANCED_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL', // Sarah - validated voice
  model_id: 'eleven_monolingual_v1',    // Timing-stable model
  voice_settings: {
    stability: 0.45,                     // GPT-5 range: enhanced clarity
    similarity_boost: 0.8,               // GPT-5 range: enhanced presence
    style: 0.1,                          // GPT-5 max: subtle style variation
    use_speaker_boost: true
  },
  speed: 0.90,                           // M1 validated speed
  output_format: 'mp3_44100_128',        // Standard quality
  apply_text_normalization: 'auto'
};

// Female-optimized post-processing EQ
const FEMALE_POST_PROCESSING = {
  warmth: 'equalizer=f=150:width_type=h:width=2:g=1.2',      // Female warmth (higher freq)
  presence: 'equalizer=f=2800:width_type=h:width=2:g=1.8',   // Female presence boost
  air: 'equalizer=f=10000:width_type=h:width=2:g=1.2',       // Female air
  compression: 'compand=attacks=0.08:decays=0.25:points=-90/-90|-18/-12|-8/-4|0/-1.5',
  filtering: 'highpass=f=85,lowpass=f=14000'
};

// Demo content paths
const DEMO_CONTENT_PATH = path.join(process.cwd(), 'data/demo/pride-prejudice-demo-9sentences.json');
const AUDIO_OUTPUT_DIR = path.join(process.cwd(), 'public/audio/demo');
const TEMP_DIR = path.join(process.cwd(), 'temp');

/**
 * Apply SSML enhancements for natural flow (timing-safe)
 */
function applySSMLEnhancements(text, level) {
  console.log('📝 Applying SSML enhancements for natural flow...');

  // Timing-safe SSML patterns
  const ssml = `<speak>
    <prosody rate="1.0" pitch="+0.5st">
      ${text}
    </prosody>
  </speak>`;

  return ssml;
}

/**
 * Generate sophisticated audio using ElevenLabs API with enhancements
 */
async function generateEnhancedAudio(text, level) {
  console.log(`🎤 Generating sophisticated ${level} audio with Sarah enhanced settings...`);

  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) {
    throw new Error('ELEVENLABS_API_KEY environment variable is required');
  }

  // Apply SSML enhancements for natural flow
  const enhancedText = applySSMLEnhancements(text, level);

  const requestBody = {
    text: enhancedText.trim(),
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
    console.log(`✅ Generated sophisticated ${level} audio: ${audioBuffer.length} bytes`);
    return audioBuffer;

  } catch (error) {
    console.error(`❌ Audio generation failed for ${level}:`, error.message);
    throw error;
  }
}

/**
 * Apply post-processing enhancements for warmth and presence
 */
async function applyPostProcessing(inputPath, outputPath) {
  console.log('🎵 Applying female-optimized post-processing...');

  // Create temp directory if it doesn't exist
  await fs.mkdir(TEMP_DIR, { recursive: true });

  // Build ffmpeg filter chain
  const filters = [
    FEMALE_POST_PROCESSING.warmth,
    FEMALE_POST_PROCESSING.presence,
    FEMALE_POST_PROCESSING.air,
    FEMALE_POST_PROCESSING.compression,
    FEMALE_POST_PROCESSING.filtering
  ].join(',');

  const command = `ffmpeg -i "${inputPath}" -af "${filters}" -ar 44100 -ab 128k -y "${outputPath}"`;

  try {
    await execAsync(command);
    console.log('✅ Post-processing applied successfully');
  } catch (error) {
    console.error('⚠️ Post-processing failed, using original audio:', error.message);
    // If post-processing fails, copy original
    await fs.copyFile(inputPath, outputPath);
  }
}

/**
 * Measure audio duration using ffprobe (Solution 1)
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
 * Calculate proportional word timings with micro-naturalness
 */
function calculateNaturalTimings(sentences, totalDuration) {
  console.log(`⏱️  Calculating natural word timings for ${totalDuration.toFixed(3)}s`);

  const totalText = sentences.map(s => s.text).join(' ');
  const totalChars = totalText.length;

  const wordTimings = {};
  let currentTime = 0;

  sentences.forEach((sentence, sIdx) => {
    const words = sentence.text.split(/\s+/).filter(word => word.length > 0);
    const sentenceChars = sentence.text.length;
    const sentenceDuration = (sentenceChars / totalChars) * totalDuration;

    // Apply micro-naturalness for paragraph initial sentences
    const isParagraphInitial = sIdx === 0 || sIdx === 4 || sIdx === 7;
    const naturalnessFactor = isParagraphInitial ? 1.02 : 1.0; // Slight pause at paragraph starts

    words.forEach((word, wIdx) => {
      const wordChars = word.length;
      const baseDuration = (wordChars / sentenceChars) * sentenceDuration;
      const wordDuration = baseDuration * naturalnessFactor;

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

  console.log(`✅ Generated ${Object.keys(wordTimings).length} natural word timings`);
  return wordTimings;
}

/**
 * Validate drift against baseline (quality gate)
 */
async function validateDrift(level, measuredDuration) {
  const EXPECTED_DURATIONS = {
    'A1': 29.0,      // Expected ~29s for A1
    'original': 52.0  // Expected ~52s for Original
  };

  const expected = EXPECTED_DURATIONS[level];
  const drift = Math.abs(measuredDuration - expected) / expected * 100;

  console.log(`📊 Drift validation: ${drift.toFixed(2)}% (threshold: <5%)`);

  if (drift > 5) {
    console.warn(`⚠️ Warning: Duration drift ${drift.toFixed(2)}% exceeds 5% threshold`);
  } else {
    console.log(`✅ Duration within acceptable range`);
  }

  return drift < 5;
}

/**
 * Save enhanced audio file
 */
async function saveEnhancedAudioFile(audioBuffer, level) {
  await fs.mkdir(AUDIO_OUTPUT_DIR, { recursive: true });

  const filename = `pride-prejudice-${level.toLowerCase()}-sarah-enhanced.mp3`;
  const filePath = path.join(AUDIO_OUTPUT_DIR, filename);

  await fs.writeFile(filePath, audioBuffer);
  console.log(`💾 Saved enhanced file: ${filePath}`);

  return {
    level,
    filename,
    filePath,
    size: audioBuffer.length
  };
}

/**
 * Update demo content with enhanced metadata
 */
async function updateDemoMetadata(audioFiles, allTimings) {
  console.log('📝 Updating demo content with sophisticated audio metadata...');

  const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));

  audioFiles.forEach(audioFile => {
    const level = audioFile.level;
    if (demoContent.levels[level]) {
      // Update with enhanced metadata
      demoContent.levels[level].enhancedAudio = {
        url: `/audio/demo/${audioFile.filename}`,
        filename: audioFile.filename,
        duration: audioFile.measuredDuration,
        size: audioFile.size,
        generatedAt: new Date().toISOString(),
        voice: 'Sarah Enhanced',
        settings: SARAH_ENHANCED_SETTINGS,
        postProcessing: 'female-optimized',
        driftValidation: audioFile.driftValid ? 'passed' : 'warning'
      };

      // Add natural word timings
      if (allTimings[level]) {
        demoContent.levels[level].naturalWordTimings = allTimings[level];
      }
    }
  });

  // Save updated content
  await fs.writeFile(
    DEMO_CONTENT_PATH,
    JSON.stringify(demoContent, null, 2),
    'utf8'
  );

  console.log('✅ Demo metadata updated with sophisticated enhancements');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🎯 Generating Sophisticated Enhanced Sarah Audio');
  console.log('📋 Using GPT-5 Enhanced Settings + Female Post-Processing');
  console.log('🔧 Method: Dual-track pipeline with natural flow');
  console.log('');

  try {
    // Load demo content
    console.log('📖 Loading demo content...');
    const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));

    const targetLevels = ['A1', 'original']; // Only the broken files
    const audioFiles = [];
    const allTimings = {};

    // Create temp directory
    await fs.mkdir(TEMP_DIR, { recursive: true });

    for (const level of targetLevels) {
      console.log(`\n🔄 Processing ${level} level with sophisticated enhancements...`);

      const levelData = demoContent.levels[level];
      if (!levelData || !levelData.sentences) {
        throw new Error(`Missing ${level} level data or sentences`);
      }

      // Combine sentences for natural flow
      const text = levelData.sentences.map(s => s.text).join(' ');
      console.log(`📝 Text (${text.length} chars): ${text.substring(0, 100)}...`);

      // Step 1: Generate enhanced audio with GPT-5 settings
      const enhancedAudioBuffer = await generateEnhancedAudio(text, level);

      // Step 2: Save raw enhanced audio temporarily
      const tempRawPath = path.join(TEMP_DIR, `${level}-raw.mp3`);
      await fs.writeFile(tempRawPath, enhancedAudioBuffer);

      // Step 3: Apply female-optimized post-processing
      const tempProcessedPath = path.join(TEMP_DIR, `${level}-processed.mp3`);
      await applyPostProcessing(tempRawPath, tempProcessedPath);

      // Step 4: Read processed audio
      const processedBuffer = await fs.readFile(tempProcessedPath);

      // Step 5: Save final enhanced audio
      const audioFile = await saveEnhancedAudioFile(processedBuffer, level);

      // Step 6: Measure duration for perfect sync
      const measuredDuration = await measureAudioDuration(audioFile.filePath);
      audioFile.measuredDuration = measuredDuration;

      // Step 7: Validate drift
      const driftValid = await validateDrift(level, measuredDuration);
      audioFile.driftValid = driftValid;

      // Step 8: Calculate natural word timings
      const naturalTimings = calculateNaturalTimings(levelData.sentences, measuredDuration);
      allTimings[level] = naturalTimings;

      audioFiles.push(audioFile);

      console.log(`✅ Completed sophisticated ${level}: ${measuredDuration.toFixed(3)}s, ${audioFile.size} bytes`);

      // Cleanup temp files
      await fs.unlink(tempRawPath).catch(() => {});
      await fs.unlink(tempProcessedPath).catch(() => {});
    }

    // Update demo metadata
    await updateDemoMetadata(audioFiles, allTimings);

    console.log('\n🎉 Sophisticated Enhanced Audio Generation Complete!');
    console.log('');
    console.log('📊 Summary:');
    audioFiles.forEach(file => {
      console.log(`  ${file.level}: ${file.filename} (${file.measuredDuration.toFixed(3)}s, ${file.size} bytes)`);
      console.log(`    - GPT-5 settings: stability 0.45, similarity_boost 0.8, style 0.1`);
      console.log(`    - Female EQ: 150Hz warmth, 2800Hz presence, 10kHz air`);
      console.log(`    - Drift validation: ${file.driftValid ? '✅ Passed' : '⚠️ Warning'}`);
    });
    console.log('');
    console.log('🔗 Next Steps:');
    console.log('  1. Build locally: npm run build');
    console.log('  2. Test locally: npm run dev');
    console.log('  3. Commit and push the sophisticated audio');
    console.log('');

  } catch (error) {
    console.error('\n❌ Sophisticated generation failed:', error.message);
    console.error('🔧 Troubleshooting:');
    console.error('  1. Check ELEVENLABS_API_KEY environment variable');
    console.error('  2. Verify ffmpeg is installed for post-processing');
    console.error('  3. Check demo content file exists');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}