import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BOOK_ID = 'sleepy-hollow-enhanced';
const TEMP_DIR = '/tmp/sleepy-hollow-bundles';
const SENTENCES_PER_BUNDLE = 4;

class SleepyHollowBundleGenerator {
  async generateBundles() {
    console.log('📚 Starting Sleepy Hollow bundle generation...');
    console.log('🔒 Using frozen text version from simplification');

    // Check for running processes (Lesson #36)
    await this.checkRunningProcesses();

    // Create temp directory
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Get CEFR level from environment or default to B1
    const cefrLevel = process.env.CEFR_LEVEL || 'B1';
    console.log(`📖 Processing ${cefrLevel} level simplification...`);

    // Get simplified text from database
    const simplification = await prisma.bookSimplification.findFirst({
      where: {
        bookId: BOOK_ID,
        targetLevel: cefrLevel
      }
    });

    if (!simplification) {
      throw new Error(`No simplification found for ${cefrLevel} level. Run simplify-sleepy-hollow.js first!`);
    }

    const bookText = simplification.simplifiedText;
    const wordCount = bookText.split(/\s+/).length;

    // Extract content hash from metadata if available
    const metadata = simplification.vocabularyChanges;
    const contentHash = metadata?.[0]?.contentHash || 'unknown';

    console.log(`📊 Book Statistics:`);
    console.log(`   - CEFR Level: ${cefrLevel}`);
    console.log(`   - Total words: ${wordCount.toLocaleString()}`);
    console.log(`   - Content hash: ${contentHash}`);
    console.log(`   - Estimated reading time: ${Math.round(wordCount / 200)} minutes`);

    // Process simplified text for audio generation
    await this.processSingleLevel(cefrLevel, bookText);

    console.log('🎉 Bundle generation complete!');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Add to Featured Books interface');
    console.log('2. Test continuous playback');
    console.log('3. Validate modernization + simplification quality');
  }

  async checkRunningProcesses() {
    // Lesson #36: Never run concurrent processes
    try {
      const { stdout } = await execAsync('ps aux | grep -E "(generate|simplify)" | grep -v grep');
      if (stdout.trim()) {
        console.warn('⚠️ WARNING: Other generation/simplification processes detected:');
        console.warn(stdout);
        console.warn('Consider stopping them to prevent race conditions');
      }
    } catch (error) {
      // No other processes found (grep returns error when no matches)
    }
  }

  async processSingleLevel(level, text) {
    console.log(`\n📚 Processing ${level} level...`);

    // Split into sentences
    let sentences = this.splitIntoSentences(text);

    // Apply test limit if set (Lesson #28)
    if (process.env.TEST_LIMIT) {
      const limit = parseInt(process.env.TEST_LIMIT);
      sentences = sentences.slice(0, limit);
      console.log(`🧪 TEST MODE: Limited to first ${limit} sentences`);
    }

    console.log(`Processing ${sentences.length} sentences`);

    // Group into bundles
    const bundles = [];
    for (let i = 0; i < sentences.length; i += SENTENCES_PER_BUNDLE) {
      const bundleSentences = sentences.slice(i, i + SENTENCES_PER_BUNDLE);
      bundles.push({
        bundleIndex: Math.floor(i / SENTENCES_PER_BUNDLE),
        sentences: bundleSentences
      });
    }

    console.log(`Creating ${bundles.length} bundles`);

    // Check for existing uploads and skip those bundles
    const existingBundleIndices = await this.fetchExistingBundleIndices(level);
    if (existingBundleIndices.size > 0) {
      console.log(`🔎 Found ${existingBundleIndices.size} existing bundles in storage. They will be skipped.`);
    }

    // Generate audio for each bundle
    for (const bundle of bundles) {
      if (existingBundleIndices.has(bundle.bundleIndex)) {
        console.log(`⏭️  Skipping bundle_${bundle.bundleIndex} (already uploaded)`);
        continue;
      }
      await this.createBundleAudio(bundle, level);
    }
  }

  splitIntoSentences(text) {
    const sentences = [];
    const rawSentences = text.split(/([.!?]+\s+)/);

    let currentSentence = '';
    for (let i = 0; i < rawSentences.length; i++) {
      currentSentence += rawSentences[i];

      if (/[.!?]+\s*$/.test(currentSentence) && currentSentence.trim().length > 20) {
        const trimmed = currentSentence.trim();
        sentences.push({
          index: sentences.length,
          text: trimmed,
          sentenceId: `sleepy_${sentences.length}` // Track sentence IDs
        });
        currentSentence = '';
      }
    }

    return sentences;
  }

  async createBundleAudio(bundle, level) {
    const bundleId = `bundle_${bundle.bundleIndex}`;
    console.log(`🎵 Creating ${bundleId} for ${level} level`);

    const levelDir = path.join(TEMP_DIR, level);
    if (!fs.existsSync(levelDir)) {
      fs.mkdirSync(levelDir, { recursive: true });
    }

    // Generate individual sentence audio
    const sentenceFiles = [];
    for (let i = 0; i < bundle.sentences.length; i++) {
      const sentence = bundle.sentences[i];
      const filename = path.join(levelDir, `${bundleId}_sentence_${i}.mp3`);

      console.log(`  Generating audio for sentence ${i}...`);

      try {
        const mp3 = await openai.audio.speech.create({
          model: 'tts-1-hd',
          voice: 'alloy',
          input: sentence.text,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        fs.writeFileSync(filename, buffer);
        sentenceFiles.push(filename);
      } catch (error) {
        console.error(`  🚫 TTS error: ${error.message}`);
        // Retry once on failure
        await new Promise(resolve => setTimeout(resolve, 2000));
        const mp3 = await openai.audio.speech.create({
          model: 'tts-1-hd',
          voice: 'alloy',
          input: sentence.text,
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        fs.writeFileSync(filename, buffer);
        sentenceFiles.push(filename);
      }
    }

    // Concatenate into bundle
    const bundleFile = path.join(levelDir, `${bundleId}.mp3`);
    await this.concatenateAudio(sentenceFiles, bundleFile);

    // Upload to Supabase
    const audioFileName = `${BOOK_ID}/${level}/${bundleId}.mp3`;
    const publicUrl = await this.uploadToSupabase(bundleFile, audioFileName);

    // Store in database with actual duration measurement (Lesson #13)
    await this.storeBundleMetadata(bundle, level, publicUrl, bundleFile);

    // Cleanup temp files
    sentenceFiles.forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
    if (fs.existsSync(bundleFile)) fs.unlinkSync(bundleFile);

    console.log(`✅ ${bundleId} complete`);
  }

  async fetchExistingBundleIndices(level) {
    const folderPath = `${BOOK_ID}/${level}`;
    const indices = new Set();

    try {
      const { data, error } = await supabase.storage
        .from('audio-files')
        .list(folderPath, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (!error && data) {
        for (const item of data) {
          if (item && item.name && item.name.endsWith('.mp3')) {
            const match = item.name.match(/^bundle_(\d+)\.mp3$/);
            if (match) {
              const idx = parseInt(match[1], 10);
              if (!Number.isNaN(idx)) indices.add(idx);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not check existing files: ${error.message}`);
    }

    return indices;
  }

  async concatenateAudio(inputFiles, outputFile) {
    const listFile = outputFile.replace('.mp3', '_list.txt');
    const listContent = inputFiles.map(file => `file '${file}'`).join('\n');
    fs.writeFileSync(listFile, listContent);

    const command = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputFile}"`;
    await execAsync(command);
    fs.unlinkSync(listFile);
  }

  async uploadToSupabase(filePath, fileName) {
    const fileBuffer = fs.readFileSync(filePath);

    // Simple upload with retry
    let retries = 3;
    while (retries > 0) {
      try {
        const { data, error } = await supabase.storage
          .from('audio-files')
          .upload(fileName, fileBuffer, {
            contentType: 'audio/mp3',
            upsert: true,
            cacheControl: '2592000'
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('audio-files')
          .getPublicUrl(fileName);

        console.log(`    ✅ Uploaded: ${fileName}`);
        return publicUrl;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        console.log(`    ⚠️ Upload failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async getAudioDuration(audioFilePath) {
    try {
      const { stdout } = await execAsync(`ffprobe -i "${audioFilePath}" -show_entries format=duration -v quiet -of csv="p=0"`);
      return parseFloat(stdout.trim());
    } catch (error) {
      console.error('Failed to get audio duration:', error);
      return 12.0; // Fallback estimate
    }
  }

  calculateBundleTiming(sentences, totalDuration) {
    // Distribute duration proportionally based on text length (Lesson #13)
    const totalWords = sentences.reduce((sum, s) => sum + s.text.split(' ').length, 0);
    let currentTime = 0;

    return sentences.map(sentence => {
      const wordCount = sentence.text.split(' ').length;
      const sentenceDuration = (wordCount / totalWords) * totalDuration;
      const startTime = currentTime;
      const endTime = currentTime + sentenceDuration;

      currentTime = endTime;

      return {
        sentenceId: sentence.sentenceId,
        sentenceIndex: sentence.index,
        text: sentence.text,
        startTime,
        endTime,
        wordTimings: [] // Would need more sophisticated processing for word-level
      };
    });
  }

  async storeBundleMetadata(bundle, level, audioUrl, audioFilePath) {
    // Get actual audio duration (Critical - Lesson #13)
    const actualDuration = await this.getAudioDuration(audioFilePath);

    // Calculate proportional sentence timing
    const bundleTimings = this.calculateBundleTiming(bundle.sentences, actualDuration);

    // Store bundle metadata in audio_assets table
    try {
      const { data, error } = await supabase
        .from('audio_assets')
        .insert({
          book_id: BOOK_ID,
          cefr_level: level,
          chunk_index: 0,
          sentence_index: bundle.bundleIndex,
          audio_url: audioUrl,
          provider: 'openai-bundled',
          voice_id: 'alloy',
          word_timings: bundleTimings,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (error) throw error;
      console.log(`    ✅ Bundle metadata stored (duration: ${actualDuration.toFixed(2)}s)`);
    } catch (error) {
      console.error(`    ❌ Failed to store metadata: ${error.message}`);
    }
  }
}

// Check environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please set:');
  console.log('  export NEXT_PUBLIC_SUPABASE_URL="your-url"');
  console.log('  export SUPABASE_SERVICE_ROLE_KEY="your-key"');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Missing OpenAI API key');
  console.log('Please set: export OPENAI_API_KEY="your-key"');
  process.exit(1);
}

const generator = new SleepyHollowBundleGenerator();
generator.generateBundles()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });