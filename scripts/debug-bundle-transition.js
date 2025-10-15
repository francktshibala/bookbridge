import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugBundleTransition() {
  console.log('🔍 Debugging bundle transition issue (audio stops after 6-7 sentences)...\n');

  // Get first 3 bundles to check the transition
  const { data: bundles } = await supabase
    .from('audio_assets')
    .select('sentence_index, audio_url, word_timings')
    .eq('book_id', 'jane-eyre-scale-test-001')
    .eq('cefr_level', 'A1')
    .in('sentence_index', [0, 1, 2])
    .order('sentence_index');

  if (!bundles) {
    console.error('Failed to load bundles');
    return;
  }

  console.log('📦 Bundle structure analysis:\n');

  let totalSentences = 0;
  for (const bundle of bundles) {
    console.log(`Bundle ${bundle.sentence_index}:`);
    console.log(`  Audio URL: ${bundle.audio_url}`);

    if (bundle.word_timings && Array.isArray(bundle.word_timings)) {
      console.log(`  Sentences in bundle: ${bundle.word_timings.length}`);

      bundle.word_timings.forEach((s, i) => {
        totalSentences++;
        const hasText = s.text && s.text.trim().length > 0;
        const textPreview = hasText ? s.text.substring(0, 40) : 'MISSING';
        const timing = `${s.startTime?.toFixed(1) || '?'}-${s.endTime?.toFixed(1) || '?'}s`;

        console.log(`    ${totalSentences}. [${timing}] ${hasText ? '✅' : '❌'} "${textPreview}..."`);

        // Check for issues
        if (!hasText) {
          console.log(`      ⚠️  MISSING TEXT!`);
        }
        if (!s.startTime || !s.endTime) {
          console.log(`      ⚠️  MISSING TIMING!`);
        }
        if (s.text && s.text.includes('undefined')) {
          console.log(`      ⚠️  TEXT CONTAINS 'undefined'!`);
        }
      });
    } else {
      console.log(`  ❌ NO SENTENCE DATA!`);
    }
    console.log('');
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Total sentences shown: ${totalSentences}`);
  console.log(`  Expected: 12 (3 bundles × 4 sentences)`);

  if (totalSentences === 8) {
    console.log(`\n⚠️  PROBLEM: Bundle 1 is missing or incomplete!`);
    console.log(`  This explains why audio stops after 6-7 sentences.`);
    console.log(`  Bundle 0 plays (4 sentences), then Bundle 1 fails.`);
  }

  // Check for gaps in bundle sequence
  const { data: allBundleIds } = await supabase
    .from('audio_assets')
    .select('sentence_index')
    .eq('book_id', 'jane-eyre-scale-test-001')
    .eq('cefr_level', 'A1')
    .order('sentence_index')
    .limit(10);

  console.log('\n🔢 Bundle sequence (first 10):');
  console.log(allBundleIds?.map(b => b.sentence_index).join(', '));

  // Check if bundles are missing
  const expectedSequence = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const actualSequence = allBundleIds?.map(b => b.sentence_index) || [];
  const missing = expectedSequence.filter(n => !actualSequence.includes(n));

  if (missing.length > 0) {
    console.log(`\n❌ MISSING BUNDLES: ${missing.join(', ')}`);
    console.log('This would cause audio to stop when trying to play missing bundle!');
  }
}

debugBundleTransition().catch(console.error);