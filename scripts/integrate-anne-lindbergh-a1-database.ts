#!/usr/bin/env npx tsx

import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

const BOOK_ID = 'anne-lindbergh';
const CEFR_LEVEL = 'A1';

async function integrateDatabaseRecords() {
  console.log('🗄️ PHASE 6: DATABASE INTEGRATION (A1)');
  console.log('='.repeat(60));
  console.log(`📚 Book ID: ${BOOK_ID}`);
  console.log(`🎯 CEFR Level: ${CEFR_LEVEL}`);

  try {
    // Load metadata from audio generation
    const metadataPath = path.join(process.cwd(), `cache/${BOOK_ID}-${CEFR_LEVEL}-bundles-metadata.json`);

    if (!fs.existsSync(metadataPath)) {
      console.error(`❌ Metadata file not found: ${metadataPath}`);
      console.log('⚠️  Please run audio generation first');
      process.exit(1);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    console.log(`📦 Loaded metadata for ${metadata.length} bundles`);

    // Load full transcript
    const originalTextPath = path.join(process.cwd(), `cache/${BOOK_ID}-original.txt`);
    const simplifiedTextPath = path.join(process.cwd(), `cache/${BOOK_ID}-${CEFR_LEVEL}-simplified.txt`);
    const previewTextPath = path.join(process.cwd(), `cache/${BOOK_ID}-${CEFR_LEVEL.toUpperCase()}-preview.txt`);

    if (!fs.existsSync(originalTextPath) || !fs.existsSync(simplifiedTextPath)) {
      console.error(`❌ Text files not found`);
      process.exit(1);
    }

    const originalText = fs.readFileSync(originalTextPath, 'utf-8');
    const simplifiedText = fs.readFileSync(simplifiedTextPath, 'utf-8');
    const previewText = fs.existsSync(previewTextPath) ? fs.readFileSync(previewTextPath, 'utf-8') : '';

    // Count sentences
    const sentences = simplifiedText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    console.log(`📝 Total sentences: ${sentences.length}`);
    if (previewText) {
      console.log(`📄 Preview: ${previewText.substring(0, 100)}...`);
    }

    // Step 1: Create or update BookContent record
    console.log(`\n📖 Step 1: Creating BookContent record...`);

    const bookContent = await prisma.bookContent.upsert({
      where: { bookId: BOOK_ID },
      create: {
        bookId: BOOK_ID,
        title: "Anne Lindbergh: Aviator and Author",
        author: "Anne Morrow Lindbergh",
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
        // Calculate sentence timings for this bundle (Enhanced Timing v3)
        const bundleSentences = bundle.sentences;
        const totalChars = bundle.text.length;
        
        // Calculate proportional timings based on character count
        let currentTime = 0;
        const sentenceTimings = bundleSentences.map((sentenceText: string, idx: number) => {
          const chars = sentenceText.length;
          const charRatio = chars / totalChars;
          const estimatedDuration = bundle.duration * charRatio;

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
          method: 'ffprobe-measured',
          voiceId: bundle.voiceId,
          voiceName: bundle.voiceName,
          speed: bundle.speed
        };

        // Extract relative path from full URL
        const relativeAudioPath = bundle.audioUrl.includes('/audio-files/')
          ? bundle.audioUrl.split('/audio-files/')[1]
          : `${BOOK_ID}/${CEFR_LEVEL}/bundle_${bundle.bundleIndex}.mp3`;

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

        if ((bundle.bundleIndex + 1) % 5 === 0) {
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

    console.log(`   ✅ Total chunks in database: ${totalChunks}`);
    console.log(`   ✅ Chunks with audio: ${chunksWithAudio}`);
    console.log(`   ✅ Integrity: ${totalChunks === metadata.length && chunksWithAudio === metadata.length ? 'PASS' : 'FAIL'}`);

    if (totalChunks === metadata.length && chunksWithAudio === metadata.length) {
      console.log(`\n🎉 DATABASE INTEGRATION COMPLETE!`);
      console.log(`=`.repeat(60));
      console.log(`📚 Book: ${BOOK_ID}`);
      console.log(`🎯 Level: ${CEFR_LEVEL}`);
      console.log(`📦 Bundles: ${totalChunks}`);
      console.log(`✅ All bundles stored with audio metadata`);
      console.log(`\n🚀 Ready for Phase 7: API Endpoint Creation`);
    } else {
      console.error(`\n❌ Integrity check failed!`);
      process.exit(1);
    }

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

integrateDatabaseRecords();

