import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BOOK_ID = 'great-gatsby-a2';
const TEMP_DIR = '/tmp/great-gatsby-bundles';
const SENTENCES_PER_BUNDLE = 4;
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

class GreatGatsbyBundleGenerator {
  constructor() {
    // Parse command line flags
    this.isPilot = process.argv.includes('--pilot');
    this.maxBundles = this.isPilot ? 20 : Infinity;
  }

  async generateBundles() {
    console.log('📚 Starting Great Gatsby bundle generation...');
    console.log('🔒 Using frozen text version from A2 simplification');
    console.log(`🎙️ Using Sarah voice (${VOICE_ID})`);

    if (this.isPilot) {
      console.log('🧪 PILOT MODE: Generating first 20 bundles only (~$1 cost)');
    }

    // Check for running processes (Lesson #36)
    await this.checkRunningProcesses();

    // Create temp directory
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Get simplified text from cache (more reliable than database)
    const cacheFile = './cache/great-gatsby-A2-simplified.json';
    if (!fs.existsSync(cacheFile)) {
      throw new Error('❌ Simplified cache not found. Run simplification first.');
    }

    const simplifiedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const sentences = simplifiedData.map(s => s.simplifiedText);

    console.log(`📖 Loaded ${sentences.length} sentences from cache`);

    // Check existing bundles for resume capability
    const existingBundles = await this.getExistingBundles();
    const totalBundles = Math.ceil(sentences.length / SENTENCES_PER_BUNDLE);
    const bundlesToProcess = Math.min(totalBundles, this.maxBundles);

    console.log(`🎯 Will create ${bundlesToProcess} bundles (${existingBundles.length} already exist)`);

    if (existingBundles.length > 0) {
      console.log(`📊 Resume capability: Found ${existingBundles.length} existing bundles`);
    }

    // Split into bundles of 4 sentences each
    const bundles = [];
    for (let i = 0; i < sentences.length && bundles.length < bundlesToProcess; i += SENTENCES_PER_BUNDLE) {
      const bundleIndex = Math.floor(i / SENTENCES_PER_BUNDLE);

      // Skip if bundle already exists (resume capability)
      if (existingBundles.includes(bundleIndex)) {
        continue;
      }

      const bundleSentences = sentences.slice(i, i + SENTENCES_PER_BUNDLE);
      const bundleText = bundleSentences.join(' ');

      bundles.push({
        index: bundleIndex,
        sentences: bundleSentences,
        text: bundleText,
        sentenceStart: i,
        sentenceEnd: i + bundleSentences.length - 1
      });
    }

    console.log(`🎁 Created ${bundles.length} bundles for audio generation`);

    // Generate audio for each bundle with progress tracking
    const results = [];
    for (let i = 0; i < bundles.length; i++) {
      const bundle = bundles[i];
      const progress = `${i + 1}/${bundles.length}`;

      console.log(`🎤 Generating audio ${progress}: Bundle ${bundle.index} (sentences ${bundle.sentenceStart + 1}-${bundle.sentenceEnd + 1})`);

      try {
        const audioResult = await this.generateBundleAudio(bundle, progress);
        results.push(audioResult);

        // Small delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Failed bundle ${bundle.index}:`, error.message);

        // Continue with other bundles instead of stopping completely
        console.log('⚠️ Continuing with remaining bundles...');
        continue;
      }
    }

    console.log(`✅ Generated ${results.length} audio bundles`);

    // Store bundle records in database
    await this.storeBundleRecords(results);

    console.log('🎉 Great Gatsby audio bundle generation complete!');
    console.log(`📁 Audio files stored in Supabase`);
    console.log(`📊 Total bundles: ${results.length}`);
    console.log(`⏱️ Estimated listening time: ${Math.round(results.length * 0.5)} minutes`);

    return results;
  }

  async checkRunningProcesses() {
    try {
      const { stdout } = await execAsync('ps aux | grep "generate.*bundles" | grep -v grep');
      if (stdout.trim()) {
        console.warn('⚠️ Other bundle generation processes detected. Continue? (Ctrl+C to cancel)');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      // No running processes found (expected)
    }
  }

  async getExistingBundles() {
    try {
      const existingChunks = await prisma.bookChunk.findMany({
        where: {
          bookId: BOOK_ID,
          cefrLevel: 'A2'
        },
        select: { chunkIndex: true }
      });
      return existingChunks.map(chunk => chunk.chunkIndex);
    } catch (error) {
      console.log('ℹ️ No existing chunks found');
      return [];
    }
  }

  async generateBundleAudio(bundle, progress) {
    const fileName = `gatsby-bundle-${bundle.index.toString().padStart(4, '0')}.mp3`;
    const tempFilePath = path.join(TEMP_DIR, fileName);

    // Generate audio using ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOICE_ID, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: bundle.text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.1,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioData = Buffer.from(audioBuffer);

    // Save temporarily for processing
    fs.writeFileSync(tempFilePath, audioData);

    // Upload to Supabase
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(`great-gatsby/${fileName}`, audioData, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000' // 1 year cache
      });

    if (uploadError) {
      throw new Error(`Supabase upload error: ${uploadError.message}`);
    }

    // Get file stats
    const stats = fs.statSync(tempFilePath);
    const fileSizeKB = Math.round(stats.size / 1024);

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    console.log(`  ✅ ${progress} - ${fileSizeKB}KB uploaded`);

    return {
      bundleIndex: bundle.index,
      sentenceStart: bundle.sentenceStart,
      sentenceEnd: bundle.sentenceEnd,
      sentences: bundle.sentences,
      audioPath: uploadData.path,
      audioUrl: supabase.storage.from('audio-files').getPublicUrl(uploadData.path).data.publicUrl,
      fileSizeBytes: stats.size,
      wordCount: bundle.text.split(/\s+/).length,
      estimatedDuration: Math.round(bundle.text.split(/\s+/).length * 0.4) // ~0.4 seconds per word
    };
  }

  async storeBundleRecords(bundles) {
    console.log('💾 Storing bundle records in database...');

    for (const bundle of bundles) {
      await prisma.bookChunk.create({
        data: {
          bookId: BOOK_ID,
          cefrLevel: 'A2',
          chunkIndex: bundle.bundleIndex,
          chunkText: bundle.sentences.join(' '),
          wordCount: bundle.wordCount,
          isSimplified: true,
          audioFilePath: bundle.audioPath,
          audioProvider: 'elevenlabs',
          audioVoiceId: VOICE_ID
        }
      });
    }

    console.log(`✅ Stored ${bundles.length} bundle records`);
  }
}

// Run the generator
const generator = new GreatGatsbyBundleGenerator();
generator.generateBundles()
  .then(() => {
    console.log('🎉 Bundle generation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Bundle generation failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });