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

const BOOK_ID = 'jane-eyre-scale-test-001';
const TEMP_DIR = '/tmp/jane-eyre-scale-test-bundles';
const SENTENCES_PER_BUNDLE = 4;

class JaneEyreBundleGenerator {
  async generateBundles() {
    console.log('📚 Starting Jane Eyre Scale Test bundle generation (6,949 sentences → 1,738 bundles)...');

    // Create temp directory
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Get CEFR level from environment or default to A2
    const cefrLevel = process.env.CEFR_LEVEL || 'A2';
    console.log(`📖 Processing ${cefrLevel} level simplification...`);

    // Get simplified text from database
    const simplification = await prisma.bookSimplification.findFirst({
      where: {
        bookId: BOOK_ID,
        targetLevel: cefrLevel
      }
    });

    if (!simplification) {
      throw new Error(`No simplification found for ${cefrLevel} level. Run simplify-jane-eyre.js first!`);
    }

    const bookText = simplification.simplifiedText;
    const wordCount = bookText.split(/\s+/).length;

    console.log(`📊 Simplified Book Statistics:`);
    console.log(`   - CEFR Level: ${cefrLevel}`);
    console.log(`   - Total words: ${wordCount.toLocaleString()}`);
    console.log(`   - Estimated pages: ${Math.round(wordCount / 250)}`);

    // Store book metadata
    await this.storeBookMetadata(bookText, wordCount);

    // Process simplified text for audio generation
    await this.processSingleLevel(cefrLevel, bookText);

    console.log('🎉 Bundle generation complete!');
  }

  async processSingleLevel(level, text) {
    console.log(`\n📚 Processing ${level} level...`);

    // Split into sentences
    let sentences = this.splitIntoSentences(text);

    // Apply test limit if set
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

    // Generate audio for each bundle
    for (const bundle of bundles) {
      await this.createBundleAudio(bundle, level);
    }
  }

  async storeBookMetadata(fullText, wordCount) {
    console.log(`\n💾 Storing book metadata for Jane Eyre Scale Test...`);

    // Store in BookContent table
    await prisma.bookContent.upsert({
      where: { bookId: BOOK_ID },
      update: {
        title: 'Jane Eyre (Scale Test)',
        author: 'Charlotte Brontë',
        fullText: fullText.substring(0, 50000), // Store first 50k chars
        era: 'victorian',
        wordCount: wordCount,
        totalChunks: Math.ceil(wordCount / 250),
        updatedAt: new Date()
      },
      create: {
        bookId: BOOK_ID,
        title: 'Jane Eyre (Scale Test)',
        author: 'Charlotte Brontë',
        fullText: fullText.substring(0, 50000),
        era: 'victorian',
        wordCount: wordCount,
        totalChunks: Math.ceil(wordCount / 250)
      }
    });

    console.log('✅ Book metadata stored');
  }

  splitIntoSentences(text) {
    // More sophisticated sentence splitting for Jane Eyre
    const sentences = [];
    const rawSentences = text.split(/([.!?]+\s+)/);

    let currentSentence = '';
    for (let i = 0; i < rawSentences.length; i++) {
      currentSentence += rawSentences[i];

      if (/[.!?]+\s*$/.test(currentSentence) && currentSentence.trim().length > 20) {
        const trimmed = currentSentence.trim();
        // Skip chapter headings
        if (!trimmed.startsWith('CHAPTER')) {
          sentences.push({
            index: sentences.length,
            text: trimmed
          });
        }
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
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: 'alloy',
        input: sentence.text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      fs.writeFileSync(filename, buffer);
      sentenceFiles.push(filename);
    }

    // Concatenate into bundle
    const bundleFile = path.join(levelDir, `${bundleId}.mp3`);
    await this.concatenateAudio(sentenceFiles, bundleFile);

    // Upload to Supabase
    const audioFileName = `${BOOK_ID}/${level}/${bundleId}.mp3`;
    const publicUrl = await this.uploadToSupabase(bundleFile, audioFileName);

    // Store in database with audio buffer for duration measurement
    await this.storeBundleMetadata(bundle, level, publicUrl, bundleFile);

    // Cleanup temp files
    sentenceFiles.forEach(file => fs.unlinkSync(file));
    console.log(`✅ ${bundleId} complete`);
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

    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(fileName, fileBuffer, {
        contentType: 'audio/mp3',
        cacheControl: '2592000',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('audio-files')
      .getPublicUrl(fileName);

    console.log(`    ✅ Uploaded: ${fileName}`);
    return publicUrl;
  }

  async getAudioDuration(audioBuffer) {
    try {
      // Save buffer to temp file to measure duration
      const tempFile = path.join('/tmp', `temp_${Date.now()}.mp3`);
      fs.writeFileSync(tempFile, audioBuffer);

      const { stdout } = await execAsync(`ffprobe -i "${tempFile}" -show_entries format=duration -v quiet -of csv="p=0"`);
      const duration = parseFloat(stdout.trim());

      // Clean up temp file
      fs.unlinkSync(tempFile);

      return duration;
    } catch (error) {
      console.error('Failed to get audio duration:', error);
      // Fallback to estimate
      return 12.0; // 4 sentences * 3 seconds average
    }
  }

  calculateBundleTiming(sentences, totalDuration) {
    // Distribute duration proportionally based on text length
    const totalWords = sentences.reduce((sum, s) => sum + s.text.split(' ').length, 0);
    let currentTime = 0;

    return sentences.map(sentence => {
      const wordCount = sentence.text.split(' ').length;
      const sentenceDuration = (wordCount / totalWords) * totalDuration;
      const startTime = currentTime;
      const endTime = currentTime + sentenceDuration;

      currentTime = endTime;

      return {
        sentenceId: `s${sentence.index}`,
        sentenceIndex: sentence.index,
        text: sentence.text,
        startTime,
        endTime,
        wordTimings: []
      };
    });
  }

  async storeBundleMetadata(bundle, level, audioUrl, audioFilePath) {
    // Read the audio file
    const audioBuffer = fs.readFileSync(audioFilePath);

    // Get actual audio duration
    const actualDuration = await this.getAudioDuration(audioBuffer);

    // Calculate accurate timing based on actual duration
    const timingMetadata = this.calculateBundleTiming(bundle.sentences, actualDuration);

    // Store bundle metadata in audio_assets table
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
        word_timings: timingMetadata,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (error) throw error;
    console.log(`    ✅ Bundle metadata stored with accurate timing (duration: ${actualDuration.toFixed(2)}s)`);
  }
}

const generator = new JaneEyreBundleGenerator();
generator.generateBundles()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });