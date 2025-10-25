import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SARAH_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// B1 text from Pride & Prejudice demo (2 sentences)
const B1_TEXT = "Everyone knows that a rich single man must want to find a wife. When such a man moves to a new place, the families around him believe that he should marry one of their daughters, even if they don't know anything about his feelings or opinions.";

const B1_SENTENCES = [
  {
    index: 0,
    text: "Everyone knows that a rich single man must want to find a wife.",
    wordCount: 13
  },
  {
    index: 1,
    text: "When such a man moves to a new place, the families around him believe that he should marry one of their daughters, even if they don't know anything about his feelings or opinions.",
    wordCount: 32
  }
];

// Speeds to test
const SPEEDS = [0.90, 0.85, 0.80];

console.log('🎯 TURBO V2.5 SPEED TEST - B1 Pride & Prejudice');
console.log('================================================');
console.log(`Model: eleven_turbo_v2_5`);
console.log(`Voice: Sarah (${SARAH_VOICE_ID})`);
console.log(`Text: ${B1_TEXT.length} characters, 2 sentences, 45 words`);
console.log(`Speeds to test: ${SPEEDS.join(', ')}`);
console.log('');

// Validate API key
if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in environment');
  process.exit(1);
}

// Ensure directories exist
const tempDir = path.join(process.cwd(), 'temp');
const outputDir = path.join(process.cwd(), 'public', 'audio', 'demo');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate audio function
async function generateAudio(text, settings) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${settings.voice_id}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: settings.model_id,
        voice_settings: settings.voice_settings
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// Measure audio duration with ffprobe (Solution 1)
function measureAudioDuration(filePath) {
  try {
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`;
    const result = execSync(command, { encoding: 'utf-8' }).trim();
    const duration = parseFloat(result);
    return duration;
  } catch (error) {
    console.error('❌ ffprobe measurement failed:', error.message);
    throw error;
  }
}

// Calculate proportional sentence timings (Solution 1)
function calculateProportionalTimings(sentences, totalDuration) {
  const totalWords = sentences.reduce((sum, s) => sum + s.wordCount, 0);
  const timings = [];
  let currentTime = 0;

  for (const sentence of sentences) {
    const wordRatio = sentence.wordCount / totalWords;
    const duration = totalDuration * wordRatio;
    const startTime = currentTime;
    const endTime = currentTime + duration;

    timings.push({
      sentenceIndex: sentence.index,
      text: sentence.text,
      startTime: parseFloat(startTime.toFixed(3)),
      endTime: parseFloat(endTime.toFixed(3)),
      duration: parseFloat(duration.toFixed(3)),
      wordCount: sentence.wordCount
    });

    currentTime = endTime;
  }

  return timings;
}

// Test single speed
async function testSpeed(speed) {
  console.log('');
  console.log(`${'='.repeat(60)}`);
  console.log(`🎙️ TESTING SPEED: ${speed}`);
  console.log(`${'='.repeat(60)}`);

  // Hero Demo production settings for Sarah
  const VOICE_SETTINGS = {
    voice_id: SARAH_VOICE_ID,
    model_id: 'eleven_turbo_v2_5', // 🎯 Testing new model
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.8,     // Hero Demo enhanced
      style: 0.05,                // Hero Demo enhanced
      use_speaker_boost: true
    },
    speed: speed
  };

  try {
    // Step 1: Generate audio
    console.log(`\n📥 Generating audio with speed ${speed}...`);
    const audioBuffer = await generateAudio(B1_TEXT, VOICE_SETTINGS);
    console.log(`✅ Audio generated: ${audioBuffer.length} bytes`);

    // Step 2: Save to temp file for measurement
    const tempFile = path.join(tempDir, `b1-turbo-${speed.toFixed(2)}-temp.mp3`);
    fs.writeFileSync(tempFile, audioBuffer);

    // Step 3: Measure actual duration with ffprobe
    console.log(`\n📏 Measuring actual audio duration...`);
    const measuredDuration = measureAudioDuration(tempFile);
    console.log(`✅ Measured duration: ${measuredDuration.toFixed(3)}s`);

    // Step 4: Calculate proportional sentence timings
    console.log(`\n⏱️ Calculating proportional sentence timings...`);
    const sentenceTimings = calculateProportionalTimings(B1_SENTENCES, measuredDuration);

    console.log('Sentence timings:');
    sentenceTimings.forEach((timing, idx) => {
      console.log(`  Sentence ${idx}: ${timing.startTime.toFixed(3)}s - ${timing.endTime.toFixed(3)}s (${timing.duration.toFixed(3)}s)`);
    });

    // Step 5: Save final audio
    const speedLabel = speed.toFixed(2).replace('.', '');
    const outputFileName = `pride-prejudice-b1-turbo-${speedLabel}.mp3`;
    const outputPath = path.join(outputDir, outputFileName);
    fs.copyFileSync(tempFile, outputPath);
    console.log(`\n✅ Audio saved: ${outputPath}`);

    // Step 6: Create metadata
    const metadata = {
      version: 1,
      model: 'eleven_turbo_v2_5',
      voice: 'Sarah',
      voice_id: SARAH_VOICE_ID,
      speed: speed,
      measuredDuration: measuredDuration,
      sentenceTimings: sentenceTimings,
      measuredAt: new Date().toISOString(),
      method: 'ffprobe-proportional',
      settings: VOICE_SETTINGS,
      test: 'speed-comparison',
      purpose: 'turbo-v2.5-speed-testing'
    };

    const metadataPath = path.join(outputDir, `pride-prejudice-b1-turbo-${speedLabel}-metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`✅ Metadata saved: ${metadataPath}`);

    // Step 7: Cleanup temp file
    fs.unlinkSync(tempFile);

    console.log(`\n✅ SPEED ${speed} COMPLETE`);

    return {
      speed,
      duration: measuredDuration,
      fileName: outputFileName,
      success: true
    };

  } catch (error) {
    console.error(`\n❌ Speed ${speed} failed:`, error.message);
    return {
      speed,
      success: false,
      error: error.message
    };
  }
}

// Main execution
async function main() {
  const results = [];

  for (const speed of SPEEDS) {
    const result = await testSpeed(speed);
    results.push(result);
  }

  // Final summary
  console.log('');
  console.log('='.repeat(60));
  console.log('🎉 ALL TESTS COMPLETE - SUMMARY');
  console.log('='.repeat(60));
  console.log('');

  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Successful: ${successCount}/${SPEEDS.length}`);
  console.log('');

  console.log('📊 Results:');
  results.forEach(r => {
    if (r.success) {
      console.log(`  ✅ Speed ${r.speed}: ${r.duration.toFixed(3)}s - ${r.fileName}`);
    } else {
      console.log(`  ❌ Speed ${r.speed}: FAILED - ${r.error}`);
    }
  });

  console.log('');
  console.log('📂 Output files:');
  console.log('  Directory: public/audio/demo/');
  results.forEach(r => {
    if (r.success) {
      console.log(`    - ${r.fileName}`);
      console.log(`    - ${r.fileName.replace('.mp3', '-metadata.json')}`);
    }
  });

  console.log('');
  console.log('🧪 Next Steps:');
  console.log('  1. Listen to each audio file and compare quality');
  console.log('  2. Test in hero demo by swapping into Daniel slot');
  console.log('  3. Validate sync accuracy with hero demo highlighting');
  console.log('  4. Choose best speed based on teacher feedback + sync');
  console.log('');
  console.log('💰 Cost: ~$0.24 total (3 speeds × 2 sentences × $0.04/1K chars)');

  if (successCount < SPEEDS.length) {
    process.exit(1);
  }
}

main();
