#!/usr/bin/env node

/**
 * Complete Audio Generation for All CEFR Levels
 *
 * Generates enhanced audio for:
 * - A2, B2, C1 levels (Daniel & Sarah)
 * - Missing alternates: Daniel B1, Sarah A1, Sarah C2
 *
 * Uses GPT-5 settings with gender-optimized post-processing
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Voice IDs
const VOICE_IDS = {
  daniel: 'onwK4e9ZLuTAKqWW03F9',
  sarah: 'EXAVITQu4vr4xnSDxMaL'
};

// GPT-5 Enhanced Settings (proven <5% drift)
const ENHANCED_SETTINGS = {
  model_id: 'eleven_monolingual_v1',
  voice_settings: {
    stability: 0.45,
    similarity_boost: 0.8,
    style: 0.1,
    use_speaker_boost: true
  },
  speed: 0.90,
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

// Post-processing pipelines
const POST_PROCESSING = {
  daniel: [
    'equalizer=f=120:width_type=h:width=2:g=1.5',    // Warmth
    'equalizer=f=3500:width_type=h:width=2:g=1.5',   // Presence
    'equalizer=f=11000:width_type=h:width=2:g=1.0',  // Air
    'compand=attacks=0.1:decays=0.3:points=-90/-90|-20/-15|-10/-5|0/-2',
    'highpass=f=80',
    'lowpass=f=15000'
  ],
  sarah: [
    'equalizer=f=150:width_type=h:width=2:g=1.2',    // Female warmth
    'equalizer=f=2800:width_type=h:width=2:g=1.8',   // Female presence
    'equalizer=f=10000:width_type=h:width=2:g=1.2',  // Female air
    'compand=attacks=0.08:decays=0.25:points=-90/-90|-18/-12|-8/-4|0/-1.5',
    'highpass=f=85',
    'lowpass=f=14000'
  ]
};

// Audio generation targets
const GENERATION_TARGETS = [
  // New levels with Daniel
  { level: 'A2', voice: 'daniel', targetDuration: 37 },
  { level: 'B2', voice: 'daniel', targetDuration: 50 },
  { level: 'C1', voice: 'daniel', targetDuration: 52 },

  // New levels with Sarah
  { level: 'A2', voice: 'sarah', targetDuration: 37 },
  { level: 'B2', voice: 'sarah', targetDuration: 50 },
  { level: 'C1', voice: 'sarah', targetDuration: 52 },

  // Missing alternates
  { level: 'B1', voice: 'daniel', targetDuration: 48 },  // Alternate for Sarah B1
  { level: 'A1', voice: 'sarah', targetDuration: 30 },   // Alternate for Daniel A1
  { level: 'C2', voice: 'sarah', targetDuration: 54 },   // C2 with Sarah
  { level: 'C2', voice: 'daniel', targetDuration: 54 }   // C2 with Daniel
];

const DEMO_CONTENT_PATH = path.join(process.cwd(), 'public/data/demo/pride-prejudice-demo.json');
const AUDIO_OUTPUT_DIR = path.join(process.cwd(), 'public/audio/demo');

/**
 * Measure audio duration using ffprobe
 */
async function measureAudioDuration(audioFilePath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioFilePath}"`
    );

    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      throw new Error(`Invalid duration measurement: ${stdout}`);
    }

    return duration;
  } catch (error) {
    console.error(`❌ Failed to measure audio duration: ${error.message}`);
    throw error;
  }
}

/**
 * Generate enhanced audio using ElevenLabs API
 */
