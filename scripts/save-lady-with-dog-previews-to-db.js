import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config({ path: '.env.local' });

const prisma = new PrismaClient();

async function savePreviewToDatabase(level) {
  const previewCachePath = path.join(process.cwd(), 'cache', `lady-with-dog-${level}-preview.txt`);
  
  if (!fs.existsSync(previewCachePath)) {
    console.log(`⚠️ Preview text file not found: ${previewCachePath}`);
    return;
  }

  const previewText = fs.readFileSync(previewCachePath, 'utf8').trim();
  
  console.log(`💾 Saving preview text for ${level} to database...`);
  
  try {
    // First, try to add the preview column if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE book_content 
        ADD COLUMN IF NOT EXISTS preview TEXT;
      `);
      console.log(`   ✅ Preview column exists or was added`);
    } catch (columnError) {
      console.log(`   ⚠️ Could not add preview column (may already exist): ${columnError.message}`);
    }
    
    // Now update the preview text
    await prisma.$executeRawUnsafe(
      `UPDATE book_content SET preview = $1 WHERE book_id = $2`,
      previewText,
      'lady-with-dog'
    );
    
    console.log(`   ✅ Preview text saved to database for ${level}`);
  } catch (error) {
    console.error(`   ❌ Failed to save ${level} preview:`, error.message);
  }
}

async function main() {
  const levels = ['A1', 'A2', 'B1'];
  
  for (const level of levels) {
    await savePreviewToDatabase(level);
  }
  
  console.log('\n🎉 Preview text save to database completed!');
  await prisma.$disconnect();
}

main().catch(console.error);

