import prisma from '../lib/prisma';

async function checkColumns() {
  try {
    console.log('🔍 Checking actual database schema...');
    
    // Check what columns exist in books table
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'books' AND table_schema = 'public'
      ORDER BY column_name;
    `;
    console.log('📋 Books table columns:', columns);
    
    // Check if review tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE '%review%'
      ORDER BY table_name;
    `;
    console.log('📋 Review tables:', tables);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();