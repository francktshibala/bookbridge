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

// Winning formula: Daniel voice + speed 0.90 (from M1 tests)
const DANIEL_VOICE_SETTINGS = {
  stability: 0.5,        // default
  similarity_boost: 0.75, // default
  style: 0.0,            // default
  speed: 0.90,           // our proven setting
  use_speaker_boost: true
};

const BOOK_ID = 'gutenberg-43'; // Jekyll & Hyde ID
const CEFR_LEVEL = 'A2';
const DANIEL_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9';

class JekyllHydeA2AudioGenerator {
  constructor() {
    this.isPilot = process.argv.includes('--pilot');
    this.maxBundles = this.isPilot ? 10 : Infinity; // Pilot: 10 bundles for testing
  }

  async generateAudio() {
    console.log('🎵 Generating Jekyll & Hyde A2 Audio with Daniel Voice...');
    console.log(`🎯 Daniel voice settings: speed ${DANIEL_VOICE_SETTINGS.speed} (M1 proven formula)`);

    if (this.isPilot) {
      console.log('🧪 PILOT MODE: Generating first 10 bundles only (~$0.25 cost)');
    }

    try {
      // Get A2 bundles from database
      const bundles = await prisma.bookChunk.findMany({
        where: {
          bookId: BOOK_ID,
          cefrLevel: CEFR_LEVEL
        },
        orderBy: { chunkIndex: 'asc' }
      });

      if (!bundles || bundles.length === 0) {
        throw new Error('❌ No A2 bundles found. Run simplify-jekyll-hyde-a2.js first!');
      }

      console.log(`📚 Found ${bundles.length} A2 bundles to process`);

      const bundlesToProcess = this.isPilot ? bundles.slice(0, this.maxBundles) : bundles;

      // Check for existing audio files (resume capability)
      const existingAudio = await this.getExistingAudio();
      const newBundles = bundlesToProcess.filter(b => !existingAudio.includes(b.chunkIndex));

      console.log(`📊 Found ${existingAudio.length} existing audio files, generating ${newBundles.length} new ones`);

      // Generate audio for each bundle
      for (const bundle of newBundles) {
        console.log(`\n🎵 Processing Bundle ${bundle.chunkIndex}...`);
        console.log(`📝 Text: "${bundle.chunkText.substring(0, 80)}..."`);
        console.log(`📊 Word count: ${bundle.wordCount} words`);

        try {
          // Generate audio with Daniel voice + M1 settings
          const audioBuffer = await this.generateElevenLabsAudio(bundle.chunkText);
          const actualDuration = this.getAudioDuration(audioBuffer);

          console.log(`🎵 Audio duration: ${actualDuration.toFixed(2)}s`);

          // Upload to Supabase with proper path structure
          const fileName = `bundle_${bundle.chunkIndex}.mp3`;
          const filePath = `${BOOK_ID}/A2/daniel/${fileName}`;

          console.log(`📤 Uploading: ${filePath}`);
          const { data, error } = await supabase.storage
            .from('audio-files')
            .upload(filePath, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true
            });

          if (error) {
            throw new Error(`Supabase upload failed: ${error.message}`);
          }

          // Update database with audio info
          await prisma.bookChunk.update({
            where: { id: bundle.id },
            data: {
              audioFilePath: data.path,
              audioProvider: 'elevenlabs',
              audioVoiceId: DANIEL_VOICE_ID
            }
          });

          console.log(`✅ Bundle ${bundle.chunkIndex} complete`);
          console.log(`🔗 URL: https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/${data.path}`);

          // Rate limiting
          if (bundle.chunkIndex < bundlesToProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

        } catch (error) {
          console.error(`❌ Failed to process bundle ${bundle.chunkIndex}:`, error.message);

          if (error.message.includes('rate limit') || error.message.includes('timeout')) {
            console.log('⏳ Rate limited, waiting 30 seconds...');
            await new Promise(resolve => setTimeout(resolve, 30000));
            continue;
          }

          throw error;
        }
      }

      console.log('\n🎉 Jekyll & Hyde A2 audio generation complete!');
      console.log(`🎯 Generated ${newBundles.length} bundles with Daniel voice (speed 0.90)`);
      console.log('\n✨ Next steps:');
      console.log('1. Update Featured Books to show A2 version');
      console.log('2. Test natural compound sentence flow');
      console.log('3. Compare with existing A1 version');

    } catch (error) {
      console.error('❌ Audio generation failed:', error.message);
      throw error;
    }
  }

  async generateElevenLabsAudio(text) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${DANIEL_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1', // Proven reliable model
        voice_settings: DANIEL_VOICE_SETTINGS
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  getAudioDuration(audioBuffer) {
    // Quick estimation based on MP3 bitrate
    const bitrate = 128000; // bits per second
    const bytes = audioBuffer.length;
    const bits = bytes * 8;
    const duration = bits / bitrate;

    return duration;
  }

  async getExistingAudio() {
    try {
      const existingChunks = await prisma.bookChunk.findMany({
        where: {
          bookId: BOOK_ID,
          cefrLevel: CEFR_LEVEL,
          audioFilePath: { not: null }
        },
        select: { chunkIndex: true }
      });

      return existingChunks.map(chunk => chunk.chunkIndex);
    } catch (error) {
      console.log('⚠️ Could not check existing audio, assuming none exist');
      return [];
    }
  }
}

// Run the script
async function main() {
  try {
    const generator = new JekyllHydeA2AudioGenerator();
    await generator.generateAudio();
  } catch (error) {
    console.error('❌ Audio generation failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();