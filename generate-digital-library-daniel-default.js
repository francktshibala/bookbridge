import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BOOK_ID = 'digital-library-test';
const DANIEL_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'; // Daniel voice (male, clear)

async function generateDanielDefaultAudio() {
  console.log('🎵 Generating Daniel voice with DEFAULT ElevenLabs settings...');
  console.log('🎯 Using NO custom voice parameters - just Daniel voice defaults');

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
      console.log('❌ No bundles found');
      return;
    }

    console.log(`📚 Found ${bundles.length} bundles to regenerate with default Daniel voice`);

    // Process each bundle
    for (const bundle of bundles) {
      console.log(`\n🎙️ Processing Bundle ${bundle.chunkIndex}...`);
      console.log(`Text: "${bundle.chunkText.substring(0, 80)}..."`);
      console.log(`Word count: ${bundle.wordCount} words`);

      try {
        // Generate audio with ElevenLabs Daniel voice - DEFAULT SETTINGS
        console.log('🎯 Generating with ElevenLabs Daniel voice (default settings)...');
        const audioBuffer = await generateElevenLabsAudio(bundle.chunkText);

        // Calculate actual audio duration
        const actualDuration = getAudioDuration(audioBuffer);
        console.log(`🎵 Actual audio duration: ${actualDuration.toFixed(2)}s`);

        // Upload to Supabase Storage (overwrite existing)
        const fileName = `bundle_${bundle.chunkIndex}.mp3`;
        const filePath = `${BOOK_ID}/A2/daniel/${fileName}`;

        console.log(`📤 Uploading to Supabase: ${filePath}`);
        const { error: uploadError } = await supabase.storage
          .from('audio-files')
          .upload(filePath, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true // Overwrite existing
          });

        if (uploadError) {
          console.error(`❌ Upload failed for Bundle ${bundle.chunkIndex}:`, uploadError);
          continue;
        }

        console.log(`✅ Bundle ${bundle.chunkIndex} generated successfully with default Daniel voice`);
        console.log(`   Audio URL: https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/${filePath}`);
        console.log(`   Duration: ${actualDuration.toFixed(1)}s`);

        // Rate limiting to prevent API overload
        if (bundle.chunkIndex < bundles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`❌ Error generating audio for Bundle ${bundle.chunkIndex}:`, error);

        if (error.message.includes('rate limit') || error.message.includes('timeout')) {
          console.log('⏳ Rate limited, waiting 30 seconds...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          continue;
        }
      }
    }

    console.log('\n🎉 Daniel voice (default settings) audio generation complete!');
    console.log('💡 Maya\'s story now has Daniel voice with default ElevenLabs parameters');
    console.log('🎯 Test: Should have perfect sync like your other 5 Featured Books');

  } catch (error) {
    console.error('❌ Error in audio generation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function generateElevenLabsAudio(text) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${DANIEL_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1', // Use standard model (same as your working books)
      // NO voice_settings - use defaults
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function getAudioDuration(audioBuffer) {
  // Quick estimation based on MP3 bitrate
  const bitrate = 128000; // bits per second
  const bytes = audioBuffer.length;
  const bits = bytes * 8;
  const duration = bits / bitrate;

  console.log(`🎵 Audio size: ${bytes} bytes, estimated duration: ${duration.toFixed(2)}s`);
  return duration;
}

generateDanielDefaultAudio();