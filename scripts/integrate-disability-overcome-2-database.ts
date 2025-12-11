/**
 * Integrate Disability Overcome #2 story into database
 * Creates BookContent and BookChunk records with Enhanced Timing v3 metadata
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();

const BOOK_ID = 'disability-overcome-2';
const CEFR_LEVEL = 'A1';

interface BundleMetadata {
  bundleIndex: number;
  startSentenceIndex: number;
  endSentenceIndex: number;
  text: string;
  sentences: string[];
  audioUrl: string;
  duration: number;
  voiceId: string;
  voiceName: string;
  speed: number;
  sentenceTimings: Array<{
    text: string;
    startTime: number;
    endTime: number;
    duration: number;
    sentenceIndex: number;
  }>;
}

async function integrateDatabase() {
  console.log(`📚 INTEGRATING "Disability Overcome #2: Blind Mountaineer" - A1 LEVEL WITH ENHANCED TIMING V3`);
  console.log(`=`.repeat(60));

  try {
    // Load story text
    const originalTextPath = path.join(process.cwd(), 'cache', `${BOOK_ID}-A1-original.txt`);
    if (!fs.existsSync(originalTextPath)) {
      throw new Error(`Story file not found: ${originalTextPath}`);
    }
    const originalText = fs.readFileSync(originalTextPath, 'utf-8');
    // Remove hook if it's at the beginning (it's already in preview-combined)
    const storyText = originalText.replace(/^Imagine you are.*?tallest mountain\.\s*/s, '');

    // Load bundle metadata
    const metadataPath = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-bundles-metadata.json`);
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Bundle metadata not found: ${metadataPath}`);
    }
    const metadata: BundleMetadata[] = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    console.log(`\n📖 Story: "${BOOK_ID}"`);
    console.log(`📊 Bundles: ${metadata.length}`);
    console.log(`📝 Sentences: ${storyText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0).length}`);

    // Create/update BookContent
    console.log(`\n📚 Creating/updating BookContent...`);
    const bookContent = await prisma.bookContent.upsert({
      where: { bookId: BOOK_ID },
      create: {
        bookId: BOOK_ID,
        title: 'Blind Mountaineer: Reaching the Top',
        author: 'BookBridge',
        fullText: storyText,
        era: 'modern',
        wordCount: storyText.split(/\s+/).length,
        totalChunks: metadata.length
      },
      update: {
        title: 'Blind Mountaineer: Reaching the Top',
        author: 'BookBridge',
        fullText: storyText,
        wordCount: storyText.split(/\s+/).length,
        totalChunks: metadata.length
      }
    });
    console.log(`   ✅ BookContent: ${bookContent.title}`);

    // Delete existing chunks for this level
    console.log(`\n🗑️  Deleting existing chunks for ${BOOK_ID} ${CEFR_LEVEL}...`);
    const deleted = await prisma.bookChunk.deleteMany({
      where: {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL
      }
    });
    console.log(`   ✅ Deleted ${deleted.count} existing chunks`);

    // Create chunks with Enhanced Timing v3 metadata
    console.log(`\n📦 Creating ${metadata.length} BookChunk records...`);
    for (const bundle of metadata) {
      const sentenceTimings = bundle.sentenceTimings.map(timing => ({
        text: timing.text,
        startTime: timing.startTime,
        endTime: timing.endTime,
        duration: timing.duration,
        sentenceIndex: timing.sentenceIndex
      }));

      const audioDurationMetadata = {
        version: 1,
        measuredDuration: bundle.duration,
        sentenceTimings: sentenceTimings,
        measuredAt: new Date().toISOString(),
        fileSize: 0,
        method: 'ffprobe-measured-enhanced-timing-v3',
        voiceId: bundle.voiceId,
        voiceName: bundle.voiceName,
        speed: bundle.speed,
        timingStrategy: 'character-proportion-with-punctuation-penalties'
      };

      const relativeAudioPath = bundle.audioUrl.includes('/audio-files/')
        ? bundle.audioUrl.split('/audio-files/')[1]
        : `${BOOK_ID}/${CEFR_LEVEL}/bundle_${bundle.bundleIndex}.mp3`;

      await prisma.bookChunk.create({
        data: {
          bookId: BOOK_ID,
          cefrLevel: CEFR_LEVEL,
          chunkIndex: bundle.bundleIndex,
          chunkText: bundle.text,
          audioFilePath: relativeAudioPath,
          audioDurationMetadata: audioDurationMetadata as any,
          wordCount: bundle.text.split(/\s+/).length,
          audioProvider: 'elevenlabs',
          audioVoiceId: bundle.voiceId
        }
      });
    }
    console.log(`   ✅ Created ${metadata.length} chunks`);

    // Verification
    console.log(`\n🔍 Verifying integration...`);
    const totalChunksInDb = await prisma.bookChunk.count({
      where: {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL
      }
    });
    console.log(`   Total chunks in database: ${totalChunksInDb}`);

    const chunksWithAudio = await prisma.bookChunk.count({
      where: {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL,
        audioFilePath: { not: null }
      }
    });
    console.log(`   Chunks with audio paths: ${chunksWithAudio}/${totalChunksInDb}`);

    const sampleChunk = await prisma.bookChunk.findFirst({
      where: { bookId: BOOK_ID, cefrLevel: CEFR_LEVEL },
      select: { audioDurationMetadata: true }
    });
    const chunksWithMetadata = sampleChunk?.audioDurationMetadata ? totalChunksInDb : 0;
    console.log(`   Chunks with timing metadata: ${chunksWithMetadata}/${totalChunksInDb}`);

    if (sampleChunk?.audioDurationMetadata) {
      const meta = sampleChunk.audioDurationMetadata as any;
      if (meta.sentenceTimings?.[0]) {
        const timing = meta.sentenceTimings[0];
        const hasStartTime = 'startTime' in timing;
        const hasEndTime = 'endTime' in timing;
        const hasSentenceIndex = 'sentenceIndex' in timing;
        
        console.log(`\n🔧 Enhanced Timing v3 Format Check:`);
        console.log(`   ✅ startTime: ${hasStartTime ? '✓' : '✗'}`);
        console.log(`   ✅ endTime: ${hasEndTime ? '✓' : '✗'}`);
        console.log(`   ✅ sentenceIndex: ${hasSentenceIndex ? '✓' : '✗'}`);
        console.log(`   ✅ Method: ${meta.method || 'unknown'}`);
        console.log(`   ✅ Voice: ${meta.voiceName || meta.voiceId || 'unknown'}`);
      }
    }

    console.log(`\n🎉 DATABASE INTEGRATION COMPLETE!`);
    console.log(`=`.repeat(60));
    console.log(`📖 Book ID: ${BOOK_ID}`);
    console.log(`📊 Level: ${CEFR_LEVEL}`);
    console.log(`📦 Chunks: ${totalChunksInDb}`);
    console.log(`🗣️ Voice: Daniel (${metadata[0]?.voiceId})`);
    console.log(`🔧 Timing: Enhanced Timing v3`);

  } catch (error) {
    console.error(`\n❌ Error integrating database:`, error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

integrateDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

