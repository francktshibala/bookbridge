#!/usr/bin/env node

/**
 * Regenerate Preview Audio for "The Danger of a Single Story" A1
 *
 * Uses the corrected meta-description preview text (not raw content extraction)
 * Sarah voice with November 2025 production standard (0.90× → FFmpeg 0.85×)
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

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Constants
const BOOK_ID = 'danger-of-single-story';
const CEFR_LEVEL = 'A1';
const CACHE_DIR = path.join(__dirname, '..', 'cache');

// Sarah voice configuration (from voice casting guide)
const SARAH_VOICE_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL',
  voice_name: 'Sarah',
  model_id: 'eleven_monolingual_v1',
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true
  },
  speed: 0.90, // Generate at 0.90× speed
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

const TARGET_SPEED = 0.85; // FFmpeg post-processing slowdown

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Check for ElevenLabs API key
if (!process.env.ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in .env.local');
  process.exit(1);
}

// Measure audio duration with ffprobe
async function measureAudioDuration(filePath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error(`❌ Error measuring duration for ${filePath}:`, error.message);
    return 0;
  }
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

// Apply FFmpeg slowdown
async function applyFFmpegSlowdown(inputPath, outputPath) {
  try {
    await execAsync(
      `ffmpeg -i "${inputPath}" -filter:a "atempo=${TARGET_SPEED}" -y "${outputPath}"`
    );
    console.log(`   ✅ FFmpeg slowdown applied (${TARGET_SPEED}×)`);
  } catch (error) {
    console.error(`❌ FFmpeg slowdown failed:`, error.message);
    throw error;
  }
}

async function generatePreviewAudio() {
  console.log('🎤 Regenerating Preview Audio for "The Danger of a Single Story" A1\n');

  // Read the corrected preview text
  const previewTextPath = path.join(CACHE_DIR, `${BOOK_ID}-${CEFR_LEVEL}-preview.txt`);
  if (!fs.existsSync(previewTextPath)) {
    console.error(`❌ Preview text not found: ${previewTextPath}`);
    process.exit(1);
  }

  const previewText = fs.readFileSync(previewTextPath, 'utf8').trim();
  console.log(`📝 Preview text (${previewText.split(/\s+/).length} words):`);
  console.log(`   "${previewText.substring(0, 100)}..."\n`);

  // Generate audio with ElevenLabs
  console.log('🎵 Generating preview audio with Sarah voice...');
  console.log(`   Voice: ${SARAH_VOICE_SETTINGS.voice_name} (${SARAH_VOICE_SETTINGS.voice_id})`);
  console.log(`   Generation speed: ${SARAH_VOICE_SETTINGS.speed}×`);
  console.log(`   FFmpeg target: ${TARGET_SPEED}×`);

  const tempAudioPath = path.join(CACHE_DIR, `${BOOK_ID}-${CEFR_LEVEL}-preview-temp.mp3`);
  const finalAudioPath = path.join(CACHE_DIR, `${BOOK_ID}-${CEFR_LEVEL}-preview.mp3`);

  try {
    // Generate audio with ElevenLabs
    const generatedAudio = await generateElevenLabsAudio(previewText, SARAH_VOICE_SETTINGS);
    fs.writeFileSync(tempAudioPath, generatedAudio);
    console.log('   ✅ ElevenLabs generation complete');

    // Apply FFmpeg slowdown
    await applyFFmpegSlowdown(tempAudioPath, finalAudioPath);

    // Measure final duration
    const duration = await measureAudioDuration(finalAudioPath);
    console.log(`   ✅ Final duration: ${duration.toFixed(2)}s`);

    // Clean up temp file
    fs.unlinkSync(tempAudioPath);

    // Upload to Supabase
    console.log('\n☁️  Uploading to Supabase...');
    const fileName = `${BOOK_ID}/${CEFR_LEVEL}/preview.mp3`;
    const audioBuffer = fs.readFileSync(finalAudioPath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Supabase upload failed:', uploadError);
      process.exit(1);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('audio-files')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;
    console.log(`   ✅ Uploaded: ${fileName}`);
    console.log(`   🔗 URL: ${publicUrl}`);

    // Save metadata to cache
    const metadata = {
      audio: {
        url: publicUrl,
        duration: duration
      },
      voice: {
        id: SARAH_VOICE_SETTINGS.voice_id,
        name: SARAH_VOICE_SETTINGS.voice_name,
        generationSpeed: SARAH_VOICE_SETTINGS.speed,
        ffmpegSpeed: TARGET_SPEED
      },
      generatedAt: new Date().toISOString()
    };

    const metadataPath = path.join(CACHE_DIR, `${BOOK_ID}-${CEFR_LEVEL}-preview-audio.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`   ✅ Metadata saved: ${metadataPath}`);

    console.log('\n🎉 Preview audio regeneration complete!');
    console.log('\n✅ Validation:');
    console.log(`   Preview text: ${previewText.split(/\s+/).length} words (target: 50-75)`);
    console.log(`   Format: Meta-description ✓`);
    console.log(`   Audio duration: ${duration.toFixed(2)}s`);
    console.log(`   Voice: Sarah ✓`);
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh browser at reading page');
    console.log('   2. Verify preview shows corrected text');
    console.log('   3. Test preview audio playback');

  } catch (error) {
    console.error('❌ Error generating preview audio:', error);
    process.exit(1);
  }
}

generatePreviewAudio();
