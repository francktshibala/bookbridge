import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import OpenAI from 'openai';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// VALIDATED VOICE IDs (from MASTER_MISTAKES_PREVENTION.md)
const VALIDATED_VOICES = {
  'jane': 'RILOU7YmBhvwJGDGjNmP'     // Professional audiobook reader
};

// NOVEMBER 2025 PRODUCTION STANDARD - FFmpeg 0.85× Post-Processing
const TARGET_SPEED = 0.85;  // 18% slower, comfortable pace

// PRODUCTION VOICE SETTINGS - Jane (A1 - user requested)
const JANE_VOICE_SETTINGS = {
  voice_id: 'RILOU7YmBhvwJGDGjNmP',  // Jane voice ID (Professional audiobook reader)
  model_id: 'eleven_monolingual_v1',
  voice_settings: {
    stability: 0.5,                    // Clarity for ESL learners
    similarity_boost: 0.8,             // Enhanced presence
    style: 0.05,                       // Subtle sophistication
    use_speaker_boost: true
  },
  speed: 0.90,                          // Generate at default
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

// VOICE MAPPING FOR STORY OF AN HOUR: A1 → Jane (user requested)
function getVoiceForLevel(level) {
  const voiceMapping = {
    'A1': JANE_VOICE_SETTINGS      // A1 uses Jane (user requested)
  };
  return voiceMapping[level] || JANE_VOICE_SETTINGS;
}

// Get book ID and level from command line or use defaults
const BOOK_ID = process.argv[2] || 'story-of-an-hour';
const CEFR_LEVEL = process.argv[3] || 'A1';

/**
 * Generate audio for preview text using ElevenLabs + FFmpeg post-processing
 * Follows November 2025 production standard (0.85× speed)
 */
async function generatePreviewAudio(previewText, bookId, level) {
  console.log(`\n🎵 Generating preview audio for "${bookId}" at ${level} level...`);
  
  try {
    const voiceSettings = getVoiceForLevel(level);
    const voiceName = 'Jane';
    
    console.log(`   🗣️ Voice: ${voiceSettings.voice_id} (${voiceName})`);
    console.log(`   📝 Text length: ${previewText.length} characters`);
    
    // Generate audio via ElevenLabs API at default speed (0.90×)
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceSettings.voice_id}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: previewText,
        model_id: voiceSettings.model_id,
        voice_settings: voiceSettings.voice_settings,
        speed: voiceSettings.speed,
        output_format: voiceSettings.output_format,
        apply_text_normalization: voiceSettings.apply_text_normalization
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioArray = Buffer.from(audioBuffer);
    console.log(`   ✅ Generated audio: ${(audioArray.length / 1024).toFixed(0)}KB`);

    // Save to temp file for measurement
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempOriginalFile = path.join(tempDir, `${bookId}-${level}-preview-original.mp3`);
    fs.writeFileSync(tempOriginalFile, audioArray);

    // Measure original duration
    const originalDurationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tempOriginalFile}"`;
    const originalDuration = parseFloat(execSync(originalDurationCommand, { encoding: 'utf8' }).trim());
    console.log(`   ⏱️ Original duration: ${originalDuration.toFixed(3)}s`);

    // Apply FFmpeg atempo filter to slow to 0.85×
    const tempSlowedFile = path.join(tempDir, `${bookId}-${level}-preview-slowed.mp3`);
    const ffmpegCommand = `ffmpeg -i "${tempOriginalFile}" -filter:a "atempo=${TARGET_SPEED}" -y "${tempSlowedFile}"`;
    execSync(ffmpegCommand, { stdio: 'inherit' });
    console.log(`   🎚️ Applied FFmpeg atempo=${TARGET_SPEED} (18% slower)`);

    // Re-measure slowed duration (CRITICAL for sync)
    const slowedDurationCommand = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tempSlowedFile}"`;
    const measuredDuration = parseFloat(execSync(slowedDurationCommand, { encoding: 'utf8' }).trim());
    console.log(`   ⏱️ Processed duration: ${measuredDuration.toFixed(3)}s`);

    // Upload slowed audio to Supabase
    const audioFileName = `${bookId}/${level}/preview.mp3`;
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

    console.log(`   ✅ Preview audio uploaded: ${publicUrl}`);

    // Clean up temp files
    if (fs.existsSync(tempOriginalFile)) fs.unlinkSync(tempOriginalFile);
    if (fs.existsSync(tempSlowedFile)) fs.unlinkSync(tempSlowedFile);

    return {
      url: publicUrl,
      duration: measuredDuration,
      voice: voiceName,
      voiceId: voiceSettings.voice_id
    };

  } catch (error) {
    console.error(`   ❌ Error generating preview audio:`, error.message);
    throw error;
  }
}

