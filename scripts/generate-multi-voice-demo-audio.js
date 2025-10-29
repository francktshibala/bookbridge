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
 * Calculate proportional sentence timings (Solution 1 + Enhanced Timing Fix v2)
 *
 * ENHANCED FIX v2 (Oct 29, 2025): GPT-5 validated approach
 * - Character-count proportion + punctuation penalties
 * - CRITICAL: Subtracts pause budget FIRST to avoid overshooting totalDuration
 * - Reference: AUDIO_SYNC_IMPLEMENTATION_GUIDE.md
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

    // Natural speech pause durations (empirically validated with ElevenLabs TTS)
    let pausePenalty = (commaCount * 0.15) +        // 150ms per comma
                       (semicolonCount * 0.25) +     // 250ms per semicolon
                       (colonCount * 0.20) +         // 200ms per colon
                       (emdashCount * 0.18) +        // 180ms per em-dash
                       (ellipsisCount * 0.12);       // 120ms per ellipsis

    // GPT-5: Cap penalties per sentence to prevent overcorrection
    pausePenalty = Math.min(pausePenalty, 0.6); // Max 600ms pause per sentence

    return {
      sentence,
      pausePenalty,
      punctuationCounts: {
        commaCount,
        semicolonCount,
        colonCount,
        emdashCount,
        ellipsisCount
      }
    };
  });

  // STEP 2: Calculate total pause budget
  const totalPauseBudget = sentencePenalties.reduce((sum, item) => sum + item.pausePenalty, 0);

  // STEP 3: GPT-5 Critical Fix - Subtract pause budget from total duration FIRST
  let remainingDuration = totalDuration - totalPauseBudget;

  // Safeguard: If pause budget exceeds total duration, scale penalties down proportionally
  if (remainingDuration < 0) {
    const scaleFactor = totalDuration * 0.8 / totalPauseBudget; // Use 80% of duration for pauses max
    sentencePenalties.forEach(item => {
      item.pausePenalty *= scaleFactor;
    });
    remainingDuration = totalDuration * 0.2; // Leave 20% for actual content
    console.warn(`⚠️ Pause budget (${totalPauseBudget.toFixed(2)}s) exceeded duration, scaled down by ${scaleFactor.toFixed(2)}`);
  }

  // STEP 4: Distribute REMAINING time by character proportion
  const timings = sentencePenalties.map((item, index) => {
    const characterRatio = item.sentence.text.length / totalCharacters;
    const baseDuration = remainingDuration * characterRatio;

    // Add pause penalty back to get final duration
    let adjustedDuration = baseDuration + item.pausePenalty;

    // GPT-5: Enforce minimum duration per sentence
    adjustedDuration = Math.max(adjustedDuration, 0.25); // Min 250ms per sentence

    return {
      index,
      sentence: item.sentence,
      characterRatio,
      baseDuration,
      pausePenalty: item.pausePenalty,
      adjustedDuration,
      punctuationCounts: item.punctuationCounts
    };
  });

  // STEP 5: Renormalize to ensure sum(durations) === totalDuration exactly
  const currentTotal = timings.reduce((sum, t) => sum + t.adjustedDuration, 0);
  const renormalizeFactor = totalDuration / currentTotal;

  if (Math.abs(renormalizeFactor - 1.0) > 0.001) {
    console.log(`📊 Renormalizing timings: ${currentTotal.toFixed(3)}s → ${totalDuration.toFixed(3)}s (factor: ${renormalizeFactor.toFixed(4)})`);

    // Only scale the base durations, not the penalties (GPT-5 recommendation)
    timings.forEach(t => {
      t.baseDuration *= renormalizeFactor;
      t.adjustedDuration = t.baseDuration + t.pausePenalty;
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
      wordCount: t.sentence.wordCount,
      // Store complexity metrics for adaptive look-ahead (runtime optimization)
      complexity: {
        characterCount: t.sentence.text.length,
        pausePenalty: parseFloat(t.pausePenalty.toFixed(3)),
        punctuationCount: Object.values(t.punctuationCounts).reduce((a, b) => a + b, 0),
        ...t.punctuationCounts
      }
    };
  });

  // Validation: Ensure final timing matches totalDuration
  const finalTotal = finalTimings[finalTimings.length - 1].endTime;
  if (Math.abs(finalTotal - totalDuration) > 0.01) {
    console.warn(`⚠️ Timing mismatch: calculated ${finalTotal.toFixed(3)}s vs actual ${totalDuration.toFixed(3)}s`);
  } else {
    console.log(`✅ Timing validation: ${finalTotal.toFixed(3)}s === ${totalDuration.toFixed(3)}s`);
  }

  return finalTimings;
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
    version: 3,  // v3: Enhanced Timing (character-count + punctuation penalties)
    voice: voice.name,
    voiceId: voice.elevenLabsId,
    voiceFileId: voice.fileId,
    gender: voice.gender,
    level: level,
    measuredDuration: measuredDuration,
    sentenceTimings: sentenceTimings,
    voiceSettings: voiceSettings.voice_settings,
    measuredAt: new Date().toISOString(),
    method: 'ffprobe-enhanced-timing',  // Updated method name
    timingStrategy: 'character-proportion-with-punctuation-penalties',
    phase: 'multi_voice_demo_testing',
    notes: 'Phase 4: Multi-voice demo testing - Enhanced timing fix for complex sentences'
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
  console.log('✨ NOW WITH ENHANCED TIMING FIX (character-count + punctuation penalties)\n');

  // Check for command-line arguments: node script.js [level] [voiceId]
  const args = process.argv.slice(2);
  const targetLevel = args[0]?.toUpperCase(); // e.g., "B1"
  const targetVoiceId = args[1]?.toLowerCase(); // e.g., "jane"

  if (targetLevel && targetVoiceId) {
    console.log(`🎯 TARGETED GENERATION MODE`);
    console.log(`   Level: ${targetLevel}`);
    console.log(`   Voice: ${targetVoiceId}\n`);
  } else if (targetLevel || targetVoiceId) {
    console.error('❌ Error: Both level and voiceId required for targeted generation');
    console.error('   Usage: node script.js B1 jane');
    console.error('   Or run without arguments to generate all voices');
    process.exit(1);
  } else {
    console.log('📋 Generating all voice variations for user preference testing\n');
    console.log('💰 Estimated cost: ~$10 (vs $500+ for full book generation)\n');
  }

  // Ensure output directory exists
  await fs.mkdir(AUDIO_OUTPUT_DIR, { recursive: true });

  // Load demo content to check which levels exist
  const demoContent = JSON.parse(await fs.readFile(DEMO_CONTENT_PATH, 'utf8'));
  const availableLevels = Object.keys(demoContent.levels);

  console.log(`📝 Available levels in demo content: ${availableLevels.join(', ')}`);

  // Build generation tasks
  const tasks = [];

  if (targetLevel && targetVoiceId) {
    // TARGETED MODE: Generate single voice
    if (!availableLevels.includes(targetLevel)) {
      console.error(`❌ Error: Level ${targetLevel} not found in demo content`);
      process.exit(1);
    }

    if (!DEMO_VOICES[targetVoiceId]) {
      console.error(`❌ Error: Voice ${targetVoiceId} not found`);
      console.error(`   Available voices: ${Object.keys(DEMO_VOICES).join(', ')}`);
      process.exit(1);
    }

    tasks.push({ voiceId: targetVoiceId, level: targetLevel });
    console.log(`\n✅ Targeting single voice: ${DEMO_VOICES[targetVoiceId].name} at ${targetLevel} level\n`);

  } else {
    // FULL MODE: Generate all voices
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
  }

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
