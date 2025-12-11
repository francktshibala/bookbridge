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

// PRODUCTION VOICE SETTINGS - Jane (Community Builder narration)
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

const STORY_ID = 'refugee-journey-2';
const CEFR_LEVEL = 'A1';

/**
 * Enhanced Timing v3: Character-count proportion + punctuation penalties
 * This ensures perfect sync for sentences with different lengths and punctuation
 */
function calculateEnhancedTimingV3(sentences, totalDuration) {
  const totalCharacters = sentences.reduce((sum, sentence) => sum + sentence.length, 0);

  // Calculate punctuation penalties for each sentence
  const sentencePenalties = sentences.map(sentence => {
    const commaCount = (sentence.match(/,/g) || []).length;
    const semicolonCount = (sentence.match(/;/g) || []).length;
    const colonCount = (sentence.match(/:/g) || []).length;
    const emdashCount = (sentence.match(/—/g) || []).length;
    const ellipsisCount = (sentence.match(/\.\.\./g) || []).length;

    let pausePenalty = (commaCount * 0.15) +
                       (semicolonCount * 0.25) +
                       (colonCount * 0.20) +
                       (emdashCount * 0.18) +
                       (ellipsisCount * 0.12);

    pausePenalty = Math.min(pausePenalty, 0.6);  // Max 600ms penalty

    return { sentence, pausePenalty };
  });

  // Pause-budget-first approach: subtract pauses before distributing remaining time
  const totalPauseBudget = sentencePenalties.reduce((sum, item) => sum + item.pausePenalty, 0);
  let remainingDuration = totalDuration - totalPauseBudget;

  // Handle overflow: if pauses exceed duration, scale them down
  if (remainingDuration < 0) {
    const scaleFactor = totalDuration * 0.8 / totalPauseBudget;
    sentencePenalties.forEach(item => {
      item.pausePenalty *= scaleFactor;
    });
    remainingDuration = totalDuration * 0.2;
    console.warn(`   ⚠️ Pause budget exceeded duration, scaled down`);
  }

  // Calculate base duration using character-count proportion
  const timings = sentencePenalties.map((item, index) => {
    const characterRatio = item.sentence.length / totalCharacters;
    const baseDuration = remainingDuration * characterRatio;
    let adjustedDuration = baseDuration + item.pausePenalty;
    adjustedDuration = Math.max(adjustedDuration, 0.25);  // Min 250ms duration

    return { index, sentence: item.sentence, adjustedDuration };
  });

  // Renormalization: ensure sum equals measured duration exactly
  const currentTotal = timings.reduce((sum, t) => sum + t.adjustedDuration, 0);
  const renormalizeFactor = totalDuration / currentTotal;

  if (Math.abs(renormalizeFactor - 1.0) > 0.001) {
    console.log(`   📊 Renormalizing: ${currentTotal.toFixed(3)}s → ${totalDuration.toFixed(3)}s`);
    timings.forEach(t => {
      t.adjustedDuration *= renormalizeFactor;
    });
  }

  // Build final timings array
  let currentTime = 0;
  const finalTimings = timings.map(t => {
    const startTime = currentTime;
    const endTime = currentTime + t.adjustedDuration;
    currentTime = endTime;

    return {
      startTime: parseFloat(startTime.toFixed(3)),
      endTime: parseFloat(endTime.toFixed(3)),
      duration: parseFloat(t.adjustedDuration.toFixed(3)),
      text: t.sentence
    };
  });

  // Validation: verify sum equals measured duration
  const finalTotal = finalTimings[finalTimings.length - 1].endTime;
  if (Math.abs(finalTotal - totalDuration) > 0.01) {
    console.warn(`   ⚠️ Timing mismatch: ${finalTotal.toFixed(3)}s vs ${totalDuration.toFixed(3)}s`);
  } else {
    console.log(`   ✅ Timing validation: ${finalTotal.toFixed(3)}s === ${totalDuration.toFixed(3)}s`);
  }

  return finalTimings;
}

/**
 * Generate audio for combined preview text using ElevenLabs + FFmpeg post-processing
 */
