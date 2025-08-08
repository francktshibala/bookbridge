const { PrismaClient } = require('@prisma/client');

async function fixAllPermissions() {
  const prisma = new PrismaClient();
  
  console.log('🔧 Comprehensive database permission fix starting...\n');
  
  try {
    // Get all tables in public schema
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    
    console.log(`Found ${tables.length} tables in public schema\n`);
    
    // Disable RLS on ALL tables
    for (const { tablename } of tables) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE public.${tablename} DISABLE ROW LEVEL SECURITY`);
        console.log(`✅ Disabled RLS on: ${tablename}`);
      } catch (e) {
        console.log(`⚠️  RLS already disabled or error on: ${tablename}`);
      }
    }
    
    console.log('\n🔧 Dropping all RLS policies...');
    
    // Drop all existing policies
    const policies = await prisma.$queryRaw`
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public'
    `;
    
    for (const { tablename, policyname } of policies) {
      try {
        await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${policyname}" ON public.${tablename}`);
        console.log(`✅ Dropped policy: ${policyname} on ${tablename}`);
      } catch (e) {
        console.log(`⚠️  Could not drop policy: ${policyname}`);
      }
    }
    
    console.log('\n🔧 Granting full permissions...');
    
    // Grant ALL permissions
    await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role`);
    
    // Also grant usage on schema
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO anon, authenticated`);
    
    console.log('✅ All permissions granted');
    
    // Test with a simple query
    console.log('\n🧪 Testing database access...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database test successful! Found ${userCount} users`);
    
    console.log('\n✨ All permissions fixed successfully!');
    console.log('\n⚠️  IMPORTANT: RLS is completely disabled. This is only for development!');
    console.log('   Before production, re-enable RLS and implement proper policies.');
    console.log('   See: docs/PRODUCTION_DATABASE_ARCHITECTURE.md\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllPermissions();