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

// Josh voice settings from TTS Enhancement Research (Agent 1 findings)
const JOSH_VOICE_SETTINGS = {
  stability: 0.55,       // Agent 1: Optimal for Josh voice clarity and adaptability
  style: 0.0,           // Agent 1: Natural delivery without stylistic emphasis
  speed: 0.88,          // Agent 1: 125 WPM target for A1 comprehension
  similarity_boost: 0.75,
  use_speaker_boost: true
};

const BOOK_ID = 'christmas-carol-enhanced-v2'; // Use versioned ID
const DANIEL_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'; // Daniel voice (male, clear)
const VOICE_ID = DANIEL_VOICE_ID; // Use Daniel for enhanced narration

// Content hash for versioned paths (GPT-5 fix)
import crypto from 'crypto';
const CONTENT_HASH = crypto.createHash('md5').update(`${BOOK_ID}-${VOICE_ID}-${JSON.stringify(JOSH_VOICE_SETTINGS)}`).digest('hex').substring(0, 8);
const TEMP_DIR = '/tmp/christmas-carol-bundles';
const SENTENCES_PER_BUNDLE = 4;

class ChristmasCarolBundleGenerator {
  constructor() {
    this.isPilot = process.argv.includes('--pilot');
    this.maxBundles = this.isPilot ? 20 : Infinity; // Pilot mode for testing
  }

  async generateBundles() {
    console.log('🎄 Starting A Christmas Carol bundle generation with A1 flow enhancement...');
    console.log(`🎯 Daniel voice settings: stability ${JOSH_VOICE_SETTINGS.stability}, style ${JOSH_VOICE_SETTINGS.style}, speed ${JOSH_VOICE_SETTINGS.speed}`);

    if (this.isPilot) {
      console.log('🧪 PILOT MODE: Generating first 20 bundles only (~$1 cost)');
    }

    // Create temp directory
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Get A1 simplified text from database
    const bookContent = await prisma.bookContent.findFirst({
      where: { bookId: BOOK_ID }
    });

    if (!bookContent) {
      throw new Error(`No book content found for ${BOOK_ID}. Run simplify-christmas-carol.js first!`);
    }

    console.log(`📚 Book: ${bookContent.title}`);
    console.log(`👤 Author: ${bookContent.author}`);

    // Split enhanced text into sentences
    const enhancedText = bookContent.fullText;
    const sentences = this.splitIntoSentences(enhancedText);

    console.log(`📊 Enhanced text statistics:`);
    console.log(`   - Total sentences: ${sentences.length}`);
    console.log(`   - Estimated bundles: ${Math.ceil(sentences.length / SENTENCES_PER_BUNDLE)}`);
    console.log(`   - Enhanced with A1 flow rules: YES`);

    // Create bundles (4 sentences each)
    const bundles = this.createBundles(sentences);
    const bundlesToProcess = this.isPilot ? bundles.slice(0, this.maxBundles) : bundles;

    console.log(`🎵 Will generate ${bundlesToProcess.length} bundles`);

    // Check for existing bundles to support resume capability
    const existingBundles = await this.getExistingBundles();
    const newBundles = bundlesToProcess.filter(b => !existingBundles.includes(b.index));

    console.log(`📊 Found ${existingBundles.length} existing bundles, generating ${newBundles.length} new ones`);

    // Generate audio for each bundle
    for (const bundle of newBundles) {
      console.log(`🎵 Processing bundle ${bundle.index + 1}/${bundlesToProcess.length}...`);

      try {
        // Generate audio using ElevenLabs with enhanced settings
        const audioBuffer = await this.generateElevenLabsAudio(bundle.text);

        // Use actual audio duration from ElevenLabs (GPT-5 fix: no estimates)
        // This will be the real duration for perfect timing calculations
        const actualDuration = await this.getAudioDuration(audioBuffer);

        console.log(`🎵 Actual audio duration: ${actualDuration.toFixed(2)}s`);

        const words = bundle.text.split(/\s+/).length;
        const estimatedDuration = words * 0.4;
        console.log(`   Text: "${bundle.text.substring(0, 60)}..."`);
        console.log(`   Words: ${words}, Estimated duration: ${estimatedDuration.toFixed(2)}s`);

        // Upload to Supabase with versioned path (GPT-5 fix)
        const versionedPath = `${BOOK_ID}/A1/${CONTENT_HASH}/bundle_${bundle.index}.mp3`;
        const { data, error } = await supabase.storage
          .from('audio-files')
          .upload(versionedPath, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true
          });

        if (error) {
          throw new Error(`Supabase upload failed: ${error.message}`);
        }

        console.log(`   ✅ Uploaded: ${versionedPath} (hash: ${CONTENT_HASH})`);

        // Store bundle metadata in database with actual duration
        await this.storeBundleMetadata(bundle, data.path, actualDuration);

        console.log(`   💾 Stored bundle ${bundle.index} metadata`);

        // Rate limiting to prevent API overload
        if (bundle.index < bundlesToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`❌ Failed to process bundle ${bundle.index}:`, error.message);

        if (error.message.includes('rate limit') || error.message.includes('timeout')) {
          console.log('⏳ Rate limited, waiting 30 seconds...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          // Try again
          continue;
        }

        throw error;
      }
    }

    console.log('🎉 Christmas Carol bundle generation complete!');
    console.log('');
    console.log('📊 Generation Summary:');
    console.log(`   - Total bundles: ${bundlesToProcess.length}`);
    console.log(`   - Voice: Daniel (ElevenLabs) with enhanced A1 settings`);
    console.log(`   - CDN path: ${BOOK_ID}/A1/${CONTENT_HASH}/bundle_X.mp3`);
    console.log(`   - Flow enhancement: Applied A1 natural flow rules`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Add Christmas Carol card to Featured Books page');
    console.log('2. Test continuous playback with enhanced voice');
    console.log('3. Measure naturalness improvements vs baseline');
  }

  async generateElevenLabsAudio(text) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: JOSH_VOICE_SETTINGS
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async getAudioDuration(audioBuffer) {
    // Quick estimation based on MP3 bitrate - more accurate than word count
    // ElevenLabs typically generates at 128kbps
    const bitrate = 128000; // bits per second
    const bytes = audioBuffer.length;
    const bits = bytes * 8;
    const duration = bits / bitrate;

    console.log(`🎵 Audio size: ${bytes} bytes, estimated duration: ${duration.toFixed(2)}s`);
    return duration;
  }

  splitIntoSentences(text) {
    // Preserve punctuation when splitting sentences (GPT-5 critical fix)
    return text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);
  }

