#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runESLMigration() {
  console.log('🚀 Starting ESL database migration...');
  console.log('📊 Phase 1: ESL Intelligence Infrastructure');
  
  try {
    let successCount = 0;
    let errorCount = 0;
    
    // Step 1: Check if users table ESL columns exist, if not we'll note it
    console.log('⚙️  Step 1: Checking current database structure...');
    
    // Test if we can query the users table to understand its structure
    const { data: usersTest, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log(`   ❌ Cannot access users table: ${usersError.message}`);
      errorCount++;
    } else {
      console.log('   ✅ Users table accessible');
      successCount++;
    }
    
    // Step 2: Create ESL vocabulary progress table
    console.log('⚙️  Step 2: Creating esl_vocabulary_progress table...');
    
    // We'll use a workaround - try to insert a test row which will create the table via Supabase
    const vocabularyTestData = {
      id: '00000000-0000-0000-0000-000000000001',
      user_id: '00000000-0000-0000-0000-000000000001',
      word: 'test',
      definition: 'A test word for table creation',
      difficulty_level: 'A1',
      encounters: 1,
      mastery_level: 0,
      first_seen: new Date().toISOString(),
      last_reviewed: new Date().toISOString(),
      next_review: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };
    
    // Try to create the table schema by attempting operations
    console.log('   📋 Note: Direct SQL schema creation not available via Supabase client');
    console.log('   📋 Recommendation: Use Supabase Dashboard SQL Editor to run the migration');
    console.log('   📋 Alternatively, set up database schema via Supabase Dashboard');
    
    // Step 3: Check if we can work with existing tables
    console.log('⚙️  Step 3: Testing existing table access...');
    
    const { data: conversationsTest, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    if (convError) {
      console.log(`   ❌ Cannot access conversations table: ${convError.message}`);
      errorCount++;
    } else {
      console.log('   ✅ Conversations table accessible');
      successCount++;
    }
    
    const { data: messagesTest, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (msgError) {
      console.log(`   ❌ Cannot access messages table: ${msgError.message}`);
      errorCount++;
    } else {
      console.log('   ✅ Messages table accessible');
      successCount++;
    }
    
    // Summary and recommendations
    console.log('\n📊 Migration Check Summary:');
    console.log(`   ✅ Accessible tables: ${successCount}`);
    console.log(`   ❌ Issues found: ${errorCount}`);
    
    console.log('\n📋 ESL Implementation Recommendations:');
    console.log('\n🎯 IMMEDIATE NEXT STEPS:');
    console.log('   1. Use Supabase Dashboard SQL Editor to run the schema migration');
    console.log('   2. Copy the SQL from scripts/esl-database-migration.sql');
    console.log('   3. Execute it in Supabase Dashboard > SQL Editor');
    console.log('   4. Update Prisma schema to include new ESL tables');
    console.log('   5. Run: npx prisma generate');
    
    console.log('\n🔧 ALTERNATIVE APPROACH:');
    console.log('   • Start with enhancing existing tables (users, episodic_memory)');
    console.log('   • Add ESL fields to existing Prisma schema');
    console.log('   • Use Prisma migrations to update database');
    console.log('   • Create new ESL tables through Prisma migrations');
    
    console.log('\n✅ WHAT WE CAN DO NOW:');
    console.log('   • Enhance AI service with ESL capabilities');
    console.log('   • Create ESL-specific services and components');
    console.log('   • Implement ESL logic using existing data structures');
    console.log('   • Test ESL features with mock data');
    
    console.log('\n🎉 Let\'s proceed with AI service enhancement and ESL logic implementation!');
    
  } catch (error) {
    console.error('💥 Migration check failed:', error);
  }
}

// Run the migration check
runESLMigration().catch(error => {
  console.error('💥 Migration script failed:', error);
  process.exit(1);
});