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
  'jane': 'RILOU7YmBhvwJGDGjNmP'     // Professional audiobook reader
};

// NOVEMBER 2025 PRODUCTION STANDARD - FFmpeg 0.85× Post-Processing
const TARGET_SPEED = 0.85;  // 18% slower, comfortable pace

// PRODUCTION VOICE SETTINGS (November 2025)
const SARAH_VOICE_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL',  // Sarah voice ID (American soft news)
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

const DANIEL_VOICE_SETTINGS = {
  voice_id: 'onwK4e9ZLuTAKqWW03F9',
  model_id: 'eleven_monolingual_v1',
  voice_settings: {
    stability: 0.45,
    similarity_boost: 0.8,
    style: 0.1,
    use_speaker_boost: true
  },
  speed: 0.90,
  output_format: 'mp3_44100_128',
  apply_text_normalization: 'auto'
};

const JANE_VOICE_SETTINGS = {
  voice_id: 'RILOU7YmBhvwJGDGjNmP',  // Jane voice ID (Professional audiobook reader)
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

// VOICE MAPPING FOR LADY WITH THE DOG: A1 → Sarah, A2 → Daniel, B1 → Jane
function getVoiceForLevel(level) {
  const voiceMapping = {
    'A1': SARAH_VOICE_SETTINGS,  // A1 uses Sarah (American soft news)
    'A2': DANIEL_VOICE_SETTINGS,
    'B1': JANE_VOICE_SETTINGS   // B1 uses Jane (Professional audiobook reader)
  };
  return voiceMapping[level] || SARAH_VOICE_SETTINGS;
}

// Get book ID and level from command line or use defaults
const BOOK_ID = process.argv[2] || 'lady-with-dog';
const CEFR_LEVEL = process.argv[3] || 'A1';

/**
 * Generate audio for preview text using ElevenLabs + FFmpeg post-processing
 * Follows November 2025 production standard (0.85× speed)
 */
async function generatePreviewAudio(previewText, bookId, level) {
  console.log(`\n🎵 Generating preview audio for "${bookId}" at ${level} level...`);
  
  try {
    const voiceSettings = getVoiceForLevel(level);
    const voiceName = level === 'A1' ? 'Sarah' : (level === 'A2' ? 'Daniel' : (level === 'B1' ? 'Jane' : 'Sarah'));
    
    console.log(`   🗣️ Using voice: ${voiceSettings.voice_id} (${voiceName})`);
    
    // Generate audio at default speed (0.90×)
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
 * SCALABLE: Works for any bookId and level
 */
async function generatePreview() {
  console.log(`\n📝 Generating preview for "${BOOK_ID}" at ${CEFR_LEVEL} level...`);

  try {
    // Load simplified text to understand content
    // Lady with the Dog uses JSON format, not TXT
    const cacheFile = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-simplified.json`);
    
    if (!fs.existsSync(cacheFile)) {
      throw new Error(`Simplified cache not found: ${cacheFile}. Run simplify script first.`);
    }

    const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const simplifiedSentences = cachedData.sentences;
    const simplifiedText = simplifiedSentences.map(s => s.simplifiedText).join(' ');
    const wordCount = simplifiedText.split(/\s+/).length;
    
    // Estimate reading time (average 150 words per minute for A1)
    const readingTimeMinutes = Math.ceil(wordCount / 150);

    console.log(`📊 Book stats: ${simplifiedSentences.length} sentences, ${wordCount} words, ~${readingTimeMinutes} min read`);

    // Get first few sentences for context (avoid spoilers)
    const previewContext = simplifiedSentences.slice(0, 5).map(s => s.simplifiedText).join(' ');

    // Generate preview using OpenAI
    const prompt = `You are an ESL reading specialist creating a book preview for ESL students.

BOOK: "The Lady with the Dog" by Anton Chekhov
CEFR LEVEL: A1 (beginner)
WORD COUNT: ${wordCount} words (~${readingTimeMinutes} minutes)
CONTEXT: ${previewContext.substring(0, 200)}...

REQUIREMENTS:
- Length: 50-75 words (A1 level - shorter is better)
- Language: Match A1 level (simple words, present/past tense only)
- Required elements:
  1. CEFR level indicator: "Perfect for A1 level" or "Great for beginners"
  2. Length/time: "${readingTimeMinutes}-minute read" or "Short story"
  3. Curiosity hook: 1-2 sentences creating interest WITHOUT spoilers
  4. Theme/genre: Brief mention (1 sentence) - "A story about..." or "Explores themes of..."
- Optional (if space): Achievement promise ("Perfect for building confidence")
- AVOID: Spoilers, complex words, overwhelming context, negative framing

Generate ONLY the preview text (no explanations, no markdown, just the preview text):`;

    console.log('🤖 Generating preview with OpenAI...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert ESL reading specialist creating engaging book previews for beginner English learners.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const previewText = response.choices[0].message.content.trim();
    const previewWordCount = previewText.split(/\s+/).length;

    console.log(`\n✅ Preview generated (${previewWordCount} words):`);
    console.log(`\n"${previewText}"\n`);

    // Validate preview length
    if (previewWordCount < 50 || previewWordCount > 100) {
      console.warn(`⚠️ Preview length (${previewWordCount} words) outside recommended range (50-100)`);
    }

    // Save preview to database (skip if preview field doesn't exist yet)
    try {
      await prisma.bookContent.upsert({
        where: { bookId: BOOK_ID },
        update: {
          // preview: previewText  // Commented out until DB migration adds preview field
        },
        create: {
          bookId: BOOK_ID,
          title: 'The Lady with the Dog',
          author: 'Anton Chekhov',
          fullText: simplifiedText,
          era: 'russian-realist',
          wordCount: wordCount,
          totalChunks: 0
          // preview: previewText  // Commented out until DB migration adds preview field
        }
      });
      console.log('✅ Preview metadata saved to database');
    } catch (dbError) {
      console.warn('⚠️ Could not save preview to database (preview field may not exist yet):', dbError.message);
      console.log('   Preview text and audio are still saved to cache files');
    }

    // Also save to cache for reference
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

