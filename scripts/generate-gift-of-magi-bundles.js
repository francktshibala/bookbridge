import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// M1 PROVEN VOICE SETTINGS
const SARAH_VOICE_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL',  // Sarah voice ID
  model_id: 'eleven_monolingual_v1',  // M1 proven model (NOT eleven_flash_v2_5)
  voice_settings: {
    stability: 0.5,        // ElevenLabs default (M1 proven)
    similarity_boost: 0.75, // ElevenLabs default (M1 proven)
    style: 0.0,            // ElevenLabs default (M1 proven)
    speed: 0.90,           // M1 PROVEN SPEED for perfect sync
    use_speaker_boost: true
  }
};

const DANIEL_VOICE_SETTINGS = {
  voice_id: 'onwK4e9ZLuTAKqWW03F9',  // Daniel voice ID
  model_id: 'eleven_monolingual_v1',  // M1 proven model (NOT eleven_flash_v2_5)
  voice_settings: {
    stability: 0.5,        // ElevenLabs default (M1 proven)
    similarity_boost: 0.75, // ElevenLabs default (M1 proven)
    style: 0.0,            // ElevenLabs default (M1 proven)
    speed: 0.90,           // M1 PROVEN SPEED for perfect sync
    use_speaker_boost: true
  }
};

// VOICE MAPPING: A1 → Sarah, A2/B1 → Daniel (per Master Mistakes Prevention)
function getVoiceForLevel(level) {
  const voiceMapping = {
    'A1': SARAH_VOICE_SETTINGS,
    'A2': SARAH_VOICE_SETTINGS, // Keep A2 as Sarah (already working)
    'B1': DANIEL_VOICE_SETTINGS  // B1 uses Daniel
  };
  return voiceMapping[level] || DANIEL_VOICE_SETTINGS;
}

const BOOK_ID = 'gift-of-the-magi';

// SCRIPT LEVEL VALIDATION - MANDATORY FIRST (prevents runtime failures)
const VALID_LEVELS = ['A1', 'A2', 'B1'];

// Get target level from command line argument
const targetLevel = process.argv[2];

// Validate level before proceeding
if (!targetLevel) {
  console.error('❌ Error: Please specify a CEFR level (A1, A2, or B1)');
  console.log('Usage: node scripts/generate-gift-of-magi-bundles.js [A1|A2|B1]');
  process.exit(1);
}

if (!VALID_LEVELS.includes(targetLevel)) {
  console.error(`❌ Error: Invalid level "${targetLevel}". Valid levels: ${VALID_LEVELS.join(', ')}`);
  process.exit(1);
}

const CEFR_LEVEL = targetLevel;

class GiftOfMagiBundleGenerator {
  constructor() {
    this.isPilot = process.argv.includes('--pilot');
    this.maxBundles = this.isPilot ? 5 : Infinity; // PILOT: 5 bundles for testing
  }

  async generateBundles() {
    const voiceSettings = getVoiceForLevel(CEFR_LEVEL);
    const voiceName = voiceSettings === SARAH_VOICE_SETTINGS ? 'Sarah' : 'Daniel';

    console.log(`🎁 Generating "The Gift of the Magi" bundles with ${voiceName} voice...`);
    console.log(`🎯 Using M1 proven settings: ${voiceName} voice + speed ${voiceSettings.voice_settings.speed} + eleven_monolingual_v1`);

    if (this.isPilot) {
      console.log('🧪 PILOT MODE: Generating first 5 bundles only (~$0.15 cost)');
    }

    try {
      // Load simplified text and chapters
      const simplifiedFilePath = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-simplified.txt`);

      if (!fs.existsSync(simplifiedFilePath)) {
        throw new Error('Simplified text not found. Run simplify-gift-of-magi.js first');
      }

      const simplifiedText = fs.readFileSync(simplifiedFilePath, 'utf8');
      // Split on sentence endings while preserving punctuation
      const sentences = simplifiedText.match(/[^.!?]*[.!?]/g) || [];
      const cleanSentences = sentences.map(s => s.trim()).filter(s => s.length > 5);

      console.log(`📝 Processing ${cleanSentences.length} sentences into bundles...`);

      // Create 4-sentence bundles (standard bundle architecture)
      const bundles = [];
      const bundlesToGenerate = this.isPilot ? Math.min(this.maxBundles, Math.ceil(cleanSentences.length / 4)) : Math.ceil(cleanSentences.length / 4);

      for (let i = 0; i < bundlesToGenerate; i++) {
        const startSentence = i * 4;
        const endSentence = Math.min(startSentence + 4, cleanSentences.length);
        const bundleSentences = cleanSentences.slice(startSentence, endSentence);

        if (bundleSentences.length === 0) break;

        const bundle = {
          bundleIndex: i,
          bundleId: `bundle_${i}`,
          sentences: bundleSentences.map((text, idx) => ({
            sentenceIndex: startSentence + idx,
            text: text.trim(), // Keep punctuation for proper formatting
            startTime: 0, // Will be calculated after audio generation
            endTime: 0    // Will be calculated after audio generation
          }))
        };

        bundles.push(bundle);
      }

      console.log(`📦 Created ${bundles.length} bundles (${bundles.length * 4} sentences max)`);

      // Generate audio for each bundle
      for (let i = 0; i < bundles.length; i++) {
        const bundle = bundles[i];
        console.log(`\\n🎵 Generating audio for bundle ${i + 1}/${bundles.length}...`);

        await this.generateBundleAudio(bundle);

        // Update progress
        console.log(`✅ Bundle ${i + 1} completed`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Save bundle data
      const result = {
        bookId: BOOK_ID,
        title: `The Gift of the Magi (${CEFR_LEVEL} Level)`,
        author: 'O. Henry',
        cefrLevel: CEFR_LEVEL,
        voiceSettings: voiceSettings,
        totalBundles: bundles.length,
        totalSentences: bundles.reduce((sum, b) => sum + b.sentences.length, 0),
        bundles: bundles,
        createdAt: new Date().toISOString()
      };

      const outputPath = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-bundles.json`);
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

      console.log('\\n🎊 Bundle Generation Complete!');
      console.log(`📦 Generated: ${result.totalBundles} bundles`);
      console.log(`📝 Sentences: ${result.totalSentences}`);
      console.log(`🎯 Voice: Sarah + M1 proven settings`);
      console.log(`💾 Saved: ${outputPath}`);

      return result;

    } catch (error) {
      console.error('❌ Bundle generation failed:', error.message);
      throw error;
    }
  }

  async generateBundleAudio(bundle) {
    try {
      // Combine sentences into single text for TTS
      const bundleText = bundle.sentences.map(s => s.text).join(' ');

      console.log(`   📝 Text: "${bundleText.substring(0, 60)}..." (${bundleText.split(' ').length} words)`);

      // Generate audio with selected voice + M1 settings
      const voiceSettings = getVoiceForLevel(CEFR_LEVEL);
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceSettings.voice_id}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: bundleText,
          model_id: voiceSettings.model_id,
          voice_settings: voiceSettings.voice_settings
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      console.log(`   🎵 Generated ${Math.round(audioBuffer.byteLength / 1024)}KB audio`);

      // Upload to Supabase with book-specific path (prevent collisions)
      const voiceName = voiceSettings === SARAH_VOICE_SETTINGS ? 'sarah' : 'daniel';
      const fileName = `${BOOK_ID}/${CEFR_LEVEL}/${voiceName}/${bundle.bundleId}.mp3`;

      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      const audioUrl = `https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/${fileName}`;
      bundle.audioUrl = audioUrl;

      // GPT-5 recommended timing: speed-aware + length penalty + safety tail
      const baseSecondsPerWord = voiceSettings === SARAH_VOICE_SETTINGS ? 0.30 : 0.4;
      const speedAdjustment = voiceSettings.voice_settings.speed; // 0.90
      const adjustedSecondsPerWord = baseSecondsPerWord / speedAdjustment; // 0.4 / 0.90 = 0.44s

      let currentTime = 0;
      bundle.sentences.forEach(sentence => {
        const words = sentence.text.trim().split(/\s+/).length;

        // GPT-5 formula: base + length penalty + safety tail
        const baseDuration = words * adjustedSecondsPerWord;
        const longSentencePenalty = words > 15 ? (words - 15) * 0.05 : 0; // Extra time for complex sentences
        const safetyTail = 0.12; // 120ms safety buffer

        const duration = baseDuration + longSentencePenalty + safetyTail;

        sentence.startTime = currentTime;
        sentence.endTime = currentTime + duration;
        currentTime += duration;
      });

      bundle.totalDuration = currentTime;

      console.log(`   ⏱️ Duration: ${bundle.totalDuration.toFixed(1)}s (${bundle.sentences.length} sentences)`);
      console.log(`   🔗 Audio: ${audioUrl}`);

    } catch (error) {
      console.error(`   ❌ Bundle ${bundle.bundleIndex} audio generation failed:`, error.message);
      throw error;
    }
  }
}

async function generateGiftOfMagiBundles() {
  const generator = new GiftOfMagiBundleGenerator();
  try {
    await generator.generateBundles();
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateGiftOfMagiBundles()
    .then(() => console.log('\\n🎁 Gift of the Magi bundle generation completed!'))
    .catch(console.error);
}

export { generateGiftOfMagiBundles };