#!/usr/bin/env node

/**
 * Hero Section B2 Audio Regeneration Script
 *
 * Regenerates B2 level audio with Daniel voice at 0.85× speed
 * Implements Solution 1: ffprobe measurement + Enhanced Timing v3
 *
 * PURPOSE: Fix "race" feeling by slowing down audio to 0.75× (16.7% slower than 0.90×)
 * SCOPE: Only B2 level, only Daniel voice (9 sentences)
 * COST: ~$0.10-0.15
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { config } = require('dotenv');
const execAsync = promisify(exec);

// Load environment variables
config({ path: '.env.local' });

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

// DANIEL VOICE SETTINGS - Generate at default speed, then slow with FFmpeg
const DANIEL_VOICE_SETTINGS = {
  voice_id: 'onwK4e9ZLuTAKqWW03F9',  // Daniel voice ID
  model_id: 'eleven_monolingual_v1',  // v1 model (reliable, proven)
  voice_settings: {
    stability: 0.45,                   // Production settings
    similarity_boost: 0.8,              // Production settings
    style: 0.1,                         // Production settings
    use_speaker_boost: true
  },
  speed: 0.90,                          // Generate at default speed (API may ignore speed param)
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

// Target speed after FFmpeg post-processing
const TARGET_SPEED = 0.83;  // ⬅️ Will slow to 0.83× using FFmpeg (balance between pace and quality)

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
          speed: voiceSettings.speed,  // ⬅️ CRITICAL: Must include speed in API call
          output_format: voiceSettings.output_format,
          apply_text_normalization: voiceSettings.apply_text_normalization
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
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

      console.log(`⏳ Retrying in ${(delay / 1000).toFixed(1)}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Solution 1: ffprobe measurement for perfect sync (CRITICAL - MANDATORY)
 */
async function measureAudioDuration(audioFilePath) {
  // Measure with ffprobe (accepts file path)
  const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioFilePath}"`;
  const { stdout } = await execAsync(command);

  const measuredDuration = parseFloat(stdout.trim());

  if (isNaN(measuredDuration) || measuredDuration <= 0) {
    throw new Error(`Invalid duration measurement: ${stdout.trim()}`);
  }

  console.log(`📏 Measured duration: ${measuredDuration.toFixed(3)}s`);
  return measuredDuration;
}

/**
 * Slow down audio using FFmpeg atempo filter
 * This ensures reliable speed reduction when API speed parameter doesn't work
 */
async function slowAudioWithFFmpeg(inputFilePath, outputFilePath, speedRatio) {
  console.log(`\n🎚️ Slowing audio to ${speedRatio}× using FFmpeg...`);
  
  // FFmpeg atempo filter: 0.5 to 2.0 range
  // To slow to 0.75×, we use atempo=0.75
  const command = `ffmpeg -i "${inputFilePath}" -filter:a "atempo=${speedRatio}" -y "${outputFilePath}"`;
  
  try {
    await execAsync(command);
    console.log(`✅ Audio slowed successfully`);
    
    // Verify output file exists
    const stats = await fs.stat(outputFilePath);
    console.log(`📦 Output file size: ${(stats.size / 1024).toFixed(1)}KB`);
    
    return outputFilePath;
  } catch (error) {
    throw new Error(`FFmpeg processing failed: ${error.message}`);
  }
}

/**
 * Calculate proportional sentence timings (Solution 1 + Enhanced Timing v3)
 *
 * ENHANCED TIMING v3: Character-count proportion + punctuation penalties
 * CRITICAL: Subtracts pause budget FIRST to avoid overshooting totalDuration
 */
function calculateProportionalTimings(sentences, totalDuration) {
  const totalCharacters = sentences.reduce((sum, sentence) => sum + sentence.text.length, 0);

  // STEP 1: Calculate pause penalties for ALL sentences first
  const sentencePenalties = sentences.map(sentence => {
    // Count all punctuation marks
    const commaCount = (sentence.text.match(/,/g) || []).length;
    const semicolonCount = (sentence.text.match(/;/g) || []).length;
    const colonCount = (sentence.text.match(/:/g) || []).length;
    const emdashCount = (sentence.text.match(/—/g) || []).length;
    const ellipsisCount = (sentence.text.match(/\.\.\./g) || []).length;

    // Natural speech pause durations (empirically validated)
    let pausePenalty = (commaCount * 0.15) +        // 150ms per comma
                       (semicolonCount * 0.25) +     // 250ms per semicolon
                       (colonCount * 0.20) +         // 200ms per colon
                       (emdashCount * 0.18) +        // 180ms per em-dash
                       (ellipsisCount * 0.12);       // 120ms per ellipsis

    // Cap penalties per sentence to prevent overcorrection
    pausePenalty = Math.min(pausePenalty, 0.6); // Max 600ms pause per sentence

    return {
      sentence,
      pausePenalty
    };
  });

  // STEP 2: Calculate total pause budget
  const totalPauseBudget = sentencePenalties.reduce((sum, item) => sum + item.pausePenalty, 0);

  // STEP 3: Subtract pause budget from total duration FIRST
  let remainingDuration = totalDuration - totalPauseBudget;

  // Safeguard: If pause budget exceeds total duration, scale penalties down proportionally
  if (remainingDuration < 0) {
    const scaleFactor = totalDuration * 0.8 / totalPauseBudget;
    sentencePenalties.forEach(item => {
      item.pausePenalty *= scaleFactor;
    });
    remainingDuration = totalDuration * 0.2;
    console.warn(`⚠️ Pause budget (${totalPauseBudget.toFixed(2)}s) exceeded duration, scaled down`);
  }

  // STEP 4: Distribute REMAINING time by character proportion
  const timings = sentencePenalties.map((item, index) => {
    const characterRatio = item.sentence.text.length / totalCharacters;
    const baseDuration = remainingDuration * characterRatio;
    let adjustedDuration = baseDuration + item.pausePenalty;
    adjustedDuration = Math.max(adjustedDuration, 0.25); // Min 250ms per sentence

    return {
      index,
      sentence: item.sentence,
      adjustedDuration
    };
  });

  // STEP 5: Renormalize to ensure sum(durations) === totalDuration exactly
  const currentTotal = timings.reduce((sum, t) => sum + t.adjustedDuration, 0);
  const renormalizeFactor = totalDuration / currentTotal;

  if (Math.abs(renormalizeFactor - 1.0) > 0.001) {
    console.log(`📊 Renormalizing timings: ${currentTotal.toFixed(3)}s → ${totalDuration.toFixed(3)}s`);
    timings.forEach(t => {
      t.adjustedDuration *= renormalizeFactor;
    });
  }

  // STEP 6: Calculate start/end times
  let currentTime = 0;
  const finalTimings = timings.map(t => {
    const startTime = currentTime;
    const endTime = currentTime + t.adjustedDuration;
    currentTime = endTime;

    return {
      sentenceIndex: t.index,
      text: t.sentence.text,
      startTime: parseFloat(startTime.toFixed(3)),
      endTime: parseFloat(endTime.toFixed(3)),
      duration: parseFloat(t.adjustedDuration.toFixed(3)),
      wordCount: t.sentence.wordCount
    };
  });

  // Validation
  const finalTotal = finalTimings[finalTimings.length - 1].endTime;
  if (Math.abs(finalTotal - totalDuration) > 0.01) {
    console.warn(`⚠️ Timing mismatch: calculated ${finalTotal.toFixed(3)}s vs actual ${totalDuration.toFixed(3)}s`);
  } else {
    console.log(`✅ Timing validation: ${finalTotal.toFixed(3)}s === ${totalDuration.toFixed(3)}s`);
  }

  return finalTimings;
}

/**
 * Update demo content JSON with new audio metadata
 */