/**
 * Main function to generate preview
 */
async function generatePreview() {
  console.log(`\n📝 Generating preview for "${BOOK_ID}" at ${CEFR_LEVEL} level...`);

  try {
    // Load simplified text from cache
    const cacheDir = path.join(process.cwd(), 'cache');
    const simplifiedJsonPath = path.join(cacheDir, `${BOOK_ID}-${CEFR_LEVEL}-simplified.json`);
    
    if (!fs.existsSync(simplifiedJsonPath)) {
      throw new Error(`Simplified cache not found: ${simplifiedJsonPath}. Run simplify script first.`);
    }

    const simplifiedData = JSON.parse(fs.readFileSync(simplifiedJsonPath, 'utf8'));
    console.log(`   📖 Loaded ${simplifiedData.sentences?.length || simplifiedData.metadata?.simplifiedSentenceCount || 'unknown'} sentences`);

    // Generate preview text using OpenAI
    const previewPrompt = `Generate a book preview for "${BOOK_ID}" at ${CEFR_LEVEL} English level.

Requirements:
- 50-100 words exactly
- Level-appropriate vocabulary (${CEFR_LEVEL} = 500-1000 most common words)
- Include: story theme, reading level, approximate length, curiosity hook
- NO spoilers - don't reveal the twist ending
- Match the emotional tone of the story
- Use simple, clear language for ${CEFR_LEVEL} learners

Return ONLY the preview text, no explanations.`;

    console.log(`   🤖 Calling OpenAI to generate preview text...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at writing book previews for ESL learners. Write clear, engaging previews that match the CEFR level.'
        },
        {
          role: 'user',
          content: previewPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    const previewText = completion.choices[0].message.content.trim();
    console.log(`   ✅ Generated preview: ${previewText.length} characters`);
    console.log(`   📝 Preview text: "${previewText.substring(0, 100)}..."`);

    // Generate preview audio
    const audio = await generatePreviewAudio(previewText, BOOK_ID, CEFR_LEVEL);

    // Save preview text to cache
    const previewTextPath = path.join(cacheDir, `${BOOK_ID}-${CEFR_LEVEL}-preview.txt`);
    fs.writeFileSync(previewTextPath, previewText, 'utf8');
    console.log(`   💾 Saved preview text: ${previewTextPath}`);

    // Save preview audio metadata to cache
    const previewAudioPath = path.join(cacheDir, `${BOOK_ID}-${CEFR_LEVEL}-preview-audio.json`);
    const audioMetadata = {
      bookId: BOOK_ID,
      level: CEFR_LEVEL,
      audio: {
        url: audio.url,
        duration: audio.duration,
        voice: audio.voice,
        voiceId: audio.voiceId
      },
      generatedAt: new Date().toISOString()
    };
    fs.writeFileSync(previewAudioPath, JSON.stringify(audioMetadata, null, 2), 'utf8');
    console.log(`   💾 Saved preview audio metadata: ${previewAudioPath}`);

    console.log(`\n✅ Preview generation complete!`);
    console.log(`   📝 Preview text: ${previewText.length} characters`);
    console.log(`   🎵 Preview audio: ${audio.duration.toFixed(2)}s (0.85× speed)`);
    console.log(`   🗣️ Voice: ${audio.voice}`);

  } catch (error) {
    console.error(`\n❌ Error generating preview:`, error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generatePreview()
    .then(() => {
      console.log('\n✅ Preview generation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Preview generation failed:', error);
      process.exit(1);
    });
}

export default generatePreview;

