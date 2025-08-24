const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const prisma = new PrismaClient();

(async () => {
  console.log('=== A1/A2 AUDIO MIGRATION STATUS CHECK ===');
  console.log('Book: Pride & Prejudice (gutenberg-1342)\n');
  
  try {
    // Check book_chunks for A1 and A2 audio file paths using Prisma
    const chunks = await prisma.bookChunk.findMany({
      where: {
        bookId: 'gutenberg-1342',
        cefrLevel: {
          in: ['A1', 'A2']
        }
      },
      select: {
        id: true,
        bookId: true,
        cefrLevel: true,
        chunkIndex: true,
        audioFilePath: true,
        audioProvider: true,
        audioVoiceId: true
      },
      orderBy: [
        { cefrLevel: 'asc' },
        { chunkIndex: 'asc' }
      ]
    });
    
    if (!chunks || chunks.length === 0) {
      console.log('❌ No A1 or A2 chunks found for gutenberg-1342');
      return;
    }
    
    console.log(`📊 Total A1/A2 chunks found: ${chunks.length}`);
    
    // Analyze audio file paths
    const pathAnalysis = {
      supabaseUrls: [],
      localPaths: [],
      nullPaths: [],
      other: []
    };
    
    chunks.forEach(chunk => {
      if (!chunk.audioFilePath) {
        pathAnalysis.nullPaths.push(chunk);
      } else if (chunk.audioFilePath.startsWith('https://') && chunk.audioFilePath.includes('supabase.co')) {
        pathAnalysis.supabaseUrls.push(chunk);
      } else if (chunk.audioFilePath.startsWith('/audio/') || chunk.audioFilePath.startsWith('./audio/')) {
        pathAnalysis.localPaths.push(chunk);
      } else {
        pathAnalysis.other.push(chunk);
      }
    });
    
    // Group by CEFR level
    const byLevel = { A1: [], A2: [] };
    chunks.forEach(chunk => {
      if (byLevel[chunk.cefrLevel]) {
        byLevel[chunk.cefrLevel].push(chunk);
      }
    });
    
    console.log('\n📈 Chunks by CEFR level:');
    Object.keys(byLevel).forEach(level => {
      console.log(`  ${level}: ${byLevel[level].length} chunks`);
    });
    
    console.log('\n🔍 Audio File Path Analysis:');
    console.log(`  📁 Local paths (/audio/...): ${pathAnalysis.localPaths.length}`);
    console.log(`  ☁️  Supabase URLs: ${pathAnalysis.supabaseUrls.length}`);
    console.log(`  ❌ No audio path: ${pathAnalysis.nullPaths.length}`);
    console.log(`  ❓ Other paths: ${pathAnalysis.other.length}`);
    
    // Show migration status
    const totalWithAudio = pathAnalysis.supabaseUrls.length + pathAnalysis.localPaths.length + pathAnalysis.other.length;
    const migrationStatus = pathAnalysis.supabaseUrls.length / totalWithAudio;
    
    console.log('\n🚀 Migration Status:');
    console.log(`  Total chunks with audio: ${totalWithAudio}`);
    console.log(`  Migrated to Supabase: ${pathAnalysis.supabaseUrls.length} (${Math.round(migrationStatus * 100)}%)`);
    console.log(`  Still local: ${pathAnalysis.localPaths.length}`);
    
    if (migrationStatus === 1) {
      console.log('  ✅ MIGRATION COMPLETE - All audio files are on Supabase!');
    } else if (migrationStatus > 0) {
      console.log('  🟡 PARTIAL MIGRATION - Some files still local');
    } else {
      console.log('  ❌ NO MIGRATION - All files are still local paths');
    }
    
    // Show sample audio file paths
    console.log('\n📄 Sample Audio File Paths:');
    
    if (pathAnalysis.supabaseUrls.length > 0) {
      console.log('\n  ☁️  Supabase URLs (sample):');
      pathAnalysis.supabaseUrls.slice(0, 3).forEach(chunk => {
        console.log(`    ${chunk.cefrLevel} chunk ${chunk.chunkIndex}: ${chunk.audioFilePath.substring(0, 80)}...`);
      });
    }
    
    if (pathAnalysis.localPaths.length > 0) {
      console.log('\n  📁 Local paths (sample):');
      pathAnalysis.localPaths.slice(0, 3).forEach(chunk => {
        console.log(`    ${chunk.cefrLevel} chunk ${chunk.chunkIndex}: ${chunk.audioFilePath}`);
      });
    }
    
    if (pathAnalysis.nullPaths.length > 0) {
      console.log('\n  ❌ Chunks without audio:');
      pathAnalysis.nullPaths.slice(0, 5).forEach(chunk => {
        console.log(`    ${chunk.cefrLevel} chunk ${chunk.chunkIndex}: NULL`);
      });
      if (pathAnalysis.nullPaths.length > 5) {
        console.log(`    ... and ${pathAnalysis.nullPaths.length - 5} more`);
      }
    }
    
    // Detailed breakdown by level
    console.log('\n📋 Detailed Breakdown by Level:');
    ['A1', 'A2'].forEach(level => {
      const levelChunks = byLevel[level] || [];
      const levelSupabase = levelChunks.filter(c => c.audioFilePath && c.audioFilePath.includes('supabase.co')).length;
      const levelLocal = levelChunks.filter(c => c.audioFilePath && (c.audioFilePath.startsWith('/audio/') || c.audioFilePath.startsWith('./audio/'))).length;
      const levelNull = levelChunks.filter(c => !c.audioFilePath).length;
      
      console.log(`\n  ${level} Level:`);
      console.log(`    Total chunks: ${levelChunks.length}`);
      console.log(`    Supabase URLs: ${levelSupabase}`);
      console.log(`    Local paths: ${levelLocal}`);
      console.log(`    No audio: ${levelNull}`);
      
      if (levelChunks.length > 0) {
        const migrated = levelSupabase / (levelSupabase + levelLocal + levelNull);
        console.log(`    Migration: ${Math.round(migrated * 100)}% complete`);
      }
    });
    
  } catch (err) {
    console.error('❌ Script error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();