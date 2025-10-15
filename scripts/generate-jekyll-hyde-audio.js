#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Configuration
const BOOK_ID = 'gutenberg-43-A1';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio', 'jekyll-hyde-a1');

// CLI flags
const args = process.argv.slice(2);
const skipExisting = !args.includes('--regenerate');

async function generateJekyllHydeAudio() {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not found in environment variables');
    }

    console.log('🎵 Generating Jekyll & Hyde A1 audio with ElevenLabs...\n');

    // Ensure audio directory exists
    if (!fs.existsSync(AUDIO_DIR)) {
      fs.mkdirSync(AUDIO_DIR, { recursive: true });
      console.log(`📁 Created audio directory: ${AUDIO_DIR}`);
    }

    // Load bundles from database
    const chunks = await prisma.bookChunk.findMany({
      where: { bookId: BOOK_ID },
      orderBy: { chunkIndex: 'asc' }
    });

    if (chunks.length === 0) {
      throw new Error('No Jekyll & Hyde A1 bundles found in database. Run create-jekyll-hyde-a1-bundles.js first.');
    }

    console.log(`📦 Found ${chunks.length} bundles to process`);

    // Check for existing audio files
    let existingCount = 0;
    let generatedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const audioFileName = `bundle-${String(i + 1).padStart(3, '0')}.mp3`;
      const audioFilePath = path.join(AUDIO_DIR, audioFileName);

      // Skip if audio already exists (unless regenerating)
      if (skipExisting && fs.existsSync(audioFilePath)) {
        existingCount++;

        // Update database with audio path if not set
        if (!chunk.audioFilePath) {
          await prisma.bookChunk.update({
            where: { id: chunk.id },
            data: {
              audioFilePath: `/audio/jekyll-hyde-a1/${audioFileName}`,
              audioProvider: 'elevenlabs',
              audioVoiceId: VOICE_ID
            }
          });
        }

        if (i % 50 === 0) {
          console.log(`⏭️  Skipped ${i + 1}/${chunks.length} (audio exists)`);
        }
        continue;
      }

      console.log(`🎵 Generating audio ${i + 1}/${chunks.length}: "${chunk.chunkText.substring(0, 50)}..."`);

      try {
        const audioBuffer = await generateAudioWithElevenLabs(chunk.chunkText);

        // Save audio file
        fs.writeFileSync(audioFilePath, audioBuffer);

        // Update database
        await prisma.bookChunk.update({
          where: { id: chunk.id },
          data: {
            audioFilePath: `/audio/jekyll-hyde-a1/${audioFileName}`,
            audioProvider: 'elevenlabs',
            audioVoiceId: VOICE_ID
          }
        });

        generatedCount++;
        console.log(`✅ Generated audio ${i + 1}/${chunks.length}`);

        // Rate limiting - ElevenLabs free tier has limits
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        errorCount++;
        const errorMsg = `Bundle ${i + 1}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);

        // Continue with next bundle instead of failing completely
        continue;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Jekyll & Hyde A1 audio generation completed!');
    console.log(`📊 Summary:`);
    console.log(`   • Total bundles: ${chunks.length}`);
    console.log(`   • Already existed: ${existingCount}`);
    console.log(`   • Newly generated: ${generatedCount}`);
    console.log(`   • Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      errors.forEach(error => console.log(`   • ${error}`));
    }

    console.log(`\n📁 Audio files saved to: ${AUDIO_DIR}`);
    console.log('='.repeat(60));

    return {
      total: chunks.length,
      existing: existingCount,
      generated: generatedCount,
      errors: errorCount
    };

  } catch (error) {
    console.error('❌ Error generating Jekyll & Hyde audio:', error);
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
        stability: 0.75,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateJekyllHydeAudio().catch(console.error);
}

export { generateJekyllHydeAudio };