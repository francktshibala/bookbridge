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

// Jane voice settings (November 2025 production standard)
const JANE_VOICE_SETTINGS = {
  voice_id: 'RILOU7YmBhvwJGDGjNmP',  // Jane - Professional Audiobook Reader
  voice_name: 'Jane',
  model_id: 'eleven_monolingual_v1',
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.8,
    style: 0.05,
    use_speaker_boost: true
  },
  speed: 0.90,  // Generate at 0.90, then slow to 0.85 with FFmpeg
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

const TARGET_SPEED = 0.85;  // November 2025 production standard
const BOOK_ID = 'always-a-family';
const LEVEL = 'A2';

console.log(`🎤 GENERATING PREVIEW: "Always a Family" by Danny & Annie Perasa`);
console.log(`🎯 Level: ${LEVEL}`);
console.log(`🗣️ Voice: ${JANE_VOICE_SETTINGS.voice_name} (${JANE_VOICE_SETTINGS.voice_id})`);
console.log(`⚡ Speed: Generate at 0.90×, FFmpeg slow to 0.85×`);
console.log(`=`.repeat(60));

// PREVIEW TEXT (meta-description - DESCRIBES the story, not from the story)
const previewText = `In this deeply moving StoryCorps conversation, Danny and Annie Perasa share their love story after sixty-three years of marriage. Danny reads one of the daily love notes he leaves for Annie, a tradition he's maintained for decades. When Annie asks how she'll live without his notes, Danny reveals he's hidden notes throughout their home for her future. A tender, heartwarming story about enduring love, devotion, and the power of small gestures that last a lifetime.`;

console.log(`\n📝 Step 1: Saving preview text...`);

// Save preview text
const previewTextPath = path.join(process.cwd(), `cache/${BOOK_ID}-${LEVEL}-preview.txt`);
fs.writeFileSync(previewTextPath, previewText);

console.log(`✅ Preview text saved (${previewText.split(/\s+/).length} words)`);
console.log(`   File: ${previewTextPath}`);
console.log(`   Text: "${previewText.substring(0, 100)}..."`);

// Generate preview audio
async function generatePreviewAudio() {
  console.log(`\n🎙️ Step 2: Generating preview audio...`);
  console.log(`   Voice: ${JANE_VOICE_SETTINGS.voice_name}`);
  console.log(`   Text length: ${previewText.length} characters`);

  try {
    // Call ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${JANE_VOICE_SETTINGS.voice_id}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: previewText,
        model_id: JANE_VOICE_SETTINGS.model_id,
        voice_settings: JANE_VOICE_SETTINGS.voice_settings,
        output_format: JANE_VOICE_SETTINGS.output_format
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Save temp file
    const tempDir = path.join(process.cwd(), 'temp/audio');
    fs.mkdirSync(tempDir, { recursive: true });

    const tempFile = path.join(tempDir, `${BOOK_ID}-${LEVEL}-preview-temp.mp3`);
    fs.writeFileSync(tempFile, audioBuffer);

    console.log(`✅ Generated audio from ElevenLabs`);

    // Apply FFmpeg 0.85× slowdown
    const slowedFile = path.join(tempDir, `${BOOK_ID}-${LEVEL}-preview-slowed.mp3`);
    console.log(`\n⚡ Step 3: Applying FFmpeg 0.85× slowdown...`);

    await execAsync(`ffmpeg -i "${tempFile}" -filter:a "atempo=0.85" -y "${slowedFile}"`);
    console.log(`✅ Applied FFmpeg slowdown`);

    // Measure duration with ffprobe
    console.log(`\n⏱️ Step 4: Measuring audio duration...`);
    const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${slowedFile}"`);
    const duration = parseFloat(stdout.trim());

    console.log(`✅ Measured duration: ${duration.toFixed(2)}s`);

    // Upload to Supabase
    console.log(`\n☁️ Step 5: Uploading to Supabase...`);
    const fileName = `${BOOK_ID}/${LEVEL}/preview.mp3`;
    const slowedBuffer = fs.readFileSync(slowedFile);

    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(fileName, slowedBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '2592000',
        upsert: true
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('audio-files')
      .getPublicUrl(fileName);

    console.log(`✅ Uploaded to Supabase: ${fileName}`);
    console.log(`   URL: ${publicUrl}`);

    // Save metadata
    const metadata = {
      contentId: BOOK_ID,
      level: LEVEL,
      audio: {
        url: publicUrl,
        duration: duration,
        voice: JANE_VOICE_SETTINGS.voice_name,
        voiceId: JANE_VOICE_SETTINGS.voice_id,
        generationSpeed: JANE_VOICE_SETTINGS.speed,
        ffmpegSpeed: TARGET_SPEED
      },
      generatedAt: new Date().toISOString()
    };

    const metadataPath = path.join(process.cwd(), `cache/${BOOK_ID}-${LEVEL}-preview-audio.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`✅ Saved metadata: ${metadataPath}`);

    // Cleanup
    fs.unlinkSync(tempFile);
    fs.unlinkSync(slowedFile);
    console.log(`✅ Cleaned up temp files`);

    return metadata;

  } catch (error) {
    console.error(`❌ Error generating preview audio:`, error.message);
    throw error;
  }
}

// Run preview generation
generatePreviewAudio()
  .then((metadata) => {
    console.log(`\n🎉 PREVIEW GENERATION COMPLETE!`);
    console.log(`=`.repeat(60));
    console.log(`📝 Preview text: ${previewTextPath}`);
    console.log(`🎵 Preview audio: ${metadata.audio.url}`);
    console.log(`⏱️ Duration: ${metadata.audio.duration.toFixed(2)}s`);
    console.log(`🗣️ Voice: ${metadata.audio.voice} (${metadata.audio.voiceId})`);
    console.log(`⚡ Speed: ${metadata.audio.ffmpegSpeed}× (November 2025 standard)`);
    console.log(`\n🚀 Ready for bundle generation!`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n💥 Fatal error:`, error);
    process.exit(1);
  });

