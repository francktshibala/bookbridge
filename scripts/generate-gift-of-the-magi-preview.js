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
  'daniel': 'onwK4e9ZLuTAKqWW03F9',  // British deep news presenter
  'sarah': 'EXAVITQu4vr4xnSDxMaL',   // American soft news
  'grandpa': 'NOpBlnGInO9m6vDvFkFC',  // Grandpa Spuds - Warm storyteller
  'james': 'EkK5I93UQWFDigLMpZcX',   // James - Husky & engaging
  'jane': 'RILOU7YmBhvwJGDGjNmP'     // Jane - Professional clear narration
};

// NOVEMBER 2025 PRODUCTION STANDARD - FFmpeg 0.85× Post-Processing
const TARGET_SPEED = 0.85;  // 18% slower, comfortable pace

// PRODUCTION VOICE SETTINGS (November 2025)
const GRANDPA_VOICE_SETTINGS = {
  voice_id: 'NOpBlnGInO9m6vDvFkFC',  // Grandpa Spuds voice ID
  model_id: 'eleven_monolingual_v1',
  voice_settings: {
    stability: 0.5,                    // Clarity for ESL learners
    similarity_boost: 0.8,             // Better presence
    style: 0.05,                       // Subtle sophistication
    use_speaker_boost: true
  },
  speed: 0.90,                          // Generate at default
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

// PRODUCTION VOICE SETTINGS - James (A2)
const JAMES_VOICE_SETTINGS = {
  voice_id: 'EkK5I93UQWFDigLMpZcX',  // James voice ID (Husky & engaging)
  model_id: 'eleven_monolingual_v1',
  voice_settings: {
    stability: 0.5,                    // Clarity for ESL learners
    similarity_boost: 0.8,             // Better presence
    style: 0.05,                       // Subtle sophistication
    use_speaker_boost: true
  },
  speed: 0.90,                          // Generate at default
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

// PRODUCTION VOICE SETTINGS - Jane (B1)
const JANE_VOICE_SETTINGS = {
  voice_id: 'RILOU7YmBhvwJGDGjNmP',  // Jane voice ID (Professional clear narration)
  model_id: 'eleven_monolingual_v1',
  voice_settings: {
    stability: 0.5,                    // Clarity for ESL learners
    similarity_boost: 0.8,             // Better presence
    style: 0.05,                       // Subtle sophistication
    use_speaker_boost: true
  },
  speed: 0.90,                          // Generate at default
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

// VOICE MAPPING FOR GIFT OF THE MAGI: A1 → Grandpa, A2 → James, B1 → Jane
function getVoiceForLevel(level) {
  const voiceMapping = {
    'A1': GRANDPA_VOICE_SETTINGS,  // A1 uses Grandpa Spuds (Warm storyteller)
    'A2': JAMES_VOICE_SETTINGS,    // A2 uses James (Husky & engaging)
    'B1': JANE_VOICE_SETTINGS      // B1 uses Jane (Professional clear narration)
  };
  return voiceMapping[level] || GRANDPA_VOICE_SETTINGS;
}

// Get book ID and level from command line or use defaults
const BOOK_ID = process.argv[2] || 'gift-of-the-magi';
const CEFR_LEVEL = process.argv[3] || 'A1';

/**
 * Generate audio for preview text using ElevenLabs + FFmpeg post-processing
 * Follows November 2025 production standard (0.85× speed)
 */
async function generatePreviewAudio(previewText, bookId, level) {
  console.log(`\n🎵 Generating preview audio for "${bookId}" at ${level} level...`);
  
  try {
    const voiceSettings = getVoiceForLevel(level);
    const voiceName = level === 'A1' ? 'Grandpa' : (level === 'A2' ? 'James' : (level === 'B1' ? 'Jane' : 'Unknown'));
    
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
        voice_settings: voiceSettings.voice_settings
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`   ✅ Generated audio: ${Math.round(audioBuffer.length / 1024)}KB`);

    // Save original audio to temp file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempOriginalFile = path.join(tempDir, `preview-${bookId}-${level}-original.mp3`);
    fs.writeFileSync(tempOriginalFile, audioBuffer);
    console.log(`   💾 Saved original audio to temp file`);

    // Measure original duration
    const originalDurationOutput = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempOriginalFile}"`
    ).toString().trim();
    const originalDuration = parseFloat(originalDurationOutput);
    console.log(`   ⏱️ Original duration: ${originalDuration.toFixed(3)}s`);

    // Apply FFmpeg atempo filter to slow down audio
    const tempProcessedFile = path.join(tempDir, `preview-${bookId}-${level}-processed.mp3`);
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
    console.error(`   ❌ Preview audio generation failed: ${error.message}`);
    throw error;
  }
}

