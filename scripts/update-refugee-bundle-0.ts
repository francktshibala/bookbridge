import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const BOOK_ID = 'refugee-journey-1';
const CEFR_LEVEL = 'A1';

async function updateBundle0() {
  console.log('🔄 Updating bundle 0 in database...');
  
  const metadataPath = path.join(process.cwd(), `cache/refugee-journey-1-A1-bundles-metadata.json`);
  const allMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const bundle0 = allMetadata[0];
  
  if (!bundle0) {
    throw new Error('Bundle 0 not found in metadata');
  }
  
  console.log(`📦 Bundle 0: "${bundle0.text.substring(0, 80)}..."`);
  console.log(`   Audio: ${bundle0.audioUrl}`);
  console.log(`   Duration: ${bundle0.duration}s`);
  
  const relativeAudioPath = bundle0.audioUrl.replace(/^https?:\/\/[^\/]+\/storage\/v1\/object\/public\/audio-files\//, '');
  
  const audioDurationMetadata = {
    totalDuration: bundle0.duration,
    sentenceTimings: bundle0.sentenceTimings.map((timing: any) => ({
      sentenceIndex: timing.sentenceIndex,
      startTime: timing.startTime,
      endTime: timing.endTime,
      duration: timing.duration,
      text: timing.text
    }))
  };
  
  const updated = await prisma.bookChunk.updateMany({
    where: {
      bookId: BOOK_ID,
      cefrLevel: CEFR_LEVEL,
      chunkIndex: 0
    },
    data: {
      chunkText: bundle0.text,
      audioFilePath: relativeAudioPath,
      audioDurationMetadata: audioDurationMetadata,
      wordCount: bundle0.text.split(/\s+/).length,
      audioVoiceId: bundle0.voiceId,
    }
  });
  
  console.log(`✅ Updated ${updated.count} chunk(s) in database`);
  
  const chunk = await prisma.bookChunk.findFirst({
    where: {
      bookId: BOOK_ID,
      cefrLevel: CEFR_LEVEL,
      chunkIndex: 0
    }
  });
  
  if (chunk) {
    console.log(`✅ Verified chunk 0:`);
    console.log(`   Text: "${chunk.chunkText.substring(0, 80)}..."`);
    console.log(`   Audio: ${chunk.audioFilePath}`);
    console.log(`   Duration: ${(chunk.audioDurationMetadata as any)?.totalDuration}s`);
  }
}

updateBundle0()
  .catch((error) => {
    console.error('❌ Error updating bundle 0:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

