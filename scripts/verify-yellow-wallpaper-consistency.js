#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function verifyYellowWallpaperConsistency() {
  try {
    console.log('🔍 Comprehensive Yellow Wallpaper Bundle Verification\n');
    console.log('=' .repeat(60));

    // Load cache file (source of audio generation)
    const cacheFile = './cache/yellow-wallpaper-a1-bundles.json';
    if (!fs.existsSync(cacheFile)) {
      console.log('❌ Cache file not found:', cacheFile);
      return;
    }

    const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    console.log(`📦 Cache contains ${cacheData.bundles.length} bundles\n`);

    // Get all database bundles
    const dbBundles = await prisma.bookChunk.findMany({
      where: {
        bookId: 'gutenberg-1952-A1',
        cefrLevel: 'A1'
      },
      orderBy: { chunkIndex: 'asc' }
    });
    console.log(`💾 Database contains ${dbBundles.length} bundles\n`);

    // Verification results
    let matchCount = 0;
    let mismatchCount = 0;
    const mismatches = [];

    console.log('Comparing bundles...\n');

    // Compare each bundle
    for (const dbBundle of dbBundles) {
      const cacheBundle = cacheData.bundles.find(b => b.bundleIndex === dbBundle.chunkIndex);

      if (!cacheBundle) {
        console.log(`❌ Bundle ${dbBundle.chunkIndex}: Not found in cache`);
        mismatchCount++;
        continue;
      }

      // Get text from both sources
      const dbText = dbBundle.chunkText;
      const cacheText = cacheBundle.sentences.map(s => s.text).join(' ');

      if (dbText === cacheText) {
        matchCount++;
      } else {
        mismatchCount++;
        mismatches.push({
          bundleIndex: dbBundle.chunkIndex,
          dbText: dbText,
          cacheText: cacheText,
          audioFile: dbBundle.audioFilePath
        });

        // Show first 3 mismatches in detail
        if (mismatches.length <= 3) {
          console.log(`❌ Bundle ${dbBundle.chunkIndex} MISMATCH:`);
          console.log(`   DB:    "${dbText.substring(0, 80)}..."`);
          console.log(`   Cache: "${cacheText.substring(0, 80)}..."`);
          console.log();
        }
      }
    }

    // Final Report
    console.log('=' .repeat(60));
    console.log('📊 VERIFICATION REPORT\n');
    console.log(`Total bundles checked: ${dbBundles.length}`);
    console.log(`✅ Matches: ${matchCount} (${(matchCount/dbBundles.length*100).toFixed(1)}%)`);
    console.log(`❌ Mismatches: ${mismatchCount} (${(mismatchCount/dbBundles.length*100).toFixed(1)}%)`);

    if (mismatchCount > 0) {
      console.log(`\n⚠️  Found ${mismatchCount} bundles with text mismatches!`);
      console.log('These bundles have different text in DB vs cache (audio source).');

      // Save detailed mismatch report
      const reportFile = './cache/yellow-wallpaper-mismatch-report.json';
      fs.writeFileSync(reportFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
          totalBundles: dbBundles.length,
          matches: matchCount,
          mismatches: mismatchCount
        },
        mismatches: mismatches
      }, null, 2));

      console.log(`\n📝 Detailed report saved to: ${reportFile}`);

      // Recommendation
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      if (mismatchCount <= 10) {
        console.log('1. Few mismatches - regenerate audio for affected bundles only');
      } else {
        console.log('1. Many mismatches - choose one approach:');
        console.log('   a) Update DB to match cache (preserves existing audio)');
        console.log('   b) Regenerate ALL audio from current DB text');
      }
      console.log('2. Implement content hashing to prevent future mismatches');
    } else {
      console.log('\n✅ Perfect consistency! All bundles match between DB and cache.');
    }

    // Check audio files existence
    console.log('\n🎵 Audio File Check:');
    const bundlesWithAudio = dbBundles.filter(b => b.audioFilePath).length;
    const bundlesWithoutAudio = dbBundles.filter(b => !b.audioFilePath).length;
    console.log(`Bundles with audio: ${bundlesWithAudio}`);
    console.log(`Bundles without audio: ${bundlesWithoutAudio}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyYellowWallpaperConsistency();