#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration - Yellow Wallpaper A1
const BOOK_ID = 'gutenberg-1952-A1';
const CEFR_LEVEL = 'A1';
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// CLI flags
const args = process.argv.slice(2);
const isPilot = args.includes('--pilot');
const clearCache = args.includes('--clear-cache');

async function generateYellowWallpaperAudio() {
  try {
    console.log(`🎵 Generating Yellow Wallpaper audio ${isPilot ? '(PILOT - 5 bundles)' : '(FULL)'} with Sarah voice...\n`);

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not found in environment');
    }

    // Get book chunks (our A1 bundles) from database
    const chunks = await prisma.bookChunk.findMany({
      where: {
        bookId: BOOK_ID,
        cefrLevel: CEFR_LEVEL,
        audioFilePath: null // Only process chunks without audio
      },
      orderBy: { chunkIndex: 'asc' },
      take: isPilot ? 5 : undefined // Limit to 5 for pilot
    });

    if (chunks.length === 0) {
      console.log('✅ All chunks already have audio generated');
      return;
    }

    console.log(`📦 Found ${chunks.length} chunks to process`);

    // Process each chunk (bundle)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\n🔄 Generating audio for bundle ${chunk.chunkIndex + 1}/${isPilot ? 5 : '96'}...`);

      try {
        // GPT-5 VALIDATOR: Ensure exactly 4 sentences per bundle
        const sentences = chunk.chunkText.split(/(?<=[.!?])\s+/).filter(s => s.trim());
        if (sentences.length !== 4) {
          console.error(`❌ VALIDATION FAILED: Bundle ${chunk.chunkIndex} has ${sentences.length} sentences, expected 4`);
          console.error(`Text: "${chunk.chunkText.substring(0, 100)}..."`);
          throw new Error(`Bundle validation failed - sentence count mismatch`);
        }
        console.log(`✅ Validated: Bundle ${chunk.chunkIndex} has exactly 4 sentences`);
        // Generate audio with ElevenLabs
        const audioBuffer = await generateAudioWithElevenLabs(chunk.chunkText);

        // Upload to Supabase storage with book-specific path (prevent conflicts)
        const fileName = `${BOOK_ID}/${CEFR_LEVEL.toLowerCase()}/chunk_${chunk.chunkIndex}.mp3`;

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

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('audio-files')
          .getPublicUrl(fileName);

        // Update chunk with audio metadata
        await prisma.bookChunk.update({
          where: { id: chunk.id },
          data: {
            audioFilePath: fileName,
            audioProvider: 'elevenlabs',
            audioVoiceId: VOICE_ID
          }
        });

        console.log(`✅ Bundle ${chunk.chunkIndex + 1} audio generated and saved`);

        // Rate limiting - ElevenLabs allows ~2 requests per second
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Error processing bundle ${chunk.chunkIndex + 1}:`, error.message);
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
      'xi-api-key': ELEVENLABS_API_KEY
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
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateYellowWallpaperAudio().catch(console.error);
}

export { generateYellowWallpaperAudio };