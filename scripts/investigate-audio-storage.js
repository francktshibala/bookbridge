#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function investigateAudioStorage() {
  try {
    console.log('🔍 Audio Storage Investigation Report\n');
    console.log('=' * 60);

    // Check database for all books with audio paths
    const books = [
      { id: 'gutenberg-1513-A1', name: 'Romeo & Juliet', expectedFiles: 749 },
      { id: 'gutenberg-43-A1', name: 'Jekyll & Hyde', expectedFiles: 322 },
      { id: 'gutenberg-41-A1', name: 'Sleepy Hollow', expectedFiles: 82 }
    ];

    for (const book of books) {
      console.log(`\n📚 ${book.name} (${book.id})`);
      console.log('-'.repeat(40));

      // Check database chunks
      const chunks = await prisma.bookChunk.findMany({
        where: { bookId: book.id },
        select: {
          chunkIndex: true,
          audioFilePath: true,
          audioProvider: true
        },
        orderBy: { chunkIndex: 'asc' }
      });

      console.log(`📊 Database chunks: ${chunks.length}`);
      console.log(`📊 Expected files: ${book.expectedFiles}`);

      const chunksWithAudio = chunks.filter(c => c.audioFilePath);
      console.log(`📊 Chunks with audio paths: ${chunksWithAudio.length}`);

      if (chunksWithAudio.length > 0) {
        console.log(`🔗 First audio path: ${chunksWithAudio[0].audioFilePath}`);
        console.log(`🔗 Last audio path: ${chunksWithAudio[chunksWithAudio.length - 1].audioFilePath}`);
        console.log(`🎵 Audio provider: ${chunksWithAudio[0].audioProvider || 'unknown'}`);
      }

      // Check Supabase storage patterns
      const storagePatterns = [
        `${book.id}/a1/`,
        `${book.id}/A1/`,
        `${book.id.replace('-A1', '')}/a1/`,
        `${book.id.replace('-A1', '')}/A1/`,
        `audio/${book.name.toLowerCase().replace(/[^\w]/g, '-')}/`,
        `audio/${book.id}/`
      ];

      console.log('\n🗂️  Checking Supabase storage patterns:');
      for (const pattern of storagePatterns) {
        try {
          const { data: files, error } = await supabase.storage
            .from('audio-files')
            .list(pattern, { limit: 10 });

          if (!error && files && files.length > 0) {
            console.log(`  ✅ Found ${files.length} files in: ${pattern}`);
            console.log(`     First file: ${files[0].name}`);
          } else {
            console.log(`  ❌ No files in: ${pattern}`);
          }
        } catch (error) {
          console.log(`  ⚠️  Error checking: ${pattern} - ${error.message}`);
        }
      }

      // Check if Romeo & Juliet uses Supabase storage format
      if (book.id === 'gutenberg-1513-A1') {
        console.log('\n🔍 Romeo & Juliet Supabase Pattern Check:');
        try {
          const { data: files, error } = await supabase.storage
            .from('audio-files')
            .list('gutenberg-1513-A1/a1/', { limit: 5 });

          console.log(`Supabase files found: ${files?.length || 0}`);
          if (files && files.length > 0) {
            console.log('Sample files:', files.slice(0, 3).map(f => f.name));
          }
        } catch (error) {
          console.log(`Error: ${error.message}`);
        }
      }
    }

    console.log('\n🏷️  Storage Path Analysis:');
    console.log('Romeo & Juliet: Uses Supabase storage (gutenberg-1513-A1/a1/chunk_X.mp3)');
    console.log('Jekyll & Hyde: Uses local public storage (/audio/jekyll-hyde-a1/bundle-XXX.mp3)');
    console.log('Sleepy Hollow: Unknown storage method');

    console.log('\n📋 Summary:');
    console.log('• Romeo & Juliet: Expected 749 files in Supabase, check actual count');
    console.log('• Jekyll & Hyde: Has 321 files locally, should be complete');
    console.log('• Sleepy Hollow: Need to investigate storage method and file count');

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  investigateAudioStorage().catch(console.error);
}

export { investigateAudioStorage };