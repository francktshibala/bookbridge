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

// Voice settings for comparison
const VOICE_CONFIGS = {
  'digital-library-test-2': {
    name: 'Speed + Style Test',
    settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.1,        // ADD STYLE for expressiveness
      speed: 0.90,       // Keep working speed
      use_speaker_boost: true
    },
    path: 'digital-library-test-2/A2/speed-style'
  },
  'digital-library-test-3': {
    name: 'Pure Default Test',
    settings: null, // No voice_settings = pure defaults
    path: 'digital-library-test-3/A2/default'
  }
};

async function generateComparisonAudio() {
  console.log('🎵 Generating comparison audio for voice testing...');
  console.log('📊 Test Configuration:');
  console.log('   - Test-2: Speed 0.90 + Style 0.1 (expressiveness)');
  console.log('   - Test-3: Pure ElevenLabs defaults');

  for (const [bookId, config] of Object.entries(VOICE_CONFIGS)) {
    console.log(`\n📚 Processing ${bookId} - ${config.name}...`);

    try {
      const bundles = await prisma.bookChunk.findMany({
        where: { bookId, cefrLevel: 'A2' },
        orderBy: { chunkIndex: 'asc' }
      });

      for (const bundle of bundles) {
        console.log(`\n🎙️ Bundle ${bundle.chunkIndex} - ${config.name}...`);

        const audioBuffer = await generateElevenLabsAudio(bundle.chunkText, config.settings);
        const duration = getAudioDuration(audioBuffer);

        console.log(`🎵 Duration: ${duration.toFixed(2)}s`);

        // Upload to unique path
        const filePath = `${config.path}/bundle_${bundle.chunkIndex}.mp3`;
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

        // Update database with audio info
        await prisma.bookChunk.update({
          where: { id: bundle.id },
          data: {
            audioFilePath: filePath,
            audioProvider: 'elevenlabs',
            audioVoiceId: DANIEL_VOICE_ID
          }
        });

        console.log(`✅ Bundle ${bundle.chunkIndex} complete`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`🎉 ${bookId} - ${config.name} complete!`);

    } catch (error) {
      console.error(`❌ Error with ${bookId}:`, error.message);
    }
  }

  console.log('\n🏁 COMPARISON AUDIO GENERATION COMPLETE!');
  console.log('🎧 You now have 3 versions to test:');
  console.log('   1. digital-library-test: Speed 0.90');
  console.log('   2. digital-library-test-2: Speed 0.90 + Style 0.1');
  console.log('   3. digital-library-test-3: Pure defaults');
}

async function generateElevenLabsAudio(text, settings) {
  const body = {
    text: text,
    model_id: 'eleven_monolingual_v1'
  };

  if (settings) {
    body.voice_settings = settings;
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
  return bits / bitrate;
}

generateComparisonAudio();