  createBundles(sentences) {
    const bundles = [];

    for (let i = 0; i < sentences.length; i += SENTENCES_PER_BUNDLE) {
      const bundleSentences = sentences.slice(i, i + SENTENCES_PER_BUNDLE);
      const bundleText = bundleSentences.join(' ');

      bundles.push({
        index: Math.floor(i / SENTENCES_PER_BUNDLE),
        sentences: bundleSentences,
        text: bundleText,
        sentenceStart: i,
        sentenceEnd: i + bundleSentences.length - 1
      });
    }

    return bundles;
  }

  async getExistingBundles() {
    try {
      const existingChunks = await prisma.bookChunk.findMany({
        where: {
          bookId: BOOK_ID,
          cefrLevel: 'A1'
        },
        select: { chunkIndex: true }
      });

      return existingChunks.map(chunk => chunk.chunkIndex);
    } catch (error) {
      console.log('⚠️ Could not check existing bundles, assuming none exist');
      return [];
    }
  }

  async storeBundleMetadata(bundle, audioFilePath, actualDuration) {
    // Calculate sentence timings from final assembled audio (GPT-5 fix)
    const sentenceTimings = [];
    let currentTime = 0;

    // Distribute actual audio duration proportionally across sentences
    const totalEstimatedDuration = bundle.sentences.reduce((sum, sentence) => {
      const words = sentence.trim().split(/\s+/).length;
      return sum + Math.max(words * 0.45, 2.5); // Daniel voice timing
    }, 0);

    const scaleFactor = actualDuration / totalEstimatedDuration;
    console.log(`⚖️ Timing scale factor: ${scaleFactor.toFixed(3)} (actual: ${actualDuration.toFixed(2)}s vs estimated: ${totalEstimatedDuration.toFixed(2)}s)`);

    for (const sentence of bundle.sentences) {
      const words = sentence.trim().split(/\s+/).length;
      const estimatedDuration = Math.max(words * 0.45, 2.5);
      const actualSentenceDuration = estimatedDuration * scaleFactor;
      const safetyTail = 0.12; // 120ms safety buffer for Daniel's delivery
      const finalDuration = actualSentenceDuration + safetyTail;

      sentenceTimings.push({
        text: sentence,
        startTime: currentTime,
        endTime: currentTime + finalDuration
      });

      currentTime += finalDuration;
    }

    // Store in BookChunk table (new architecture)
    await prisma.bookChunk.upsert({
      where: {
        bookId_cefrLevel_chunkIndex: {
          bookId: BOOK_ID,
          cefrLevel: 'A1',
          chunkIndex: bundle.index
        }
      },
      create: {
        bookId: BOOK_ID,
        cefrLevel: 'A1',
        chunkIndex: bundle.index,
        chunkText: bundle.text,
        wordCount: bundle.text.split(/\s+/).length,
        audioFilePath: audioFilePath,
        audioProvider: 'elevenlabs',
        audioVoiceId: VOICE_ID,
        isSimplified: true
      },
      update: {
        chunkText: bundle.text,
        audioFilePath: audioFilePath,
        audioProvider: 'elevenlabs',
        audioVoiceId: VOICE_ID
      }
    });
  }
}

// Run the script
async function main() {
  try {
    const generator = new ChristmasCarolBundleGenerator();
    await generator.generateBundles();
  } catch (error) {
    console.error('❌ Bundle generation failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();