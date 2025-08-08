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

async function checkDatabase() {
  try {
    console.log('Checking database status...');
    
    // Check if subscription tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['subscriptions', 'usage_tracking', 'payment_history', 'analyzed_books']);
    
    console.log('Existing subscription-related tables:', tables);
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
    }
    
    // Try to check subscriptions table directly
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(1);
    
    if (subsError) {
      console.error('Subscriptions table error:', subsError);
    } else {
      console.log('Subscriptions table accessible, sample data:', subs);
    }
    
    // Check auth user
    const { data: user, error: userError } = await supabase.auth.getUser();
    console.log('Current auth status:', { user: user.user?.id, error: userError });
    
  } catch (error) {
    console.error('Database check failed:', error);
  }
}

checkDatabase();