import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

const prisma = new PrismaClient();

async function addPreviewColumn() {
  try {
    console.log('Adding preview column to book_content table...');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE book_content 
      ADD COLUMN IF NOT EXISTS preview TEXT;
    `);
    
    console.log('✅ Preview column added successfully!');
  } catch (error) {
    console.error('❌ Error adding preview column:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addPreviewColumn()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

