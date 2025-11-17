#!/usr/bin/env node

/**
 * Hero Section Voice Audio Regeneration Script (Universal)
 *
 * Regenerates hero demo audio for any voice/level combination at 0.85× speed
 * Implements Solution 1: ffprobe measurement + Enhanced Timing v3
 * Uses FFmpeg post-processing for reliable speed reduction
 *
 * USAGE: node scripts/regenerate-hero-voice-0.83.js [LEVEL] [VOICE_ID]
 * Example: node scripts/regenerate-hero-voice-0.83.js A1 daniel
 * Example: node scripts/regenerate-hero-voice-0.83.js A2 arabella
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

// Voice configurations (from lib/config/demo-voices.ts)
const DEMO_VOICES = {
  // A1 Voices
  hope: {
    fileId: 'hope',
    name: 'Hope',
    gender: 'female',
    elevenLabsId: 'iCrDUkL56s3C8sCRl7wb',
    description: 'Soothing narrator'
  },
  daniel: {
    fileId: 'daniel',
    name: 'Daniel',
    gender: 'male',
    elevenLabsId: 'onwK4e9ZLuTAKqWW03F9',
    description: 'British authority (locked - proven best)'
  },
  // A2 Voices
  arabella: {
    fileId: 'arabella',
    name: 'Arabella',
    gender: 'female',
    elevenLabsId: 'aEO01A4wXwd1O8GPgGlF',
    description: 'Young enchanting narrator'
  },
  grandpa_spuds: {
    fileId: 'grandpa-spuds',
    name: 'Grandpa Spuds',
    gender: 'male',
    elevenLabsId: 'NOpBlnGInO9m6vDvFkFC',
    description: 'Warm storyteller'
  },
  // B1 Voices
  jane: {
    fileId: 'jane',
    name: 'Jane',
    gender: 'female',
    elevenLabsId: 'RILOU7YmBhvwJGDGjNmP',
    description: 'Professional audiobook reader'
  },
  james: {
    fileId: 'james',
    name: 'James',
    gender: 'male',
    elevenLabsId: 'EkK5I93UQWFDigLMpZcX',
    description: 'Husky & engaging'
  },
  // B2 Voices
  zara: {
    fileId: 'zara',
    name: 'Zara',
    gender: 'female',
    elevenLabsId: 'jqcCZkN6Knx8BJ5TBdYR',
    description: 'Warm, real-world conversationalist'
  },
  // C1 Voices
  sally_ford: {
    fileId: 'sally-ford',
    name: 'Sally Ford',
    gender: 'female',
    elevenLabsId: 'kBag1HOZlaVBH7ICPE8x',
    description: 'British mature elegance'
  },
  frederick_surrey: {
    fileId: 'frederick-surrey',
    name: 'Frederick Surrey',
    gender: 'male',
    elevenLabsId: 'j9jfwdrw7BRfcR43Qohk',
    description: 'Documentary British narrator'
  },
  // C2 Voices
  vivie: {
    fileId: 'vivie',
    name: 'Vivie',
    gender: 'female',
    elevenLabsId: 'z7U1SjrEq4fDDDriOQEN',
    description: 'Cultured educational narrator'
  },
  john_doe: {
    fileId: 'john-doe',
    name: 'John Doe',
    gender: 'male',
    elevenLabsId: 'EiNlNiXeDU1pqqOPrYMO',
    description: 'Deep American authority'
  },
  // Original Voices
  sarah: {
    fileId: 'sarah',
    name: 'Sarah',
    gender: 'female',
    elevenLabsId: 'EXAVITQu4vr4xnSDxMaL',
    description: 'Original baseline (locked)'
  },
  david_castlemore: {
    fileId: 'david-castlemore',
    name: 'David Castlemore',
    gender: 'male',
    elevenLabsId: 'XjLkpWUlnhS8i7gGz3lZ',
    description: 'Newsreader and educator'
  }
};

// Voice-specific settings (production standard - November 2025)
function getVoiceSettings(voiceId) {
  const voice = DEMO_VOICES[voiceId];
  if (!voice) {
    throw new Error(`Voice ${voiceId} not found in DEMO_VOICES`);
  }

  // Base settings for all voices
  const baseSettings = {
    voice_id: voice.elevenLabsId,
    model_id: 'eleven_monolingual_v1',
    speed: 0.90,  // Generate at default
    output_format: 'mp3_44100_128',
    apply_text_normalization: 'auto'
  };

  // Voice-specific optimizations (production settings)
  const voiceOptimizations = {
    // A1 Voices
    hope: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.05,
      use_speaker_boost: true
    },
    daniel: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true
    },
    // A2 Voices
    arabella: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true
    },
    grandpa_spuds: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true
    },
    // B1 Voices
    jane: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true
    },
    james: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true
    },
    // B2 Voices
    zara: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true
    },
    // C1 Voices
    sally_ford: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true
    },
    frederick_surrey: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true
    },
    // C2 Voices
    vivie: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.2,
      use_speaker_boost: true
    },
    john_doe: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true
    },
    // Original Voices
    sarah: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.05,
      use_speaker_boost: true
    },
    david_castlemore: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true
    }
  };

  return {
    ...baseSettings,
    voice_settings: voiceOptimizations[voiceId] || voiceOptimizations.daniel
  };
}

// Target speed after FFmpeg post-processing
const TARGET_SPEED = 0.85;

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
          speed: voiceSettings.speed,
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
 */
