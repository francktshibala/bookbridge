#!/usr/bin/env npx tsx

/**
 * Seed script: American Voices story text (Sprint 3)
 *
 * Inserts BookContent rows for the 3 American Voices stories so the
 * BundleReadingInterface can display them in text-only mode.
 *
 * Requires: scripts/seed-american-voices-collection.ts to have run first.
 *
 * Usage: npx tsx scripts/seed-american-voices-content.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const STORIES = [
  {
    bookId: 'frederick-douglass-reading',
    title: 'Learning to Read and Write',
    author: 'Frederick Douglass',
    era: 'american-19c',
    textFile: 'cache/frederick-douglass-reading-A2-simplified.txt',
  },
  {
    bookId: 'mary-antin-promised-land',
    title: 'The Promised Land: Initiation',
    author: 'Mary Antin',
    era: 'american-19c',
    textFile: 'cache/mary-antin-promised-land-A1-simplified.txt',
  },
  {
    bookId: 'booker-washington-school',
    title: 'The Struggle for an Education',
    author: 'Booker T. Washington',
    era: 'american-19c',
    textFile: 'cache/booker-washington-school-A2-simplified.txt',
  },
];

const SENTENCES_PER_BUNDLE = 4;

function countSentences(text: string): number {
  return text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0).length;
}

async function main() {
  console.log('📚 Seeding American Voices story content...\n');

  for (const story of STORIES) {
    const fullPath = path.join(process.cwd(), story.textFile);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Skipping ${story.bookId} — file not found: ${story.textFile}`);
      continue;
    }

    const text = fs.readFileSync(fullPath, 'utf-8').trim();
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = countSentences(text);
    const totalBundles = Math.ceil(sentenceCount / SENTENCES_PER_BUNDLE);

    console.log(`📖 Seeding: ${story.title}`);
    console.log(`   Words: ${wordCount} | Sentences: ~${sentenceCount} | Bundles: ${totalBundles}`);

    await prisma.bookContent.upsert({
      where: { bookId: story.bookId },
      create: {
        bookId: story.bookId,
        title: story.title,
        author: story.author,
        fullText: text,
        era: story.era,
        wordCount,
        totalChunks: totalBundles,
      },
      update: {
        title: story.title,
        author: story.author,
        fullText: text,
        era: story.era,
        wordCount,
        totalChunks: totalBundles,
      },
    });

    console.log(`   ✅ BookContent inserted for ${story.bookId}\n`);
  }

  console.log('🎉 All story content seeded!');
  console.log('\n💡 Next steps:');
  console.log('   1. Run: node scripts/seed-quiz-questions.js');
  console.log('   2. npm run build — verify no errors');
  console.log('   3. Test at bookbridge.app — browse American Voices collection');
  console.log('   4. Verify text displays in reading interface (no audio controls expected)');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