async function generatePreview() {
  try {
    console.log(`\n📖 Generating preview for "${BOOK_ID}" at ${CEFR_LEVEL} level...`);

    // Load simplified text
    const simplifiedCachePath = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-simplified.txt`);
    if (!fs.existsSync(simplifiedCachePath)) {
      throw new Error(`Simplified cache not found: ${simplifiedCachePath}. Run simplify script first.`);
    }

    const simplifiedText = fs.readFileSync(simplifiedCachePath, 'utf8').trim();
    const wordCount = simplifiedText.split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200); // Average reading speed

    console.log(`   📝 Loaded simplified text: ${wordCount} words (${readingTimeMinutes} min read)`);

    // Generate preview using OpenAI
    const prompt = `You are an expert ESL reading specialist. Generate a 50-75 word preview for "The Gift of the Magi" by O. Henry at A1 level.

REQUIREMENTS:
- Length: 50-75 words (A1 level - simple language)
- Language: Match A1 CEFR level (simple words, present/past tense only)
- Required elements:
  1. CEFR level indicator: "Perfect for A1 level" or "Great for beginners"
  2. Length/time: "${readingTimeMinutes}-minute read" or "Short story"
  3. Curiosity hook: 1-2 sentences creating interest WITHOUT spoilers
  4. Theme/genre: Brief mention (1 sentence) - "A story about..." or "Explores themes of..."
- AVOID: Spoilers, complex words, overwhelming context, negative framing
- Tone: Warm, inviting, encouraging

Generate ONLY the preview text, no explanations.`;

    console.log(`   🤖 Generating preview with OpenAI...`);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an expert ESL reading specialist who creates engaging, level-appropriate book previews.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    const previewText = completion.choices[0].message.content.trim();
    const previewWordCount = previewText.split(/\s+/).length;

    console.log(`   ✅ Generated preview: ${previewWordCount} words`);
    console.log(`   📄 Preview text: "${previewText.substring(0, 100)}..."`);

    // Validate preview length
    if (previewWordCount < 50 || previewWordCount > 100) {
      console.warn(`⚠️ Preview length (${previewWordCount} words) outside recommended range (50-100)`);
    }

    // Save preview to database using raw SQL (works if preview column exists)
    try {
      // First ensure BookContent record exists
      await prisma.bookContent.upsert({
        where: { bookId: BOOK_ID },
        update: {
          wordCount: wordCount,
          totalChunks: 0
        },
        create: {
          bookId: BOOK_ID,
          title: 'The Gift of the Magi',
          author: 'O. Henry',
          fullText: simplifiedText,
          era: 'american-19c',
          wordCount: wordCount,
          totalChunks: 0
        }
      });
      
      // Note: Preview text is saved to cache file only (same pattern as The Necklace)
      // Database preview column migration was rolled back, so we use cache files
    } catch (dbError) {
      console.warn('⚠️ Could not save preview to database:', dbError.message);
      console.log('   Preview text and audio are still saved to cache files');
    }

    // Also save to cache for reference (same pattern as The Necklace)
    const previewCacheFile = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-preview.txt`);
    fs.writeFileSync(previewCacheFile, previewText);
    console.log(`✅ Preview cached to: ${previewCacheFile}`);

    // Generate preview audio (scalable for any book/level)
    let previewAudio = null;
    try {
      previewAudio = await generatePreviewAudio(previewText, BOOK_ID, CEFR_LEVEL);
      
      // Save audio metadata to cache
      const audioMetadataFile = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-preview-audio.json`);
      fs.writeFileSync(audioMetadataFile, JSON.stringify(previewAudio, null, 2));
      console.log(`✅ Preview audio metadata cached to: ${audioMetadataFile}`);
    } catch (audioError) {
      console.warn(`⚠️ Preview audio generation failed (preview text still saved): ${audioError.message}`);
      // Don't throw - preview text is still useful without audio
    }

    return {
      previewText,
      previewAudio
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
    .then((result) => {
      console.log('\n🎉 Preview generation completed successfully!');
      if (result.previewAudio) {
        console.log(`\n📊 Preview Audio Summary:`);
        console.log(`   URL: ${result.previewAudio.audioUrl}`);
        console.log(`   Duration: ${result.previewAudio.duration.toFixed(2)}s`);
        console.log(`   Speed: ${result.previewAudio.targetSpeed}× (${((1 - result.previewAudio.targetSpeed) * 100).toFixed(0)}% slower)`);
      }
    })
    .catch(console.error);
}

export { generatePreview };

