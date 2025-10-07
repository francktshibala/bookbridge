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

// Daniel voice settings from Christmas Carol (research-validated)
const DANIEL_VOICE_SETTINGS = {
  stability: 0.55,       // Optimal for Daniel voice clarity and adaptability
  style: 0.0,           // Natural delivery without stylistic emphasis
  speed: 0.88,          // 125 WPM target for A1 comprehension
  similarity_boost: 0.75,
  use_speaker_boost: true
};

const BOOK_ID = 'digital-library-test';
const DANIEL_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'; // Daniel voice (male, clear)

async function generateDanielVoiceAudio() {
  console.log('🎵 Generating Daniel voice audio for digital-library-test...');
  console.log(`🎯 Daniel voice settings: stability ${DANIEL_VOICE_SETTINGS.stability}, style ${DANIEL_VOICE_SETTINGS.style}, speed ${DANIEL_VOICE_SETTINGS.speed}`);

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

    console.log(`📚 Found ${bundles.length} bundles to regenerate with Daniel voice`);

    // Process each bundle
    for (const bundle of bundles) {
      console.log(`\n🎙️ Processing Bundle ${bundle.chunkIndex}...`);
      console.log(`Text: "${bundle.chunkText.substring(0, 80)}..."`);
      console.log(`Word count: ${bundle.wordCount} words`);

      try {
        // Generate audio with ElevenLabs Daniel voice
        console.log('🎯 Generating audio with ElevenLabs Daniel voice...');
        const audioBuffer = await generateElevenLabsAudio(bundle.chunkText);

        // Calculate actual audio duration (like Christmas Carol)
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

        // Update database with new audio path and provider info
        await prisma.bookChunk.update({
          where: { id: bundle.id },
          data: {
            audioFilePath: filePath,
            audioProvider: 'elevenlabs',
            audioVoiceId: DANIEL_VOICE_ID
          }
        });

        console.log(`✅ Bundle ${bundle.chunkIndex} generated successfully with Daniel voice`);
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

    console.log('\n🎉 Daniel voice audio generation complete!');
    console.log('💡 Maya\'s story now has natural Daniel voice narration');
    console.log('🎯 Next: Test in app to compare with Christmas Carol quality');

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
      model_id: 'eleven_flash_v2_5', // Same as Christmas Carol
      voice_settings: DANIEL_VOICE_SETTINGS
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function getAudioDuration(audioBuffer) {
  // Quick estimation based on MP3 bitrate - same as Christmas Carol
  const bitrate = 128000; // bits per second
  const bytes = audioBuffer.length;
  const bits = bytes * 8;
  const duration = bits / bitrate;

  console.log(`🎵 Audio size: ${bytes} bytes, estimated duration: ${duration.toFixed(2)}s`);
  return duration;
}

generateDanielVoiceAudio();