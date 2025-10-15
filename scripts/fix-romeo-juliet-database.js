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
const BUNDLE_FILE = path.join(CACHE_DIR, 'romeo-juliet-a1-bundles.json');

const BOOK_ID = 'gutenberg-1513';
const CEFR_LEVEL = 'A1';

async function fixRomeoJulietDatabase() {
  try {
    console.log(`🔧 Fixing Romeo & Juliet database from cache...\n`);

    // Load existing bundle data
    if (!fs.existsSync(BUNDLE_FILE)) {
      throw new Error('Romeo & Juliet bundle cache not found. Cannot fix database.');
    }

    const bundleData = JSON.parse(fs.readFileSync(BUNDLE_FILE, 'utf-8'));
    console.log(`📦 Found ${bundleData.totalBundles} bundles in cache`);

    // Clear existing corrupted data
    console.log('🗑️ Clearing existing corrupted BookChunk data...');
    await prisma.bookChunk.deleteMany({
      where: { bookId: BOOK_ID }
    });

    // Re-populate from cache data
    console.log('📝 Re-populating BookChunk table from cache...');

    let insertedChunks = 0;
    for (const bundle of bundleData.bundles) {
      const chunkText = bundle.sentences.map(s => s.text).join(' ');

      await prisma.bookChunk.create({
        data: {
          bookId: BOOK_ID,
          chunkIndex: bundle.bundleIndex,
          chunkText: chunkText,
          cefrLevel: CEFR_LEVEL,
          audioFilePath: `romeo-juliet/bundle_${bundle.bundleIndex}.mp3`,
          audioProvider: 'elevenlabs',
          wordCount: bundle.sentences.reduce((sum, s) => sum + s.text.split(' ').length, 0)
        }
      });

      insertedChunks++;
      if (insertedChunks % 100 === 0) {
        console.log(`✅ Inserted ${insertedChunks}/${bundleData.totalBundles} chunks`);
      }
    }

    console.log(`\n✅ Successfully fixed Romeo & Juliet database!`);
    console.log(`📊 Inserted ${insertedChunks} BookChunk records`);
    console.log(`🎯 Book ID: ${BOOK_ID}`);
    console.log(`📚 CEFR Level: ${CEFR_LEVEL}`);

  } catch (error) {
    console.error('❌ Error fixing Romeo & Juliet database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixRomeoJulietDatabase().catch(console.error);