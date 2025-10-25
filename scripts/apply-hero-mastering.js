#!/usr/bin/env node

/**
 * Hero Mastering Chain Application Script
 *
 * Applies Agent 3 DSP & Psychoacoustics research findings to enhanced audio files
 * Implements professional mastering chain for mind-blowing quality
 *
 * PRESERVATION: Duration-neutral effects only (maintains perfect sync)
 * ENHANCEMENT: Professional studio quality optimized for mobile devices
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Agent 3 Hero Mastering Chain Settings
const HERO_MASTERING_CHAIN = {
  // Female voices (Sarah) - Optimized frequency response
  female: {
    warmth: 'equalizer=f=150:width_type=h:width=2:g=1.2',      // Female warmth frequency
    presence: 'equalizer=f=2800:width_type=h:width=2:g=1.8',   // Female presence boost
    air: 'equalizer=f=10000:width_type=h:width=2:g=1.2',       // Female air frequency
    deesser: 'deesser=i=0.1:m=0.02:f=0.5:s=o',                // Sibilance control
    compression: 'compand=attacks=0.08:decays=0.25:points=-90/-90|-18/-12|-8/-4|0/-1.5', // Female dynamics
    filtering: 'highpass=f=85,lowpass=f=14000',                // Female filtering
    loudness: 'loudnorm=I=-18:TP=-1:LRA=7'                     // Professional loudness
  },

  // Male voices (Daniel) - Optimized frequency response
  male: {
    warmth: 'equalizer=f=120:width_type=h:width=2:g=1.5',      // Male warmth frequency
    presence: 'equalizer=f=3500:width_type=h:width=2:g=1.5',   // Male presence boost
    air: 'equalizer=f=11000:width_type=h:width=2:g=1.0',       // Male air frequency
    deesser: 'deesser=i=0.1:m=0.02:f=0.5:s=o',                // Sibilance control
    compression: 'compand=attacks=0.1:decays=0.3:points=-90/-90|-20/-15|-10/-5|0/-2', // Male dynamics
    filtering: 'highpass=f=80,lowpass=f=15000',                // Male filtering
    loudness: 'loudnorm=I=-18:TP=-1:LRA=7'                     // Professional loudness
  }
};

// Audio file paths
const AUDIO_INPUT_DIR = path.join(process.cwd(), 'public/audio/demo');
const AUDIO_OUTPUT_DIR = AUDIO_INPUT_DIR; // Same directory, different naming

/**
 * Solution 1: Duration measurement for sync validation (CRITICAL)
 */
async function measureAudioDuration(filePath) {
  try {
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`;
    const { stdout } = await execAsync(command);
    const duration = parseFloat(stdout.trim());

    if (isNaN(duration) || duration <= 0) {
      throw new Error(`Invalid duration measurement: ${stdout.trim()}`);
    }

    return duration;
  } catch (error) {
    throw new Error(`Failed to measure duration: ${error.message}`);
  }
}

/**
 * Apply hero mastering chain with gender-specific optimization
 */
async function applyHeroMastering(inputFile, outputFile, voiceGender) {
  console.log(`🎛️ Applying hero mastering: ${voiceGender} voice optimization`);

  // Get gender-specific mastering settings
  const settings = HERO_MASTERING_CHAIN[voiceGender];

  // Build FFmpeg command with complete mastering chain
  const filterChain = [
    settings.warmth,      // Warmth EQ (gender-specific frequency)
    settings.deesser,     // De-essing (sibilance control)
    settings.compression, // Dynamic range compression
    settings.presence,    // Presence boost (gender-specific)
    settings.air,         // Air frequency enhancement
    settings.filtering,   // High/low pass filtering
    settings.loudness     // Professional loudness normalization (-18 LUFS)
  ].join(',');

  const command = `ffmpeg -i "${inputFile}" -af "${filterChain}" -c:a libmp3lame -b:a 128k "${outputFile}" -y`;

  console.log(`📡 Processing: ${path.basename(inputFile)}`);
  console.log(`🎯 Target: -18 LUFS, ${voiceGender} frequency optimization`);

  try {
    // Measure original duration
    const originalDuration = await measureAudioDuration(inputFile);
    console.log(`📏 Original duration: ${originalDuration.toFixed(3)}s`);

    // Apply mastering chain
    const { stderr } = await execAsync(command);

    // Measure processed duration
    const processedDuration = await measureAudioDuration(outputFile);
    console.log(`📏 Processed duration: ${processedDuration.toFixed(3)}s`);

    // Validate duration preservation (critical for sync)
    const durationDrift = Math.abs((processedDuration - originalDuration) / originalDuration) * 100;
    console.log(`📊 Duration drift: ${durationDrift.toFixed(3)}%`);

    if (durationDrift > 1.0) { // Very strict threshold for mastering
      console.warn(`⚠️ WARNING: Duration drift ${durationDrift.toFixed(3)}% > 1.0% - may affect sync`);
    } else {
      console.log(`✅ Duration preservation verified: ${durationDrift.toFixed(3)}% < 1.0%`);
    }

    return {
      success: true,
      originalDuration,
      processedDuration,
      durationDrift,
      driftValid: durationDrift <= 1.0
    };

  } catch (error) {
    console.error(`❌ Mastering failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate audio quality with ffprobe analysis
 */
async function validateAudioQuality(filePath) {
  try {
    // Get comprehensive audio analysis
    const command = `ffprobe -v quiet -show_entries format=duration,bit_rate,size:stream=channels,sample_rate,codec_name -of json "${filePath}"`;
    const { stdout } = await execAsync(command);
    const analysis = JSON.parse(stdout);

    const audioInfo = {
      duration: parseFloat(analysis.format.duration),
      bitrate: parseInt(analysis.format.bit_rate),
      size: parseInt(analysis.format.size),
      sampleRate: analysis.streams[0]?.sample_rate,
      channels: analysis.streams[0]?.channels,
      codec: analysis.streams[0]?.codec_name
    };

    console.log(`📊 Audio quality analysis:`);
    console.log(`   Duration: ${audioInfo.duration.toFixed(3)}s`);
    console.log(`   Bitrate: ${Math.round(audioInfo.bitrate / 1000)}kbps`);
    console.log(`   Sample Rate: ${audioInfo.sampleRate}Hz`);
    console.log(`   Channels: ${audioInfo.channels}`);
    console.log(`   Codec: ${audioInfo.codec}`);

    return audioInfo;

  } catch (error) {
    console.warn(`⚠️ Quality validation failed: ${error.message}`);
    return null;
  }
}

/**
 * Main mastering workflow
 */
async function main() {
  console.log('🎛️ Hero Mastering Chain Application - Agent 3 Research Implementation');
  console.log('📋 Applying professional mastering to enhanced audio files\n');

  // Define mastering tasks
  const masteringTasks = [
    {
      input: 'pride-prejudice-a1-sarah-enhanced-pilot.mp3',
      output: 'pride-prejudice-a1-sarah-hero-mastered.mp3',
      voice: 'sarah',
      gender: 'female',
      level: 'A1'
    },
    {
      input: 'pride-prejudice-b1-daniel-enhanced-pilot.mp3',
      output: 'pride-prejudice-b1-daniel-hero-mastered.mp3',
      voice: 'daniel',
      gender: 'male',
      level: 'B1'
    },
    {
      input: 'pride-prejudice-original-daniel-enhanced-pilot.mp3',
      output: 'pride-prejudice-original-daniel-hero-mastered.mp3',
      voice: 'daniel',
      gender: 'male',
      level: 'Original'
    }
  ];

  const results = [];

  for (const task of masteringTasks) {
    console.log(`\n🚀 Processing: ${task.level} level with ${task.voice} voice`);

    const inputPath = path.join(AUDIO_INPUT_DIR, task.input);
    const outputPath = path.join(AUDIO_OUTPUT_DIR, task.output);

    // Check if input file exists
    try {
      await fs.access(inputPath);
    } catch (error) {
      console.error(`❌ Input file not found: ${task.input}`);
      results.push({ ...task, success: false, error: 'Input file not found' });
      continue;
    }

    // Apply hero mastering
    const masteringResult = await applyHeroMastering(inputPath, outputPath, task.gender);

    // Validate output quality
    const qualityInfo = await validateAudioQuality(outputPath);

    results.push({
      ...task,
      ...masteringResult,
      qualityInfo
    });
  }

  // Summary report
  console.log('\n📊 HERO MASTERING SUMMARY');
  console.log('=' .repeat(60));

  results.forEach(result => {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
    const drift = result.driftValid !== undefined ? (result.driftValid ? ' (Drift: ✅)' : ' (Drift: ⚠️)') : '';
    const quality = result.qualityInfo ? ` - ${Math.round(result.qualityInfo.bitrate / 1000)}kbps` : '';

    console.log(`${status} ${result.level.toUpperCase()}-${result.voice.toUpperCase()}${quality}${drift}`);

    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    } else if (result.durationDrift !== undefined) {
      console.log(`   Duration drift: ${result.durationDrift.toFixed(3)}%`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  const driftValidCount = results.filter(r => r.driftValid).length;

  console.log(`\n🎯 Results: ${successCount}/${results.length} mastered successfully`);
  console.log(`🎯 Duration preservation: ${driftValidCount}/${successCount} passed (<1% requirement)`);

  if (successCount === results.length && driftValidCount === successCount) {
    console.log('\n🏆 HERO MASTERING COMPLETE: Professional studio quality achieved!');
    console.log('   ✅ -18 LUFS professional loudness standard');
    console.log('   ✅ Gender-specific frequency optimization');
    console.log('   ✅ Mobile device clarity enhancement');
    console.log('   ✅ Perfect sync preservation');
    console.log('\n🎧 Ready for A/B testing: Enhanced vs Hero-Mastered audio');
  } else {
    console.log('\n⚠️ ISSUES DETECTED: Review failed mastering or duration drift');
  }
}

// Run the hero mastering
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Hero mastering failed:', error);
    process.exit(1);
  });
}

module.exports = {
  applyHeroMastering,
  validateAudioQuality,
  HERO_MASTERING_CHAIN
};