#!/usr/bin/env tsx

/**
 * Manually run micro_feedback table migration
 * This script executes the SQL file to create the table
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('[Migration] Reading SQL file...');
    const sqlPath = path.join(__dirname, '../prisma/migrations/create_micro_feedback.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('[Migration] Executing SQL...');

    // Remove comments and split by semicolons
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
      console.log(`[Migration] Running: ${preview}...`);
      await prisma.$executeRawUnsafe(statement);
    }

    console.log('[Migration] ✅ micro_feedback table created successfully!');

    // Verify table exists
    const result = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'micro_feedback'
    ` as any[];

    if (result.length > 0) {
      console.log('[Migration] ✅ Verified: micro_feedback table exists');
    } else {
      console.error('[Migration] ❌ Warning: Could not verify table creation');
    }

  } catch (error) {
    console.error('[Migration] ❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
