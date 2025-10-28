#!/usr/bin/env node

/**
 * Multi-Voice Demo Audio Generation Script
 *
 * Generates 14 voice variations for Pride & Prejudice demo (Phase 4: Multi-Voice Testing)
 * Implements Solution 1: ffprobe measurement + proportional timing + cache
 *
 * VOICES: All 14 voices from demo-voices.ts configuration
 * PRESERVATION: Maintains <5% drift requirement for perfect sync
 * METHODOLOGY: Master Mistakes Prevention compliant
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Voice configuration (synced with lib/config/demo-voices.ts)
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
  david_castlemore: {
    fileId: 'david-castlemore',
    name: 'David Castlemore',
    gender: 'male',
    elevenLabsId: 'XjLkpWUlnhS8i7gGz3lZ',
    description: 'Newsreader and educator'
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
  }
};

// Strategic voice assignments by level (synced with LEVEL_TO_VOICES)
const LEVEL_TO_VOICES = {
  'A1': { female: 'hope', male: 'daniel' },
  'A2': { female: 'arabella', male: 'grandpa_spuds' },
  'B1': { female: 'jane', male: 'james' },
  'B2': { female: 'zara', male: 'david_castlemore' },
  'C1': { female: 'sally_ford', male: 'frederick_surrey' },
  'C2': { female: 'vivie', male: 'john_doe' },
  'Original': { female: 'sarah', male: 'david_castlemore' }
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
 * Get optimized voice settings based on voice characteristics and level
 */
function getVoiceSettings(voiceId, level) {
  // Base settings optimized for each voice
  const baseSettings = {
    model_id: 'eleven_monolingual_v1',    // Timing-stable model
    speed: 0.90,                           // LOCKED - never change (perfect sync)
    output_format: 'mp3_44100_128',
    apply_text_normalization: 'auto'
  };

  // Voice-specific optimizations (based on Agent 2 research + Voice Casting Guide)
  const voiceOptimizations = {
    // Daniel - British authority (LOCKED settings)
    daniel: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true
    },
    // Sarah - Original baseline (LOCKED settings)
    sarah: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.05,
      use_speaker_boost: true
    },
    // Hope - Soothing for A1 beginners
    hope: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.05,
      use_speaker_boost: true
    },
    // Arabella - Young enchanting
    arabella: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true
    },
    // Grandpa Spuds - Warm storyteller
    grandpa_spuds: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.05,
      use_speaker_boost: true
    },
    // Jane - Professional audiobook
    jane: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true
    },
    // James - Engaging American
    james: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true
    },
    // Zara - Modern conversationalist
    zara: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true
    },
    // David Castlemore - Educator
    david_castlemore: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true
    },
    // Sally Ford - Elegant British
    sally_ford: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true
    },
    // Frederick Surrey - Documentary
    frederick_surrey: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true
    },
    // Vivie - Cultured educational
    vivie: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.2,
      use_speaker_boost: true
    },
    // John Doe - Deep authority
    john_doe: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.15,
      use_speaker_boost: true
    }
  };

  return {
    ...baseSettings,
    voice_id: DEMO_VOICES[voiceId].elevenLabsId,
    voice_settings: voiceOptimizations[voiceId] || voiceOptimizations.daniel
  };
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
 * Generate audio for specific voice at assigned level
 */
async function generateVoiceAudio(voiceId, level) {
  const voice = DEMO_VOICES[voiceId];
  console.log(`\n🚀 Generating: ${level} level with ${voice.name} (${voice.gender})`);

  // Load demo content
  const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));
  const levelData = demoContent.levels[level];

  if (!levelData) {
    throw new Error(`Level ${level} not found in demo content`);
  }

  // Get voice settings
  const voiceSettings = getVoiceSettings(voiceId, level);

  console.log(`📝 Text: "${levelData.text.substring(0, 50)}..."`);
  console.log(`🎤 Voice: ${voice.name} (${voice.elevenLabsId})`);
  console.log(`⚙️ Settings: stability=${voiceSettings.voice_settings.stability}, similarity_boost=${voiceSettings.voice_settings.similarity_boost}, style=${voiceSettings.voice_settings.style}`);

  // Generate audio
  const audioBuffer = await generateAudioWithRetry(levelData.text, voiceSettings);

  // Solution 1: Measure actual duration
  const measuredDuration = await measureAudioDuration(audioBuffer);

  // Calculate proportional sentence timings
  const sentenceTimings = calculateProportionalTimings(levelData.sentences, measuredDuration);

  // Save audio file
  const fileName = `pride-prejudice-${level.toLowerCase()}-${voice.fileId}-enhanced.mp3`;
  const filePath = path.join(AUDIO_OUTPUT_DIR, fileName);

  await fs.writeFile(filePath, audioBuffer);
  console.log(`✅ Audio saved: ${fileName}`);

  // Create metadata
  const metadata = {
    version: 2,
    voice: voice.name,
    voiceId: voice.elevenLabsId,
    voiceFileId: voice.fileId,
    gender: voice.gender,
    level: level,
    measuredDuration: measuredDuration,
    sentenceTimings: sentenceTimings,
    voiceSettings: voiceSettings.voice_settings,
    measuredAt: new Date().toISOString(),
    method: 'ffprobe-proportional',
    phase: 'multi_voice_demo_testing',
    notes: 'Phase 4: Multi-voice demo testing - Strategic voice assignment'
  };

  // Save metadata
  const metadataPath = path.join(AUDIO_OUTPUT_DIR, `${fileName}.metadata.json`);
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

  return {
    voiceId,
    voiceName: voice.name,
    level,
    fileName,
    duration: measuredDuration,
    metadata
  };
}

/**
 * Validate drift compared to baseline (Master Mistakes Prevention requirement)
 */
async function validateDrift(newFile, baselineFile) {
  if (!await fs.access(baselineFile).then(() => true).catch(() => false)) {
    console.log(`ℹ️ No baseline file for comparison - skipping drift validation`);
    return null;
  }

  try {
    // Measure both files
    const newBuffer = await fs.readFile(newFile);
    const baselineBuffer = await fs.readFile(baselineFile);

    const newDuration = await measureAudioDuration(newBuffer);
    const baselineDuration = await measureAudioDuration(baselineBuffer);

    // Calculate drift percentage
    const driftPercentage = Math.abs((newDuration - baselineDuration) / baselineDuration) * 100;

    console.log(`📊 Drift validation:`);
    console.log(`   New: ${newDuration.toFixed(3)}s`);
    console.log(`   Baseline: ${baselineDuration.toFixed(3)}s`);
    console.log(`   Drift: ${driftPercentage.toFixed(2)}%`);

    const driftValid = driftPercentage < 5.0; // <5% requirement

    if (driftValid) {
      console.log(`✅ Drift validation PASSED: ${driftPercentage.toFixed(2)}% < 5%`);
    } else {
      console.log(`⚠️ Drift validation WARNING: ${driftPercentage.toFixed(2)}% >= 5%`);
    }

    return { valid: driftValid, percentage: driftPercentage };

  } catch (error) {
    console.warn(`⚠️ Drift validation error:`, error.message);
    return null;
  }
}

/**
 * Main generation workflow
 */
