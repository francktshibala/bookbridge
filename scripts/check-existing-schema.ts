import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Checking existing database schema...\n');

  try {
    // Check if subscriptions table already exists and its structure
    console.log('1️⃣ Checking subscriptions table...');
    const { data: subsCols, error: subsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'subscriptions');
    
    if (subsError) {
      console.log('❌ Error checking subscriptions:', subsError.message);
    } else if (subsCols && subsCols.length > 0) {
      console.log('✅ Subscriptions table exists with columns:');
      subsCols.forEach(col => console.log(`   - ${col.column_name}: ${col.data_type}`));
    } else {
      console.log('ℹ️  Subscriptions table does not exist');
    }

    // Check usage_tracking table
    console.log('\n2️⃣ Checking usage_tracking table...');
    const { data: usageCols, error: usageError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'usage_tracking');
    
    if (usageError) {
      console.log('❌ Error checking usage_tracking:', usageError.message);
    } else if (usageCols && usageCols.length > 0) {
      console.log('✅ Usage tracking table exists with columns:');
      usageCols.forEach(col => console.log(`   - ${col.column_name}: ${col.data_type}`));
    } else {
      console.log('ℹ️  Usage tracking table does not exist');
    }

    // Check what tables exist in public schema
    console.log('\n3️⃣ Checking all public tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('❌ Error checking tables:', tablesError.message);
    } else {
      console.log('📋 Existing public tables:');
      tables.forEach(table => console.log(`   - ${table.table_name}`));
    }

    // Try to see if we can detect the schema pattern by checking auth.users
    console.log('\n4️⃣ Checking auth.users structure for reference...');
    const { data: authCols, error: authError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'auth')
      .eq('table_name', 'users');
    
    if (authError) {
      console.log('❌ Error checking auth.users:', authError.message);
    } else if (authCols) {
      console.log('📋 Auth users columns (first few):');
      authCols.slice(0, 5).forEach(col => console.log(`   - ${col.column_name}: ${col.data_type}`));
    }

  } catch (error) {
    console.error('💥 Schema check failed:', error);
  }
}

checkSchema();