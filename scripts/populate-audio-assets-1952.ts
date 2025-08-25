import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function populateAudioAssets() {
  console.log('📚 Populating audio_assets table for gutenberg-1952...\n');
  
  const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const CHUNKS_PER_LEVEL = 14;
  
  for (const level of CEFR_LEVELS) {
    console.log(`Processing ${level}...`);
    
    for (let i = 0; i < CHUNKS_PER_LEVEL; i++) {
      const audioUrl = `https://xsolwqqdbsuydwmmwtsl.supabase.co/storage/v1/object/public/audio-files/gutenberg-1952/${level.toLowerCase()}/chunk_${i}.mp3`;
      
      try {
        // Insert into audio_assets table using raw SQL
        await prisma.$executeRaw`
          INSERT INTO audio_assets (
            book_id, 
            cefr_level, 
            chunk_index, 
            sentence_index,
            audio_url, 
            provider, 
            voice_id, 
            format,
            duration,
            expires_at,
            created_at
          )
          VALUES (
            'gutenberg-1952', 
            ${level}, 
            ${i}, 
            0,
            ${audioUrl}, 
            'openai', 
            'alloy', 
            'mp3',
            60.0,
            '2030-12-31'::timestamp,
            NOW()
          )
          ON CONFLICT (book_id, cefr_level, chunk_index, sentence_index, voice_id) 
          DO UPDATE SET 
            audio_url = EXCLUDED.audio_url,
            updated_at = NOW()
        `;
        console.log(`  ✅ ${level}/chunk_${i}`);
      } catch (error) {
        console.error(`  ❌ Failed ${level}/chunk_${i}:`, error);
      }
    }
  }
  
  console.log('\n✅ Audio assets populated!');
  await prisma.$disconnect();
}

populateAudioAssets().catch(console.error);