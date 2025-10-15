import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BOOK_ID = 'jane-eyre-scale-test-001';

async function restoreOriginalText() {
  console.log('🔄 Restoring original text from audio bundles to ensure perfect sync...\n');

  // Get all bundles with their text
  let allBundles = [];
  let offset = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error } = await supabase
      .from('audio_assets')
      .select('sentence_index, word_timings')
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

  console.log(`📦 Found ${allBundles.length} bundles with text`);

  // Reconstruct the original text from bundles
  let reconstructedText = '';
  let totalSentences = 0;

  for (const bundle of allBundles) {
    if (bundle.word_timings && Array.isArray(bundle.word_timings)) {
      for (const sentence of bundle.word_timings) {
        if (sentence.text) {
          reconstructedText += sentence.text;
          // Add space if sentence doesn't end with punctuation
          if (!/[.!?]\s*$/.test(sentence.text)) {
            reconstructedText += ' ';
          } else if (!sentence.text.endsWith(' ')) {
            reconstructedText += ' ';
          }
          totalSentences++;
        }
      }
    }
  }

  console.log(`✅ Reconstructed ${totalSentences} sentences from bundles`);
  console.log(`📝 Text length: ${reconstructedText.length} characters`);
  console.log(`\nFirst 500 chars: "${reconstructedText.substring(0, 500)}..."`);

  // Update the database with the original text that matches audio
  const result = await prisma.bookSimplification.update({
    where: {
      id: (await prisma.bookSimplification.findFirst({
        where: { bookId: BOOK_ID, targetLevel: 'A1' }
      }))?.id
    },
    data: {
      simplifiedText: reconstructedText.trim(),
      updatedAt: new Date()
    }
  });

  console.log('\n✅ Database updated with original text that matches audio!');
  console.log('🎉 Audio and text should now be perfectly synchronized');

  await prisma.$disconnect();
}

restoreOriginalText()
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });