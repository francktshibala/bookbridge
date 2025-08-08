const { PrismaClient } = require('@prisma/client');

async function disableRLS() {
  const prisma = new PrismaClient();
  
  console.log('🔧 Disabling Row Level Security to fix permission errors...\n');
  
  const tables = [
    'users',
    'subscriptions', 
    'books',
    'conversations',
    'messages',
    'usage',
    'system_usage',
    'book_cache',
    'app_testimonials'
  ];
  
  try {
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
        console.log(`✅ Disabled RLS on table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not disable RLS on ${table}: ${error.message}`);
      }
    }
    
    console.log('\n🔧 Granting permissions to roles...');
    
    // Grant permissions
    await prisma.$executeRawUnsafe(`GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated`);
    
    console.log('✅ Permissions granted successfully');
    
    console.log('\n✨ Database permissions fixed!');
    console.log('\n⚠️  WARNING: RLS is now disabled. This is fine for development but');
    console.log('   you should re-enable it before production deployment.');
    console.log('   See docs/PRODUCTION_DATABASE_ARCHITECTURE.md for details.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

disableRLS();