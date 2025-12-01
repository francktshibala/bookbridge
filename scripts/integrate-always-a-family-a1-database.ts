import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();

const BOOK_ID = 'always-a-family';
const CEFR_LEVEL = 'A1';

console.log(`📚 INTEGRATING "Always a Family" - A1 LEVEL INTO DATABASE`);
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
}

async function integrateDatabase() {
  console.log(`\n📖 Step 1: Loading original text...`);
  const originalTextPath = path.join(process.cwd(), 'cache/storycorps/always-a-family-original.txt');
  const originalText = fs.readFileSync(originalTextPath, 'utf-8');
  console.log(`✅ Loaded original text (${originalText.split(/\s+/).length} words)`);

  console.log(`\n📝 Step 2: Loading simplified text...`);
  const simplifiedTextPath = path.join(process.cwd(), `cache/storycorps/${BOOK_ID}-${CEFR_LEVEL}-simplified.txt`);
  const simplifiedText = fs.readFileSync(simplifiedTextPath, 'utf-8');
  console.log(`✅ Loaded simplified text (${simplifiedText.split(/\s+/).length} words)`);

  console.log(`\n🎵 Step 3: Loading bundle metadata...`);
  const metadataPath = path.join(process.cwd(), `cache/storycorps/${BOOK_ID}-${CEFR_LEVEL}-bundles-metadata.json`);
  const metadata: BundleMetadata[] = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  console.log(`✅ Loaded ${metadata.length} bundles`);

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

  console.log(`\n📦 Step 6: Creating BookChunks with audio metadata...`);
  let successCount = 0;
  let failCount = 0;

  for (const bundle of metadata) {
    try {
      // Create sentence timings metadata (Solution 1)
      const avgDurationPerSentence = bundle.duration / bundle.sentences.length;
      const sentenceTimings = bundle.sentences.map((sentence, idx) => ({
        text: sentence,
        startTime: idx * avgDurationPerSentence,
        endTime: (idx + 1) * avgDurationPerSentence,
        duration: avgDurationPerSentence,
        sentenceIndex: bundle.startSentenceIndex + idx
      }));

      // Create audioDurationMetadata (Solution 1 - November 2025 Standard)
      const audioDurationMetadata = {
        version: 1,
        measuredDuration: bundle.duration,
        sentenceTimings: sentenceTimings,
        measuredAt: new Date().toISOString(),
        fileSize: 0,
        method: 'ffprobe-measured',
        voiceId: bundle.voiceId,
        voiceName: bundle.voiceName,
        speed: bundle.speed
      };

      // Extract relative path from full URL
      const relativeAudioPath = bundle.audioUrl.includes('/audio-files/')
        ? bundle.audioUrl.split('/audio-files/')[1]
        : `${BOOK_ID}/${CEFR_LEVEL}/bundle_${bundle.bundleIndex}.mp3`;

      const chunk = await prisma.bookChunk.upsert({
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
          audioDurationMetadata: audioDurationMetadata as any
        }
      });

      successCount++;
      if ((successCount) % 5 === 0) {
        console.log(`   ✅ Created ${successCount}/${metadata.length} chunks...`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to create chunk ${bundle.bundleIndex}: ${error}`);
      failCount++;
    }
  }

  console.log(`\n✅ Step 6 Complete: ${successCount}/${metadata.length} chunks created`);

  console.log(`\n🔍 Step 7: Verifying database integrity...`);
  const chunks = await prisma.bookChunk.findMany({
    where: {
      bookId: BOOK_ID,
      cefrLevel: CEFR_LEVEL
    },
    orderBy: { chunkIndex: 'asc' }
  });

  console.log(`\n📊 Verification Results:`);
  console.log(`   Total chunks in DB: ${chunks.length}`);
  console.log(`   Expected chunks: ${metadata.length}`);
  console.log(`   Success rate: ${Math.round((successCount / metadata.length) * 100)}%`);

  // Check for gaps
  const indices = chunks.map(c => c.chunkIndex).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 0; i < indices.length - 1; i++) {
    if (indices[i + 1] - indices[i] > 1) {
      gaps.push(`${indices[i]} -> ${indices[i + 1]}`);
    }
  }

  if (gaps.length > 0) {
    console.log(`   ⚠️ Gaps detected: ${gaps.join(', ')}`);
  } else {
    console.log(`   ✅ No gaps detected`);
  }

  // Check audio metadata
  const chunksWithAudio = chunks.filter(c => c.audioFilePath && c.audioDurationMetadata);
  console.log(`   Chunks with audio: ${chunksWithAudio.length}/${chunks.length}`);

  if (chunksWithAudio.length === chunks.length) {
    console.log(`   ✅ All chunks have audio metadata`);
  } else {
    console.log(`   ⚠️ ${chunks.length - chunksWithAudio.length} chunks missing audio metadata`);
  }

  console.log(`\n🎉 DATABASE INTEGRATION COMPLETE!`);
  console.log(`=`.repeat(60));
  console.log(`📚 Book: ${BOOK_ID} (${CEFR_LEVEL})`);
  console.log(`📦 Chunks: ${chunks.length}`);
  console.log(`🗣️ Voice: Sarah (EXAVITQu4vr4xnSDxMaL)`);
  console.log(`⚡ Speed: 0.85× (November 2025 standard)`);
  console.log(`✅ Integrity: ${chunksWithAudio.length === chunks.length && gaps.length === 0 ? '100%' : 'Issues detected'}`);
  console.log(`\n🚀 Ready for API endpoint creation`);

  await prisma.$disconnect();
}

integrateDatabase()
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });

