import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// NOVEMBER 2025 PRODUCTION STANDARD - Sarah Voice with FFmpeg 0.85× Post-Processing
const TARGET_SPEED = 0.85;

const SARAH_VOICE_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL',  // Sarah - American soft news
  model_id: 'eleven_monolingual_v1',
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.8,
    style: 0.05,
    use_speaker_boost: true
  },
  speed: 0.90,
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

const BOOK_ID = 'always-a-family';
const CEFR_LEVEL = 'A1';
const isPilot = process.argv.includes('--pilot');

console.log(`🎵 Generating audio bundles for "Always a Family"`);
console.log(`📚 Book ID: ${BOOK_ID}`);
console.log(`🎯 CEFR Level: ${CEFR_LEVEL}`);
console.log(`🗣️ Voice: Sarah (${SARAH_VOICE_SETTINGS.voice_id}) - American soft news`);
console.log(`⚡ Speed: Generate at 0.90×, FFmpeg slow to 0.85×`);

if (isPilot) {
  console.log('🧪 PILOT MODE: Will generate only first 5 bundles (~$0.75 cost)');
}

// Load simplified text
const simplifiedTextPath = path.join(process.cwd(), `cache/storycorps/${BOOK_ID}-${CEFR_LEVEL}-simplified.txt`);
const simplifiedText = fs.readFileSync(simplifiedTextPath, 'utf-8');

// Split into sentences
const sentences = simplifiedText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
console.log(`📝 Total sentences: ${sentences.length}`);

// Create 4-sentence bundles
const bundles = [];
for (let i = 0; i < sentences.length; i += 4) {
  const bundleSentences = sentences.slice(i, i + 4);
  bundles.push({
    bundleIndex: Math.floor(i / 4),
    startSentenceIndex: i,
    endSentenceIndex: i + bundleSentences.length - 1,
    text: bundleSentences.join(' '),
    sentences: bundleSentences
  });
}

console.log(`📦 Total bundles: ${bundles.length}`);
console.log(`💰 Estimated cost: ~$${Math.ceil((bundles.length * 150) / 1000 * 0.30)}`);

// Generate audio
async function generateElevenLabsAudio(text, voiceSettings, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceSettings.voice_id}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: voiceSettings.model_id,
          voice_settings: voiceSettings.voice_settings,
          output_format: voiceSettings.output_format
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.log(`   ⏳ Retry attempt ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
  throw lastError;
}

async function applyFFmpegSlowdown(inputPath, outputPath) {
  try {
    await execAsync(`ffmpeg -i "${inputPath}" -filter:a "atempo=0.85" -y "${outputPath}"`);
    return true;
  } catch (error) {
    console.error(`   ❌ FFmpeg slowdown failed: ${error.message}`);
    return false;
  }
}

async function measureAudioDuration(filePath) {
  try {
    const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error(`   ❌ FFprobe measurement failed`);
    return null;
  }
}

async function generateBundles() {
  const tempDir = path.join(process.cwd(), 'temp/audio');
  fs.mkdirSync(tempDir, { recursive: true });

  const bundlesToProcess = isPilot ? bundles.slice(0, 5) : bundles;
  const metadata = [];

  console.log(`\n🎬 Starting audio generation for ${bundlesToProcess.length} bundles...\n`);

  for (let i = 0; i < bundlesToProcess.length; i++) {
    const bundle = bundlesToProcess[i];
    const progress = `${i + 1}/${bundlesToProcess.length}`;

    console.log(`📦 Bundle ${progress} (sentences ${bundle.startSentenceIndex}-${bundle.endSentenceIndex})`);
    console.log(`   📝 "${bundle.text.substring(0, 60)}..."`);

    try {
      // Generate audio
      console.log(`   🎙️ Generating audio with Sarah voice...`);
      const audioBuffer = await generateElevenLabsAudio(bundle.text, SARAH_VOICE_SETTINGS);

      // Save temp file
      const tempFile = path.join(tempDir, `bundle_${bundle.bundleIndex}_temp.mp3`);
      fs.writeFileSync(tempFile, audioBuffer);

      // Apply FFmpeg slowdown
      const slowedFile = path.join(tempDir, `bundle_${bundle.bundleIndex}_slowed.mp3`);
      console.log(`   ⚡ Applying FFmpeg 0.85× slowdown...`);
      await applyFFmpegSlowdown(tempFile, slowedFile);

      // Measure duration
      const duration = await measureAudioDuration(slowedFile);
      console.log(`   ⏱️ Duration: ${duration ? duration.toFixed(2) + 's' : 'unknown'}`);

      // Upload to Supabase
      const fileName = `${BOOK_ID}/${CEFR_LEVEL}/bundle_${bundle.bundleIndex}.mp3`;
      const slowedBuffer = fs.readFileSync(slowedFile);

      console.log(`   ☁️ Uploading to Supabase...`);
      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(fileName, slowedBuffer, {
          contentType: 'audio/mpeg',
          cacheControl: '2592000',
          upsert: true
        });

      if (error) {
        console.error(`   ❌ Upload failed: ${error.message}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName);

      console.log(`   ✅ Uploaded: ${fileName}`);

      metadata.push({
        bundleIndex: bundle.bundleIndex,
        startSentenceIndex: bundle.startSentenceIndex,
        endSentenceIndex: bundle.endSentenceIndex,
        text: bundle.text,
        sentences: bundle.sentences,
        audioUrl: publicUrl,
        duration: duration,
        voiceId: SARAH_VOICE_SETTINGS.voice_id,
        voiceName: 'Sarah',
        speed: TARGET_SPEED
      });

      // Cleanup
      fs.unlinkSync(tempFile);
      fs.unlinkSync(slowedFile);

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }

    if ((i + 1) % 5 === 0) {
      console.log(`\n📈 Progress: ${i + 1}/${bundlesToProcess.length} (${Math.round((i + 1) / bundlesToProcess.length * 100)}%)\n`);
    }
  }

  // Save metadata
  const metadataPath = path.join(process.cwd(), `cache/storycorps/${BOOK_ID}-${CEFR_LEVEL}-bundles-metadata.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log(`\n🎉 AUDIO GENERATION COMPLETE!`);
  console.log(`=`.repeat(60));
  console.log(`📦 Total bundles: ${metadata.length}`);
  console.log(`✅ Success rate: ${Math.round((metadata.length / bundlesToProcess.length) * 100)}%`);
  console.log(`💾 Metadata: ${metadataPath}`);
  console.log(`🗣️ Voice: Sarah (${SARAH_VOICE_SETTINGS.voice_id}) - American soft news`);
  console.log(`⚡ Speed: 0.85× (November 2025 standard)`);
  console.log(`\n🚀 Ready for database integration`);

  await prisma.$disconnect();
}

process.on('SIGINT', async () => {
  console.log('\n⏹️ Interrupted. Cleaning up...');
  await prisma.$disconnect();
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  generateBundles().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