async function generateEnhancedAudio(text, voice, level) {
  console.log(`🎤 Generating ${level} with ${voice} voice...`);

  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) {
    throw new Error('ELEVENLABS_API_KEY environment variable is required');
  }

  const requestBody = {
    text: text.trim(),
    model_id: ENHANCED_SETTINGS.model_id,
    voice_settings: ENHANCED_SETTINGS.voice_settings,
    output_format: ENHANCED_SETTINGS.output_format,
    apply_text_normalization: ENHANCED_SETTINGS.apply_text_normalization
  };

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_IDS[voice]}`,
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
    console.log(`✅ Generated ${level} ${voice}: ${audioBuffer.length} bytes`);
    return audioBuffer;

  } catch (error) {
    console.error(`❌ Audio generation failed for ${level} ${voice}:`, error.message);
    throw error;
  }
}

/**
 * Apply gender-optimized post-processing
 */
async function applyPostProcessing(inputPath, outputPath, voice) {
  console.log(`🎨 Applying ${voice} post-processing...`);

  const filters = POST_PROCESSING[voice];
  const ffmpegCommand = [
    'ffmpeg -y',
    `-i "${inputPath}"`,
    '-af',
    '"' + filters.join(',') + '"',
    '-c:a libmp3lame',
    '-b:a 128k',
    '-ar 44100',
    `"${outputPath}"`
  ].join(' ');

  try {
    await execAsync(ffmpegCommand);
    console.log(`✅ Post-processing complete`);
  } catch (error) {
    console.error(`❌ Post-processing failed:`, error.message);
    throw error;
  }
}

/**
 * Process a single audio target
 */
async function processAudioTarget(target, content) {
  const { level, voice, targetDuration } = target;

  // Get text content for the level
  const levelKey = level === 'C2' ? 'C2' : level;
  const levelData = content.levels[levelKey];

  if (!levelData) {
    console.error(`❌ No content found for level ${levelKey}`);
    return null;
  }

  const text = levelData.text;
  console.log(`\n📝 Processing ${level} ${voice} (${text.split(' ').length} words)`);

  try {
    // Generate audio
    const audioBuffer = await generateEnhancedAudio(text, voice, level);

    // Save temporary file
    const tempFilename = `pride-prejudice-${level.toLowerCase()}-${voice}-temp.mp3`;
    const tempFilePath = path.join(AUDIO_OUTPUT_DIR, tempFilename);
    await fs.writeFile(tempFilePath, audioBuffer);

    // Apply post-processing
    const enhancedFilename = `pride-prejudice-${level.toLowerCase()}-${voice}-enhanced.mp3`;
    const enhancedFilePath = path.join(AUDIO_OUTPUT_DIR, enhancedFilename);
    await applyPostProcessing(tempFilePath, enhancedFilePath, voice);

    // Measure duration
    const duration = await measureAudioDuration(enhancedFilePath);

    // Calculate drift
    const drift = Math.abs((duration - targetDuration) / targetDuration) * 100;

    console.log(`📊 ${level} ${voice}: ${duration.toFixed(3)}s (target: ${targetDuration}s, drift: ${drift.toFixed(2)}%)`);

    if (drift > 5) {
      console.log(`⚠️  Warning: Drift exceeds 5% threshold`);
    } else {
      console.log(`✅ Drift validation passed`);
    }

    // Clean up temp file
    await fs.unlink(tempFilePath);

    return {
      level,
      voice,
      filename: enhancedFilename,
      duration,
      targetDuration,
      drift
    };

  } catch (error) {
    console.error(`❌ Failed to process ${level} ${voice}:`, error.message);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🎯 Complete Audio Generation for All CEFR Levels');
  console.log('📋 Using GPT-5 Enhanced Settings');
  console.log('🎨 With Gender-Optimized Post-Processing');
  console.log('');

  try {
    // Create output directory
    await fs.mkdir(AUDIO_OUTPUT_DIR, { recursive: true });

    // Load demo content
    console.log('📖 Loading demo content...');
    const content = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));

    // Process all targets
    const results = [];
    for (const target of GENERATION_TARGETS) {
      const result = await processAudioTarget(target, content);
      if (result) {
        results.push(result);
      }
    }

    // Summary
    console.log('\n🎉 Audio Generation Complete!');
    console.log('\n📊 Summary:');

    const successful = results.filter(r => r !== null);
    const withinDrift = results.filter(r => r && r.drift <= 5);

    console.log(`  Generated: ${successful.length}/${GENERATION_TARGETS.length} files`);
    console.log(`  Within 5% drift: ${withinDrift.length}/${successful.length} files`);

    console.log('\n📁 Generated Files:');
    for (const result of results) {
      if (result) {
        const driftIcon = result.drift <= 5 ? '✅' : '⚠️';
        console.log(`  ${driftIcon} ${result.filename} - ${result.duration.toFixed(3)}s (${result.drift.toFixed(2)}% drift)`);
      }
    }

    console.log('\n🎯 Next Steps:');
    console.log('  1. Update InteractiveReadingDemo component for 6 levels');
    console.log('  2. Implement Aa level selector dropdown');
    console.log('  3. Create unified control bar design');
    console.log('  4. Add scrollable text container');

  } catch (error) {
    console.error('\n❌ Audio generation failed:', error.message);
    console.error('🔧 Troubleshooting:');
    console.error('  1. Check ELEVENLABS_API_KEY environment variable');
    console.error('  2. Verify ffmpeg is installed: brew install ffmpeg');
    console.error('  3. Check API quota and permissions');
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
  applyPostProcessing
};