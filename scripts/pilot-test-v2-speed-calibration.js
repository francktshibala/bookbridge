#!/usr/bin/env node

/**
 * SPEED CALIBRATION TEST: Find Optimal v2 Speed Parameter
 *
 * Problem: Initial v2 test showed 11.39% drift (exceeds 5% requirement)
 * Root Cause: v2 multilingual model baseline speed differs from v1
 * Solution: Test multiple v2 speeds to find setting that brings drift <2%
 *
 * What this does:
 * 1. Uses v1 baseline from previous test (71.08s)
 * 2. Generates v2 at THREE speeds: 0.95, 0.98, 1.00
 * 3. Applies male post-processing to each
 * 4. Measures drift for each speed
 * 5. Recommends optimal speed based on <2% drift target
 *
 * Cost: ~$0.30 (3 audio generations)
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
    voice_id: 'j9jfwdrw7BRfcR43Qohk',
    gender: 'male',
    level: 'C1'
  },

  // v1 baseline (from previous test)
  v1_baseline_duration: 71.08, // seconds (from pilot-test-results.json)

  // Speed values to test
  test_speeds: [0.95, 0.98, 1.00],

  // V2 optimized parameters (from Agent 4 research)
  v2_base_settings: {
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.42,
      similarity_boost: 0.68,
      style: 0.25,
      use_speaker_boost: true
    }
  },

  output_dir: path.join(__dirname, '..', 'public', 'audio', 'pilot-test', 'speed-calibration'),
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
  console.log(`✅ Loaded: ${c1Text.substring(0, 80)}...`);
  console.log(`📊 Character count: ${c1Text.length}`);
  return c1Text;
}

async function generateAudio(text, speed, outputFilename) {
  console.log(`\n🎙️  Generating audio: ${outputFilename}`);
  console.log(`   Model: ${TEST_CONFIG.v2_base_settings.model_id}`);
  console.log(`   Speed: ${speed}×`);
  console.log(`   Stability: ${TEST_CONFIG.v2_base_settings.voice_settings.stability}`);
  console.log(`   Similarity Boost: ${TEST_CONFIG.v2_base_settings.voice_settings.similarity_boost}`);
  console.log(`   Style: ${TEST_CONFIG.v2_base_settings.voice_settings.style}`);

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
        model_id: TEST_CONFIG.v2_base_settings.model_id,
        voice_settings: {
          ...TEST_CONFIG.v2_base_settings.voice_settings,
          speed: speed
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
  console.log(`🎛️  Applying post-processing...`);
  await execAsync(
    `ffmpeg -i "${inputPath}" -af "${MALE_POST_PROCESSING}" -c:a mp3 -b:a 192k "${outputPath}" -y`
  );
  console.log(`✅ Post-processing complete`);
}

async function runSpeedCalibration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 SPEED CALIBRATION TEST: v2 Optimal Speed Discovery');
  console.log('   Voice: Frederick Surrey (C1)');
  console.log('   Goal: Find v2 speed that achieves <2% drift');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // Create output directory
    await fs.mkdir(TEST_CONFIG.output_dir, { recursive: true });
    console.log(`\n📁 Output directory: ${TEST_CONFIG.output_dir}`);

    // Load demo text
    const c1Text = await loadDemoText();

    console.log(`\n📊 v1 Baseline (from previous test): ${TEST_CONFIG.v1_baseline_duration.toFixed(2)}s`);

    // Store results for each speed
    const results = [];

    // Test each speed
    for (const speed of TEST_CONFIG.test_speeds) {
      console.log('\n' + '='.repeat(60));
      console.log(`TESTING: v2 at ${speed}× speed`);
      console.log('='.repeat(60));

      // Generate raw audio
      const rawFilename = `frederick-c1-v2-speed${speed}-raw.mp3`;
      const rawPath = await generateAudio(c1Text, speed, rawFilename);
      const rawDuration = await measureDuration(rawPath);
      console.log(`⏱️  Raw Duration: ${rawDuration.toFixed(2)}s`);

      // Apply post-processing
      const enhancedFilename = `frederick-c1-v2-speed${speed}-enhanced.mp3`;
      const enhancedPath = path.join(TEST_CONFIG.output_dir, enhancedFilename);
      await applyPostProcessing(rawPath, enhancedPath);
      const enhancedDuration = await measureDuration(enhancedPath);
      console.log(`⏱️  Enhanced Duration: ${enhancedDuration.toFixed(2)}s`);

      // Calculate drift
      const drift = Math.abs(enhancedDuration - TEST_CONFIG.v1_baseline_duration) / TEST_CONFIG.v1_baseline_duration * 100;
      const driftDelta = enhancedDuration - TEST_CONFIG.v1_baseline_duration;
      const passes2percent = drift < 2;
      const passes5percent = drift < 5;

      console.log(`\n📊 Drift Analysis (speed ${speed}×):`);
      console.log(`   v1 baseline:      ${TEST_CONFIG.v1_baseline_duration.toFixed(2)}s`);
      console.log(`   v2 enhanced:      ${enhancedDuration.toFixed(2)}s`);
      console.log(`   Delta:            ${driftDelta >= 0 ? '+' : ''}${driftDelta.toFixed(2)}s`);
      console.log(`   Drift:            ${drift.toFixed(2)}%`);
      console.log(`   <2% target:       ${passes2percent ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   <5% requirement:  ${passes5percent ? '✅ PASS' : '❌ FAIL'}`);

      results.push({
        speed,
        raw_duration: rawDuration,
        enhanced_duration: enhancedDuration,
        drift_percent: drift,
        drift_delta: driftDelta,
        passes_2percent: passes2percent,
        passes_5percent: passes5percent,
        raw_filename: rawFilename,
        enhanced_filename: enhancedFilename
      });
    }

    // ==========================================
    // RESULTS SUMMARY & RECOMMENDATION
    // ==========================================
    console.log('\n' + '═'.repeat(60));
    console.log('📋 SPEED CALIBRATION RESULTS');
    console.log('═'.repeat(60));

    console.log(`\n📊 Speed Comparison Table:`);
    console.log(`┌────────┬──────────┬──────────┬─────────┬──────────┐`);
    console.log(`│ Speed  │ Duration │  Delta   │  Drift  │  Status  │`);
    console.log(`├────────┼──────────┼──────────┼─────────┼──────────┤`);
    console.log(`│ v1     │  71.08s  │    -     │    -    │ BASELINE │`);
    for (const r of results) {
      const statusSymbol = r.passes_2percent ? '✅ <2%' : r.passes_5percent ? '⚠️  <5%' : '❌ >5%';
      const deltaStr = `${r.drift_delta >= 0 ? '+' : ''}${r.drift_delta.toFixed(2)}s`;
      const driftStr = `${r.drift_percent.toFixed(2)}%`;
      console.log(`│ ${r.speed.toFixed(2)}×  │  ${r.enhanced_duration.toFixed(2)}s  │ ${deltaStr.padStart(8)} │ ${driftStr.padStart(6)} │ ${statusSymbol.padEnd(8)} │`);
    }
    console.log(`└────────┴──────────┴──────────┴─────────┴──────────┘`);

    // Find best option
    const passing2percent = results.filter(r => r.passes_2percent);
    const passing5percent = results.filter(r => r.passes_5percent);

    console.log(`\n🎯 Recommendation:`);

    if (passing2percent.length > 0) {
      // Find the one with lowest drift among <2% passers
      const best = passing2percent.reduce((min, r) => r.drift_percent < min.drift_percent ? r : min);
      console.log(`\n✅ SUCCESS! Speed ${best.speed}× achieves <2% drift target`);
      console.log(`   Drift: ${best.drift_percent.toFixed(2)}%`);
      console.log(`   Duration: ${best.enhanced_duration.toFixed(2)}s (${best.drift_delta >= 0 ? '+' : ''}${best.drift_delta.toFixed(2)}s from v1)`);
      console.log(`\n📝 Next Steps:`);
      console.log(`   1. Listen to: ${best.enhanced_filename}`);
      console.log(`   2. Verify ESL pacing is still acceptable at ${best.speed}× speed`);
      console.log(`   3. If pacing is good → Update v2 settings to use speed: ${best.speed}`);
      console.log(`   4. Proceed to A/B user testing`);
    } else if (passing5percent.length > 0) {
      const best = passing5percent.reduce((min, r) => r.drift_percent < min.drift_percent ? r : min);
      console.log(`\n⚠️  PARTIAL SUCCESS: Speed ${best.speed}× meets <5% requirement but not <2% target`);
      console.log(`   Drift: ${best.drift_percent.toFixed(2)}%`);
      console.log(`   Duration: ${best.enhanced_duration.toFixed(2)}s (${best.drift_delta >= 0 ? '+' : ''}${best.drift_delta.toFixed(2)}s from v1)`);
      console.log(`\n📝 Decision Required:`);
      console.log(`   Option A: Accept ${best.drift_percent.toFixed(2)}% drift (meets <5% requirement)`);
      console.log(`   Option B: Test higher speeds (1.02×, 1.05×) to reach <2% target`);
      console.log(`   Option C: Use Enhanced Timing v3 proportionality adjustment`);
    } else {
      console.log(`\n❌ NONE of the tested speeds meet <5% requirement`);
      console.log(`\n📝 Options:`);
      console.log(`   1. Test even higher speeds (1.05×, 1.10×, 1.15×)`);
      console.log(`   2. Stay with v1 until better solution found`);
      console.log(`   3. Apply Enhanced Timing v3 metadata proportionality correction`);
    }

    console.log(`\n📁 Generated Files:`);
    for (const r of results) {
      console.log(`   • ${r.enhanced_filename} (${r.speed}× speed, ${r.drift_percent.toFixed(2)}% drift)`);
    }

    // Save results to JSON
    const summaryData = {
      timestamp: new Date().toISOString(),
      voice: TEST_CONFIG.voice,
      v1_baseline_duration: TEST_CONFIG.v1_baseline_duration,
      test_speeds: TEST_CONFIG.test_speeds,
      results: results,
      recommendation: passing2percent.length > 0
        ? { status: 'success', best_speed: passing2percent.reduce((min, r) => r.drift_percent < min.drift_percent ? r : min).speed }
        : passing5percent.length > 0
        ? { status: 'partial', best_speed: passing5percent.reduce((min, r) => r.drift_percent < min.drift_percent ? r : min).speed }
        : { status: 'fail', suggestion: 'test_higher_speeds' }
    };

    const resultsPath = path.join(TEST_CONFIG.output_dir, 'speed-calibration-results.json');
    await fs.writeFile(resultsPath, JSON.stringify(summaryData, null, 2));
    console.log(`\n📄 Results saved: ${resultsPath}`);

    console.log(`\n💰 Cost: ~$0.30 (${TEST_CONFIG.test_speeds.length} audio generations)`);
    console.log(`\n═══════════════════════════════════════════════════════════\n`);

  } catch (error) {
    console.error('\n❌ Error during speed calibration:', error);
    process.exit(1);
  }
}

// Run the speed calibration test
runSpeedCalibration();