async function updateDemoContent(audioMetadata) {
  console.log('\n📝 Updating demo content JSON...');

  const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));

  // Ensure B2 level exists
  if (!demoContent.levels.B2) {
    throw new Error('B2 level not found in demo content');
  }

  // Update B2 level with Daniel audio metadata
  if (!demoContent.levels.B2.audio) {
    demoContent.levels.B2.audio = {};
  }

  demoContent.levels.B2.audio.daniel = {
    url: `/audio/demo/pride-prejudice-b2-daniel-enhanced.mp3`,
    filename: 'pride-prejudice-b2-daniel-enhanced.mp3',
    duration: audioMetadata.measuredDuration,
    size: audioMetadata.fileSize || 0,
    generatedAt: new Date().toISOString(),
    voice: audioMetadata.voiceId,
    settings: {
      voice_id: audioMetadata.voiceId,
      model_id: DANIEL_VOICE_SETTINGS.model_id,
      voice_settings: DANIEL_VOICE_SETTINGS.voice_settings,
      speed: DANIEL_VOICE_SETTINGS.speed,
      output_format: DANIEL_VOICE_SETTINGS.output_format,
      apply_text_normalization: DANIEL_VOICE_SETTINGS.apply_text_normalization
    },
    sentenceTimings: audioMetadata.sentenceTimings,
    metadata: {
      version: 3,
      method: 'ffprobe-enhanced-timing',
      timingStrategy: 'character-proportion-with-punctuation-penalties'
    }
  };

  // Save updated content
  await fs.writeFile(DEMO_CONTENT_PATH, JSON.stringify(demoContent, null, 2));
  console.log('✅ Demo content JSON updated');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🎯 Hero Section B2 Audio Regeneration');
  console.log('📋 Level: B2');
  console.log('🎤 Voice: Daniel');
  console.log('⚙️ Target Speed: 0.83× (using FFmpeg post-processing - balanced pace/quality)');
  console.log('🔧 Method: Generate at default → FFmpeg slow → Solution 1 (ffprobe + Enhanced Timing v3)');
  console.log('');

  try {
    // Load demo content
    console.log('📖 Loading demo content...');
    const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));

    if (!demoContent.levels.B2) {
      throw new Error('B2 level not found in demo content');
    }

    const b2Data = demoContent.levels.B2;
    console.log(`📝 B2 text: "${b2Data.text.substring(0, 80)}..."`);
    console.log(`📊 Sentences: ${b2Data.sentences.length}`);

    // Generate audio at default speed (API may ignore speed parameter)
    console.log('\n🎵 Generating audio with Daniel voice at default speed...');
    const audioBuffer = await generateAudioWithRetry(b2Data.text, DANIEL_VOICE_SETTINGS);

    // Ensure output directory exists
    await fs.mkdir(AUDIO_OUTPUT_DIR, { recursive: true });
    await fs.mkdir(path.join(process.cwd(), 'temp'), { recursive: true });

    // Save original audio to temp file
    const tempOriginalFile = path.join(process.cwd(), 'temp', `b2-daniel-original-${Date.now()}.mp3`);
    await fs.writeFile(tempOriginalFile, audioBuffer);
    console.log(`💾 Original audio saved to temp file`);

    // Measure original duration
    console.log('\n📏 Measuring original audio duration...');
    const originalDuration = await measureAudioDuration(tempOriginalFile);
    console.log(`📊 Original duration: ${originalDuration.toFixed(3)}s`);

    // Slow down audio using FFmpeg
    const tempSlowedFile = path.join(process.cwd(), 'temp', `b2-daniel-slowed-${Date.now()}.mp3`);
    await slowAudioWithFFmpeg(tempOriginalFile, tempSlowedFile, TARGET_SPEED);

    // Measure slowed duration
    console.log('\n📏 Measuring slowed audio duration (Solution 1)...');
    const measuredDuration = await measureAudioDuration(tempSlowedFile);
    console.log(`📊 Slowed duration: ${measuredDuration.toFixed(3)}s (${((measuredDuration / originalDuration - 1) * 100).toFixed(1)}% longer)`);

    // Calculate proportional sentence timings based on slowed duration
    console.log('\n⏱️ Calculating sentence timings (Enhanced Timing v3)...');
    const sentenceTimings = calculateProportionalTimings(b2Data.sentences, measuredDuration);

    // Copy slowed audio to final location
    const fileName = 'pride-prejudice-b2-daniel-enhanced.mp3';
    const filePath = path.join(AUDIO_OUTPUT_DIR, fileName);
    await fs.copyFile(tempSlowedFile, filePath);
    const fileStats = await fs.stat(filePath);
    console.log(`✅ Final audio saved: ${fileName} (${(fileStats.size / 1024).toFixed(1)}KB)`);

    // Clean up temp files
    try {
      await fs.unlink(tempOriginalFile);
      await fs.unlink(tempSlowedFile);
      console.log(`🧹 Temp files cleaned up`);
    } catch (error) {
      console.warn(`⚠️ Could not clean up temp files: ${error.message}`);
    }

    // Create metadata
    const metadata = {
      voiceId: DANIEL_VOICE_SETTINGS.voice_id,
      voiceName: 'Daniel',
      level: 'B2',
      fileName: fileName,
      measuredDuration: measuredDuration,
      originalDuration: originalDuration,
      sentenceTimings: sentenceTimings,
      fileSize: fileStats.size,
      voiceSettings: DANIEL_VOICE_SETTINGS.voice_settings,
      speed: TARGET_SPEED,  // Target speed after FFmpeg processing
      originalSpeed: DANIEL_VOICE_SETTINGS.speed,  // Speed used for generation
      processingMethod: 'ffmpeg-atempo',
      speedIncrease: ((measuredDuration / originalDuration - 1) * 100).toFixed(1) + '%',
      measuredAt: new Date().toISOString(),
      method: 'ffprobe-enhanced-timing',
      timingStrategy: 'character-proportion-with-punctuation-penalties'
    };

    // Save metadata file
    const metadataPath = path.join(AUDIO_OUTPUT_DIR, `${fileName}.metadata.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`✅ Metadata saved: ${fileName}.metadata.json`);

    // Update demo content JSON
    await updateDemoContent(metadata);

    console.log('\n✅ REGENERATION COMPLETE!');
    console.log(`📊 Summary:`);
    console.log(`   Level: B2`);
    console.log(`   Voice: Daniel`);
    console.log(`   Speed: 0.75×`);
    console.log(`   Duration: ${measuredDuration.toFixed(3)}s`);
    console.log(`   Sentences: ${sentenceTimings.length}`);
    console.log(`   File: ${fileName}`);
    console.log('\n🎯 Next steps:');
    console.log('   1. Test audio playback in browser');
    console.log('   2. Verify sentence highlighting syncs perfectly');
    console.log('   3. Confirm speed feels comfortable with good quality');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run script
main();

