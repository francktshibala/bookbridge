#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

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
    // Execute each migration step individually for better error handling
    const migrationSteps = [
      {
        name: 'Extend users table with ESL fields',
        sql: `
          ALTER TABLE users ADD COLUMN IF NOT EXISTS esl_level VARCHAR(2) DEFAULT NULL;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS native_language VARCHAR(10) DEFAULT NULL;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_goals JSON DEFAULT NULL;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS reading_speed INTEGER DEFAULT 150;
        `
      },
      {
        name: 'Enhance episodic_memory table',
        sql: `
          ALTER TABLE episodic_memory ADD COLUMN IF NOT EXISTS vocabulary_introduced JSON DEFAULT '[]';
          ALTER TABLE episodic_memory ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(2) DEFAULT NULL;
          ALTER TABLE episodic_memory ADD COLUMN IF NOT EXISTS comprehension_score DECIMAL(3,2) DEFAULT NULL;
        `
      },
      {
        name: 'Create esl_vocabulary_progress table',
        sql: `
          CREATE TABLE IF NOT EXISTS esl_vocabulary_progress (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              word VARCHAR(100) NOT NULL,
              definition TEXT,
              difficulty_level VARCHAR(2),
              encounters INTEGER DEFAULT 1,
              mastery_level INTEGER DEFAULT 0,
              first_seen TIMESTAMP DEFAULT NOW(),
              last_reviewed TIMESTAMP DEFAULT NOW(),
              next_review TIMESTAMP DEFAULT NOW() + INTERVAL '1 day',
              created_at TIMESTAMP DEFAULT NOW(),
              UNIQUE(user_id, word)
          );
        `
      },
      {
        name: 'Create reading_sessions table',
        sql: `
          CREATE TABLE IF NOT EXISTS reading_sessions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              book_id VARCHAR NOT NULL,
              session_start TIMESTAMP DEFAULT NOW(),
              session_end TIMESTAMP,
              words_read INTEGER DEFAULT 0,
              avg_reading_speed INTEGER,
              difficulty_level VARCHAR(2),
              comprehension_score DECIMAL(3,2),
              vocabulary_lookups INTEGER DEFAULT 0,
              time_on_simplified INTEGER DEFAULT 0,
              time_on_original INTEGER DEFAULT 0,
              created_at TIMESTAMP DEFAULT NOW()
          );
        `
      },
      {
        name: 'Create book_simplifications table',
        sql: `
          CREATE TABLE IF NOT EXISTS book_simplifications (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              book_id VARCHAR NOT NULL,
              target_level VARCHAR(2) NOT NULL,
              chunk_index INTEGER NOT NULL,
              original_text TEXT NOT NULL,
              simplified_text TEXT NOT NULL,
              vocabulary_changes JSON DEFAULT '[]',
              cultural_annotations JSON DEFAULT '[]',
              quality_score DECIMAL(3,2),
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW(),
              UNIQUE(book_id, target_level, chunk_index)
          );
        `
      },
      {
        name: 'Create performance indexes',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_vocab_progress_user_word ON esl_vocabulary_progress(user_id, word);
          CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_book ON reading_sessions(user_id, book_id);
          CREATE INDEX IF NOT EXISTS idx_book_simplifications_lookup ON book_simplifications(book_id, target_level);
          CREATE INDEX IF NOT EXISTS idx_vocab_next_review ON esl_vocabulary_progress(user_id, next_review);
          CREATE INDEX IF NOT EXISTS idx_reading_sessions_date ON reading_sessions(user_id, created_at);
          CREATE INDEX IF NOT EXISTS idx_book_simplifications_updated ON book_simplifications(updated_at);
        `
      }
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < migrationSteps.length; i++) {
      const step = migrationSteps[i];
      console.log(`⚙️  Step ${i + 1}/${migrationSteps.length}: ${step.name}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: step.sql });
        
        if (error) {
          // Check if error is about already existing items (which is OK)
          if (error.message.includes('already exists') || 
              error.message.includes('relation') && error.message.includes('already exists')) {
            console.log(`   ✅ ${step.name}: Already exists (OK)`);
            successCount++;
          } else {
            console.error(`   ❌ ${step.name} failed:`, error.message);
            errorCount++;
          }
        } else {
          console.log(`   ✅ ${step.name}: Success`);
          successCount++;
        }
        
        // Small delay between steps
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (err) {
        console.error(`   ❌ ${step.name} failed:`, err.message);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful steps: ${successCount}`);
    console.log(`   ❌ Failed steps: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 ESL database migration completed successfully!');
      console.log('\n📋 Created/Updated:');
      console.log('   • Extended users table with ESL fields (esl_level, native_language, learning_goals, reading_speed)');
      console.log('   • Enhanced episodic_memory table with vocabulary tracking');
      console.log('   • Created esl_vocabulary_progress table for spaced repetition');
      console.log('   • Created reading_sessions table for analytics');
      console.log('   • Created book_simplifications table for cached content');
      console.log('   • Added performance indexes for fast queries');
      
      // Verify the migration
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
    // Check if ESL tables were created by trying to query them
    const tables = ['esl_vocabulary_progress', 'reading_sessions', 'book_simplifications'];
    
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`   ❌ Table ${tableName}: Error (${error.message})`);
        } else {
          console.log(`   ✅ Table ${tableName}: Created and accessible`);
        }
      } catch (err) {
        console.log(`   ❌ Table ${tableName}: Not accessible (${err.message})`);
      }
    }
    
    // Check if users table has new ESL columns
    try {
      const { data: userTest, error: userError } = await supabase
        .from('users')
        .select('esl_level, native_language, reading_speed')
        .limit(1);
      
      if (userError) {
        console.log(`   ❌ Users ESL columns: Error (${userError.message})`);
      } else {
        console.log(`   ✅ Users ESL columns: Added successfully`);
      }
    } catch (err) {
      console.log(`   ❌ Users ESL columns: Not accessible (${err.message})`);
    }
    
    console.log('\n✨ Migration verification completed!');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Update Prisma schema to include new ESL tables');
    console.log('   2. Generate Prisma client: npx prisma generate');
    console.log('   3. Enhance AI service with ESL capabilities');
    console.log('   4. Test ESL functionality with sample data');
    
  } catch (error) {
    console.error('⚠️  Verification failed:', error);
  }
}

// Run the migration
runESLMigration().catch(error => {
  console.error('💥 Migration script failed:', error);
  process.exit(1);
});