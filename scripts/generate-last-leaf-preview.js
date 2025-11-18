import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import OpenAI from 'openai';

const execAsync = promisify(exec);

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

// PRODUCTION VOICE SETTINGS - Jane (B1)
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

// Get book ID and level from command line or use defaults
const BOOK_ID = process.argv[2] || 'the-last-leaf';
const CEFR_LEVEL = process.argv[3] || 'B1';

/**
 * Generate audio for preview text using ElevenLabs + FFmpeg post-processing
 * Follows November 2025 production standard (0.85× speed)
 */
async function generatePreviewAudio(previewText, bookId, level) {
  console.log(`\n🎵 Generating preview audio for "${bookId}" at ${level} level...`);
  
  try {
    const voiceSettings = JANE_VOICE_SETTINGS;
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
        speed: voiceSettings.speed || 0.90
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
    }

    const originalAudioBuffer = await response.arrayBuffer();
    console.log(`   ✅ Generated audio: ${Math.round(originalAudioBuffer.byteLength / 1024)}KB`);

    // Ensure temp directory exists
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save original audio to temp file
    const tempOriginalFile = path.join(tempDir, `preview_${bookId}_${level}_original_temp.mp3`);
    fs.writeFileSync(tempOriginalFile, Buffer.from(originalAudioBuffer));

    // Measure original duration with ffprobe
    const originalDurationOutput = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempOriginalFile}"`
    ).toString().trim();
    const originalDuration = parseFloat(originalDurationOutput);
    console.log(`   ⏱️ Original duration: ${originalDuration.toFixed(3)}s`);

    // Apply FFmpeg atempo filter to slow down to 0.85×
    const tempProcessedFile = path.join(tempDir, `preview_${bookId}_${level}_processed_temp.mp3`);
    execSync(
      `ffmpeg -i "${tempOriginalFile}" -filter:a "atempo=${TARGET_SPEED}" -y "${tempProcessedFile}"`,
      { stdio: 'ignore' }
    );
    console.log(`   🎚️ Applied FFmpeg atempo=${TARGET_SPEED} (18% slower)`);

    // Measure processed duration
    const processedDurationOutput = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempProcessedFile}"`
    ).toString().trim();
    const processedDuration = parseFloat(processedDurationOutput);
    console.log(`   ⏱️ Processed duration: ${processedDuration.toFixed(3)}s`);

    // Read processed audio
    const processedAudioBuffer = fs.readFileSync(tempProcessedFile);

    // Upload to Supabase storage
    const audioFileName = `${bookId}/${level}/preview.mp3`;
    console.log(`   ☁️ Uploading to Supabase: ${audioFileName}`);
    
    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(audioFileName, processedAudioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio-files')
      .getPublicUrl(audioFileName);

    console.log(`   ✅ Preview audio uploaded: ${publicUrl}`);

    // Clean up temp files
    try {
      fs.unlinkSync(tempOriginalFile);
      fs.unlinkSync(tempProcessedFile);
    } catch (cleanupError) {
      console.warn(`   ⚠️ Could not clean up temp files: ${cleanupError.message}`);
    }

    return {
      audioUrl: publicUrl,
      duration: processedDuration,
      originalDuration: originalDuration,
      targetSpeed: TARGET_SPEED
    };

  } catch (error) {
    console.error('❌ Preview audio generation failed:', error.message);
    throw error;
  }
}

/**
 * Generate preview for a book at a specific CEFR level
 * Based on research: 50-100 words, includes level, length, curiosity hook, theme
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
    const simplifiedText = simplifiedData.sentences.map(s => s.text).join(' ');
    const wordCount = simplifiedText.split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200); // 200 words per minute

    console.log(`   📖 Book: "The Last Leaf" by O. Henry`);
    console.log(`   📊 Word count: ${wordCount} words`);
    console.log(`   ⏱️ Reading time: ~${readingTimeMinutes} minutes`);

    // Generate preview text using OpenAI
    const previewPrompt = `Generate a book preview for "The Last Leaf" by O. Henry at ${CEFR_LEVEL} English level.

Requirements:
- Length: 75-100 words (B1 level)
- Language: Match ${CEFR_LEVEL} level vocabulary and grammar
- Required elements:
  1. CEFR level indicator: "Perfect for ${CEFR_LEVEL} level" or "Great for intermediate learners"
  2. Length/time: "${readingTimeMinutes}-minute read" or "Short story"
  3. Curiosity hook: 1-2 sentences creating interest WITHOUT spoilers
  4. Theme/genre: Brief mention (1 sentence) - "A story about..." or "Explores themes of..."
- Optional: Achievement promise ("Perfect for building confidence")
- AVOID: Spoilers, complex words, overwhelming context, negative framing

The story is about two young artists, Sue and Johnsy, living in Greenwich Village. Johnsy becomes very sick and believes she will die when the last leaf falls from a vine outside her window. Their neighbor, an old artist named Behrman, creates a masterpiece to save her life.

Generate ONLY the preview text, no explanations:`;

    console.log(`   🤖 Generating preview text with OpenAI...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: previewPrompt
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    const previewText = completion.choices[0].message.content.trim();
    const previewWordCount = previewText.split(/\s+/).length;

    console.log(`   ✅ Generated preview: ${previewWordCount} words`);
    console.log(`   📝 Preview text: "${previewText.substring(0, 100)}..."`);

    // Validate preview length
    if (previewWordCount < 50 || previewWordCount > 125) {
      console.warn(`   ⚠️ Preview length (${previewWordCount} words) is outside recommended range (50-125 words)`);
    }

    // Generate preview audio
    const audioMetadata = await generatePreviewAudio(previewText, BOOK_ID, CEFR_LEVEL);

    // Save preview text to cache
    const previewTextPath = path.join(cacheDir, `${BOOK_ID}-${CEFR_LEVEL}-preview.txt`);
    fs.writeFileSync(previewTextPath, previewText, 'utf8');
    console.log(`   💾 Preview text saved to: ${previewTextPath}`);

    // Save preview audio metadata to cache
    const previewAudioMetadata = {
      audioUrl: audioMetadata.audioUrl,
      duration: audioMetadata.duration,
      originalDuration: audioMetadata.originalDuration,
      targetSpeed: audioMetadata.targetSpeed,
      voice: 'Jane',
      voiceId: JANE_VOICE_SETTINGS.voice_id,
      generatedAt: new Date().toISOString()
    };

    const previewAudioPath = path.join(cacheDir, `${BOOK_ID}-${CEFR_LEVEL}-preview-audio.json`);
    fs.writeFileSync(previewAudioPath, JSON.stringify(previewAudioMetadata, null, 2), 'utf8');
    console.log(`   💾 Preview audio metadata saved to: ${previewAudioPath}`);

    console.log(`\n✅ Preview generation complete!`);
    console.log(`   📝 Preview text: ${previewWordCount} words`);
    console.log(`   🎵 Preview audio: ${audioMetadata.duration.toFixed(2)}s (${audioMetadata.targetSpeed}× speed)`);
    console.log(`   🗣️ Voice: Jane (${JANE_VOICE_SETTINGS.voice_id})`);

    return {
      previewText,
      previewAudio: previewAudioMetadata
    };

  } catch (error) {
    console.error('❌ Preview generation failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generatePreview()
    .then(() => console.log('\n✅ Preview generation completed successfully!'))
    .catch(error => {
      console.error('\n❌ Failed:', error.message);
      process.exit(1);
    });
}

export { generatePreview };

