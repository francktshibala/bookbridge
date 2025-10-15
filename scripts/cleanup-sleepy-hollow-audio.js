import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables from .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)="?([^"]+)"?$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BOOK_ID = 'sleepy-hollow-enhanced';

async function cleanupSleepyHollowAudio() {
  console.log('🧹 Cleaning up Sleepy Hollow audio files and database records...');

  try {
    // 1. Delete audio assets from database
    console.log('📊 Deleting audio_assets records...');
    const { count: audioCount } = await supabase
      .from('audio_assets')
      .delete()
      .eq('book_id', BOOK_ID);

    console.log(`✅ Deleted ${audioCount || 0} audio asset records from database`);

    // 2. Delete audio files from Supabase storage
    console.log('🗂️ Deleting audio files from storage...');

    // List all CEFR levels
    const levels = ['B1', 'B2', 'A1', 'A2', 'C1', 'C2'];

    for (const level of levels) {
      const folderPath = `${BOOK_ID}/${level}`;

      // List all files in this level folder
      const { data: files, error: listError } = await supabase.storage
        .from('audio-files')
        .list(folderPath, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (listError) {
        console.warn(`⚠️ Could not list files for ${folderPath}: ${listError.message}`);
        continue;
      }

      if (files && files.length > 0) {
        // Delete files in this folder
        const filesToDelete = files.map(file => `${folderPath}/${file.name}`);

        console.log(`Found ${filesToDelete.length} files in ${folderPath}`);

        const { error: deleteError } = await supabase.storage
          .from('audio-files')
          .remove(filesToDelete);

        if (deleteError) {
          console.error(`❌ Error deleting files from ${folderPath}: ${deleteError.message}`);
        } else {
          console.log(`✅ Deleted ${filesToDelete.length} audio files from ${folderPath}`);
        }
      } else {
        console.log(`ℹ️ No files found in ${folderPath}`);
      }
    }

    // 3. Clean up temp directories
    console.log('📁 Cleaning up temp directories...');
    const tempDir = '/tmp/sleepy-hollow-bundles';
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`✅ Deleted temp directory: ${tempDir}`);
    } else {
      console.log('ℹ️ No temp directory found');
    }

    // 4. Kill any running bundle generation processes
    console.log('🔍 Checking for running generation processes...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('ps aux | grep -E "generate-sleepy-hollow" | grep -v grep');
      if (stdout.trim()) {
        console.warn('⚠️ Found running generation processes:');
        console.warn(stdout);

        // Extract PIDs and kill them
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const parts = line.split(/\s+/);
          const pid = parts[1];
          if (pid) {
            try {
              await execAsync(`kill ${pid}`);
              console.log(`✅ Killed process ${pid}`);
            } catch (e) {
              // Process might have already ended
            }
          }
        }
      } else {
        console.log('✅ No running generation processes found');
      }
    } catch (error) {
      // No processes found (grep returns error when no matches)
      console.log('✅ No running generation processes found');
    }

    console.log('');
    console.log('🎉 Sleepy Hollow audio cleanup complete!');
    console.log('');
    console.log('📋 Next steps to regenerate from scratch:');
    console.log('source .env.local && CEFR_LEVEL=B1 node scripts/generate-sleepy-hollow-bundles.js');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanupSleepyHollowAudio()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });