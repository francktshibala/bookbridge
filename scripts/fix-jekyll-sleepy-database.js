#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Configuration
const PROJECT_ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(PROJECT_ROOT, 'cache');

async function fixJekyllAndSleepyDatabase() {
  try {
    console.log(`🔧 Fixing Jekyll & Hyde and Sleepy Hollow database...\n`);

    // Fix Jekyll & Hyde A1
    const jekyllBundleFile = path.join(CACHE_DIR, 'jekyll-hyde-a1-bundles.json');
    if (fs.existsSync(jekyllBundleFile)) {
      const jekyllData = JSON.parse(fs.readFileSync(jekyllBundleFile, 'utf-8'));

      // Clear existing corrupted data
      console.log('🗑️ Clearing existing Jekyll & Hyde BookChunk data...');
      await prisma.bookChunk.deleteMany({
        where: { bookId: 'gutenberg-43' }
      });

      console.log('📝 Re-populating Jekyll & Hyde BookChunk table...');

      for (let i = 0; i < jekyllData.bundles.length; i++) {
        const bundle = jekyllData.bundles[i];
        const chunkText = bundle.simplifiedSentences.join(' ');

        await prisma.bookChunk.create({
          data: {
            bookId: 'gutenberg-43',
            chunkIndex: i,
            chunkText: chunkText,
            cefrLevel: 'A1',
            audioFilePath: `jekyll-hyde/bundle_${i}.mp3`,
            audioProvider: 'elevenlabs',
            wordCount: bundle.wordCount || chunkText.split(' ').length
          }
        });
      }

      console.log(`✅ Fixed Jekyll & Hyde: ${jekyllData.bundles.length} chunks inserted`);
    }

    // For Sleepy Hollow - create A1 data from B1 simplified
    const sleepyFile = path.join(CACHE_DIR, 'sleepy-hollow-B1-simplified.json');
    if (fs.existsSync(sleepyFile)) {
      const sleepyData = JSON.parse(fs.readFileSync(sleepyFile, 'utf-8'));

      // Clear existing data
      console.log('🗑️ Clearing existing Sleepy Hollow BookChunk data...');
      await prisma.bookChunk.deleteMany({
        where: { bookId: 'sleepy-hollow-enhanced' }
      });

      console.log('📝 Creating Sleepy Hollow A1 chunks from B1 data...');

      // Extract sentences from the structured data
      const sentences = sleepyData.sentences || [];
      if (sentences.length > 0) {
        const sentencesPerChunk = 4;

        for (let i = 0; i < sentences.length; i += sentencesPerChunk) {
          const chunkSentences = sentences.slice(i, i + sentencesPerChunk);
          const chunkText = chunkSentences.map(s => s.text.trim()).join(' ');

          await prisma.bookChunk.create({
            data: {
              bookId: 'sleepy-hollow-enhanced',
              chunkIndex: Math.floor(i / sentencesPerChunk),
              chunkText: chunkText,
              cefrLevel: 'A1',
              audioFilePath: `sleepy-hollow/bundle_${Math.floor(i / sentencesPerChunk)}.mp3`,
              audioProvider: 'elevenlabs',
              wordCount: chunkText.split(' ').length
            }
          });
        }

        const totalChunks = Math.ceil(sentences.length / sentencesPerChunk);
        console.log(`✅ Created Sleepy Hollow A1: ${totalChunks} chunks from ${sentences.length} sentences`);
      }
    }

    console.log(`\n✅ Successfully fixed both books!`);

  } catch (error) {
    console.error('❌ Error fixing Jekyll & Sleepy database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixJekyllAndSleepyDatabase().catch(console.error);