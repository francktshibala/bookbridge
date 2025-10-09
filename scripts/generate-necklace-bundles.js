#!/usr/bin/env node

/**
 * Generate The Necklace bundles with Daniel voice (A2 and B1 levels)
 * Based on Anne of Green Gables bundle generation architecture
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import crypto from 'crypto';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Daniel voice settings optimized for short stories (from Master Prevention Guide)
const DANIEL_VOICE_SETTINGS = {
  stability: 0.55,       // Clear and adaptable
  style: 0.0,           // Natural delivery without stylistic emphasis
  speed: 0.90,          // PROVEN: Daniel voice + speed 0.90 from Master Prevention
  similarity_boost: 0.75,
  use_speaker_boost: true
};

const DANIEL_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'; // Daniel voice (male, clear)
const VOICE_ID = DANIEL_VOICE_ID;

const SENTENCES_PER_BUNDLE = 4;

class NecklaceBundleGenerator {
  constructor() {
    this.isPilot = process.argv.includes('--pilot');
    this.level = process.argv.find(arg => ['A2', 'B1'].includes(arg)) || 'A2';
    this.bookId = `the-necklace-${this.level.toLowerCase()}`;
    this.maxBundles = this.isPilot ? 5 : Infinity; // Pilot mode: 5 bundles for testing

    // Content hash for versioned paths
    this.contentHash = crypto.createHash('md5').update(`${this.bookId}-${VOICE_ID}-${JSON.stringify(DANIEL_VOICE_SETTINGS)}`).digest('hex').substring(0, 8);
    this.tempDir = `/tmp/necklace-bundles-${this.level}`;
  }

  async generateBundles() {
    console.log(`💎 Starting "The Necklace" bundle generation (${this.level} level)...`);
    console.log(`🎯 Daniel voice settings: stability ${DANIEL_VOICE_SETTINGS.stability}, speed ${DANIEL_VOICE_SETTINGS.speed}`);

    if (this.isPilot) {
      console.log('🧪 PILOT MODE: Generating first 5 bundles only (~$0.25 cost)');
    }

    // Create temp directory
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    // Create book content record first
    await this.createBookContentRecord();

    // Read simplified text from cache
    const cacheDir = path.join(process.cwd(), 'cache');
    const simplifiedFile = path.join(cacheDir, `the-necklace-${this.level}-simplified.txt`);

    if (!fs.existsSync(simplifiedFile)) {
      throw new Error(`${this.level} simplified text not found: ${simplifiedFile}. Run simplify-the-necklace.js ${this.level} first!`);
    }

    const simplifiedText = fs.readFileSync(simplifiedFile, 'utf-8');
    console.log(`📖 Loaded ${this.level} simplified text: ${simplifiedText.length} characters`);

    // Split into sentences
    const sentences = this.splitIntoSentences(simplifiedText);

    console.log(`📊 ${this.level} text statistics:`);
    console.log(`   - Total sentences: ${sentences.length}`);
    console.log(`   - Estimated bundles: ${Math.ceil(sentences.length / SENTENCES_PER_BUNDLE)}`);
    console.log(`   - ${this.level} level: Natural ${this.level === 'A2' ? 'compound' : 'complex'} sentences`);

    // Create bundles (4 sentences each)
    const bundles = this.createBundles(sentences);
    const bundlesToProcess = this.isPilot ? bundles.slice(0, this.maxBundles) : bundles;

    console.log(`🎵 Will generate ${bundlesToProcess.length} bundles`);

    // Check for existing bundles
    const existingBundles = await this.getExistingBundles();
    const newBundles = bundlesToProcess.filter(b => !existingBundles.includes(b.index));

    console.log(`📊 Found ${existingBundles.length} existing bundles, generating ${newBundles.length} new ones`);

    // Generate audio for each bundle
    for (const bundle of newBundles) {
      console.log(`🎵 Processing bundle ${bundle.index + 1}/${bundlesToProcess.length}...`);

      try {
        // Generate audio using ElevenLabs with Daniel voice
        const audioBuffer = await this.generateElevenLabsAudio(bundle.text);

        // Get actual audio duration
        const actualDuration = await this.getAudioDuration(audioBuffer);

        console.log(`🎵 Actual audio duration: ${actualDuration.toFixed(2)}s`);

        const words = bundle.text.split(/\s+/).length;
        const estimatedDuration = words * 0.32; // Daniel voice timing
        console.log(`   Text: "${bundle.text.substring(0, 80)}..."`);
        console.log(`   Words: ${words}, Estimated duration: ${estimatedDuration.toFixed(2)}s`);

        // Upload to Supabase with versioned path
        const versionedPath = `${this.bookId}/${this.level}/${this.contentHash}/bundle_${bundle.index}.mp3`;
        const { data, error } = await supabase.storage
          .from('audio-files')
          .upload(versionedPath, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true
          });

        if (error) {
          throw new Error(`Supabase upload failed: ${error.message}`);
        }

        console.log(`   ✅ Uploaded: ${versionedPath} (hash: ${this.contentHash})`);

        // Store bundle metadata in database
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
          continue;
        }

        throw error;
      }
    }

    console.log('🎉 "The Necklace" bundle generation complete!');
    console.log('');
    console.log('📊 Generation Summary:');
    console.log(`   - Total bundles: ${bundlesToProcess.length}`);
    console.log(`   - Level: ${this.level}`);
    console.log(`   - Voice: Daniel (ElevenLabs) with proven settings`);
    console.log(`   - CDN path: ${this.bookId}/${this.level}/${this.contentHash}/bundle_X.mp3`);
    console.log(`   - ${this.level} ${this.level === 'A2' ? 'compound' : 'complex'} sentences: Applied natural flow rules`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Add "The Necklace" card to Featured Books page');
    console.log('2. Test continuous playback with multi-level support');
    console.log('3. Measure impact vs longer books');
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
        model_id: 'eleven_monolingual_v1', // Daniel's optimized model
        voice_settings: DANIEL_VOICE_SETTINGS
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async getAudioDuration(audioBuffer) {
    // Quick estimation based on MP3 bitrate
    const bitrate = 128000; // bits per second
    const bytes = audioBuffer.length;
    const bits = bytes * 8;
    const duration = bits / bitrate;

    console.log(`🎵 Audio size: ${bytes} bytes, estimated duration: ${duration.toFixed(2)}s`);
    return duration;
  }

  splitIntoSentences(text) {
    // Preserve punctuation when splitting sentences with improved logic for B1 level
    const sentences = text
      .split(/(?<=[.!?])\s+(?=[A-Z"]|$)/) // Split on sentence endings followed by capital letter or quote
      .map(s => s.trim())
      .filter(s => s.length > 5);

    // For B1 level, further split quote-separated sentences for better highlighting
    if (this.level === 'B1') {
      return sentences.flatMap(sentence => {
        // Handle cases like: "Ah, the good stew!" "I cannot imagine..."
        const quoteSplit = sentence.split(/(?<=["'][.!?])\s+(?=["'][A-Z])/);
        return quoteSplit.map(s => s.trim()).filter(s => s.length > 5);
      });
    }

    return sentences;
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
          bookId: this.bookId,
          cefrLevel: this.level
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
    // Calculate sentence timings using Daniel voice formula
    const sentenceTimings = [];
    let currentTime = 0;

    // Use different timing for A2 vs B1 (B1 needs more time for complex sentences)
    const secondsPerWord = this.level === 'A2' ? 0.32 : 0.40; // B1 gets more time
    const safetyBuffer = this.level === 'A2' ? 0.1 : 0.2; // B1 gets longer buffer

    const totalEstimatedDuration = bundle.sentences.reduce((sum, sentence) => {
      const words = sentence.trim().split(/\s+/).length;
      return sum + Math.max(words * secondsPerWord, 2.0);
    }, 0);

    const scaleFactor = actualDuration / totalEstimatedDuration;
    console.log(`⚖️ Timing scale factor: ${scaleFactor.toFixed(3)} (actual: ${actualDuration.toFixed(2)}s vs estimated: ${totalEstimatedDuration.toFixed(2)}s)`);
    console.log(`🎯 Using ${this.level} timing: ${secondsPerWord}s/word + ${safetyBuffer}s buffer`);

    for (const sentence of bundle.sentences) {
      const words = sentence.trim().split(/\s+/).length;
      const estimatedDuration = Math.max(words * secondsPerWord, 2.0);
      const actualSentenceDuration = estimatedDuration * scaleFactor;
      const finalDuration = actualSentenceDuration + safetyBuffer;

      sentenceTimings.push({
        text: sentence,
        startTime: currentTime,
        endTime: currentTime + finalDuration
      });

      currentTime += finalDuration;
    }

    // Store in BookChunk table
    await prisma.bookChunk.upsert({
      where: {
        bookId_cefrLevel_chunkIndex: {
          bookId: this.bookId,
          cefrLevel: this.level,
          chunkIndex: bundle.index
        }
      },
      create: {
        bookId: this.bookId,
        cefrLevel: this.level,
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

  async createBookContentRecord() {
    console.log(`📝 Creating book content record (${this.level})...`);

    // Read the simplified text to get accurate word count
    const cacheDir = path.join(process.cwd(), 'cache');
    const simplifiedFile = path.join(cacheDir, `the-necklace-${this.level}-simplified.txt`);
    const simplifiedText = fs.readFileSync(simplifiedFile, 'utf-8');
    const wordCount = simplifiedText.split(/\s+/).length;

    await prisma.bookContent.upsert({
      where: { bookId: this.bookId },
      create: {
        bookId: this.bookId,
        title: 'The Necklace',
        author: 'Guy de Maupassant',
        fullText: simplifiedText,
        era: 'modern',
        wordCount: wordCount,
        totalChunks: Math.ceil(this.splitIntoSentences(simplifiedText).length / SENTENCES_PER_BUNDLE)
      },
      update: {
        title: 'The Necklace',
        author: 'Guy de Maupassant',
        fullText: simplifiedText,
        wordCount: wordCount,
        totalChunks: Math.ceil(this.splitIntoSentences(simplifiedText).length / SENTENCES_PER_BUNDLE)
      }
    });

    console.log('✅ Book content record created');
  }
}

// Run the script
async function main() {
  try {
    const generator = new NecklaceBundleGenerator();
    await generator.generateBundles();
  } catch (error) {
    console.error('❌ Bundle generation failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();