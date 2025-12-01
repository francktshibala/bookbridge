#!/usr/bin/env npx tsx

import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

const BOOK_ID = 'danger-of-single-story';
const CEFR_LEVEL = 'B1';

async function integrateDatabaseRecords() {
  console.log('🗄️ PHASE 4: DATABASE INTEGRATION (B1)');
  console.log('='.repeat(60));
  console.log(`📚 Book ID: ${BOOK_ID}`);
  console.log(`🎯 CEFR Level: ${CEFR_LEVEL}`);

  try {
    // Load metadata from audio generation
    const metadataPath = path.join(process.cwd(), `cache/ted-talks/${BOOK_ID}-${CEFR_LEVEL}-bundles-metadata.json`);

    if (!fs.existsSync(metadataPath)) {
      console.error(`❌ Metadata file not found: ${metadataPath}`);
      console.log('⚠️  Please run audio generation first');
      process.exit(1);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    console.log(`📦 Loaded metadata for ${metadata.length} bundles`);

    // Load full transcript
    const originalTextPath = path.join(process.cwd(), 'cache/ted-talks/danger-of-single-story-original.txt');
    const simplifiedTextPath = path.join(process.cwd(), 'cache/ted-talks/danger-of-single-story-b1-simplified.txt');
    const previewTextPath = path.join(process.cwd(), 'cache/danger-of-single-story-B1-preview.txt');

    const originalText = fs.readFileSync(originalTextPath, 'utf-8');
    const simplifiedText = fs.readFileSync(simplifiedTextPath, 'utf-8');
    const previewText = fs.readFileSync(previewTextPath, 'utf-8');

    // Count sentences
    const sentences = simplifiedText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    console.log(`📝 Total sentences: ${sentences.length}`);
    console.log(`📄 Preview: ${previewText.substring(0, 100)}...`);

    // Step 1: Create or update BookContent record
    console.log(`\n📖 Step 1: Creating BookContent record...`);

    const bookContent = await prisma.bookContent.upsert({
      where: { bookId: BOOK_ID },
      create: {
        bookId: BOOK_ID,
        title: "The Danger of a Single Story",
        author: "Chimamanda Ngozi Adichie",
        fullText: originalText,
        era: "modern",
        wordCount: originalText.split(/\s+/).length,
        totalChunks: metadata.length
      },
      update: {
        fullText: originalText,
        wordCount: originalText.split(/\s+/).length,
        totalChunks: metadata.length,
        updatedAt: new Date()
      }
    });

    console.log(`✅ BookContent created/updated: ${bookContent.id}`);

    // Step 2: Create BookChunk records for each bundle
    console.log(`\n📦 Step 2: Creating BookChunk records (${metadata.length} bundles)...`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const bundle of metadata) {
      try {
        // Calculate sentence timings for this bundle
        const bundleSentences = bundle.sentences;
        const totalWords = bundleSentences.reduce((sum: number, s: string) =>
          sum + s.split(/\s+/).length, 0
        );

        let currentTime = 0;
        const sentenceTimings = bundleSentences.map((sentenceText: string, idx: number) => {
          const words = sentenceText.split(/\s+/).length;
          const wordRatio = words / totalWords;
          const estimatedDuration = bundle.duration * wordRatio;

          const timing = {
            sentenceIndex: bundle.startSentenceIndex + idx,
            text: sentenceText,
            startTime: currentTime,
            endTime: currentTime + estimatedDuration,
            duration: estimatedDuration
          };

          currentTime += estimatedDuration;
          return timing;
        });

        // Create audioDurationMetadata (Solution 1 from MASTER_MISTAKES_PREVENTION)
        const audioDurationMetadata = {
          version: 1,
          measuredDuration: bundle.duration,
          sentenceTimings: sentenceTimings,
          measuredAt: new Date().toISOString(),
          fileSize: 0, // Unknown (would need to fetch from Supabase)
          method: 'ffprobe-measured',
          voiceId: bundle.voiceId,
          voiceName: bundle.voiceName,
          speed: bundle.speed
        };

        // Extract relative path from full URL
        // URL format: https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/danger-of-single-story/A2/bundle_X.mp3
        const relativeAudioPath = bundle.audioUrl.includes('/audio-files/')
          ? bundle.audioUrl.split('/audio-files/')[1]
          : `danger-of-single-story/A2/bundle_${bundle.bundleIndex}.mp3`;

        // Upsert BookChunk
        const existingChunk = await prisma.bookChunk.findUnique({
          where: {
            bookId_cefrLevel_chunkIndex: {
              bookId: BOOK_ID,
              cefrLevel: CEFR_LEVEL,
              chunkIndex: bundle.bundleIndex
            }
          }
        });

        const bookChunk = await prisma.bookChunk.upsert({
          where: {
            bookId_cefrLevel_chunkIndex: {
              bookId: BOOK_ID,
              cefrLevel: CEFR_LEVEL,
              chunkIndex: bundle.bundleIndex
            }
          },
          create: {
            bookId: BOOK_ID,
            cefrLevel: CEFR_LEVEL,
            chunkIndex: bundle.bundleIndex,
            chunkText: bundle.text,
            wordCount: bundle.text.split(/\s+/).length,
            isSimplified: true,
            qualityScore: null,
            audioFilePath: relativeAudioPath,
            audioProvider: 'elevenlabs',
            audioVoiceId: bundle.voiceId,
            audioDurationMetadata: audioDurationMetadata as any
          },
          update: {
            chunkText: bundle.text,
            wordCount: bundle.text.split(/\s+/).length,
            audioFilePath: relativeAudioPath,
            audioProvider: 'elevenlabs',
            audioVoiceId: bundle.voiceId,
            audioDurationMetadata: audioDurationMetadata as any
          }
        });

        if (existingChunk) {
          updatedCount++;
        } else {
          createdCount++;
        }

        if ((bundle.bundleIndex + 1) % 20 === 0) {
          console.log(`   📊 Progress: ${bundle.bundleIndex + 1}/${metadata.length}`);
        }

      } catch (error: any) {
        console.error(`   ❌ Error processing bundle ${bundle.bundleIndex}:`, error.message);
      }
    }

    console.log(`\n✅ BookChunk records processed:`);
    console.log(`   Created: ${createdCount}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Total: ${createdCount + updatedCount}`);

    // Step 3: Verify database integrity
    console.log(`\n🔍 Step 3: Verifying database integrity...`);

    const totalChunks = await prisma.bookChunk.count({
      where: {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL
      }
    });

    const chunksWithAudio = await prisma.bookChunk.count({
      where: {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL,
        audioFilePath: { not: null }
      }
    });

    const chunksWithDurationMetadata = await prisma.bookChunk.count({
      where: {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL,
        audioDurationMetadata: { not: Prisma.DbNull }
      }
    });

    console.log(`   📦 Total BookChunks: ${totalChunks}`);
    console.log(`   🎵 Chunks with audio: ${chunksWithAudio}`);
    console.log(`   ⏱️  Chunks with duration metadata: ${chunksWithDurationMetadata}`);
    console.log(`   ✅ Integrity: ${chunksWithAudio === totalChunks && chunksWithDurationMetadata === totalChunks ? 'PASS' : 'FAIL'}`);

    console.log(`\n🎉 DATABASE INTEGRATION COMPLETE!`);
    console.log(`=`.repeat(60));
    console.log(`📚 Book: The Danger of a Single Story by Chimamanda Ngozi Adichie`);
    console.log(`🎯 Level: ${CEFR_LEVEL}`);
    console.log(`📦 Total bundles: ${totalChunks}`);
    console.log(`🎵 Audio files: ${chunksWithAudio}`);
    console.log(`⏱️  Duration metadata: ${chunksWithDurationMetadata}`);
    console.log(`\n🚀 Ready for API endpoint creation!`);

  } catch (error: any) {
    console.error(`💥 Fatal error during database integration:`, error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n⏹️  Process interrupted. Cleaning up...');
  await prisma.$disconnect();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  integrateDatabaseRecords()
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}
