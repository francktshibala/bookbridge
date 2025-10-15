import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DANIEL_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9';
const BOOK_ID = 'digital-library-test-2'; // M2 card

// GPT-5 Test 1: Model upgrade with speed 0.90
const MODEL_UPGRADE_SETTINGS = {
  stability: 0.5,        // default
  similarity_boost: 0.75, // default
  style: 0.0,            // default
  speed: 0.90,           // our working speed
  use_speaker_boost: true
};

async function testModelUpgrade() {
  console.log('🧪 GPT-5 TEST 1: Model Upgrade (eleven_flash_v2_5)');
  console.log('🎯 Testing: eleven_flash_v2_5 + speed 0.90 + default params');
  console.log('📝 Goal: Better quality without breaking sync');

  try {
    const bundles = await prisma.bookChunk.findMany({
      where: { bookId: BOOK_ID, cefrLevel: 'A2' },
      orderBy: { chunkIndex: 'asc' }
    });

    console.log(`📚 Testing model upgrade on ${bundles.length} bundles...`);

    for (const bundle of bundles) {
      console.log(`\n🎙️ Bundle ${bundle.chunkIndex} - Model Upgrade Test...`);

      try {
        const audioBuffer = await generateElevenLabsAudio(bundle.chunkText);
        const actualDuration = getAudioDuration(audioBuffer);
        console.log(`🎵 Duration: ${actualDuration.toFixed(2)}s`);

        // Upload (overwrite existing broken style audio)
        const filePath = `digital-library-test-2/A2/speed-style/bundle_${bundle.chunkIndex}.mp3`;
        const { error } = await supabase.storage
          .from('audio-files')
          .upload(filePath, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true
          });

        if (error) {
          console.error(`❌ Upload failed:`, error);
          continue;
        }

        console.log(`✅ Bundle ${bundle.chunkIndex} - Model upgrade complete`);

        // Rate limiting
        if (bundle.chunkIndex < bundles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`❌ Error with Bundle ${bundle.chunkIndex}:`, error.message);
      }
    }

    console.log('\n🎉 MODEL UPGRADE TEST COMPLETE!');
    console.log('🧪 M2 now has: eleven_flash_v2_5 + speed 0.90 + defaults');
    console.log('🎯 Test sync and quality - if better than M1, we found our upgrade!');
    console.log('📝 If sync breaks: Revert to eleven_monolingual_v1');

  } catch (error) {
    console.error('❌ Error:', error);
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
      model_id: 'eleven_flash_v2_5', // GPT-5 recommended upgrade
      voice_settings: MODEL_UPGRADE_SETTINGS
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function getAudioDuration(audioBuffer) {
  const bitrate = 128000;
  const bytes = audioBuffer.length;
  const bits = bytes * 8;
  return bits / bitrate;
}

testModelUpgrade();