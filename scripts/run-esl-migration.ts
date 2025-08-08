#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

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
    // Read the migration SQL file
    const migrationPath = join(__dirname, 'esl-database-migration.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    
    console.log('📝 Migration SQL loaded successfully');
    console.log(`📏 SQL length: ${migrationSQL.length} characters`);
    
    // Split SQL into individual statements (basic approach)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`🔧 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comment-only statements and SELECT statements at the end
      if (statement.includes('Migration complete') || statement.startsWith('SELECT')) {
        continue;
      }
      
      try {
        console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);
        
        // Use Supabase's RPC to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';'
        });
        
        if (error) {
          // Check if error is about column/table already existing (which is OK)
          if (error.message.includes('already exists') || 
              error.message.includes('relation') && error.message.includes('already exists')) {
            console.log(`   ✅ Statement ${i + 1}: Already exists (OK)`);
            successCount++;
          } else {
            console.error(`   ❌ Statement ${i + 1} failed:`, error.message);
            errorCount++;
          }
        } else {
          console.log(`   ✅ Statement ${i + 1}: Success`);
          successCount++;
        }
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`   ❌ Statement ${i + 1} failed:`, err);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ❌ Failed statements: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 ESL database migration completed successfully!');
      console.log('\n📋 Created/Updated:');
      console.log('   • Extended users table with ESL fields');
      console.log('   • Enhanced episodic_memory table');
      console.log('   • Created esl_vocabulary_progress table');
      console.log('   • Created reading_sessions table');
      console.log('   • Created book_simplifications table');
      console.log('   • Added performance indexes');
      console.log('   • Created esl_user_progress view');
      
      // Verify the migration by checking if key tables exist
      console.log('\n🔍 Verifying migration...');
      await verifyMigration();
      
    } else {
      console.log(`\n⚠️  Migration completed with ${errorCount} errors. Please check the logs above.`);
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

async function verifyMigration() {
  try {
    // Check if ESL tables were created
    const tables = ['esl_vocabulary_progress', 'reading_sessions', 'book_simplifications'];
    
    for (const tableName of tables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ Table ${tableName}: Not accessible (${error.message})`);
      } else {
        console.log(`   ✅ Table ${tableName}: Created successfully`);
      }
    }
    
    // Check if users table has new ESL columns
    const { data: userColumns, error: userError } = await supabase
      .from('users')
      .select('esl_level, native_language, learning_goals, reading_speed')
      .limit(1);
    
    if (userError) {
      console.log(`   ❌ Users ESL columns: Not accessible (${userError.message})`);
    } else {
      console.log(`   ✅ Users ESL columns: Added successfully`);
    }
    
    console.log('\n✨ Migration verification completed!');
    
  } catch (error) {
    console.error('⚠️  Verification failed:', error);
  }
}

// Run the migration
if (require.main === module) {
  runESLMigration().catch(error => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
}

export { runESLMigration };