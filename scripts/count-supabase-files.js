#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function countFiles(path) {
  let allFiles = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data: files, error } = await supabase.storage
      .from('audio-files')
      .list(path, {
        limit: limit,
        offset: offset,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error(`Error listing files in ${path}:`, error);
      break;
    }

    if (!files || files.length === 0) {
      break;
    }

    allFiles = allFiles.concat(files);

    if (files.length < limit) {
      break;
    }

    offset += limit;
  }

  return allFiles;
}

async function main() {
  console.log('🔍 Counting Supabase Storage Files\n');

  const paths = [
    'gutenberg-1513-A1/a1/', // Romeo & Juliet
    'gutenberg-43/a1/',      // Jekyll & Hyde alternative path
    'gutenberg-41/a1/'       // Sleepy Hollow check
  ];

  for (const path of paths) {
    console.log(`📁 Checking: ${path}`);
    const files = await countFiles(path);
    console.log(`   Files found: ${files.length}`);

    if (files.length > 0) {
      console.log(`   First file: ${files[0].name}`);
      console.log(`   Last file: ${files[files.length - 1].name}`);

      // Show some sample file names to understand the pattern
      if (files.length > 5) {
        console.log(`   Sample files: ${files.slice(0, 3).map(f => f.name).join(', ')}`);
      }
    }
    console.log('');
  }
}

main().catch(console.error);