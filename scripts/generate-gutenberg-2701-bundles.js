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

const BOOK_ID = 'gutenberg-2701';
const TEMP_DIR = '/tmp/moby-bundles';
const SENTENCES_PER_BUNDLE = 4;

class MobyBundleGenerator {
  async generateBundles() {
    console.log('🐋 Starting Moby Dick bundle generation...');

    // Create temp directory
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Get simplifications
    const simplifications = await prisma.bookSimplification.findMany({
      where: { bookId: BOOK_ID },
      select: { targetLevel: true, simplifiedText: true }
    });

    console.log(`Found ${simplifications.length} simplifications`);

    for (const simplification of simplifications) {
      if (simplification.simplifiedText) {
        await this.processSingleLevel(simplification.targetLevel, simplification.simplifiedText);
      }
    }

    console.log('🎉 Bundle generation complete!');
  }

  async processSingleLevel(level, text) {
    console.log(`\n📚 Processing ${level} level...`);

    // Split into sentences
    const sentences = this.splitIntoSentences(text);
    console.log(`Found ${sentences.length} sentences`);

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

  splitIntoSentences(text) {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10)
      .map((sentence, index) => ({
        index,
        text: sentence
      }));
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

    // Store in database
    await this.storeBundleMetadata(bundle, level, publicUrl);

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

  async storeBundleMetadata(bundle, level, audioUrl) {
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
        word_timings: bundle.sentences.map((sentence, idx) => ({
          sentenceId: `s${sentence.index}`,
          sentenceIndex: sentence.index,
          text: sentence.text,
          startTime: idx * 3.0,
          endTime: (idx + 1) * 3.0,
          wordTimings: []
        })),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (error) throw error;
    console.log(`    ✅ Bundle metadata stored`);
  }
}

const generator = new MobyBundleGenerator();
generator.generateBundles()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });