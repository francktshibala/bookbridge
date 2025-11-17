#!/usr/bin/env node

/**
 * PILOT TEST: ElevenLabs v2 with Frederick Surrey (C1)
 *
 * Purpose: Test v2 upgrade with optimized parameters before full rollout
 *
 * What this does:
 * 1. Generates C1 Pride & Prejudice text with ElevenLabs v2
 * 2. Uses new parameters: stability 0.42, similarity_boost 0.68, style 0.25
 * 3. Applies male post-processing chain (warmth, presence, air)
 * 4. Measures drift (must be <5%)
 * 5. Creates side-by-side comparison files for A/B testing
 *
 * Cost: ~$0.50 (one 40-second audio file)
 * Branch: experimental/mindblowing-voices
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in .env.local');
  process.exit(1);
}

// Test configuration
const TEST_CONFIG = {
  voice: {
    name: 'Frederick Surrey',
    voice_id: 'j9jfwdrw7BRfcR43Qohk', // Frederick Surrey voice ID from ElevenLabs
    gender: 'male',
    level: 'C1',
    description: 'British documentary narrator - intrigue and wonder'
  },

  // V2 OPTIMIZED PARAMETERS (from Agent 4 research)
  v2_settings: {
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.42,           // Down from 0.45 (more expressiveness)
      similarity_boost: 0.68,     // Down from 0.80 (warmer, less digital)
      style: 0.25,               // Up from 0.20 (more emotional engagement)
      use_speaker_boost: true
    },
    speed: 0.90  // LOCKED (sync requirement)
  },

  // Current v1 settings for comparison
  v1_settings: {
    model_id: 'eleven_monolingual_v1',
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.80,
      style: 0.20,
      use_speaker_boost: true
    },
    speed: 0.90
  },

  output_dir: path.join(__dirname, '..', 'public', 'audio', 'pilot-test'),
  demo_data_path: path.join(__dirname, '..', 'public', 'data', 'demo', 'pride-prejudice-demo.json')
};

// Male post-processing chain (from Agent 2 research)
const MALE_POST_PROCESSING = `
highpass=f=30,
lowpass=f=18000,
equalizer=f=120:width_type=h:width=2:g=2.0,
equalizer=f=3500:width_type=h:width=2:g=2.0,
equalizer=f=11000:width_type=h:width=2:g=1.5,
aphaser=in_gain=0.3:out_gain=0.3:delay=3.0:decay=0.4:speed=0.5:type=t,
equalizer=f=7000:width_type=h:width=1:g=-3,
compand=attacks=0.10:decays=0.30:points=-90/-90|-20/-15|-10/-5|0/-2,
alimiter=limit=0.95
`.replace(/\n/g, '').trim();

async function loadDemoText() {
  console.log('\n📖 Loading C1 demo text...');
  const demoData = JSON.parse(await fs.readFile(TEST_CONFIG.demo_data_path, 'utf-8'));
  const c1Text = demoData.levels.C1.text;
  console.log(`✅ Loaded: ${c1Text.substring(0, 100)}...`);
  console.log(`📊 Character count: ${c1Text.length}`);
  return c1Text;
}

async function generateAudio(text, settings, outputFilename) {
  console.log(`\n🎙️  Generating audio: ${outputFilename}`);
  console.log(`   Model: ${settings.model_id}`);
  console.log(`   Stability: ${settings.voice_settings.stability}`);
  console.log(`   Similarity Boost: ${settings.voice_settings.similarity_boost}`);
  console.log(`   Style: ${settings.voice_settings.style}`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${TEST_CONFIG.voice.voice_id}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        model_id: settings.model_id,
        voice_settings: {
          stability: settings.voice_settings.stability,
          similarity_boost: settings.voice_settings.similarity_boost,
          style: settings.voice_settings.style || 0,
          use_speaker_boost: settings.voice_settings.use_speaker_boost
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const outputPath = path.join(TEST_CONFIG.output_dir, outputFilename);
  await fs.writeFile(outputPath, Buffer.from(audioBuffer));

  console.log(`✅ Audio saved: ${outputPath}`);
  return outputPath;
}

async function measureDuration(audioPath) {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  );
  return parseFloat(stdout.trim());
}

async function applyPostProcessing(inputPath, outputPath) {
  console.log(`\n🎛️  Applying male post-processing chain...`);
  console.log(`   Input: ${inputPath}`);
  console.log(`   Output: ${outputPath}`);

  await execAsync(
    `ffmpeg -i "${inputPath}" -af "${MALE_POST_PROCESSING}" -c:a mp3 -b:a 192k "${outputPath}" -y`
  );

  console.log(`✅ Post-processing complete`);
}

async function runPilotTest() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 PILOT TEST: ElevenLabs v2 Enhancement');
  console.log('   Voice: Frederick Surrey (C1 British Documentary)');
  console.log('   Text: Pride & Prejudice C1 (Hero Section Demo)');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // Create output directory
    await fs.mkdir(TEST_CONFIG.output_dir, { recursive: true });
    console.log(`\n📁 Output directory: ${TEST_CONFIG.output_dir}`);

    // Load demo text
    const c1Text = await loadDemoText();

    // ==========================================
    // PHASE 1: Generate v1 baseline (current)
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 1: Baseline (v1 - Current Production)');
    console.log('='.repeat(60));

    const v1RawPath = await generateAudio(c1Text, TEST_CONFIG.v1_settings, 'frederick-c1-v1-raw.mp3');
    const v1Duration = await measureDuration(v1RawPath);
    console.log(`⏱️  v1 Duration: ${v1Duration.toFixed(2)}s`);

    // ==========================================
    // PHASE 2: Generate v2 with new parameters
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 2: Enhanced (v2 - New Parameters)');
    console.log('='.repeat(60));

    const v2RawPath = await generateAudio(c1Text, TEST_CONFIG.v2_settings, 'frederick-c1-v2-raw.mp3');
    const v2RawDuration = await measureDuration(v2RawPath);
    console.log(`⏱️  v2 Raw Duration: ${v2RawDuration.toFixed(2)}s`);

    // ==========================================
    // PHASE 3: Apply post-processing
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 3: Post-Processing (Warmth + Presence + Air)');
    console.log('='.repeat(60));

    const v2ProcessedPath = path.join(TEST_CONFIG.output_dir, 'frederick-c1-v2-enhanced.mp3');
    await applyPostProcessing(v2RawPath, v2ProcessedPath);

    const v2ProcessedDuration = await measureDuration(v2ProcessedPath);
    console.log(`⏱️  v2 Processed Duration: ${v2ProcessedDuration.toFixed(2)}s`);

    // ==========================================
    // PHASE 4: Measure drift
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 4: Drift Analysis');
    console.log('='.repeat(60));

    const modelDrift = Math.abs(v2RawDuration - v1Duration) / v1Duration * 100;
    const processingDrift = Math.abs(v2ProcessedDuration - v2RawDuration) / v2RawDuration * 100;
    const totalDrift = Math.abs(v2ProcessedDuration - v1Duration) / v1Duration * 100;

    console.log(`\n📊 Drift Measurements:`);
    console.log(`   v1 → v2 (model change):     ${modelDrift.toFixed(2)}% ${modelDrift < 2 ? '✅ PASS' : '❌ FAIL'} (target: <2%)`);
    console.log(`   v2 raw → processed:          ${processingDrift.toFixed(2)}% ${processingDrift < 0.1 ? '✅ PASS' : '❌ FAIL'} (target: <0.1%)`);
    console.log(`   v1 → v2 enhanced (total):    ${totalDrift.toFixed(2)}% ${totalDrift < 5 ? '✅ PASS' : '❌ FAIL'} (target: <5%)`);

    // ==========================================
    // RESULTS SUMMARY
    // ==========================================
    console.log('\n' + '═'.repeat(60));
    console.log('📋 PILOT TEST RESULTS');
    console.log('═'.repeat(60));

    console.log(`\n✅ Files Generated:`);
    console.log(`   1. ${v1RawPath}`);
    console.log(`      → v1 baseline (current production)`);
    console.log(`   2. ${v2RawPath}`);
    console.log(`      → v2 with new parameters (no post-processing)`);
    console.log(`   3. ${v2ProcessedPath}`);
    console.log(`      → v2 + post-processing (full enhancement)`);

    console.log(`\n📊 Duration Comparison:`);
    console.log(`   v1 baseline:        ${v1Duration.toFixed(2)}s`);
    console.log(`   v2 raw:             ${v2RawDuration.toFixed(2)}s (${modelDrift >= 0 ? '+' : ''}${(v2RawDuration - v1Duration).toFixed(2)}s)`);
    console.log(`   v2 enhanced:        ${v2ProcessedDuration.toFixed(2)}s (${totalDrift >= 0 ? '+' : ''}${(v2ProcessedDuration - v1Duration).toFixed(2)}s)`);

    const allTestsPassed = modelDrift < 2 && processingDrift < 0.1 && totalDrift < 5;

    console.log(`\n${allTestsPassed ? '🎉' : '⚠️'} Overall Result: ${allTestsPassed ? 'PASS ✅' : 'NEEDS ATTENTION ⚠️'}`);

    if (allTestsPassed) {
      console.log(`\n✅ Technical validation PASSED!`);
      console.log(`   → Drift is within <5% requirement`);
      console.log(`   → Post-processing preserves duration`);
      console.log(`   → Safe to proceed to A/B user testing`);
    } else {
      console.log(`\n⚠️  Technical validation needs attention:`);
      if (modelDrift >= 2) console.log(`   ⚠️  Model drift (${modelDrift.toFixed(2)}%) exceeds 2% threshold`);
      if (processingDrift >= 0.1) console.log(`   ⚠️  Processing drift (${processingDrift.toFixed(2)}%) exceeds 0.1% threshold`);
      if (totalDrift >= 5) console.log(`   ⚠️  Total drift (${totalDrift.toFixed(2)}%) exceeds 5% requirement`);
    }

    console.log(`\n📝 Next Steps:`);
    console.log(`   1. Listen to both versions side-by-side:`);
    console.log(`      → v1: ${path.basename(v1RawPath)}`);
    console.log(`      → v2: ${path.basename(v2ProcessedPath)}`);
    console.log(`   2. Run A/B test with 3-5 users`);
    console.log(`   3. Collect preference data (target: >80% prefer v2)`);
    console.log(`   4. If both tests pass → Proceed to full rollout`);

    console.log(`\n💰 Cost: ~$0.50 (2 audio generations)`);
    console.log(`\n═══════════════════════════════════════════════════════════\n`);

    // Save results to JSON for programmatic access
    const results = {
      timestamp: new Date().toISOString(),
      voice: TEST_CONFIG.voice,
      text_length: c1Text.length,
      durations: {
        v1_baseline: v1Duration,
        v2_raw: v2RawDuration,
        v2_enhanced: v2ProcessedDuration
      },
      drift: {
        model_change: modelDrift,
        post_processing: processingDrift,
        total: totalDrift
      },
      tests_passed: {
        model_drift: modelDrift < 2,
        processing_drift: processingDrift < 0.1,
        total_drift: totalDrift < 5,
        overall: allTestsPassed
      },
      files: {
        v1_baseline: path.basename(v1RawPath),
        v2_raw: path.basename(v2RawPath),
        v2_enhanced: path.basename(v2ProcessedPath)
      }
    };

    const resultsPath = path.join(TEST_CONFIG.output_dir, 'pilot-test-results.json');
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
    console.log(`📄 Results saved: ${resultsPath}\n`);

  } catch (error) {
    console.error('\n❌ Error during pilot test:', error);
    process.exit(1);
  }
}

// Run the pilot test
runPilotTest();
