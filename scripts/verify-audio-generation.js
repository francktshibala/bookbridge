#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAudioGeneration() {
  try {
    console.log('🔍 Verifying Yellow Wallpaper audio files...\n');

    // Get bundle 0
    const bundle = await prisma.bookChunk.findFirst({
      where: {
        bookId: 'gutenberg-1952-A1',
        cefrLevel: 'A1',
        chunkIndex: 0
      }
    });

    console.log('📦 Bundle 0 details:');
    console.log(`Text: "${bundle.chunkText}"`);
    console.log(`Audio path: ${bundle.audioFilePath}`);
    console.log(`Audio provider: ${bundle.audioProvider}`);
    console.log(`Updated: ${bundle.updatedAt}`);

    // Check if audio file exists in Supabase
    if (bundle.audioFilePath) {
      const { data: files } = await supabase.storage
        .from('audio-files')
        .list('gutenberg-1952-A1/a1/', {
          limit: 5
        });

      console.log('\n🎵 Audio files in Supabase:');
      files?.forEach(file => {
        console.log(`  - ${file.name} (${file.updated_at})`);
      });
    }

    // Check all bundles with audio
    const bundlesWithAudio = await prisma.bookChunk.count({
      where: {
        bookId: 'gutenberg-1952-A1',
        audioFilePath: { not: null }
      }
    });

    console.log(`\n📊 Total bundles with audio: ${bundlesWithAudio}/94`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAudioGeneration();
