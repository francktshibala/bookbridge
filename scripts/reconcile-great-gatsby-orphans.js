import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BOOK_ID = 'great-gatsby-a2';
const CEFR_LEVEL = 'A2';
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice

class OrphanReconciler {
  async reconcileOrphans() {
    console.log('🔍 Starting orphaned audio file reconciliation...');
    console.log(`📚 Book: ${BOOK_ID} (${CEFR_LEVEL} level)`);

    // Get simplified text for calculating sentences
    const cacheFile = './cache/great-gatsby-A2-simplified.json';
    if (!fs.existsSync(cacheFile)) {
      throw new Error('❌ Simplified cache not found.');
    }

    const simplifiedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const sentences = simplifiedData.map(s => s.simplifiedText);

    // Step 1: Get existing database records
    const existingChunks = await this.getExistingChunks();
    console.log(`📊 Found ${existingChunks.length} existing database records`);

    // Step 2: Get storage files
    const storageFiles = await this.getStorageFiles();
    console.log(`📁 Found ${storageFiles.length} files in storage`);

    // Step 3: Find orphans (files without DB records)
    const orphans = this.findOrphans(storageFiles, existingChunks);
    console.log(`🔍 Found ${orphans.length} orphaned files:`);
    orphans.forEach(orphan => console.log(`  - Bundle ${orphan.bundleIndex}: ${orphan.fileName}`));

    if (orphans.length === 0) {
      console.log('✅ No orphans found - all files have database records!');
      return;
    }

    // Step 4: Verify orphaned files
    console.log('\n🔍 Verifying orphaned files...');
    const verifiedOrphans = [];

    for (const orphan of orphans) {
      try {
        const isValid = await this.verifyAudioFile(orphan);
        if (isValid) {
          verifiedOrphans.push(orphan);
          console.log(`  ✅ Bundle ${orphan.bundleIndex}: Valid audio file`);
        } else {
          console.log(`  ❌ Bundle ${orphan.bundleIndex}: Invalid or corrupted`);
        }
      } catch (error) {
        console.log(`  ❌ Bundle ${orphan.bundleIndex}: Verification failed - ${error.message}`);
      }
    }

    if (verifiedOrphans.length === 0) {
      console.log('❌ No valid orphaned files found');
      return;
    }

    // Step 5: Create database records for verified orphans
    console.log(`\n💾 Creating database records for ${verifiedOrphans.length} verified orphans...`);

    for (const orphan of verifiedOrphans) {
      try {
        await this.createDatabaseRecord(orphan, sentences);
        console.log(`  ✅ Bundle ${orphan.bundleIndex}: Database record created`);
      } catch (error) {
        console.log(`  ❌ Bundle ${orphan.bundleIndex}: Failed to create record - ${error.message}`);
      }
    }

    console.log('\n🎉 Reconciliation complete!');
    console.log(`✅ Processed ${verifiedOrphans.length} orphaned files`);

    // Final verification
    const finalCount = await this.getExistingChunks();
    console.log(`📊 Total database records now: ${finalCount.length}/902`);
  }

  async getExistingChunks() {
    const chunks = await prisma.bookChunk.findMany({
      where: {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL
      },
      select: { chunkIndex: true }
    });
    return chunks.map(chunk => chunk.chunkIndex);
  }

  async getStorageFiles() {
    try {
      const { data: files, error } = await supabase.storage
        .from('audio-files')
        .list('great-gatsby', {
          limit: 1000
        });

      if (error) throw error;

      return files
        .filter(file => file.name.startsWith('gatsby-bundle-') && file.name.endsWith('.mp3'))
        .map(file => {
          const match = file.name.match(/gatsby-bundle-(\d+)\.mp3/);
          return {
            fileName: file.name,
            fullPath: `great-gatsby/${file.name}`,
            bundleIndex: match ? parseInt(match[1]) : -1,
            size: file.metadata?.size || 0
          };
        })
        .filter(file => file.bundleIndex >= 0)
        .sort((a, b) => a.bundleIndex - b.bundleIndex);
    } catch (error) {
      console.error('Error listing storage files:', error);
      return [];
    }
  }

  findOrphans(storageFiles, existingChunks) {
    const existingSet = new Set(existingChunks);
    return storageFiles.filter(file => !existingSet.has(file.bundleIndex));
  }

  async verifyAudioFile(orphan) {
    try {
      // Get file metadata from Supabase
      const { data, error } = await supabase.storage
        .from('audio-files')
        .download(orphan.fullPath);

      if (error) {
        console.log(`    ⚠️ Download error: ${error.message}`);
        return false;
      }

      // Check file size (should be > 4KB for valid audio)
      const fileSize = data.size;
      if (fileSize < 4096) {
        console.log(`    ⚠️ File too small: ${fileSize} bytes`);
        return false;
      }

      // Check if it's a valid audio file by reading the first few bytes
      const arrayBuffer = await data.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Check for MP3 header (ID3 or MP3 sync)
      const isMP3 = (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || // ID3
                    (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0); // MP3 sync

      if (!isMP3) {
        console.log(`    ⚠️ Not a valid MP3 file`);
        return false;
      }

      console.log(`    ✓ Valid MP3: ${(fileSize / 1024).toFixed(1)}KB`);
      return true;

    } catch (error) {
      console.log(`    ⚠️ Verification error: ${error.message}`);
      return false;
    }
  }

  async createDatabaseRecord(orphan, sentences) {
    // Calculate sentences for this bundle
    const sentenceStart = orphan.bundleIndex * 4;
    const sentenceEnd = Math.min(sentenceStart + 3, sentences.length - 1);
    const bundleSentences = sentences.slice(sentenceStart, sentenceStart + 4);
    const bundleText = bundleSentences.join(' ');

    // Create database record using upsert for safety
    await prisma.bookChunk.upsert({
      where: {
        bookId_cefrLevel_chunkIndex: {
          bookId: BOOK_ID,
          cefrLevel: CEFR_LEVEL,
          chunkIndex: orphan.bundleIndex
        }
      },
      update: {
        // Update if exists (shouldn't happen, but safe)
        chunkText: bundleText,
        wordCount: bundleText.split(/\s+/).length,
        audioFilePath: orphan.fullPath,
        audioProvider: 'elevenlabs',
        audioVoiceId: VOICE_ID,
        isSimplified: true
      },
      create: {
        // Create new record
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL,
        chunkIndex: orphan.bundleIndex,
        chunkText: bundleText,
        wordCount: bundleText.split(/\s+/).length,
        audioFilePath: orphan.fullPath,
        audioProvider: 'elevenlabs',
        audioVoiceId: VOICE_ID,
        isSimplified: true
      }
    });
  }
}

// Run the reconciler
const reconciler = new OrphanReconciler();
reconciler.reconcileOrphans()
  .then(() => {
    console.log('🎉 Reconciliation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Reconciliation failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });