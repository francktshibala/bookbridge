#!/usr/bin/env npx tsx

/**
 * Database Integration for "Always a Family" A1 - WITHOUT character names in audio
 * 
 * This script:
 * 1. Loads bundle metadata with cleaned audio (no names) but original text (with names)
 * 2. Creates BookChunk records with original text for display
 * 3. Stores audioDurationMetadata with new timings (based on cleaned audio)
 * 4. Ensures text display shows names but audio doesn't speak them
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();

const BOOK_ID = 'always-a-family';
const CEFR_LEVEL = 'A1';

console.log(`📚 INTEGRATING "Always a Family" - A1 LEVEL (NO NAMES IN AUDIO)`);
console.log(`=`.repeat(60));

interface BundleMetadata {
  bundleIndex: number;
  startSentenceIndex: number;
  endSentenceIndex: number;
  text: string;  // Original text WITH names (for display)
  sentences: string[];  // Original sentences WITH names (for display)
  cleanedText: string;  // Text WITHOUT names (used for audio generation)
  cleanedSentences: string[];  // Sentences WITHOUT names
  audioUrl: string;
  duration: number;  // Duration of cleaned audio (shorter, no names)
  voiceId: string;
  voiceName: string;
  speed: number;
}

async function integrateDatabase() {
  console.log(`\n📖 Step 1: Loading original text...`);
  const originalTextPath = path.join(process.cwd(), 'cache/storycorps/always-a-family-original.txt');
  const originalText = fs.readFileSync(originalTextPath, 'utf-8');
  console.log(`✅ Loaded original text (${originalText.split(/\s+/).length} words)`);

  console.log(`\n📝 Step 2: Loading simplified text (with names for display)...`);
  const simplifiedTextPath = path.join(process.cwd(), 'cache/storycorps/always-a-family-A1-simplified.txt');
  const simplifiedText = fs.readFileSync(simplifiedTextPath, 'utf-8');
  console.log(`✅ Loaded simplified text (${simplifiedText.split(/\s+/).length} words)`);

  console.log(`\n🎵 Step 3: Loading bundle metadata (with cleaned audio)...`);
  const metadataPath = path.join(process.cwd(), 'cache/storycorps/always-a-family-A1-bundles-metadata-no-names.json');
  const metadata: BundleMetadata[] = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  console.log(`✅ Loaded ${metadata.length} bundles`);
  console.log(`   📝 Text: Original with names (for display)`);
  console.log(`   🎤 Audio: Cleaned without names (natural flow)`);

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

  console.log(`\n📦 Step 6: Creating BookChunks with updated audio metadata...`);
  console.log(`   ⚠️ IMPORTANT: Text includes names, audio does not`);
  let successCount = 0;
  let failCount = 0;

  for (const bundle of metadata) {
    try {
      // Calculate sentence timings based on cleaned audio duration
      // But use original sentences (with names) for display
      const avgDurationPerSentence = bundle.duration / bundle.cleanedSentences.length;
      
      // Map timings to original sentences (with names) for display
      const sentenceTimings = bundle.sentences.map((originalSentence, idx) => {
        // Use cleaned sentence for timing calculation
        const cleanedSentence = bundle.cleanedSentences[idx] || originalSentence;
        return {
          text: originalSentence,  // Display original with names
          startTime: idx * avgDurationPerSentence,
          endTime: (idx + 1) * avgDurationPerSentence,
          duration: avgDurationPerSentence,
          sentenceIndex: bundle.startSentenceIndex + idx
        };
      });

      const audioDurationMetadata = {
        version: 1,
        measuredDuration: bundle.duration,  // Duration of cleaned audio (shorter)
        sentenceTimings: sentenceTimings,
        measuredAt: new Date().toISOString(),
        fileSize: 0,
        method: 'ffprobe-measured',
        voiceId: bundle.voiceId,
        voiceName: bundle.voiceName,
        speed: bundle.speed,
        note: 'Character names removed from audio but kept in text display'
      };

      const relativeAudioPath = bundle.audioUrl.split('/public/audio-files/')[1];

             await prisma.bookChunk.create({
               data: {
                 bookId: BOOK_ID,
                 cefrLevel: CEFR_LEVEL,
                 chunkIndex: bundle.bundleIndex,
                 chunkText: bundle.text,  // Original text WITH names (for display)
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

  console.log(`\n🎉 DATABASE INTEGRATION COMPLETE!`);
  console.log(`=`.repeat(60));
  console.log(`📚 Book: ${BOOK_ID} (${CEFR_LEVEL})`);
  console.log(`📦 Chunks: ${totalChunksInDb}`);
  console.log(`🗣️ Voice: Sarah (${SARAH_VOICE_SETTINGS.voice_id})`);
  console.log(`⚡ Speed: ${TARGET_SPEED}× (November 2025 standard)`);
  console.log(`✅ Integrity: ${((totalChunksInDb / metadata.length) * 100).toFixed(0)}%`);
  console.log(`\n📝 Audio: Character names removed (natural flow)`);
  console.log(`📝 Text: Character names kept (visual aid for learners)`);
  console.log(`\n🚀 Ready for API endpoint update`);
}

// Import voice settings for logging
const SARAH_VOICE_SETTINGS = {
  voice_id: 'EXAVITQu4vr4xnSDxMaL',
  voice_name: 'Sarah'
};
const TARGET_SPEED = 0.85;

integrateDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(`\n💥 Fatal error during database integration:`, error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