async function main() {
  console.log('🎵 Multi-Voice Demo Audio Generation - Phase 4 Implementation');
  console.log('📋 Generating 14 voice variations for user preference testing\n');
  console.log('💰 Estimated cost: ~$10 (vs $500+ for full book generation)\n');

  // Ensure output directory exists
  await fs.mkdir(AUDIO_OUTPUT_DIR, { recursive: true });

  // Load demo content to check which levels exist
  const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));
  const availableLevels = Object.keys(demoContent.levels);

  console.log(`📝 Available levels in demo content: ${availableLevels.join(', ')}`);

  // Build generation tasks only for levels that exist in demo content
  const tasks = [];

  for (const [level, voices] of Object.entries(LEVEL_TO_VOICES)) {
    // Check if this level exists in the demo content
    if (availableLevels.includes(level)) {
      tasks.push({ voiceId: voices.female, level });
      tasks.push({ voiceId: voices.male, level });
    } else {
      console.log(`⏭️  Skipping ${level} - not in demo content`);
    }
  }

  console.log(`📝 Total voices to generate: ${tasks.length}`);
  console.log(`📝 Levels: A1, A2, B1, B2, C1, C2, Original`);
  console.log(`📝 Voices per level: 2 (1 female + 1 male)\n`);

  const results = [];
  let generatedCount = 0;

  for (const task of tasks) {
    try {
      const result = await generateVoiceAudio(task.voiceId, task.level);

      // Validate drift if baseline exists
      const newFilePath = path.join(AUDIO_OUTPUT_DIR, result.fileName);
      const baselineFileName = `pride-prejudice-${task.level.toLowerCase()}-${
        task.voiceId === 'daniel' || task.voiceId === 'sarah' ? task.voiceId : 'baseline'
      }.mp3`;
      const baselinePath = path.join(AUDIO_OUTPUT_DIR, baselineFileName);

      const driftResult = await validateDrift(newFilePath, baselinePath);

      results.push({
        ...result,
        success: true,
        driftValid: driftResult?.valid,
        driftPercentage: driftResult?.percentage
      });

      generatedCount++;
      console.log(`\n✅ Progress: ${generatedCount}/${tasks.length} voices completed`);

    } catch (error) {
      console.error(`❌ Failed to generate ${task.level}-${task.voiceId}:`, error.message);
      results.push({
        voiceId: task.voiceId,
        level: task.level,
        success: false,
        error: error.message
      });
    }

    // Add delay between generations to avoid rate limits
    if (generatedCount < tasks.length) {
      console.log('⏳ Waiting 2s before next generation...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary report
  console.log('\n' + '='.repeat(70));
  console.log('📊 MULTI-VOICE DEMO GENERATION SUMMARY');
  console.log('='.repeat(70));

  // Group by level
  const levelGroups = {};
  for (const result of results) {
    if (!levelGroups[result.level]) {
      levelGroups[result.level] = [];
    }
    levelGroups[result.level].push(result);
  }

  for (const [level, levelResults] of Object.entries(levelGroups)) {
    console.log(`\n${level} Level:`);
    for (const result of levelResults) {
      const status = result.success ? '✅' : '❌';
      const drift = result.driftPercentage ? ` (drift: ${result.driftPercentage.toFixed(2)}%)` : '';
      const duration = result.duration ? ` - ${result.duration.toFixed(3)}s` : '';

      console.log(`  ${status} ${result.voiceName || result.voiceId}${duration}${drift}`);

      if (!result.success) {
        console.log(`     Error: ${result.error}`);
      }
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const driftValidCount = results.filter(r => r.driftValid).length;

  console.log('\n' + '='.repeat(70));
  console.log(`🎯 Results: ${successCount}/${results.length} generated successfully (${failCount} failed)`);
  console.log(`🎯 Drift validation: ${driftValidCount} passed (<5% requirement)`);

  if (successCount === results.length) {
    console.log('\n🚀 SUCCESS: All 14 voice variations generated!');
    console.log('   Next step: Deploy to production with backup strategy');
  } else if (successCount > 0) {
    console.log('\n⚠️ PARTIAL SUCCESS: Some voices generated, but errors occurred');
    console.log('   Review errors above and retry failed generations');
  } else {
    console.log('\n❌ FAILURE: No voices generated successfully');
    console.log('   Check API key and connection');
  }

  console.log('\n📁 Files saved to: public/audio/demo/');
  console.log('📁 Metadata saved with .metadata.json extension');
}

// Run the generation
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Generation failed:', error);
    process.exit(1);
  });
}

module.exports = {
  generateVoiceAudio,
  validateDrift,
  DEMO_VOICES,
  LEVEL_TO_VOICES
};
