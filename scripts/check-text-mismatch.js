import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTextMismatch() {
  console.log('🔍 Checking text mismatch between display and audio...\n');

  // Get the simplified text that's displayed
  const simplification = await prisma.bookSimplification.findFirst({
    where: {
      bookId: 'jane-eyre-scale-test-001',
      targetLevel: 'A1'
    }
  });

  if (!simplification) {
    console.error('No simplification found');
    return;
  }

  // Split display text into sentences (same logic as display)
  const displaySentences = simplification.simplifiedText
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s + '.');

  console.log(`📖 Display text has ${displaySentences.length} sentences`);
  console.log(`First 3 display sentences:`);
  displaySentences.slice(0, 3).forEach((s, i) => {
    console.log(`  ${i}: "${s}"`);
  });

  // Get the stored bundle metadata
  const { data: bundle0 } = await supabase
    .from('audio_assets')
    .select('word_timings')
    .eq('book_id', 'jane-eyre-scale-test-001')
    .eq('cefr_level', 'A1')
    .eq('sentence_index', 0)
    .single();

  console.log('\n🎵 Bundle 0 stored metadata:');
  if (bundle0?.word_timings && bundle0.word_timings.length > 0) {
    console.log(`Has ${bundle0.word_timings.length} sentences with timing`);
    bundle0.word_timings.forEach((s, i) => {
      console.log(`  ${i}: "${s.text}"`);
    });
  } else {
    console.log('  No sentence text in metadata (empty word_timings)');
  }

  // Check what text was used for audio generation
  console.log('\n⚠️  Text Mismatch Analysis:');
  console.log('The audio was generated from sentences split during bundle generation.');
  console.log('The display uses a different sentence splitting method.');
  console.log('This causes audio-text misalignment!\n');

  // Compare first few sentences
  if (bundle0?.word_timings && bundle0.word_timings.length > 0) {
    console.log('📊 Comparison (Bundle 0):');
    for (let i = 0; i < Math.min(4, bundle0.word_timings.length); i++) {
      const displayText = displaySentences[i] || 'N/A';
      const audioText = bundle0.word_timings[i].text || 'N/A';
      const match = displayText === audioText ? '✅' : '❌';
      console.log(`\n  Sentence ${i}: ${match}`);
      console.log(`    Display: "${displayText}"`);
      console.log(`    Audio:   "${audioText}"`);
    }
  }

  await prisma.$disconnect();
}

checkTextMismatch().catch(console.error);