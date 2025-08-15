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

async function createUserSubscription() {
  console.log('🔧 Creating subscription records for existing user...\n');

  const userId = '750ecd93-5bc3-44bb-bc49-b03e165e386a'; // Your user ID

  try {
    // Create subscription record
    console.log('1️⃣ Creating subscription record...');
    const { data: newSub, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        userId: userId,
        tier: 'free'
      })
      .select()
      .single();

    if (subError) {
      console.error('❌ Failed to create subscription:', subError.message);
      return;
    } else {
      console.log('✅ Subscription created:', newSub.id);
    }

    // Create usage tracking record
    console.log('2️⃣ Creating usage tracking record...');
    const { data: newUsage, error: usageError } = await supabase
      .from('usage_tracking')
      .insert({
        userId: userId,
        bookAnalysesCount: 0
      })
      .select()
      .single();

    if (usageError) {
      console.error('❌ Failed to create usage tracking:', usageError.message);
      return;
    } else {
      console.log('✅ Usage tracking created:', newUsage.id);
    }

    console.log('\n🎉 User subscription records created successfully!');
    console.log('Now refresh the test page to see real database data.');

  } catch (error) {
    console.error('💥 Failed to create user subscription:', error);
  }
}

createUserSubscription();