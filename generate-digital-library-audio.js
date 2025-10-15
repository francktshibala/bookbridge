import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Use OpenAI for initial testing (most reliable)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const BOOK_ID = 'digital-library-test';

async function generateDigitalLibraryAudio() {
  console.log('🎵 Generating audio for "The Digital Library" test story...');

  try {
    // Get all bundles from BookChunk table
    const bundles = await prisma.bookChunk.findMany({
      where: {
        bookId: BOOK_ID,
        cefrLevel: 'A2'
      },
      orderBy: { chunkIndex: 'asc' }
    });

    if (!bundles || bundles.length === 0) {
      console.log('❌ No bundles found. Run create-test-story.js first');
      return;
    }

    console.log(`📚 Found ${bundles.length} bundles to generate audio for`);

    // Process each bundle
    for (const bundle of bundles) {
      console.log(`\n🎙️ Processing Bundle ${bundle.chunkIndex}...`);
      console.log(`Text: "${bundle.chunkText.substring(0, 80)}..."`);
      console.log(`Word count: ${bundle.wordCount} words`);

      try {
        // Generate audio with OpenAI TTS (Daniel-like voice)
        console.log('🎯 Generating audio with OpenAI TTS...');
        const mp3Response = await openai.audio.speech.create({
          model: 'tts-1-hd', // Higher quality model
          voice: 'onyx', // Male voice, deeper/more natural than alloy
          input: bundle.chunkText,
          speed: 0.9 // Slightly slower for clarity
        });

        const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());

        // Upload to Supabase Storage
        const fileName = `bundle_${bundle.chunkIndex}.mp3`;
        const filePath = `${BOOK_ID}/A2/test/${fileName}`;

        console.log(`📤 Uploading to Supabase: ${filePath}`);
        const { error: uploadError } = await supabase.storage
          .from('audio-files')
          .upload(filePath, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true
          });

        if (uploadError) {
          console.error(`❌ Upload failed for Bundle ${bundle.chunkIndex}:`, uploadError);
          continue;
        }

        // Estimate duration (for testing - real duration would need audio analysis)
        const estimatedDuration = bundle.wordCount * 0.4; // 0.4s per word

        console.log(`✅ Bundle ${bundle.chunkIndex} generated successfully`);
        console.log(`   Audio URL: https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/${filePath}`);
        console.log(`   Estimated duration: ${estimatedDuration.toFixed(1)}s`);

      } catch (error) {
        console.error(`❌ Error generating audio for Bundle ${bundle.chunkIndex}:`, error);
      }
    }

    console.log('\n🎉 Audio generation complete!');
    console.log('💡 Next steps:');
    console.log('   1. Test playback in the app');
    console.log('   2. Compare naturalness with Christmas Carol');
    console.log('   3. Document results for golden template');

  } catch (error) {
    console.error('❌ Error in audio generation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateDigitalLibraryAudio();