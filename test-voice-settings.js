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
const DANIEL_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9';

// Test 1: Safe Quick Test (GPT-5 Recommended)
const SAFE_QUICK_SETTINGS = {
  // All defaults + speed adjustment only
  speed: 0.90
};

async function generateSafeQuickTest() {
  console.log('🧪 TEST 1: Safe Quick Test (Defaults + Speed 0.90)');
  console.log('🎯 GPT-5 Recommendation: Minimal risk, slight tenderness improvement');

  try {
    // Get all bundles
    const bundles = await prisma.bookChunk.findMany({
      where: { bookId: BOOK_ID, cefrLevel: 'A2' },
      orderBy: { chunkIndex: 'asc' }
    });

    console.log(`📚 Testing with ${bundles.length} bundles...`);

    for (const bundle of bundles) {
      console.log(`\n🎙️ Bundle ${bundle.chunkIndex} - Safe Quick Test...`);

      try {
        const audioBuffer = await generateElevenLabsAudio(bundle.chunkText, SAFE_QUICK_SETTINGS);
        const actualDuration = getAudioDuration(audioBuffer);
        console.log(`🎵 Duration: ${actualDuration.toFixed(2)}s`);

        // Upload (overwrite existing)
        const filePath = `${BOOK_ID}/A2/daniel/bundle_${bundle.chunkIndex}.mp3`;
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

        console.log(`✅ Bundle ${bundle.chunkIndex} - Safe Quick Test complete`);

        // Rate limiting
        if (bundle.chunkIndex < bundles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`❌ Error with Bundle ${bundle.chunkIndex}:`, error.message);
      }
    }

    console.log('\n🎉 TEST 1 COMPLETE: Safe Quick Test (Defaults + Speed 0.90)');
    console.log('🧪 Test this now in the app - if sync works and voice sounds better, we found our solution!');
    console.log('📝 If not good enough, run: node test-voice-settings.js --test2');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function generateElevenLabsAudio(text, settings) {
  const body = {
    text: text,
    model_id: 'eleven_monolingual_v1'
  };

  // Only add voice_settings if we have custom settings
  if (Object.keys(settings).length > 0) {
    body.voice_settings = {
      stability: 0.5, // default
      similarity_boost: 0.75, // default
      style: 0.0, // default
      use_speaker_boost: true, // default
      ...settings // override with our test settings
    };
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${DANIEL_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    body: JSON.stringify(body)
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
  const duration = bits / bitrate;
  return duration;
}

generateSafeQuickTest();