async function generateCombinedPreviewAudio(combinedText, storyId, level) {
  console.log(`\n🎵 Generating combined preview audio for "${storyId}" at ${level} level...`);

  try {
    console.log(`   🗣️ Voice: ${JANE_VOICE_ID} (Jane)`);
    console.log(`   📝 Text length: ${combinedText.length} characters`);

    // Generate audio via ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${JANE_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: combinedText,
        model_id: JANE_VOICE_SETTINGS.model_id,
        voice_settings: JANE_VOICE_SETTINGS.voice_settings,
        speed: JANE_VOICE_SETTINGS.speed,
        output_format: JANE_VOICE_SETTINGS.output_format,
        apply_text_normalization: JANE_VOICE_SETTINGS.apply_text_normalization
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }

    // Save original audio to temp file
    const tempDir = path.join(process.cwd(), 'cache', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempOriginalFile = path.join(tempDir, `${storyId}-${level}-preview-original.mp3`);
    const audioBuffer = await response.arrayBuffer();
    fs.writeFileSync(tempOriginalFile, Buffer.from(audioBuffer));

    console.log(`   ✅ Generated original audio: ${tempOriginalFile}`);

    // Apply FFmpeg slowdown (0.85× = 18% slower)
    const tempSlowedFile = path.join(tempDir, `${storyId}-${level}-preview-slowed.mp3`);
    console.log(`   🐌 Applying FFmpeg slowdown (${TARGET_SPEED}×)...`);
    execSync(`ffmpeg -i "${tempOriginalFile}" -filter:a "atempo=${TARGET_SPEED}" -y "${tempSlowedFile}"`, {
      stdio: 'inherit'
    });

    // Measure duration with ffprobe
    console.log(`   📏 Measuring audio duration...`);
    const durationOutput = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempSlowedFile}"`
    ).toString().trim();
    const measuredDuration = parseFloat(durationOutput);

    console.log(`   ⏱️ Measured duration: ${measuredDuration.toFixed(2)}s`);

    // Split combined text into sentences for timing calculation
    const sentences = combinedText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^About This Story$/i));

    console.log(`   📊 Splitting into ${sentences.length} sentences for timing calculation...`);

    // Calculate Enhanced Timing v3 sentence timings
    const sentenceTimings = calculateEnhancedTimingV3(sentences, measuredDuration);
    console.log(`   ✅ Calculated timings for ${sentenceTimings.length} sentences`);

    // Upload slowed audio to Supabase
    const audioFileName = `${storyId}/${level}/preview-combined.mp3`;
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

    console.log(`   ✅ Combined preview audio uploaded: ${publicUrl}`);

    // Clean up temp files
    if (fs.existsSync(tempOriginalFile)) fs.unlinkSync(tempOriginalFile);
    if (fs.existsSync(tempSlowedFile)) fs.unlinkSync(tempSlowedFile);

    return {
      url: publicUrl,
      duration: measuredDuration,
      voice: 'Jane',
      voiceId: JANE_VOICE_ID,
      sentenceTimings: sentenceTimings
    };

  } catch (error) {
    console.error(`❌ Error generating combined preview audio: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🎤 Generating combined preview audio for "Refugee Journey #2 Story"');

  // Load combined text from cache
  const cacheDir = path.join(process.cwd(), 'cache');
  const combinedTextPath = path.join(cacheDir, `${STORY_ID}-${CEFR_LEVEL}-preview-combined.txt`);
  
  if (!fs.existsSync(combinedTextPath)) {
    throw new Error(`Combined text file not found: ${combinedTextPath}. Run generate-community-builder-preview-combined.js first.`);
  }

  const combinedText = fs.readFileSync(combinedTextPath, 'utf8').trim();
  const wordCount = combinedText.split(/\s+/).filter(word => word.length > 0).length;
  
  console.log(`\n📝 Combined preview text (${wordCount} words):`);
  console.log(`   "${combinedText.substring(0, 200)}..."`);

  // Generate audio
  const audioMetadata = await generateCombinedPreviewAudio(combinedText, STORY_ID, CEFR_LEVEL);

  // Save audio metadata to cache (including sentence timings)
  const audioMetadataPath = path.join(cacheDir, `${STORY_ID}-${CEFR_LEVEL}-preview-combined-audio.json`);
  const metadata = {
    storyId: STORY_ID,
    level: CEFR_LEVEL,
    audio: {
      url: audioMetadata.url,
      duration: audioMetadata.duration,
      voice: audioMetadata.voice,
      voiceId: audioMetadata.voiceId,
      sentenceTimings: audioMetadata.sentenceTimings
    },
    generatedAt: new Date().toISOString(),
    timingMethod: 'enhanced-timing-v3'
  };
  fs.writeFileSync(audioMetadataPath, JSON.stringify(metadata, null, 2));
  console.log(`✅ Saved audio metadata to cache (with ${audioMetadata.sentenceTimings.length} sentence timings)`);

  console.log('\n🎉 Combined preview audio generation complete!');
  console.log(`   📝 Text: ${combinedTextPath}`);
  console.log(`   🎵 Audio: ${audioMetadata.url}`);
  console.log(`   ⏱️ Duration: ${audioMetadata.duration.toFixed(2)}s`);
}

main()
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

