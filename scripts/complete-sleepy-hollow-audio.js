#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

async function generateAudio(text) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': ELEVENLABS_API_KEY },
    body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.5, style: 0.0, use_speaker_boost: true } })
  });
  return Buffer.from(await response.arrayBuffer());
}

async function completeSleepyHollowAudio() {
  try {
    // Get chunks that don't have audio files yet (starting from where we left off)
    const sleepyChunks = await prisma.bookChunk.findMany({
      where: { bookId: 'sleepy-hollow-enhanced', cefrLevel: 'A1', chunkIndex: { gte: 21 } },
      orderBy: { chunkIndex: 'asc' }
    });

    console.log(`Completing Sleepy Hollow audio for ${sleepyChunks.length} remaining chunks...`);

    for (const chunk of sleepyChunks) {
      console.log(`Processing Sleepy chunk ${chunk.chunkIndex}/82...`);
      const audioBuffer = await generateAudio(chunk.chunkText);
      const fileName = `sleepy-hollow/bundle_${chunk.chunkIndex}.mp3`;

      const { error } = await supabase.storage.from('audio-files').upload(fileName, audioBuffer, {
        contentType: 'audio/mp3', cacheControl: '2592000', upsert: true
      });

      if (error) throw error;
      console.log(`✅ Generated ${fileName}`);
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('✅ Complete Sleepy Hollow audio generation finished!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

completeSleepyHollowAudio();