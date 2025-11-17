#!/usr/bin/env node

/**
 * SPEED CALIBRATION TEST (HIGH SPEEDS): Find Optimal v2 Speed for <2% Drift
 *
 * Previous Test Results:
 * - 0.90×: 11.39% drift ❌
 * - 0.95×: 10.55% drift ❌
 * - 0.98×:  5.11% drift ❌ (just 0.11% over 5% requirement!)
 * - 1.00×: 10.33% drift ❌
 *
 * Strategy: Test higher speeds to reach <2% drift target
 * Target duration: 71.08s × 1.02 = 72.50s (for 2% drift)
 *
 * What this does:
 * 1. Tests v2 at speeds: 1.03×, 1.05×, 1.08×
 * 2. Applies male post-processing
 * 3. Measures drift vs v1 baseline (71.08s)
 * 4. Identifies optimal speed for <2% drift
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

  // v1 baseline (from initial pilot test)
  v1_baseline_duration: 71.08, // seconds

  // Higher speed values to test
  test_speeds: [1.03, 1.05, 1.08],

  // V2 optimized parameters
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

// Male post-processing chain
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
  return c1Text;
}

async function generateAudio(text, speed, outputFilename) {
  console.log(`\n🎙️  Generating audio: ${outputFilename}`);
  console.log(`   Speed: ${speed}× (testing for <2% drift)`);

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

  console.log(`✅ Audio saved`);
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

async function runHighSpeedCalibration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 HIGH SPEED CALIBRATION: Finding <2% Drift Sweet Spot');
  console.log('   Voice: Frederick Surrey (C1)');
  console.log('   Target: <72.50s (2% drift) | Requirement: <74.63s (5% drift)');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // Create output directory
    await fs.mkdir(TEST_CONFIG.output_dir, { recursive: true });

    // Load demo text
    const c1Text = await loadDemoText();

    console.log(`\n📊 v1 Baseline: ${TEST_CONFIG.v1_baseline_duration.toFixed(2)}s`);
    console.log(`   Target for <2% drift: ≤72.50s`);
    console.log(`   Target for <5% drift: ≤74.63s`);

    // Store results
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
    console.log('📋 HIGH SPEED CALIBRATION RESULTS');
    console.log('═'.repeat(60));

    console.log(`\n📊 Complete Speed Comparison (All Tests):`);
    console.log(`┌────────┬──────────┬──────────┬─────────┬──────────┐`);
    console.log(`│ Speed  │ Duration │  Delta   │  Drift  │  Status  │`);
    console.log(`├────────┼──────────┼──────────┼─────────┼──────────┤`);
    console.log(`│ v1     │  71.08s  │    -     │    -    │ BASELINE │`);
    console.log(`│ 0.98×  │  74.71s  │   +3.63s │  5.11% │ ⚠️  <6%   │ (from previous test)`);
    for (const r of results) {
      const statusSymbol = r.passes_2percent ? '✅ <2%' : r.passes_5percent ? '⚠️  <5%' : '❌ >5%';
      const deltaStr = `${r.drift_delta >= 0 ? '+' : ''}${r.drift_delta.toFixed(2)}s`;
      const driftStr = `${r.drift_percent.toFixed(2)}%`;
      console.log(`│ ${r.speed.toFixed(2)}×  │  ${r.enhanced_duration.toFixed(2)}s  │ ${deltaStr.padStart(8)} │ ${driftStr.padStart(6)} │ ${statusSymbol.padEnd(8)} │`);
    }
    console.log(`└────────┴──────────┴──────────┴─────────┴──────────┘`);

    // Find best options
    const passing2percent = results.filter(r => r.passes_2percent);
    const passing5percent = results.filter(r => r.passes_5percent);

    console.log(`\n🎯 FINAL RECOMMENDATION:`);

    if (passing2percent.length > 0) {
      const best = passing2percent.reduce((min, r) => r.drift_percent < min.drift_percent ? r : min);
      console.log(`\n✅ SUCCESS! Optimal speed found: ${best.speed}×`);
      console.log(`   Duration: ${best.enhanced_duration.toFixed(2)}s`);
      console.log(`   Drift: ${best.drift_percent.toFixed(2)}% ✅ (meets <2% target)`);
      console.log(`   Delta: ${best.drift_delta >= 0 ? '+' : ''}${best.drift_delta.toFixed(2)}s from v1`);
      console.log(`\n📝 Next Steps:`);
      console.log(`   1. Listen to: ${best.enhanced_filename}`);
      console.log(`   2. Verify audio quality is acceptable at ${best.speed}× speed`);
      console.log(`   3. Verify ESL pacing is still learner-friendly`);
      console.log(`   4. Update v2 production settings to: speed: ${best.speed}`);
      console.log(`   5. Proceed to A/B user testing (target: >80% prefer v2)`);
    } else if (passing5percent.length > 0) {
      const best = passing5percent.reduce((min, r) => r.drift_percent < min.drift_percent ? r : min);
      console.log(`\n⚠️  PARTIAL SUCCESS: Best option meets <5% requirement`);
      console.log(`   Speed: ${best.speed}×`);
      console.log(`   Duration: ${best.enhanced_duration.toFixed(2)}s`);
      console.log(`   Drift: ${best.drift_percent.toFixed(2)}% (meets <5% requirement)`);
      console.log(`\n   Previous test: 0.98× = 5.11% drift`);
      console.log(`\n📝 Decision Required:`);
      console.log(`   Option A: Accept ${best.speed}× at ${best.drift_percent.toFixed(2)}% drift`);
      console.log(`   Option B: Accept 0.98× at 5.11% drift (slower, slightly over 5%)`);
      console.log(`   Option C: Test intermediate speeds (1.09×, 1.10×, 1.12×)`);
    } else {
      console.log(`\n⚠️  Need even higher speeds to reach <5% drift`);
      console.log(`\n📝 Recommendations:`);
      console.log(`   1. Test speeds: 1.10×, 1.12×, 1.15×`);
      console.log(`   2. OR accept 0.98× at 5.11% drift (Enhanced Timing v3 can handle it)`);
    }

    // Save combined results
    const summaryData = {
      timestamp: new Date().toISOString(),
      voice: TEST_CONFIG.voice,
      v1_baseline_duration: TEST_CONFIG.v1_baseline_duration,
      all_tested_speeds: [0.98, ...TEST_CONFIG.test_speeds],
      high_speed_results: results,
      recommendation: passing2percent.length > 0
        ? {
            status: 'optimal_found',
            speed: passing2percent.reduce((min, r) => r.drift_percent < min.drift_percent ? r : min).speed,
            drift: passing2percent.reduce((min, r) => r.drift_percent < min.drift_percent ? r : min).drift_percent
          }
        : passing5percent.length > 0
        ? {
            status: 'acceptable_found',
            speed: passing5percent.reduce((min, r) => r.drift_percent < min.drift_percent ? r : min).speed,
            drift: passing5percent.reduce((min, r) => r.drift_percent < min.drift_percent ? r : min).drift_percent
          }
        : { status: 'test_higher_speeds', suggestion: [1.10, 1.12, 1.15] }
    };

    const resultsPath = path.join(TEST_CONFIG.output_dir, 'speed-calibration-high-results.json');
    await fs.writeFile(resultsPath, JSON.stringify(summaryData, null, 2));
    console.log(`\n📄 Results saved: ${resultsPath}`);

    console.log(`\n💰 Total Cost: ~$0.60 (6 generations across both calibration tests)`);
    console.log(`\n═══════════════════════════════════════════════════════════\n`);

  } catch (error) {
    console.error('\n❌ Error during calibration:', error);
    process.exit(1);
  }
}

// Run the high speed calibration test
runHighSpeedCalibration();
