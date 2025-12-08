import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Load environment variables
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// VALIDATED VOICE ID - Jane (Professional audiobook reader)
const JANE_VOICE_ID = 'RILOU7YmBhvwJGDGjNmP';

// NOVEMBER 2025 PRODUCTION STANDARD - FFmpeg 0.85× Post-Processing
const TARGET_SPEED = 0.85;  // 18% slower, comfortable pace

// PRODUCTION VOICE SETTINGS - Jane (Memoir narration)
const JANE_VOICE_SETTINGS = {
  voice_id: JANE_VOICE_ID,
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

const BOOK_ID = 'helen-keller';
const CEFR_LEVEL = 'A1';

/**
 * Generate audio for background context text using ElevenLabs + FFmpeg post-processing
 */
async function generateBackgroundAudio(backgroundText, bookId, level) {
  console.log(`\n🎵 Generating background context audio for "${bookId}" at ${level} level...`);

  try {
    console.log(`   🗣️ Voice: ${JANE_VOICE_ID} (Jane)`);
    console.log(`   📝 Text length: ${backgroundText.length} characters`);

    // Generate audio via ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${JANE_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: backgroundText,
        model_id: JANE_VOICE_SETTINGS.model_id,
        voice_settings: JANE_VOICE_SETTINGS.voice_settings,
        speed: JANE_VOICE_SETTINGS.speed,
        output_format: JANE_VOICE_SETTINGS.output_format,
        apply_text_normalization: JANE_VOICE_SETTINGS.apply_text_normalization
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioArray = Buffer.from(audioBuffer);
    console.log(`   ✅ Generated audio: ${(audioArray.length / 1024).toFixed(0)}KB`);

    // Save to temp file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempOriginalFile = path.join(tempDir, `${bookId}-${level}-background-original.mp3`);
    fs.writeFileSync(tempOriginalFile, audioArray);

    // Measure original duration
    const originalDurationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tempOriginalFile}"`;
    const originalDuration = parseFloat(execSync(originalDurationCommand, { encoding: 'utf8' }).trim());
    console.log(`   ⏱️ Original duration: ${originalDuration.toFixed(3)}s`);

    // Apply FFmpeg atempo filter to slow to 0.85×
    const tempSlowedFile = path.join(tempDir, `${bookId}-${level}-background-slowed.mp3`);
    const ffmpegCommand = `ffmpeg -i "${tempOriginalFile}" -filter:a "atempo=${TARGET_SPEED}" -y "${tempSlowedFile}"`;
    execSync(ffmpegCommand, { stdio: 'inherit' });
    console.log(`   🎚️ Applied FFmpeg atempo=${TARGET_SPEED} (18% slower)`);

    // Re-measure slowed duration (CRITICAL for sync)
    const slowedDurationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tempSlowedFile}"`;
    const measuredDuration = parseFloat(execSync(slowedDurationCommand, { encoding: 'utf8' }).trim());
    console.log(`   ⏱️ Processed duration: ${measuredDuration.toFixed(3)}s`);

    // Upload slowed audio to Supabase
    const audioFileName = `${bookId}/${level}/background-context.mp3`;
    console.log(`   ☁️ Uploading to Supabase: ${audioFileName}`);

    const slowedAudioBuffer = fs.readFileSync(tempSlowedFile);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(audioFileName, slowedAudioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio-files')
      .getPublicUrl(audioFileName);

    console.log(`   ✅ Background context audio uploaded: ${publicUrl}`);

    // Clean up temp files
    if (fs.existsSync(tempOriginalFile)) fs.unlinkSync(tempOriginalFile);
    if (fs.existsSync(tempSlowedFile)) fs.unlinkSync(tempSlowedFile);

    return {
      url: publicUrl,
      duration: measuredDuration,
      voice: 'Jane',
      voiceId: JANE_VOICE_ID
    };

  } catch (error) {
    console.error(`❌ Error generating background context audio: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🎤 Generating background context audio for Helen Keller\'s "The Story of My Life"');

  // Load background context text from cache
  const cacheDir = path.join(process.cwd(), 'cache');
  const backgroundTextPath = path.join(cacheDir, `${BOOK_ID}-background.txt`);
  
  if (!fs.existsSync(backgroundTextPath)) {
    throw new Error(`Background context text file not found: ${backgroundTextPath}`);
  }

  const backgroundText = fs.readFileSync(backgroundTextPath, 'utf8').trim();
  const wordCount = backgroundText.split(/\s+/).filter(word => word.length > 0).length;
  
  console.log(`\n📝 Background context text (${wordCount} words):`);
  console.log(`   "${backgroundText}"`);

  // Generate audio
  const audioMetadata = await generateBackgroundAudio(backgroundText, BOOK_ID, CEFR_LEVEL);

  // Save audio metadata to cache
  const audioMetadataPath = path.join(cacheDir, `${BOOK_ID}-${CEFR_LEVEL}-background-audio.json`);
  const metadata = {
    bookId: BOOK_ID,
    level: CEFR_LEVEL,
    audio: audioMetadata,
    generatedAt: new Date().toISOString()
  };
  fs.writeFileSync(audioMetadataPath, JSON.stringify(metadata, null, 2));
  console.log(`✅ Saved audio metadata to cache`);

  console.log('\n🎉 Background context audio generation complete!');
  console.log(`   📝 Text: ${backgroundTextPath}`);
  console.log(`   🎵 Audio: ${audioMetadata.url}`);
  console.log(`   ⏱️ Duration: ${audioMetadata.duration.toFixed(2)}s`);
}

main()
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

