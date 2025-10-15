import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function addAudioMetadataColumn() {
  console.log('🔧 Adding audio_duration_metadata column to BookChunk table...');

  try {
    // Add the column using raw SQL
    await prisma.$executeRaw`
      ALTER TABLE "book_chunks"
      ADD COLUMN IF NOT EXISTS "audio_duration_metadata" JSONB;
    `;

    console.log('✅ Column added successfully (or already exists)');

    // Verify the column exists
    const result = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'book_chunks'
      AND column_name = 'audio_duration_metadata';
    `;

    if (result.length > 0) {
      console.log('✅ Verified: audio_duration_metadata column exists');
    } else {
      console.error('❌ Column creation may have failed');
    }

  } catch (error) {
    console.error('❌ Error adding column:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addAudioMetadataColumn()
    .then(() => console.log('✅ Database schema updated'))
    .catch(console.error);
}

export { addAudioMetadataColumn };