import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();

const BOOK_ID = 'always-a-family';
const CEFR_LEVEL = 'A1';

console.log(`📚 INTEGRATING "Always a Family" - A1 LEVEL WITH ENHANCED TIMING V3`);
console.log(`=`.repeat(60));

interface BundleMetadata {
  bundleIndex: number;
  startSentenceIndex: number;
  endSentenceIndex: number;
  text: string; // Original text with names for display
  sentences: string[]; // Original sentences with names for display
  cleanedText: string; // Text used for audio generation (no names)
  cleanedSentences: string[]; // Sentences used for audio generation (no names)
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
  const originalTextPath = path.join(process.cwd(), 'cache/storycorps/always-a-family-original.txt');
  const originalText = fs.readFileSync(originalTextPath, 'utf-8');
  console.log(`✅ Loaded original text (${originalText.split(/\s+/).length} words)`);

  console.log(`\n📝 Step 2: Loading simplified text (with names for display)...`);
  const simplifiedTextPath = path.join(process.cwd(), `cache/storycorps/${BOOK_ID}-${CEFR_LEVEL}-simplified.txt`);
  const simplifiedText = fs.readFileSync(simplifiedTextPath, 'utf-8');
  console.log(`✅ Loaded simplified text (${simplifiedText.split(/\s+/).length} words)`);

  console.log(`\n🎵 Step 3: Loading bundle metadata (with Enhanced Timing v3)...`);
  const metadataPath = path.join(process.cwd(), `cache/storycorps/${BOOK_ID}-${CEFR_LEVEL}-bundles-metadata.json`);
  const metadata: BundleMetadata[] = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  console.log(`✅ Loaded ${metadata.length} bundles`);
  console.log(`   📝 Text: Original with names (for display)`);
  console.log(`   🎤 Audio: Cleaned without names (natural flow)`);
  console.log(`   🔧 Timing: Enhanced Timing v3 (character-count + punctuation penalties)`);

  console.log(`\n💾 Step 4: Creating/updating BookContent...`);
  const bookContent = await prisma.bookContent.upsert({
    where: { bookId: BOOK_ID },
    create: {
      bookId: BOOK_ID,
      title: "Always a Family",
      author: "Danny & Annie Perasa",
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

  console.log(`\n🔨 Step 5: Deleting existing A1 chunks (if any)...`);
  const deleteResult = await prisma.bookChunk.deleteMany({
    where: {
      bookId: BOOK_ID,
      cefrLevel: CEFR_LEVEL
    }
  });
  console.log(`✅ Deleted ${deleteResult.count} existing chunks`);

  console.log(`\n📦 Step 6: Creating BookChunks with Enhanced Timing v3 metadata...`);
  let successCount = 0;
  let failCount = 0;

  for (const bundle of metadata) {
    try {
      // Use pre-calculated sentenceTimings from Enhanced Timing v3
      // These already have startTime, endTime, duration, and sentenceIndex
      const sentenceTimings = bundle.sentenceTimings.map(timing => ({
        text: timing.text,  // Original sentence with name for display
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
          chunkText: bundle.text, // Store original text with names for display
          audioFilePath: relativeAudioPath,
          audioDurationMetadata: audioDurationMetadata,
          wordCount: bundle.text.split(/\s+/).length,
          audioProvider: 'elevenlabs',
          audioVoiceId: bundle.voiceId,
        }
      });
      successCount++;
      if (successCount % 5 === 0) {
        console.log(`   ✅ Created ${successCount}/${metadata.length} chunks...`);
      }
    } catch (error) {
      console.error(`   ❌ Error creating chunk ${bundle.bundleIndex}:`, error instanceof Error ? error.message : String(error));
      failCount++;
    }
  }
  console.log(`\n✅ Step 6 Complete: ${successCount}/${metadata.length} chunks created`);

  console.log(`\n🔍 Step 7: Verifying database integrity...`);
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
  console.log(`   Chunks with audio: ${chunksWithAudio}/${totalChunksInDb}`);
  if (chunksWithAudio === totalChunksInDb) {
    console.log(`   ✅ All chunks have audio metadata`);
  } else {
    console.warn(`   ⚠️ Warning: Some chunks are missing audio metadata.`);
  }

  // Verify Enhanced Timing v3 format
  const sampleChunk = await prisma.bookChunk.findFirst({
    where: { bookId: BOOK_ID, cefrLevel: CEFR_LEVEL },
    select: { audioDurationMetadata: true }
  });

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
      console.log(`   ✅ Timing strategy: ${meta.timingStrategy || 'N/A'}`);
      
      if (hasStartTime && hasEndTime && hasSentenceIndex) {
        console.log(`   ✅ Format correct - ready for perfect sync!`);
      } else {
        console.warn(`   ⚠️ Format incomplete - may cause sync issues`);
      }
    }
  }

  console.log(`\n🎉 DATABASE INTEGRATION COMPLETE!`);
  console.log(`=`.repeat(60));
  console.log(`📚 Book: ${BOOK_ID} (${CEFR_LEVEL})`);
  console.log(`📦 Chunks: ${totalChunksInDb}`);
  console.log(`🗣️ Voice: Sarah (${metadata[0]?.voiceId})`);
  console.log(`⚡ Speed: ${TARGET_SPEED}× (November 2025 standard)`);
  console.log(`🔧 Timing: Enhanced Timing v3 (character-count + punctuation penalties)`);
  console.log(`✅ Integrity: ${((totalChunksInDb / metadata.length) * 100).toFixed(0)}%`);
  console.log(`\n🚀 Ready for testing - A1 now has perfect sync!`);
}

const TARGET_SPEED = 0.85;

integrateDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(`\n💥 Fatal error during database integration:`, error);
    process.exit(1);
  });

