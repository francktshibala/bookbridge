/**
 * Integrate Cultural Bridge #1 story into database
 * Creates BookContent and BookChunk records with Enhanced Timing v3 metadata
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();

const BOOK_ID = 'cultural-bridge-2';
const CEFR_LEVEL = 'A1';

interface SentenceTiming {
  text: string;
  startTime: number;
  endTime: number;
  duration: number;
  sentenceIndex: number;
}

interface BundleMetadata {
  bundleIndex: number;
  audioUrl: string;
  audioPath: string;
  sentences: SentenceTiming[];
  totalDuration: number;
  measuredDuration: number;
}

async function integrateDatabase() {
    console.log(`📚 INTEGRATING "Bridging Traditions and Modern Life" - A1 LEVEL WITH ENHANCED TIMING V3`);
  console.log(`=`.repeat(70));

  try {
    // Load story text
    const simplifiedTextPath = path.join(process.cwd(), 'cache', `${BOOK_ID}-${CEFR_LEVEL}-simplified.txt`);
    if (!fs.existsSync(simplifiedTextPath)) {
      throw new Error(`Story file not found: ${simplifiedTextPath}`);
    }
    const storyText = fs.readFileSync(simplifiedTextPath, 'utf-8');

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
        title: 'Bridging Traditions and Modern Life',
        author: 'BookBridge',
        fullText: storyText,
        era: 'modern',
        wordCount: storyText.split(/\s+/).length,
        totalChunks: metadata.length
      },
      update: {
        title: 'Bridging Traditions and Modern Life',
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
      const sentenceTimings = bundle.sentences.map(timing => ({
        text: timing.text,
        startTime: timing.startTime,
        endTime: timing.endTime,
        duration: timing.duration,
        sentenceIndex: timing.sentenceIndex
      }));

      const chunkText = bundle.sentences.map(s => s.text).join(' ');

      await prisma.bookChunk.create({
        data: {
          bookId: BOOK_ID,
          cefrLevel: CEFR_LEVEL,
          chunkIndex: bundle.bundleIndex,
          chunkText: chunkText,
          wordCount: chunkText.split(/\s+/).length,
          audioFilePath: bundle.audioPath,
          audioDurationMetadata: {
            measuredDuration: bundle.measuredDuration,
            sentenceTimings: sentenceTimings,
            timingVersion: 'enhanced-v3',
            voiceId: 'RILOU7YmBhvwJGDGjNmP',
            voiceName: 'Jane',
            speed: 0.765,
            generatedAt: new Date().toISOString()
          }
        }
      });

      console.log(`   ✅ Bundle ${bundle.bundleIndex}: ${bundle.sentences.length} sentences, ${bundle.measuredDuration.toFixed(2)}s`);
    }

    console.log(`\n✅ Database integration complete!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - BookContent: ✅`);
    console.log(`   - BookChunks: ${metadata.length} created`);
    console.log(`   - Total audio duration: ${metadata.reduce((sum, b) => sum + b.measuredDuration, 0).toFixed(2)}s`);

  } catch (error) {
    console.error('\n❌ Error integrating database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

integrateDatabase();
