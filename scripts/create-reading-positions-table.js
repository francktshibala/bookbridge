#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createReadingPositionsTable() {
  try {
    console.log('🔧 Creating reading_positions table...');

    // SQL to create the reading_positions table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "reading_positions" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "book_id" TEXT NOT NULL,
        "current_sentence_index" INTEGER NOT NULL DEFAULT 0,
        "current_bundle_index" INTEGER NOT NULL DEFAULT 0,
        "current_chapter" INTEGER NOT NULL DEFAULT 1,
        "playback_time" DECIMAL(65,30) NOT NULL DEFAULT 0,
        "total_time" DECIMAL(65,30) NOT NULL DEFAULT 0,
        "cefr_level" TEXT NOT NULL DEFAULT 'B2',
        "playback_speed" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
        "content_mode" TEXT NOT NULL DEFAULT 'simplified',
        "last_accessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "session_duration" INTEGER NOT NULL DEFAULT 0,
        "device_type" TEXT,
        "completion_percentage" DECIMAL(65,30) NOT NULL DEFAULT 0,
        "sentences_read" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "reading_positions_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create unique constraint
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "reading_positions_user_id_book_id_key"
      ON "reading_positions"("user_id", "book_id");
    `;

    // Create indexes
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "reading_positions_user_id_last_accessed_idx"
      ON "reading_positions"("user_id", "last_accessed");
    `;

    console.log('✅ reading_positions table created successfully');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ reading_positions table already exists');
    } else {
      console.error('❌ Error creating reading_positions table:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createReadingPositionsTable().catch(console.error);
}

export { createReadingPositionsTable };