async function slowAudioWithFFmpeg(inputFilePath, outputFilePath, speedRatio) {
  console.log(`\n🎚️ Slowing audio to ${speedRatio}× using FFmpeg...`);
  
  const command = `ffmpeg -i "${inputFilePath}" -filter:a "atempo=${speedRatio}" -y "${outputFilePath}"`;
  
  try {
    await execAsync(command);
    console.log(`✅ Audio slowed successfully`);
    
    const stats = await fs.stat(outputFilePath);
    console.log(`📦 Output file size: ${(stats.size / 1024).toFixed(1)}KB`);
    
    return outputFilePath;
  } catch (error) {
    throw new Error(`FFmpeg processing failed: ${error.message}`);
  }
}

/**
 * Calculate proportional sentence timings (Solution 1 + Enhanced Timing v3)
 */
function calculateProportionalTimings(sentences, totalDuration) {
  const totalCharacters = sentences.reduce((sum, sentence) => sum + sentence.text.length, 0);

  const sentencePenalties = sentences.map(sentence => {
    const commaCount = (sentence.text.match(/,/g) || []).length;
    const semicolonCount = (sentence.text.match(/;/g) || []).length;
    const colonCount = (sentence.text.match(/:/g) || []).length;
    const emdashCount = (sentence.text.match(/—/g) || []).length;
    const ellipsisCount = (sentence.text.match(/\.\.\./g) || []).length;

    let pausePenalty = (commaCount * 0.15) +
                       (semicolonCount * 0.25) +
                       (colonCount * 0.20) +
                       (emdashCount * 0.18) +
                       (ellipsisCount * 0.12);

    pausePenalty = Math.min(pausePenalty, 0.6);

    return { sentence, pausePenalty };
  });

  const totalPauseBudget = sentencePenalties.reduce((sum, item) => sum + item.pausePenalty, 0);
  let remainingDuration = totalDuration - totalPauseBudget;

  if (remainingDuration < 0) {
    const scaleFactor = totalDuration * 0.8 / totalPauseBudget;
    sentencePenalties.forEach(item => {
      item.pausePenalty *= scaleFactor;
    });
    remainingDuration = totalDuration * 0.2;
    console.warn(`⚠️ Pause budget exceeded duration, scaled down`);
  }

  const timings = sentencePenalties.map((item, index) => {
    const characterRatio = item.sentence.text.length / totalCharacters;
    const baseDuration = remainingDuration * characterRatio;
    let adjustedDuration = baseDuration + item.pausePenalty;
    adjustedDuration = Math.max(adjustedDuration, 0.25);

    return { index, sentence: item.sentence, adjustedDuration };
  });

  const currentTotal = timings.reduce((sum, t) => sum + t.adjustedDuration, 0);
  const renormalizeFactor = totalDuration / currentTotal;

  if (Math.abs(renormalizeFactor - 1.0) > 0.001) {
    console.log(`📊 Renormalizing timings: ${currentTotal.toFixed(3)}s → ${totalDuration.toFixed(3)}s`);
    timings.forEach(t => {
      t.adjustedDuration *= renormalizeFactor;
    });
  }

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
async function updateDemoContent(level, voiceId, audioMetadata) {
  console.log('\n📝 Updating demo content JSON...');

  const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));

  // Convert "Original" to "original" for JSON lookup
  const levelKey = level === 'Original' ? 'original' : level;

  if (!demoContent.levels[levelKey]) {
    throw new Error(`Level ${levelKey} not found in demo content`);
  }

  if (!demoContent.levels[levelKey].audio) {
    demoContent.levels[levelKey].audio = {};
  }

  const voice = DEMO_VOICES[voiceId];
  const voiceSettings = getVoiceSettings(voiceId);

  demoContent.levels[levelKey].audio[voiceId] = {
    url: `/audio/demo/pride-prejudice-${level.toLowerCase()}-${voice.fileId}-enhanced.mp3`,
    filename: `pride-prejudice-${level.toLowerCase()}-${voice.fileId}-enhanced.mp3`,
    duration: audioMetadata.measuredDuration,
    originalDuration: audioMetadata.originalDuration,
    size: audioMetadata.fileSize || 0,
    generatedAt: new Date().toISOString(),
    voice: voice.elevenLabsId,
    settings: {
      voice_id: voice.elevenLabsId,
      model_id: voiceSettings.model_id,
      voice_settings: voiceSettings.voice_settings,
      speed: TARGET_SPEED,
      originalSpeed: voiceSettings.speed,
      processingMethod: 'ffmpeg-atempo',
      speedIncrease: audioMetadata.speedIncrease,
      output_format: voiceSettings.output_format,
      apply_text_normalization: voiceSettings.apply_text_normalization
    },
    sentenceTimings: audioMetadata.sentenceTimings,
    metadata: {
      version: 3,
      method: 'ffprobe-enhanced-timing',
      timingStrategy: 'character-proportion-with-punctuation-penalties'
    }
  };

  await fs.writeFile(DEMO_CONTENT_PATH, JSON.stringify(demoContent, null, 2));
  console.log('✅ Demo content JSON updated');
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('❌ Usage: node scripts/regenerate-hero-voice-0.83.js [LEVEL] [VOICE_ID]');
    console.error('   Example: node scripts/regenerate-hero-voice-0.83.js A1 daniel');
    console.error('   Example: node scripts/regenerate-hero-voice-0.83.js A2 arabella');
    process.exit(1);
  }

  const levelArg = args[0].toUpperCase();
  const voiceId = args[1].toLowerCase();

  // Validate level
  const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'ORIGINAL'];
  if (!validLevels.includes(levelArg)) {
    console.error(`❌ Invalid level: ${levelArg}. Must be one of: ${validLevels.join(', ')}`);
    process.exit(1);
  }

  // Convert ORIGINAL to lowercase "original" for JSON lookup
  const level = levelArg === 'ORIGINAL' ? 'original' : levelArg;

  // Validate voice
  if (!DEMO_VOICES[voiceId]) {
    console.error(`❌ Invalid voice ID: ${voiceId}`);
    console.error(`   Available voices: ${Object.keys(DEMO_VOICES).join(', ')}`);
    process.exit(1);
  }

  const voice = DEMO_VOICES[voiceId];
  const voiceSettings = getVoiceSettings(voiceId);

  console.log('🎯 Hero Section Audio Regeneration');
  console.log(`📋 Level: ${levelArg}`);
  console.log(`🎤 Voice: ${voice.name} (${voice.gender})`);
  console.log(`⚙️ Target Speed: 0.85× (using FFmpeg post-processing - balanced pace/quality)`);
  console.log(`🔧 Method: Generate at default → FFmpeg slow → Solution 1 (ffprobe + Enhanced Timing v3)`);
  console.log('');

  try {
    // Load demo content
    console.log('📖 Loading demo content...');
    const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));

    const levelKey = level; // Already converted above
    if (!demoContent.levels[levelKey]) {
      throw new Error(`Level ${levelKey} not found in demo content`);
    }

    const levelData = demoContent.levels[levelKey];
    console.log(`📝 ${levelKey} text: "${levelData.text.substring(0, 80)}..."`);
    console.log(`📊 Sentences: ${levelData.sentences.length}`);

    // Generate audio at default speed
    console.log(`\n🎵 Generating audio with ${voice.name} voice at default speed...`);
    const audioBuffer = await generateAudioWithRetry(levelData.text, voiceSettings);

    // Ensure output directory exists
    await fs.mkdir(AUDIO_OUTPUT_DIR, { recursive: true });
    await fs.mkdir(path.join(process.cwd(), 'temp'), { recursive: true });

    // Save original audio to temp file
    const tempOriginalFile = path.join(process.cwd(), 'temp', `${levelKey.toLowerCase()}-${voiceId}-original-${Date.now()}.mp3`);
    await fs.writeFile(tempOriginalFile, audioBuffer);
    console.log(`💾 Original audio saved to temp file`);

    // Measure original duration
    console.log('\n📏 Measuring original audio duration...');
    const originalDuration = await measureAudioDuration(tempOriginalFile);
    console.log(`📊 Original duration: ${originalDuration.toFixed(3)}s`);

    // Slow down audio using FFmpeg
    const tempSlowedFile = path.join(process.cwd(), 'temp', `${levelKey.toLowerCase()}-${voiceId}-slowed-${Date.now()}.mp3`);
    await slowAudioWithFFmpeg(tempOriginalFile, tempSlowedFile, TARGET_SPEED);

    // Measure slowed duration
    console.log('\n📏 Measuring slowed audio duration (Solution 1)...');
    const measuredDuration = await measureAudioDuration(tempSlowedFile);
    console.log(`📊 Slowed duration: ${measuredDuration.toFixed(3)}s (${((measuredDuration / originalDuration - 1) * 100).toFixed(1)}% longer)`);

    // Calculate proportional sentence timings
    console.log('\n⏱️ Calculating sentence timings (Enhanced Timing v3)...');
    const sentenceTimings = calculateProportionalTimings(levelData.sentences, measuredDuration);

    // Copy slowed audio to final location
    const fileName = `pride-prejudice-${levelKey.toLowerCase()}-${voice.fileId}-enhanced.mp3`;
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
      voiceId: voice.elevenLabsId,
      voiceName: voice.name,
      level: levelKey,
      fileName: fileName,
      measuredDuration: measuredDuration,
      originalDuration: originalDuration,
      sentenceTimings: sentenceTimings,
      fileSize: fileStats.size,
      voiceSettings: voiceSettings.voice_settings,
      speed: TARGET_SPEED,
      originalSpeed: voiceSettings.speed,
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

    // Update demo content JSON (convert back to proper case for updateDemoContent)
    const updateLevelKey = levelKey === 'original' ? 'Original' : levelKey;
    await updateDemoContent(updateLevelKey, voiceId, metadata);

    console.log('\n✅ REGENERATION COMPLETE!');
    console.log(`📊 Summary:`);
    console.log(`   Level: ${levelKey}`);
    console.log(`   Voice: ${voice.name}`);
    console.log(`   Speed: 0.85×`);
    console.log(`   Duration: ${measuredDuration.toFixed(3)}s`);
    console.log(`   Sentences: ${sentenceTimings.length}`);
    console.log(`   File: ${fileName}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run script
main();

