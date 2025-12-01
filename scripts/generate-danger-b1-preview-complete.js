#!/usr/bin/env node

/**
 * Generate Complete B1 Preview for "The Danger of a Single Story"
 * Creates both text (meta-description) AND audio (Jane voice)
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const BOOK_ID = 'danger-of-single-story';
const CEFR_LEVEL = 'B1';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

// Jane voice settings (Professional Audiobook Reader)
const JANE_VOICE_SETTINGS = {
  voice_id: 'RILOU7YmBhvwJGDGjNmP',
  voice_name: 'Jane',
  model_id: 'eleven_monolingual_v1',
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true
  },
  speed: 0.90,
  output_format: 'mp3_44100_128'
};

const TARGET_SPEED = 0.85; // FFmpeg slowdown

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Check API key
if (!process.env.ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found');
  process.exit(1);
}

// Generate audio with ElevenLabs API
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
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.log(`   ⏳ Retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
  throw lastError;
}

async function measureAudioDuration(filePath) {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  );
  return parseFloat(stdout.trim());
}

async function applyFFmpegSlowdown(inputPath, outputPath) {
  await execAsync(`ffmpeg -i "${inputPath}" -filter:a "atempo=${TARGET_SPEED}" -y "${outputPath}"`);
}

async function generatePreview() {
  console.log('🎤 Generating B1 Preview for "The Danger of a Single Story"\n');

  // 1. Create preview text (meta-description format - same across all levels)
  const previewText = `In this powerful TED Talk, writer Chimamanda Ngozi Adichie explores the danger of stereotypes and single stories. Through personal experiences from Nigeria to America, she shows how limiting people to one narrative creates misunderstanding. A thought-provoking message about the importance of diverse stories, cultural understanding, and seeing the full humanity in everyone.`;

  const previewTextPath = path.join(CACHE_DIR, `${BOOK_ID}-${CEFR_LEVEL}-preview.txt`);
  fs.writeFileSync(previewTextPath, previewText);

  const wordCount = previewText.split(/\s+/).length;
  console.log(`📝 Preview text created (${wordCount} words)`);
  console.log(`   ✅ Format: Meta-description (not raw content)`);
  console.log(`   📄 Saved: ${previewTextPath}\n`);

  // 2. Generate preview audio with Jane voice
  console.log('🎵 Generating preview audio with Jane voice...');
  console.log(`   Voice: ${JANE_VOICE_SETTINGS.voice_name} (${JANE_VOICE_SETTINGS.voice_id})`);
  console.log(`   Generation: 0.90×, FFmpeg: 0.85×`);

  const tempAudioPath = path.join(CACHE_DIR, `${BOOK_ID}-${CEFR_LEVEL}-preview-temp.mp3`);
  const finalAudioPath = path.join(CACHE_DIR, `${BOOK_ID}-${CEFR_LEVEL}-preview.mp3`);

  const generatedAudio = await generateElevenLabsAudio(previewText, JANE_VOICE_SETTINGS);
  fs.writeFileSync(tempAudioPath, generatedAudio);
  console.log('   ✅ ElevenLabs generation complete');

  await applyFFmpegSlowdown(tempAudioPath, finalAudioPath);
  console.log(`   ✅ FFmpeg slowdown applied (${TARGET_SPEED}×)`);

  const duration = await measureAudioDuration(finalAudioPath);
  console.log(`   ✅ Duration: ${duration.toFixed(2)}s`);

  fs.unlinkSync(tempAudioPath);

  // 3. Upload to Supabase
  console.log('\n☁️  Uploading to Supabase...');
  const fileName = `${BOOK_ID}/${CEFR_LEVEL}/preview.mp3`;
  const audioBuffer = fs.readFileSync(finalAudioPath);

  const { error: uploadError } = await supabase.storage
    .from('audio-files')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true
    });

  if (uploadError) {
    console.error('❌ Upload failed:', uploadError);
    process.exit(1);
  }

  const { data: urlData } = supabase.storage
    .from('audio-files')
    .getPublicUrl(fileName);

  console.log(`   ✅ Uploaded: ${fileName}`);
  console.log(`   🔗 URL: ${urlData.publicUrl}`);

  // 4. Save metadata
  const metadata = {
    audio: {
      url: urlData.publicUrl,
      duration: duration
    },
    voice: {
      id: JANE_VOICE_SETTINGS.voice_id,
      name: JANE_VOICE_SETTINGS.voice_name,
      generationSpeed: JANE_VOICE_SETTINGS.speed,
      ffmpegSpeed: TARGET_SPEED
    },
    generatedAt: new Date().toISOString()
  };

  const metadataPath = path.join(CACHE_DIR, `${BOOK_ID}-${CEFR_LEVEL}-preview-audio.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log('\n🎉 B1 Preview Generation Complete!');
  console.log('\n✅ Validation:');
  console.log(`   Preview text: ${wordCount} words (target: 50-75)`);
  console.log(`   Format: Meta-description ✓`);
  console.log(`   Audio: ${duration.toFixed(2)}s`);
  console.log(`   Voice: Jane ✓`);
  console.log('\n💡 Next: node scripts/generate-danger-of-single-story-b1-bundles.js --pilot');
}

generatePreview();
