#!/usr/bin/env node

/**
 * Generate Gift of the Magi A2 bundles with SOLUTION 1 architecture
 * Following Master Mistakes Prevention for perfect sync
 * SEPARATE SCRIPT for A2 to preserve existing A1/B1 functionality
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { execSync } from 'child_process';
import https from 'https';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Book configuration for A2 only
const BOOK_ID = 'gift-of-the-magi';
const CEFR_LEVEL = 'A2';
const BUNDLE_SIZE = 4; // 4 sentences per bundle

// Sarah voice for A2 (per requirements)
const SARAH_VOICE_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL',  // Sarah voice ID
  model_id: 'eleven_monolingual_v1',  // M1 proven model
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    speed: 0.90,  // CRITICAL for sync
    use_speaker_boost: true
  }
};

async function generateElevenLabsAudio(text, voiceSettings) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text,
      model_id: voiceSettings.model_id,
      voice_settings: voiceSettings.voice_settings
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: `/v1/text-to-speech/${voiceSettings.voice_id}`,
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`ElevenLabs API error: ${res.statusCode} - ${Buffer.concat(chunks).toString()}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function uploadToSupabase(audioBuffer, fileName) {
  const { data, error } = await supabase.storage
    .from('audio-files')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: false
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return data;
}

async function generateGiftOfMagiA2Bundles() {
  const isPilot = process.argv.includes('--pilot');

  console.log('🎁 Gift of the Magi A2 Bundle Generation with SOLUTION 1');
  console.log('=' .repeat(60));
  console.log('📊 Configuration:');
  console.log(`   📖 Book: ${BOOK_ID}`);
  console.log(`   🎯 Level: ${CEFR_LEVEL}`);
  console.log(`   🗣️ Voice: Sarah (${SARAH_VOICE_SETTINGS.voice_id})`);
  console.log(`   📦 Bundle size: ${BUNDLE_SIZE} sentences`);
  console.log(`   🧪 Mode: ${isPilot ? 'PILOT (3 bundles max)' : 'FULL'}`);
  console.log(`   ⚡ Architecture: SOLUTION 1 (ffprobe + cached metadata)`);
  console.log('=' .repeat(60));

  try {
    // Verify ffmpeg/ffprobe is installed
    try {
      execSync('ffprobe -version', { stdio: 'ignore' });
      console.log('✅ ffprobe detected - Solution 1 ready');
    } catch (error) {
      throw new Error('ffprobe not found! Install with: brew install ffmpeg');
    }

    // Load existing A2 simplified text
    const simplifiedPath = path.join(process.cwd(), 'cache', 'gift-of-the-magi-A2-simplified.txt');
    if (!fs.existsSync(simplifiedPath)) {
      throw new Error(`A2 simplified text not found at ${simplifiedPath}`);
    }

    const simplifiedText = fs.readFileSync(simplifiedPath, 'utf-8');
    const sentences = simplifiedText.match(/[^.!?]+[.!?]+/g) || [];

    console.log(`\n📚 Text loaded: ${sentences.length} sentences`);

    // Create bundles
    const bundles = [];
    for (let i = 0; i < sentences.length; i += BUNDLE_SIZE) {
      const bundleSentences = sentences.slice(i, Math.min(i + BUNDLE_SIZE, sentences.length));

      bundles.push({
        index: Math.floor(i / BUNDLE_SIZE),
        sentences: bundleSentences.map((text, idx) => ({
          sentenceIndex: i + idx,
          text: text.trim(),
          wordCount: text.trim().split(/\s+/).length
        }))
      });
    }

    console.log(`📦 Created ${bundles.length} bundles of ${BUNDLE_SIZE} sentences each`);

    // Ensure BookContent record exists
    const totalText = sentences.join(' ');
    await prisma.bookContent.upsert({
      where: { bookId: BOOK_ID },
      update: {
        title: 'The Gift of the Magi',
        author: 'O. Henry',
        fullText: totalText,
        era: 'american-short-story',
        wordCount: totalText.split(/\s+/).length,
        totalChunks: bundles.length
      },
      create: {
        bookId: BOOK_ID,
        title: 'The Gift of the Magi',
        author: 'O. Henry',
        fullText: totalText,
        era: 'american-short-story',
        wordCount: totalText.split(/\s+/).length,
        totalChunks: bundles.length
      }
    });

    // Limit to pilot if requested
    const bundlesToProcess = isPilot ? bundles.slice(0, 3) : bundles;
    console.log(`🔄 Will process ${bundlesToProcess.length} bundles`);

    // Check for existing A2 bundles to enable resume
    const existingBundles = await prisma.bookChunk.findMany({
      where: {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL
      },
      select: { chunkIndex: true }
    });

    const existingIndices = new Set(existingBundles.map(b => b.chunkIndex));
    const newBundles = bundlesToProcess.filter(b => !existingIndices.has(b.index));

    if (existingIndices.size > 0) {
      console.log(`⚠️ Found ${existingIndices.size} existing A2 bundles`);
      console.log(`🗑️ Deleting existing A2 bundles to regenerate with Solution 1...`);

      await prisma.bookChunk.deleteMany({
        where: {
          bookId: BOOK_ID,
          cefrLevel: CEFR_LEVEL
        }
      });

      console.log(`✅ Cleared old A2 bundles`);
    }

    console.log(`📊 Will generate ${bundlesToProcess.length} new bundles with Solution 1`);

    let processedCount = 0;

    for (const bundle of bundlesToProcess) {
      try {
        console.log(`\n🎵 Processing bundle ${bundle.index}/${bundles.length - 1}...`);

        // Combine sentences for audio
        const bundleText = bundle.sentences.map(s => s.text).join(' ');
        const totalWords = bundle.sentences.reduce((sum, s) => sum + s.wordCount, 0);

        console.log(`   📝 Text: "${bundleText.substring(0, 100)}..."`);
        console.log(`   📊 ${totalWords} words, ${bundle.sentences.length} sentences`);

        // Generate audio
        console.log('   🎙️ Generating audio with Sarah voice...');
        const audioBuffer = await generateElevenLabsAudio(bundleText, SARAH_VOICE_SETTINGS);

        // A2-specific CDN path
        const audioFileName = `${BOOK_ID}/A2/${SARAH_VOICE_SETTINGS.voice_id}/bundle_${bundle.index}.mp3`;

        console.log('   ☁️ Uploading to Supabase...');
        try {
          await uploadToSupabase(audioBuffer, audioFileName);
          console.log('   ✅ Upload successful');
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log('   📁 Audio file already exists, continuing...');
          } else {
            throw error;
          }
        }

        // SOLUTION 1: MEASURE ACTUAL DURATION WITH FFPROBE
        const tempFile = path.join(process.cwd(), 'temp', `a2_bundle_${bundle.index}_temp.mp3`);

        // Ensure temp directory exists
        if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
          fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
        }

        // Write audio buffer to temp file
        fs.writeFileSync(tempFile, Buffer.from(audioBuffer));

        let measuredDuration = null;
        try {
          const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tempFile}"`;
          const result = execSync(command, { encoding: 'utf-8' }).trim();
          measuredDuration = parseFloat(result);
          console.log(`   ⏱️ MEASURED DURATION: ${measuredDuration.toFixed(3)}s (Solution 1)`);
        } catch (error) {
          console.error('   ❌ CRITICAL: Could not measure duration:', error.message);
          throw new Error('Solution 1 requires ffprobe measurement - cannot proceed');
        } finally {
          // Clean up temp file
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        }

        // SOLUTION 1: Always use measured duration
        if (!measuredDuration) {
          throw new Error('Solution 1 requires measured duration - cannot proceed');
        }

        // Calculate proportional sentence timings
        let currentTime = 0;
        const sentenceTimings = bundle.sentences.map(sentence => {
          const wordRatio = sentence.wordCount / totalWords;
          const duration = measuredDuration * wordRatio;
          const startTime = currentTime;
          const endTime = currentTime + duration;
          currentTime = endTime;

          return {
            sentenceIndex: sentence.sentenceIndex,
            text: sentence.text,
            startTime: parseFloat(startTime.toFixed(3)),
            endTime: parseFloat(endTime.toFixed(3)),
            duration: parseFloat(duration.toFixed(3))
          };
        });

        // Prepare audio duration metadata for caching
        const audioDurationMetadata = {
          version: 1,
          measuredDuration: measuredDuration,
          sentenceTimings: sentenceTimings,
          measuredAt: new Date().toISOString(),
          method: 'ffprobe-proportional'
        };

        // Save to database with cached duration metadata
        await prisma.bookChunk.create({
          data: {
            bookId: BOOK_ID,
            chunkIndex: bundle.index,
            cefrLevel: CEFR_LEVEL,
            chunkText: bundleText,
            wordCount: totalWords,
            isSimplified: true,
            audioFilePath: audioFileName, // Relative path only
            audioProvider: 'elevenlabs',
            audioVoiceId: SARAH_VOICE_SETTINGS.voice_id,
            audioDurationMetadata: audioDurationMetadata // SOLUTION 1: Cache the measured duration
          }
        });

        processedCount++;
        console.log(`   ✅ Bundle ${bundle.index} completed (${processedCount}/${bundlesToProcess.length})`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ Failed to process bundle ${bundle.index}:`, error.message);
        throw error;
      }
    }

    console.log(`\n✅ A2 Bundle generation complete with SOLUTION 1!`);
    console.log(`📊 Summary:`);
    console.log(`   📦 Total bundles: ${bundles.length}`);
    console.log(`   🆕 Bundles processed: ${processedCount}`);
    console.log(`   🎯 CEFR Level: ${CEFR_LEVEL}`);
    console.log(`   🗣️ Voice: Sarah (${SARAH_VOICE_SETTINGS.voice_id})`);
    console.log(`   ⚡ Solution 1: All bundles have cached audioDurationMetadata`);

    if (isPilot) {
      console.log(`\n🧪 PILOT COMPLETE - Run without --pilot flag for full generation`);
    }

  } catch (error) {
    console.error('❌ A2 Bundle generation failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateGiftOfMagiA2Bundles()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export { generateGiftOfMagiA2Bundles };