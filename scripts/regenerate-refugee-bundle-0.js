import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SARAH_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
const TARGET_SPEED = 0.85;

const SARAH_VOICE_SETTINGS = {
  voice_id: SARAH_VOICE_ID,
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

const STORY_ID = 'refugee-journey-1';
const CEFR_LEVEL = 'A1';

function calculateEnhancedTimingV3(sentences, totalDuration) {
  const totalCharacters = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  const sentencePenalties = sentences.map(sentence => {
    const commaCount = (sentence.match(/,/g) || []).length;
    const semicolonCount = (sentence.match(/;/g) || []).length;
    const colonCount = (sentence.match(/:/g) || []).length;
    const emdashCount = (sentence.match(/—/g) || []).length;
    const ellipsisCount = (sentence.match(/\.\.\./g) || []).length;
    let pausePenalty = (commaCount * 0.15) + (semicolonCount * 0.25) + (colonCount * 0.20) + (emdashCount * 0.18) + (ellipsisCount * 0.12);
    pausePenalty = Math.min(pausePenalty, 0.6);
    return { sentence, pausePenalty };
  });
  const totalPauseBudget = sentencePenalties.reduce((sum, item) => sum + item.pausePenalty, 0);
  let remainingDuration = totalDuration - totalPauseBudget;
  if (remainingDuration < 0) {
    const scaleFactor = totalDuration * 0.8 / totalPauseBudget;
    sentencePenalties.forEach(item => { item.pausePenalty *= scaleFactor; });
    remainingDuration = totalDuration * 0.2;
  }
  const timings = sentencePenalties.map((item, index) => {
    const characterRatio = item.sentence.length / totalCharacters;
    const baseDuration = remainingDuration * characterRatio;
    let adjustedDuration = baseDuration + item.pausePenalty;
    adjustedDuration = Math.max(adjustedDuration, 0.25);
    return { index, sentence: item.sentence, adjustedDuration };
  });
  const currentTotal = timings.reduce((sum, t) => sum + t.adjustedDuration, 0);
  const renormalizeFactor = totalDuration / currentTotal;
  if (Math.abs(renormalizeFactor - 1.0) > 0.001) {
    timings.forEach(t => { t.adjustedDuration *= renormalizeFactor; });
  }
  let currentTime = 0;
  const finalTimings = timings.map(t => {
    const startTime = currentTime;
    const endTime = currentTime + t.adjustedDuration;
    currentTime = endTime;
    return {
      startTime: parseFloat(startTime.toFixed(3)),
      endTime: parseFloat(endTime.toFixed(3)),
      duration: parseFloat(t.adjustedDuration.toFixed(3))
    };
  });
  return finalTimings;
}

async function regenerateBundle0() {
  console.log('🔄 Regenerating bundle 0 with corrected text (heading removed)...');
  
  const inputFile = path.join(process.cwd(), 'cache', `${STORY_ID}-A1-original.txt`);
  const fullText = fs.readFileSync(inputFile, 'utf8');
  const sentences = fullText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  
  console.log(`📖 Loaded ${sentences.length} sentences`);
  
  const bundleSentences = sentences.slice(0, 4);
  const bundleText = bundleSentences.join(' ');
  
  console.log(`📦 Bundle 0 text: "${bundleText.substring(0, 100)}..."`);
  
  const tempDir = path.join(process.cwd(), 'cache', 'temp');
  fs.mkdirSync(tempDir, { recursive: true });
  
  try {
    console.log(`🎙️ Generating audio with Sarah voice...`);
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${SARAH_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: bundleText,
        model_id: SARAH_VOICE_SETTINGS.model_id,
        voice_settings: SARAH_VOICE_SETTINGS.voice_settings,
        speed: SARAH_VOICE_SETTINGS.speed,
        output_format: SARAH_VOICE_SETTINGS.output_format,
        apply_text_normalization: SARAH_VOICE_SETTINGS.apply_text_normalization
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    const tempFile = path.join(tempDir, `${STORY_ID}-${CEFR_LEVEL}-bundle-0-temp.mp3`);
    fs.writeFileSync(tempFile, Buffer.from(audioBuffer));
    
    const slowedFile = path.join(tempDir, `${STORY_ID}-${CEFR_LEVEL}-bundle-0-slowed.mp3`);
    console.log(`⚡ Applying FFmpeg 0.85× slowdown...`);
    execSync(`ffmpeg -i "${tempFile}" -filter:a "atempo=${TARGET_SPEED}" -y "${slowedFile}"`, {
      stdio: 'inherit'
    });
    
    const durationOutput = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${slowedFile}"`
    ).toString().trim();
    const duration = parseFloat(durationOutput);
    
    console.log(`⏱️ Duration: ${duration.toFixed(2)}s`);
    
    const sentenceTimings = calculateEnhancedTimingV3(bundleSentences, duration);
    
    console.log(`☁️ Uploading to Supabase...`);
    const fileName = `${STORY_ID}/${CEFR_LEVEL}/bundle_0.mp3`;
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
    
    console.log(`✅ Uploaded: ${fileName}`);
    
    const sentenceTimingsWithIndex = bundleSentences.map((sentence, idx) => ({
      text: sentence,
      startTime: sentenceTimings[idx].startTime,
      endTime: sentenceTimings[idx].endTime,
      duration: sentenceTimings[idx].duration,
      sentenceIndex: idx
    }));
    
    const bundleMetadata = {
      bundleIndex: 0,
      startSentenceIndex: 0,
      endSentenceIndex: 3,
      text: bundleText,
      sentences: bundleSentences,
      audioUrl: publicUrl,
      duration: duration,
      voiceId: SARAH_VOICE_SETTINGS.voice_id,
      voiceName: 'Sarah',
      speed: TARGET_SPEED,
      sentenceTimings: sentenceTimingsWithIndex
    };
    
    // Update bundle metadata file
    const metadataPath = path.join(process.cwd(), `cache/${STORY_ID}-${CEFR_LEVEL}-bundles-metadata.json`);
    const allMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    allMetadata[0] = bundleMetadata;
    fs.writeFileSync(metadataPath, JSON.stringify(allMetadata, null, 2));
    
    console.log(`✅ Updated bundle metadata file`);
    
    fs.unlinkSync(tempFile);
    fs.unlinkSync(slowedFile);
    
    console.log(`\n🎉 Bundle 0 regenerated successfully!`);
    console.log(`   📝 Text: "${bundleText.substring(0, 80)}..."`);
    console.log(`   ⏱️ Duration: ${duration.toFixed(2)}s`);
    console.log(`   🎵 Audio: ${publicUrl}`);
    
  } catch (error) {
    console.error(`❌ Error regenerating bundle 0:`, error.message);
    throw error;
  }
}

regenerateBundle0()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(`\n💥 Fatal error:`, error);
    process.exit(1);
  });

