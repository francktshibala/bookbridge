import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BOOK_ID = 'jane-eyre-scale-test-001';
const SENTENCES_PER_BUNDLE = 4;

// Calculate real sentence timing based on actual audio duration
function calculateBundleTiming(sentences, totalDuration) {
  // Distribute duration proportionally based on text length
  const totalWords = sentences.reduce((sum, s) => sum + s.text.split(' ').length, 0);
  let currentTime = 0;

  return sentences.map(sentence => {
    const wordCount = sentence.text.split(' ').length;
    const sentenceDuration = (wordCount / totalWords) * totalDuration;
    const startTime = currentTime;
    const endTime = currentTime + sentenceDuration;

    currentTime = endTime;

    return {
      sentenceId: `s${sentence.index}`,
      sentenceIndex: sentence.index,
      text: sentence.text,
      startTime,
      endTime,
      wordTimings: []
    };
  });
}

async function fixBundleTiming() {
  console.log('🔧 Fixing Jane Eyre bundle timing metadata...');

  // Get simplified text
  const simplification = await prisma.bookSimplification.findFirst({
    where: {
      bookId: BOOK_ID,
      targetLevel: 'A1'
    }
  });

  if (!simplification) {
    throw new Error('No A1 simplification found');
  }

  // Split into sentences (same logic as generator)
  const sentences = [];
  const rawSentences = simplification.simplifiedText.split(/([.!?]+\s+)/);

  let currentSentence = '';
  for (let i = 0; i < rawSentences.length; i++) {
    currentSentence += rawSentences[i];

    if (/[.!?]+\s*$/.test(currentSentence) && currentSentence.trim().length > 20) {
      const trimmed = currentSentence.trim();
      if (!trimmed.startsWith('CHAPTER')) {
        sentences.push({
          index: sentences.length,
          text: trimmed
        });
      }
      currentSentence = '';
    }
  }

  console.log(`📝 Found ${sentences.length} sentences`);

  // Get all existing bundles
  let allBundles = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error } = await supabase
      .from('audio_assets')
      .select('*')
      .eq('book_id', BOOK_ID)
      .eq('cefr_level', 'A1')
      .eq('provider', 'openai-bundled')
      .order('sentence_index', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    if (batch && batch.length > 0) {
      allBundles = [...allBundles, ...batch];
      offset += limit;
      hasMore = batch.length === limit;
    } else {
      hasMore = false;
    }
  }

  console.log(`🔍 Found ${allBundles.length} bundles to fix`);

  // Fix timing for each bundle
  for (let i = 0; i < allBundles.length; i++) {
    const bundle = allBundles[i];
    const bundleIndex = bundle.sentence_index;

    // Get sentences for this bundle
    const bundleSentences = sentences.slice(
      bundleIndex * SENTENCES_PER_BUNDLE,
      (bundleIndex + 1) * SENTENCES_PER_BUNDLE
    );

    if (bundleSentences.length === 0) continue;

    // Use actual duration from audio metadata or estimate based on sentence count
    const estimatedDuration = bundleSentences.length * 2.5; // fallback
    const bundleTimings = calculateBundleTiming(bundleSentences, estimatedDuration);

    // Update bundle with real timing
    const { error: updateError } = await supabase
      .from('audio_assets')
      .update({
        word_timings: bundleTimings
      })
      .eq('id', bundle.id);

    if (updateError) {
      console.error(`❌ Failed to update bundle ${bundleIndex}:`, updateError);
    } else {
      if (i % 100 === 0) {
        console.log(`✅ Fixed ${i}/${allBundles.length} bundles...`);
      }
    }
  }

  console.log(`🎉 Fixed timing for all ${allBundles.length} bundles!`);
}

fixBundleTiming()
  .then(() => {
    console.log('✅ Bundle timing fix complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });