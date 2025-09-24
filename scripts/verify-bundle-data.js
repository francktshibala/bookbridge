import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyBundleData() {
  console.log('🔍 Verifying bundle data integrity...\n');

  // Get a few sample bundles
  const { data: samples } = await supabase
    .from('audio_assets')
    .select('sentence_index, audio_url, word_timings')
    .eq('book_id', 'jane-eyre-scale-test-001')
    .eq('cefr_level', 'A1')
    .in('sentence_index', [0, 1, 2, 10, 100, 500, 1000, 2000])
    .order('sentence_index');

  if (!samples || samples.length === 0) {
    console.error('❌ No bundles found!');
    return;
  }

  console.log(`📦 Checking ${samples.length} sample bundles:\n`);

  for (const bundle of samples) {
    console.log(`Bundle ${bundle.sentence_index}:`);

    if (!bundle.word_timings || !Array.isArray(bundle.word_timings)) {
      console.log('  ❌ MISSING word_timings array!');
      continue;
    }

    if (bundle.word_timings.length === 0) {
      console.log('  ❌ EMPTY word_timings array!');
      continue;
    }

    console.log(`  ✅ Has ${bundle.word_timings.length} sentences`);

    // Check each sentence in the bundle
    bundle.word_timings.forEach((sentence, idx) => {
      if (!sentence.text) {
        console.log(`    ❌ Sentence ${idx}: MISSING TEXT`);
      } else if (sentence.text.trim() === '') {
        console.log(`    ❌ Sentence ${idx}: EMPTY TEXT`);
      } else {
        console.log(`    ✅ Sentence ${idx}: "${sentence.text.substring(0, 50)}..."`);
      }
    });

    console.log('');
  }

  // Count total issues
  const { data: allBundles, error } = await supabase
    .from('audio_assets')
    .select('sentence_index, word_timings')
    .eq('book_id', 'jane-eyre-scale-test-001')
    .eq('cefr_level', 'A1')
    .order('sentence_index')
    .limit(100); // Check first 100 bundles

  if (allBundles) {
    let missingCount = 0;
    let emptyCount = 0;
    let missingTextCount = 0;

    allBundles.forEach(bundle => {
      if (!bundle.word_timings || !Array.isArray(bundle.word_timings)) {
        missingCount++;
      } else if (bundle.word_timings.length === 0) {
        emptyCount++;
      } else {
        bundle.word_timings.forEach(s => {
          if (!s.text || s.text.trim() === '') {
            missingTextCount++;
          }
        });
      }
    });

    console.log('📊 Summary of first 100 bundles:');
    console.log(`  - Bundles with missing metadata: ${missingCount}`);
    console.log(`  - Bundles with empty metadata: ${emptyCount}`);
    console.log(`  - Sentences with missing text: ${missingTextCount}`);

    if (missingCount > 0 || emptyCount > 0 || missingTextCount > 0) {
      console.log('\n⚠️  CRITICAL: Bundle metadata is corrupted or incomplete!');
      console.log('Need to re-run the fix-bundle-timing.js script or regenerate audio.');
    }
  }
}

verifyBundleData().catch(console.error);