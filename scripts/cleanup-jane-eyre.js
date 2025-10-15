import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function cleanup() {
  console.log('🧹 Cleaning up existing Jane Eyre A1 bundles...');

  const { error } = await supabase
    .from('audio_assets')
    .delete()
    .eq('book_id', 'jane-eyre-scale-test-001')
    .eq('cefr_level', 'A1');

  if (error) {
    console.error('Error cleaning up:', error);
  } else {
    console.log('✅ Cleanup complete');
  }
}

cleanup().then(() => process.exit(0));