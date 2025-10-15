/**
 * Generate Test Book with Bundled Audio for Continuous Reading
 * Creates audio bundles (4 sentences per file) with embedded timing metadata
 */

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Initialize APIs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const claude = require('@anthropic-ai/sdk');
const anthropic = new claude({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Bundle Configuration
const BUNDLE_CONFIG = {
  sentencesPerBundle: 4,
  compressionBitrate: '48k', // 32-48 kbps AAC-LC as recommended
  tempDir: '/tmp/bookbridge-bundles',
  crossfadeDuration: 15 // 15ms micro-crossfade
};

// Test Book Configuration (same as individual file version)
const TEST_BOOK = {
  id: 'test-continuous-bundles-001',
  title: 'The Little Adventure (Bundled)',
  author: 'Claude Code Bundle Test',
  originalText: `
Chapter 1: The Discovery

Maya walked through the forest near her grandmother's house. The trees were tall and green. She heard a strange sound coming from behind a big oak tree. When she looked, she found a small, glowing crystal.

"What is this?" Maya whispered. The crystal was warm in her hands. It sparkled with blue and purple lights. She had never seen anything like it before.

Chapter 2: The Magic Begins

Maya took the crystal home. In her room, she placed it on her desk. Suddenly, the crystal began to glow brighter. Her books started floating in the air. Her pencils danced around the room.

"This must be magic!" Maya said with excitement. She touched the crystal again. This time, she could hear the thoughts of her cat, Whiskers. "Meow means hello," Whiskers thought.

Chapter 3: Learning Control

The next day, Maya practiced with the crystal. She learned to make small objects move. She made her homework write itself. She even made flowers bloom instantly in her garden.

But Maya realized something important. Magic was powerful, but it was better when used to help others. She decided to use her new abilities to help her friends and family.

Chapter 4: Helping Others

Maya used her magic crystal to help her grandmother with heavy boxes. She helped her friend Tom find his lost dog. She made beautiful drawings appear on the walls of the children's hospital.

Everyone in the town began to notice the wonderful things happening. They didn't know it was Maya's magic, but they felt happier. The town became a more joyful place to live.

Chapter 5: The Choice

One evening, an old wizard appeared at Maya's door. "I see you have found my crystal," he said kindly. "You have used it well. But now you must choose. Keep the magic for yourself, or give it to someone who needs it more."

Maya thought carefully. She looked at the crystal, then at the wizard. "I choose to give it to the children's hospital," she said. "They need magic more than I do." The wizard smiled. "You have learned the most important magic of all - kindness."

The End
`.trim()
};

const CEFR_LEVELS = ['original'];

class BundledTestBookGenerator {
  constructor() {
    // Ensure temp directory exists
    if (!fs.existsSync(BUNDLE_CONFIG.tempDir)) {
      fs.mkdirSync(BUNDLE_CONFIG.tempDir, { recursive: true });
    }
  }

  async generateSimplification(text, cefrLevel) {
    // Same implementation as individual version
    try {
      if (cefrLevel === 'original') return text;

      const simplificationPrompts = {
        a2: `Simplify this text for A2 English learners. Use simple sentences, basic vocabulary, and present tense. Keep the story engaging but use only common words that A2 students know:`,
        b1: `Simplify this text for B1 English learners. Use clear sentences, familiar vocabulary, and straightforward grammar. The story should remain interesting while being accessible to intermediate students:`
      };

      const prompt = simplificationPrompts[cefrLevel];

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `${prompt}

Text to simplify:
${text}

Return only the simplified text, no explanations.`
        }]
      });

      return response.content[0].text.trim();
    } catch (error) {
      console.error(`Failed to simplify for ${cefrLevel}:`, error);
      return text;
    }
  }

  splitIntoSentences(text) {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + (s.endsWith('.') || s.endsWith('!') || s.endsWith('?') ? '' : '.'));
  }

  groupSentencesIntoBundles(sentences) {
    const bundles = [];
    for (let i = 0; i < sentences.length; i += BUNDLE_CONFIG.sentencesPerBundle) {
      const bundleSentences = sentences.slice(i, i + BUNDLE_CONFIG.sentencesPerBundle);
      bundles.push({
        bundleIndex: Math.floor(i / BUNDLE_CONFIG.sentencesPerBundle),
        sentences: bundleSentences.map((sentence, sentenceIndexInBundle) => ({
          sentenceIndex: i + sentenceIndexInBundle,
          text: sentence,
          sentenceIndexInBundle
        }))
      });
    }
    return bundles;
  }

  async generateIndividualSentenceAudio(sentence, sentenceIndex, tempDir) {
    try {
      console.log(`  🎵 Generating individual audio for sentence ${sentenceIndex}`);

      // Generate audio with OpenAI
      const audioResponse = await openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: 'alloy',
        input: sentence.trim(),
        speed: 1.0
      });

      // Save to temp file
      const buffer = Buffer.from(await audioResponse.arrayBuffer());
      const tempFilePath = path.join(tempDir, `sentence_${sentenceIndex}.mp3`);
      fs.writeFileSync(tempFilePath, buffer);

      return tempFilePath;

    } catch (error) {
      console.error(`Failed to generate audio for sentence ${sentenceIndex}:`, error);
      return null;
    }
  }

  async createBundleAudio(bundle, bookId, cefrLevel, tempDir) {
    try {
      console.log(`📦 Creating bundle ${bundle.bundleIndex} with ${bundle.sentences.length} sentences`);

      const bundleId = `bundle_${bundle.bundleIndex}`;
      const bundleTempDir = path.join(tempDir, bundleId);

      // Create bundle temp directory
      if (!fs.existsSync(bundleTempDir)) {
        fs.mkdirSync(bundleTempDir, { recursive: true });
      }

      // Step 1: Generate individual sentence audio files
      const sentenceFiles = [];
      let totalDuration = 0;

      for (const sentence of bundle.sentences) {
        const filePath = await this.generateIndividualSentenceAudio(
          sentence.text,
          sentence.sentenceIndex,
          bundleTempDir
        );

        if (filePath) {
          sentenceFiles.push(filePath);
          // Estimate duration (will be more accurate after bundling)
          totalDuration += this.estimateSentenceDuration(sentence.text);
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (sentenceFiles.length === 0) {
        throw new Error('No valid sentence audio files generated');
      }

      // Step 2: Concatenate audio files with micro-crossfade
      const bundleOutputPath = path.join(bundleTempDir, `${bundleId}.mp3`);
      await this.concatenateAudioFiles(sentenceFiles, bundleOutputPath);

      // Step 3: Get actual duration and create timing metadata
      const actualDuration = await this.getAudioDuration(bundleOutputPath);
      const timingMetadata = this.calculateBundleTiming(bundle.sentences, actualDuration);

      // Step 4: Compress and optimize (optional)
      let finalFilePath = bundleOutputPath;
      let compressedPath = null;
      try {
        compressedPath = path.join(bundleTempDir, `${bundleId}_compressed.mp3`);
        await this.compressAudio(bundleOutputPath, compressedPath);
        finalFilePath = compressedPath;
        console.log(`    ✅ Compression successful`);
      } catch (compressionError) {
        console.log(`    ⚠️ Compression failed, using uncompressed bundle:`, compressionError.message);
        compressedPath = null;
        // Continue with uncompressed file
      }

      // Step 5: Upload to Supabase
      const audioFileName = `${bookId}/${cefrLevel}/${bundleId}.mp3`;
      const audioUrl = await this.uploadBundleToSupabase(finalFilePath, audioFileName);

      // Clean up temp files
      const filesToCleanup = [bundleOutputPath, ...sentenceFiles];
      if (compressedPath) filesToCleanup.push(compressedPath);
      this.cleanupTempFiles(filesToCleanup);

      return {
        bundleId,
        bundleIndex: bundle.bundleIndex,
        audioUrl,
        totalDuration: actualDuration,
        sentences: timingMetadata
      };

    } catch (error) {
      console.error(`Failed to create bundle ${bundle.bundleIndex}:`, error);
      return null;
    }
  }

  estimateSentenceDuration(text) {
    // Rough estimate: ~150 words per minute, 4 words per second = 0.25 seconds per word
    const wordCount = text.split(' ').length;
    return Math.max(1.0, wordCount * 0.25); // Minimum 1 second
  }

  async concatenateAudioFiles(inputFiles, outputPath) {
    try {
      // Check if ffmpeg is available
      try {
        await execAsync('which ffmpeg');
      } catch (e) {
        throw new Error('ffmpeg not found. Please install with: brew install ffmpeg');
      }

      // Simple concatenation without crossfade for now
      if (inputFiles.length === 1) {
        // Single file - just copy
        await execAsync(`cp "${inputFiles[0]}" "${outputPath}"`);
        console.log(`    📋 Copied single file`);
        return;
      }

      // Multiple files - create concat list file
      const listFile = outputPath.replace('.mp3', '_list.txt');
      const listContent = inputFiles.map(file => `file '${file}'`).join('\n');
      fs.writeFileSync(listFile, listContent);

      // Simple concatenation without crossfade for reliability
      const command = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}"`;

      console.log(`    🔧 Concatenating ${inputFiles.length} files`);
      await execAsync(command);

      // Clean up list file
      fs.unlinkSync(listFile);

    } catch (error) {
      if (error.message.includes('ffmpeg not found')) {
        console.error('\n❌ ffmpeg is required but not installed.');
        console.error('Please install ffmpeg first:');
        console.error('  brew install ffmpeg');
        console.error('\nThen run this script again.\n');
      }
      throw error;
    }
  }

  async getAudioDuration(filePath) {
    try {
      const { stdout } = await execAsync(`ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`);
      return parseFloat(stdout.trim());
    } catch (error) {
      console.error('Failed to get audio duration:', error);
      return 0;
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
        sentenceId: `s${sentence.sentenceIndex}`,
        sentenceIndex: sentence.sentenceIndex,
        text: sentence.text,
        startTime,
        endTime,
        wordTimings: this.approximateWordTimings(sentence.text, startTime, endTime)
      };
    });
  }

  approximateWordTimings(text, startTime, endTime) {
    const words = text.split(' ').filter(w => w.length > 0);
    const duration = endTime - startTime;
    const timePerWord = duration / words.length;

    return words.map((word, index) => ({
      word: word.replace(/[.!?,:;]/g, ''),
      start: startTime + (index * timePerWord),
      end: startTime + ((index + 1) * timePerWord)
    }));
  }

  async compressAudio(inputPath, outputPath) {
    try {
      const command = `ffmpeg -y -i "${inputPath}" -codec:a aac -b:a ${BUNDLE_CONFIG.compressionBitrate} -ac 1 -af "silenceremove=1:0:-50dB" "${outputPath}"`;
      console.log(`    🗜️ Compressing to ${BUNDLE_CONFIG.compressionBitrate} AAC-LC`);
      await execAsync(command);
    } catch (error) {
      console.error('Compression failed:', error);
      throw error;
    }
  }

  async uploadBundleToSupabase(filePath, fileName) {
    try {
      const buffer = fs.readFileSync(filePath);

      const { data, error } = await supabase.storage
        .from('audio-files')
        .upload(fileName, buffer, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName);

      console.log(`    ✅ Bundle uploaded: ${fileName}`);
      return publicUrl;

    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  cleanupTempFiles(filePaths) {
    filePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.warn(`Failed to cleanup ${filePath}:`, error.message);
      }
    });
  }

  async storeBundleInDatabase(bundleData, bookId, cefrLevel) {
    try {
      // Store bundle metadata in audio_assets table with special structure
      const { data, error } = await supabase
        .from('audio_assets')
        .insert({
          book_id: bookId,
          cefr_level: cefrLevel,
          chunk_index: 0,
          sentence_index: bundleData.bundleIndex, // Bundle index in sentence_index field
          audio_url: bundleData.audioUrl,
          word_timings: bundleData.sentences, // Full bundle timing metadata
          provider: 'openai-bundled',
          voice_id: 'alloy',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (error) throw error;

      console.log(`    ✅ Bundle ${bundleData.bundleId} stored in database`);
      return data;

    } catch (error) {
      console.error(`Failed to store bundle ${bundleData.bundleId}:`, error);
      return null;
    }
  }

  async generateBundledTestBook() {
    try {
      console.log('🚀 Starting bundled test book generation...');

      // Step 1: Store book content
      await prisma.bookContent.upsert({
        where: { bookId: TEST_BOOK.id },
        update: {
          title: TEST_BOOK.title,
          author: TEST_BOOK.author,
          fullText: TEST_BOOK.originalText,
          era: 'modern',
          wordCount: TEST_BOOK.originalText.split(' ').length,
          totalChunks: 1
        },
        create: {
          bookId: TEST_BOOK.id,
          title: TEST_BOOK.title,
          author: TEST_BOOK.author,
          fullText: TEST_BOOK.originalText,
          era: 'modern',
          wordCount: TEST_BOOK.originalText.split(' ').length,
          totalChunks: 1
        }
      });

      console.log('✅ Book content stored/updated in database');

      // Step 2: Generate for each CEFR level
      for (const cefrLevel of CEFR_LEVELS) {
        console.log(`\n📝 Processing CEFR level: ${cefrLevel}`);

        // Get simplified text
        const simplifiedText = await this.generateSimplification(TEST_BOOK.originalText, cefrLevel);

        // Split into sentences and group into bundles
        const sentences = this.splitIntoSentences(simplifiedText);
        const bundles = this.groupSentencesIntoBundles(sentences);

        console.log(`   Found ${sentences.length} sentences, creating ${bundles.length} bundles`);

        // Store simplified text
        if (cefrLevel !== 'original') {
          await prisma.bookSimplification.upsert({
            where: {
              bookId_targetLevel_chunkIndex_versionKey: {
                bookId: TEST_BOOK.id,
                targetLevel: cefrLevel,
                chunkIndex: 0,
                versionKey: 'v1'
              }
            },
            update: {
              originalText: TEST_BOOK.originalText,
              simplifiedText: simplifiedText
            },
            create: {
              bookId: TEST_BOOK.id,
              targetLevel: cefrLevel,
              chunkIndex: 0,
              originalText: TEST_BOOK.originalText,
              simplifiedText: simplifiedText,
              versionKey: 'v1'
            }
          });
        }

        // Generate bundled audio
        const levelTempDir = path.join(BUNDLE_CONFIG.tempDir, cefrLevel);
        if (!fs.existsSync(levelTempDir)) {
          fs.mkdirSync(levelTempDir, { recursive: true });
        }

        for (const bundle of bundles) {
          const bundleData = await this.createBundleAudio(bundle, TEST_BOOK.id, cefrLevel, levelTempDir);

          if (bundleData) {
            await this.storeBundleInDatabase(bundleData, TEST_BOOK.id, cefrLevel);
          }
        }

        console.log(`✅ ${cefrLevel} level complete: ${bundles.length} bundles`);
      }

      console.log('\n🎉 Bundled test book generation complete!');
      console.log(`Book ID: ${TEST_BOOK.id}`);
      console.log(`Available levels: ${CEFR_LEVELS.join(', ')}`);

      const sentences = this.splitIntoSentences(TEST_BOOK.originalText);
      const bundles = this.groupSentencesIntoBundles(sentences);

      return {
        success: true,
        bookId: TEST_BOOK.id,
        levels: CEFR_LEVELS,
        sentenceCount: sentences.length,
        bundleCount: bundles.length,
        sentencesPerBundle: BUNDLE_CONFIG.sentencesPerBundle
      };

    } catch (error) {
      console.error('❌ Bundled test book generation failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new BundledTestBookGenerator();
  generator.generateBundledTestBook()
    .then(result => {
      console.log('\n📊 Generation Result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Generation failed:', error);
      process.exit(1);
    });
}

module.exports = BundledTestBookGenerator;