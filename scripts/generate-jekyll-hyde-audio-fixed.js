#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const BOOK_ID = 'gutenberg-43';
const CEFR_LEVEL = 'A1';
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// CLI flags
const args = process.argv.slice(2);
const isPilot = args.includes('--pilot');

async function generateJekyllHydeAudio() {
  try {
    console.log(`🎵 Generating Jekyll & Hyde audio ${isPilot ? '(PILOT - 5 bundles)' : '(FULL)'} with Sarah voice...\n`);

    // Get chunks without audio
    const chunks = await prisma.bookChunk.findMany({
      where: {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL,
        audioFilePath: {
          contains: 'jekyll-hyde/bundle_'
        }
      },
      orderBy: { chunkIndex: 'asc' },
      take: isPilot ? 5 : undefined
    });

    if (chunks.length === 0) {
      console.log('✅ All bundles already have audio generated or no bundles found');
      return;
    }

    console.log(`📦 Found ${chunks.length} chunks to process`);

    // Process each chunk (bundle)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\n🔄 Generating audio for bundle ${chunk.chunkIndex}/${chunks.length}...`);

      try {
        // Generate audio with ElevenLabs
        const audioBuffer = await generateAudioWithElevenLabs(chunk.chunkText);

        // Upload to Supabase storage with correct path format
        const fileName = `jekyll-hyde/bundle_${chunk.chunkIndex}.mp3`;

        const { data, error: uploadError } = await supabase.storage
          .from('audio-files')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mp3',
            cacheControl: '2592000', // 30 days
            upsert: true
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log(`✅ Bundle ${chunk.chunkIndex} audio generated and uploaded to ${fileName}`);

        // Rate limiting - ElevenLabs allows ~2 requests per second
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Error processing bundle ${chunk.chunkIndex}:`, error.message);
        // Continue with next chunk instead of failing completely
        continue;
      }
    }

    console.log(`\n🎉 Audio generation completed!`);
    console.log(`📊 Processed ${chunks.length} bundles`);

    if (isPilot) {
      console.log(`\n🧪 PILOT COMPLETE - Test audio quality, then run without --pilot for full generation`);
    } else {
      console.log(`\n✅ Ready for Featured Books deployment!`);
    }

  } catch (error) {
    console.error('❌ Audio generation failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function generateAudioWithElevenLabs(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateJekyllHydeAudio().catch(console.error);
}

export { generateJekyllHydeAudio };