#!/usr/bin/env node

/**
 * Regenerate "Always a Family" A1 bundles WITHOUT character names in audio
 * 
 * This script:
 * 1. Loads existing bundle metadata
 * 2. Strips "Danny:" and "Annie:" prefixes from text before TTS
 * 3. Keeps original text with names for display
 * 4. Regenerates audio with cleaned text
 * 5. Updates database with new audio files
 * 
 * Result: Audio flows naturally without repetitive name tags, but text still shows names
 */

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

/**
 * Remove character name prefixes from dialogue
 * "Danny: Hello" → "Hello"
 * "Annie: Yes" → "Yes"
 * Also handles names in middle of text: "text. Danny: more text" → "text. more text"
 */
function removeCharacterNames(text) {
  // Remove "Danny:" or "Annie:" anywhere in text (not just start of line)
  // Pattern: name followed by colon and optional space
  return text
    .replace(/\b(Danny|Annie):\s*/gi, '')
    .trim();
}

console.log(`🎵 REGENERATING "Always a Family" A1 bundles WITHOUT character names`);
console.log(`📚 Book ID: ${BOOK_ID}`);
console.log(`🎯 Level: ${CEFR_LEVEL}`);
console.log(`🗣️ Voice: Sarah (${SARAH_VOICE_SETTINGS.voice_id})`);
console.log(`⚡ Speed: Generate at 0.90×, FFmpeg slow to 0.85×`);
console.log(`=`.repeat(60));

// Load existing bundle metadata
const metadataPath = path.join(process.cwd(), 'cache/storycorps/always-a-family-A1-bundles-metadata.json');
const existingMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

console.log(`\n📦 Loaded ${existingMetadata.length} existing bundles`);
console.log(`\n🔄 Processing bundles to remove character names from audio...`);

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

async function regenerateBundles() {
  const tempDir = path.join(process.cwd(), 'temp/audio');
  fs.mkdirSync(tempDir, { recursive: true });

  const updatedMetadata = [];

  console.log(`\n🎬 Regenerating audio for ${existingMetadata.length} bundles...\n`);

  for (let i = 0; i < existingMetadata.length; i++) {
    const bundle = existingMetadata[i];
    const progress = `${i + 1}/${existingMetadata.length}`;

    // Original text with names (for display)
    const originalText = bundle.text;
    
    // Cleaned text without names (for audio)
    const cleanedText = removeCharacterNames(originalText);
    
    // Also clean individual sentences
    const cleanedSentences = bundle.sentences.map(s => removeCharacterNames(s));

    console.log(`📦 Bundle ${progress} (sentences ${bundle.startSentenceIndex}-${bundle.endSentenceIndex})`);
    console.log(`   📝 Original: "${originalText.substring(0, 60)}..."`);
    console.log(`   🎤 Cleaned:  "${cleanedText.substring(0, 60)}..."`);

    try {
      console.log(`   🎙️ Generating audio with cleaned text (no names)...`);
      const audioBuffer = await generateElevenLabsAudio(cleanedText, SARAH_VOICE_SETTINGS);

      const tempFile = path.join(tempDir, `${BOOK_ID}-${CEFR_LEVEL}-bundle-${bundle.bundleIndex}-temp.mp3`);
      fs.writeFileSync(tempFile, audioBuffer);

      const slowedFile = path.join(tempDir, `${BOOK_ID}-${CEFR_LEVEL}-bundle-${bundle.bundleIndex}-slowed.mp3`);
      console.log(`   ⚡ Applying FFmpeg 0.85× slowdown...`);
      const slowdownSuccess = await applyFFmpegSlowdown(tempFile, slowedFile);

      if (!slowdownSuccess) {
        throw new Error('FFmpeg slowdown failed');
      }

      console.log(`   ⏱️ Measuring duration...`);
      const duration = await measureAudioDuration(slowedFile);

      if (duration === null) {
        throw new Error('Failed to measure audio duration');
      }

      console.log(`   ⏱️ Duration: ${duration.toFixed(2)}s`);

      console.log(`   ☁️ Uploading to Supabase...`);
      const fileName = `${BOOK_ID}/${CEFR_LEVEL}/bundle_${bundle.bundleIndex}.mp3`;
      const slowedBuffer = fs.readFileSync(slowedFile);

      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(fileName, slowedBuffer, {
          contentType: 'audio/mpeg',
          cacheControl: '2592000',
          upsert: true
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      const publicUrl = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName).data.publicUrl;

      console.log(`   ✅ Uploaded: ${fileName}`);

      // Store metadata with ORIGINAL text (with names) for display
      // But audio was generated from CLEANED text (without names)
      updatedMetadata.push({
        bundleIndex: bundle.bundleIndex,
        startSentenceIndex: bundle.startSentenceIndex,
        endSentenceIndex: bundle.endSentenceIndex,
        text: originalText,  // Keep original for display
        sentences: bundle.sentences,  // Keep original sentences with names
        cleanedText: cleanedText,  // Store cleaned version for reference
        cleanedSentences: cleanedSentences,  // Store cleaned sentences
        audioUrl: publicUrl,
        duration: duration,
        voiceId: SARAH_VOICE_SETTINGS.voice_id,
        voiceName: 'Sarah',
        speed: TARGET_SPEED
      });

      fs.unlinkSync(tempFile);
      fs.unlinkSync(slowedFile);

    } catch (error) {
      console.error(`   ❌ Error processing bundle ${progress}:`, error.message);
      // Continue to next bundle even if one fails
    }
  }

  console.log(`\n📈 Progress: ${updatedMetadata.length}/${existingMetadata.length} (100%)\n`);

  // Save updated metadata
  const outputPath = path.join(process.cwd(), `cache/storycorps/${BOOK_ID}-${CEFR_LEVEL}-bundles-metadata-no-names.json`);
  fs.writeFileSync(outputPath, JSON.stringify(updatedMetadata, null, 2));
  
  console.log(`\n🎉 AUDIO REGENERATION COMPLETE!`);
  console.log(`=`.repeat(60));
  console.log(`📦 Total bundles: ${updatedMetadata.length}`);
  console.log(`✅ Success rate: ${((updatedMetadata.length / existingMetadata.length) * 100).toFixed(0)}%`);
  console.log(`💾 Metadata: ${outputPath}`);
  console.log(`🗣️ Voice: Sarah (${SARAH_VOICE_SETTINGS.voice_id})`);
  console.log(`⚡ Speed: ${TARGET_SPEED}× (November 2025 standard)`);
  console.log(`\n📝 Note: Character names removed from audio but kept in text display`);
  console.log(`\n🚀 Next step: Run database integration script to update records`);
}

regenerateBundles()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(`\n💥 Fatal error during bundle regeneration:`, error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

