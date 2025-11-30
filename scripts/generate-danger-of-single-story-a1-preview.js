import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// NOVEMBER 2025 PRODUCTION STANDARD - Sarah Voice with FFmpeg 0.85× Post-Processing
const TARGET_SPEED = 0.85;

// Sarah Voice Settings (from VOICE_CASTING_GUIDE)
const SARAH_VOICE_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL',
  model_id: 'eleven_monolingual_v1',
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true
  },
  speed: 0.90,
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

console.log('🎤 Generating preview for "The Danger of a Single Story" A1');
console.log(`🗣️ Voice: Sarah (${SARAH_VOICE_SETTINGS.voice_id})`);
console.log(`⚡ Speed: Generate at 0.90×, FFmpeg slow to 0.85×`);

// Read simplified text
const simplifiedPath = path.join(process.cwd(), 'cache/ted-talks/danger-of-single-story-a1-simplified.txt');
const fullText = fs.readFileSync(simplifiedPath, 'utf8');

// Extract first 600 characters for preview
const previewText = fullText.substring(0, 600).trim();
console.log(`\n📝 Preview text (${previewText.length} characters):`);
console.log(previewText.substring(0, 100) + '...\n');

// Save preview text
const previewTextPath = path.join(process.cwd(), 'cache/danger-of-single-story-A1-preview.txt');
fs.writeFileSync(previewTextPath, previewText);
console.log(`✅ Saved preview text to: ${previewTextPath}`);

// Generate audio
async function generatePreviewAudio() {
  console.log('\n🎙️ Generating preview audio...');

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${SARAH_VOICE_SETTINGS.voice_id}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: previewText,
      model_id: SARAH_VOICE_SETTINGS.model_id,
      voice_settings: SARAH_VOICE_SETTINGS.voice_settings,
      output_format: SARAH_VOICE_SETTINGS.output_format
    })
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());

  // Save temporary file
  const tempDir = path.join(process.cwd(), 'temp/audio');
  fs.mkdirSync(tempDir, { recursive: true });
  const tempFile = path.join(tempDir, 'preview_temp.mp3');
  fs.writeFileSync(tempFile, audioBuffer);

  // Apply FFmpeg slowdown
  const slowedFile = path.join(tempDir, 'preview_slowed.mp3');
  console.log(`⚡ Applying FFmpeg 0.85× slowdown...`);
  await execAsync(`ffmpeg -i "${tempFile}" -filter:a "atempo=0.85" -y "${slowedFile}"`);

  // Measure duration
  const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${slowedFile}"`);
  const duration = parseFloat(stdout.trim());
  console.log(`⏱️ Duration: ${duration.toFixed(2)}s`);

  // Upload to Supabase
  const fileName = 'danger-of-single-story/A1/preview.mp3';
  const slowedBuffer = fs.readFileSync(slowedFile);

  console.log(`☁️ Uploading to Supabase...`);
  const { data, error } = await supabase.storage
    .from('audio-files')
    .upload(fileName, slowedBuffer, {
      contentType: 'audio/mpeg',
      cacheControl: '2592000',
      upsert: true
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('audio-files')
    .getPublicUrl(fileName);

  console.log(`✅ Uploaded: ${publicUrl}`);

  // Save metadata
  const metadata = {
    contentId: 'danger-of-single-story',
    level: 'A1',
    audio: {
      url: publicUrl,
      duration: duration,
      voice: 'Sarah',
      voiceId: SARAH_VOICE_SETTINGS.voice_id
    },
    generatedAt: new Date().toISOString()
  };

  const metadataPath = path.join(process.cwd(), 'cache/danger-of-single-story-A1-preview-audio.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`💾 Saved metadata to: ${metadataPath}`);

  // Cleanup
  fs.unlinkSync(tempFile);
  fs.unlinkSync(slowedFile);

  console.log('\n🎉 PREVIEW GENERATION COMPLETE!');
  console.log(`📝 Text: ${previewText.length} characters`);
  console.log(`🎵 Audio: ${duration.toFixed(2)}s`);
  console.log(`🗣️ Voice: Sarah (${SARAH_VOICE_SETTINGS.voice_id})`);
}

generatePreviewAudio().catch(console.error);
