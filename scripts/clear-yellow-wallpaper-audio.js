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

async function clearYellowWallpaperAudio() {
  try {
    console.log('🗑️  Clearing Yellow Wallpaper audio files only...\n');

    // Clear audio file references from database
    const result = await prisma.bookChunk.updateMany({
      where: {
        bookId: 'gutenberg-1952-A1',
        cefrLevel: 'A1'
      },
      data: {
        audioFilePath: null,
        audioProvider: null,
        audioVoiceId: null
      }
    });

    console.log(`✅ Cleared audio references from ${result.count} bundles in database`);

    // Delete audio files from Supabase storage
    const { data: files } = await supabase.storage
      .from('audio-files')
      .list('gutenberg-1952-A1/a1/', {
        limit: 100
      });

    if (files && files.length > 0) {
      const filePaths = files.map(file => `gutenberg-1952-A1/a1/${file.name}`);

      const { data, error } = await supabase.storage
        .from('audio-files')
        .remove(filePaths);

      if (error) {
        console.error('❌ Error deleting files from Supabase:', error);
      } else {
        console.log(`✅ Deleted ${filePaths.length} audio files from Supabase storage`);
      }
    } else {
      console.log('ℹ️  No audio files found in Supabase to delete');
    }

    // Verify bundles still exist
    const bundleCount = await prisma.bookChunk.count({
      where: {
        bookId: 'gutenberg-1952-A1',
        cefrLevel: 'A1'
      }
    });

    console.log(`\n✅ Verification: ${bundleCount} text bundles remain intact`);
    console.log('📝 Text content preserved, only audio cleared');
    console.log('\n🎯 Ready to regenerate audio for all 94 bundles');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearYellowWallpaperAudio();