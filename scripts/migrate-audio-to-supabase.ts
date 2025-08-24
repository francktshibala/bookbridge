import { createClient } from '@supabase/supabase-js';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface MigrationStats {
  totalFiles: number;
  successfulUploads: number;
  failures: number;
  skipped: number;
}

async function migrateAudioToSupabase() {
  try {
    console.log('🚀 Starting audio migration to Supabase Storage...\n');
    
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing required environment variables');
    }
    
    // Create service role client
    const supabase = createClient(supabaseUrl, serviceKey);
    
    const stats: MigrationStats = {
      totalFiles: 0,
      successfulUploads: 0,
      failures: 0,
      skipped: 0
    };
    
    // Get all chunks with local audio files
    console.log('📋 Finding chunks with local audio files...');
    const chunksWithAudio = await prisma.bookChunk.findMany({
      where: {
        bookId: 'gutenberg-1342',
        audioFilePath: { 
          not: null,
          startsWith: '/audio/' // Local file paths
        }
      },
      select: {
        id: true,
        cefrLevel: true,
        chunkIndex: true,
        audioFilePath: true
      },
      orderBy: [
        { cefrLevel: 'asc' },
        { chunkIndex: 'asc' }
      ]
    });
    
    console.log(`📊 Found ${chunksWithAudio.length} chunks with local audio files\n`);
    stats.totalFiles = chunksWithAudio.length;
    
    if (chunksWithAudio.length === 0) {
      console.log('✅ No local audio files found to migrate');
      return;
    }
    
    // Process chunks by level for organized output
    const chunksByLevel = chunksWithAudio.reduce((acc, chunk) => {
      if (!acc[chunk.cefrLevel]) acc[chunk.cefrLevel] = [];
      acc[chunk.cefrLevel].push(chunk);
      return acc;
    }, {} as Record<string, typeof chunksWithAudio>);
    
    for (const [level, chunks] of Object.entries(chunksByLevel)) {
      console.log(`🔄 Migrating ${level} level (${chunks.length} files)...`);
      
      for (const chunk of chunks) {
        const localPath = path.join(process.cwd(), 'public', chunk.audioFilePath!);
        
        // Check if local file exists
        if (!fs.existsSync(localPath)) {
          console.log(`⚠️  Skipping ${chunk.cefrLevel}/chunk_${chunk.chunkIndex}: local file not found`);
          stats.skipped++;
          continue;
        }
        
        try {
          // Read local audio file
          const audioBuffer = fs.readFileSync(localPath);
          
          // Generate Supabase filename (maintain original structure)
          const fileName = `${chunk.cefrLevel.toLowerCase()}/chunk_${chunk.chunkIndex}.mp3`;
          
          console.log(`   📤 Uploading ${fileName}...`);
          
          // Upload to Supabase Storage
          const { data, error } = await supabase.storage
            .from('audio-files')
            .upload(fileName, audioBuffer, {
              contentType: 'audio/mp3',
              cacheControl: '2592000', // 30 days cache
              upsert: false
            });
            
          if (error) {
            console.error(`   ❌ Upload failed for ${fileName}:`, error.message);
            stats.failures++;
            continue;
          }
          
          // Get CDN URL
          const { data: { publicUrl } } = supabase.storage
            .from('audio-files')
            .getPublicUrl(data.path);
            
          // Update database with Supabase URL
          await prisma.bookChunk.update({
            where: { id: chunk.id },
            data: { audioFilePath: publicUrl }
          });
          
          console.log(`   ✅ Migrated ${fileName} -> ${publicUrl.substring(0, 80)}...`);
          stats.successfulUploads++;
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`   ❌ Failed to migrate ${chunk.cefrLevel}/chunk_${chunk.chunkIndex}:`, error);
          stats.failures++;
        }
      }
      
      console.log(`✅ Completed ${level} level migration\n`);
    }
    
    // Print migration summary
    console.log('\n📊 Migration Summary:');
    console.log(`   Total files: ${stats.totalFiles}`);
    console.log(`   ✅ Successfully migrated: ${stats.successfulUploads}`);
    console.log(`   ❌ Failed: ${stats.failures}`);
    console.log(`   ⚠️  Skipped: ${stats.skipped}`);
    
    if (stats.successfulUploads > 0) {
      console.log('\n🌍 All migrated audio files are now available globally via Supabase CDN!');
      console.log('🎯 Users worldwide (including Africa) will experience instant audio playback');
    }
    
    if (stats.failures > 0) {
      console.log(`\n⚠️  ${stats.failures} files failed to migrate. Check error messages above.`);
      process.exit(1);
    }
    
    console.log('\n🎉 Audio migration to Supabase Storage completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  migrateAudioToSupabase();
}

export { migrateAudioToSupabase };