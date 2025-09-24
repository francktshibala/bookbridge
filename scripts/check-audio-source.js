import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAudioSource() {
  console.log('🔍 Investigating audio-text vocabulary mismatch...\n');

  // 1. Get current simplified text from database
  const simplification = await prisma.bookSimplification.findFirst({
    where: {
      bookId: 'jane-eyre-scale-test-001',
      targetLevel: 'A1'
    },
    select: {
      simplifiedText: true,
      createdAt: true,
      updatedAt: true
    }
  });

  console.log('📚 Database Simplification:');
  console.log(`  Created: ${simplification?.createdAt}`);
  console.log(`  Updated: ${simplification?.updatedAt}`);
  console.log(`  First 200 chars: "${simplification?.simplifiedText?.substring(0, 200)}..."`);

  // 2. Check when audio bundles were created
  const { data: firstBundle } = await supabase
    .from('audio_assets')
    .select('created_at, audio_url')
    .eq('book_id', 'jane-eyre-scale-test-001')
    .eq('cefr_level', 'A1')
    .eq('sentence_index', 0)
    .single();

  console.log('\n🎵 Audio Generation:');
  console.log(`  Bundle 0 created: ${firstBundle?.created_at}`);
  console.log(`  Audio URL: ${firstBundle?.audio_url}`);

  // 3. Check bundle metadata for actual text used
  const { data: bundleWithText } = await supabase
    .from('audio_assets')
    .select('word_timings')
    .eq('book_id', 'jane-eyre-scale-test-001')
    .eq('cefr_level', 'A1')
    .eq('sentence_index', 0)
    .single();

  console.log('\n📝 Text Used for Audio (from bundle metadata):');
  if (bundleWithText?.word_timings && Array.isArray(bundleWithText.word_timings)) {
    bundleWithText.word_timings.forEach((s, i) => {
      console.log(`  Sentence ${i}: "${s.text}"`);
    });
  }

  // 4. Compare timing
  console.log('\n⚠️  Timeline Analysis:');
  const simplDate = new Date(simplification?.updatedAt || simplification?.createdAt);
  const audioDate = new Date(firstBundle?.created_at);

  if (simplDate > audioDate) {
    console.log('❌ PROBLEM FOUND: Simplification was updated AFTER audio generation!');
    console.log(`   Simplification: ${simplDate.toISOString()}`);
    console.log(`   Audio created:  ${audioDate.toISOString()}`);
    console.log('\n   This means the audio uses OLD text that no longer matches!');
  } else {
    console.log('✅ Audio was created after simplification');
  }

  // 5. Check for text processing differences
  console.log('\n🔄 Possible Text Processing Issues:');
  console.log('1. Audio generation might have used direct OpenAI output');
  console.log('2. Display text might have been post-processed');
  console.log('3. Sentence splitting logic differs between generation and display');

  // 6. Solution
  console.log('\n💡 SOLUTION:');
  console.log('The audio bundles need to be REGENERATED using the current simplified text.');
  console.log('The text stored in bundle metadata must be used for display to ensure sync.');

  await prisma.$disconnect();
}

checkAudioSource().catch(console.error);