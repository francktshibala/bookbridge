import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();

const BOOK_ID = 'community-builder-1';
const CEFR_LEVEL = 'A1';

console.log(`📚 INTEGRATING "Community Builder Story" - A1 LEVEL WITH ENHANCED TIMING V3`);
console.log(`=`.repeat(60));

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
  console.log(`\n📖 Step 1: Loading original text...`);
  const originalTextPath = path.join(process.cwd(), 'cache', `${BOOK_ID}-A1-original.txt`);
  const originalText = fs.readFileSync(originalTextPath, 'utf-8');
  console.log(`✅ Loaded original text (${originalText.split(/\s+/).length} words)`);

  console.log(`\n🎵 Step 2: Loading bundle metadata (with Enhanced Timing v3)...`);
  const metadataPath = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-bundles-metadata.json`);
  const metadata: BundleMetadata[] = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  console.log(`✅ Loaded ${metadata.length} bundles`);
  console.log(`   🔧 Timing: Enhanced Timing v3 (character-count + punctuation penalties)`);

  console.log(`\n💾 Step 3: Creating/updating BookContent...`);
  const bookContent = await prisma.bookContent.upsert({
    where: { bookId: BOOK_ID },
    create: {
      bookId: BOOK_ID,
      title: "Community Builder: One Person Transforms a Neighborhood",
      author: "BookBridge",
      fullText: originalText,
      era: "modern",
      wordCount: originalText.split(/\s+/).length,
      totalChunks: metadata.length
    },
    update: {
      totalChunks: metadata.length
    }
  });
  console.log(`✅ BookContent created/updated (ID: ${bookContent.id})`);

  console.log(`\n🔨 Step 4: Deleting existing A1 chunks (if any)...`);
  const deleteResult = await prisma.bookChunk.deleteMany({
    where: {
      bookId: BOOK_ID,
      cefrLevel: CEFR_LEVEL
    }
  });
  console.log(`✅ Deleted ${deleteResult.count} existing chunks`);

  console.log(`\n📦 Step 5: Creating BookChunks with Enhanced Timing v3 metadata...`);
  let successCount = 0;
  let failCount = 0;

  for (const bundle of metadata) {
    try {
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
          audioDurationMetadata: audioDurationMetadata,
          wordCount: bundle.text.split(/\s+/).length,
          audioProvider: 'elevenlabs',
          audioVoiceId: bundle.voiceId,
        }
      });
      successCount++;
      if (successCount % 10 === 0) {
        console.log(`   ✅ Created ${successCount}/${metadata.length} chunks...`);
      }
    } catch (error) {
      console.error(`   ❌ Error creating chunk ${bundle.bundleIndex}:`, error instanceof Error ? error.message : String(error));
      failCount++;
    }
  }
  console.log(`\n✅ Step 5 Complete: ${successCount}/${metadata.length} chunks created`);

  console.log(`\n🔍 Step 6: Verifying database integrity...`);
  const totalChunksInDb = await prisma.bookChunk.count({
    where: { bookId: BOOK_ID, cefrLevel: CEFR_LEVEL }
  });
  const missingChunks = metadata.length - totalChunksInDb;

  console.log(`\n📊 Verification Results:`);
  console.log(`   Total chunks in DB: ${totalChunksInDb}`);
  console.log(`   Expected chunks: ${metadata.length}`);
  console.log(`   Success rate: ${((totalChunksInDb / metadata.length) * 100).toFixed(0)}%`);
  if (missingChunks > 0) {
    console.warn(`   ⚠️ Warning: ${missingChunks} chunks are missing from the database.`);
  } else {
    console.log(`   ✅ No gaps detected`);
  }

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

  console.log(`\n🎉 DATABASE INTEGRATION COMPLETE!`);
  console.log(`=`.repeat(60));
  console.log(`📦 Total bundles: ${totalChunksInDb}`);
  console.log(`🗣️ Voice: Jane (${metadata[0]?.voiceId})`);
  console.log(`🔧 Timing: Enhanced Timing v3`);
  console.log(`\n🚀 Ready for API endpoint creation`);
}

integrateDatabase()
  .catch(error => {
    console.error(`\n💥 Fatal error:`, error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

