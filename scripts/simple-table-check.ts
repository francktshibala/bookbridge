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

async function checkBasics() {
  try {
    // Check if books table exists (which we know should exist)
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('*')
      .limit(1);
    
    if (booksError) {
      console.error('Books table error:', booksError);
    } else {
      console.log('✅ Books table is accessible');
    }
    
    // Now try subscriptions
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(1);
    
    if (subsError) {
      console.error('❌ Subscriptions table error:', subsError.message);
      if (subsError.code === '42P01') {
        console.log('📝 Subscriptions table does not exist - needs to be created');
      }
    } else {
      console.log('✅ Subscriptions table is accessible');
    }
    
  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkBasics();