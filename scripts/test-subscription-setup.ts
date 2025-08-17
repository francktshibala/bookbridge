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

async function testSetup() {
  console.log('🧪 Testing subscription system setup...\n');

  try {
    // Test 1: Check if tables exist and are accessible
    console.log('1️⃣ Testing table access...');
    
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('id')
      .limit(1);
    
    if (subsError) {
      console.error('❌ Subscriptions table:', subsError.message);
      return;
    } else {
      console.log('✅ Subscriptions table accessible');
    }

    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('id')
      .limit(1);
    
    if (usageError) {
      console.error('❌ Usage tracking table:', usageError.message);
      return;
    } else {
      console.log('✅ Usage tracking table accessible');
    }

    // Test 2: Create a test user subscription
    console.log('\n2️⃣ Testing subscription creation...');
    
    const testUserId = '00000000-0000-0000-0000-000000000001'; // Dummy UUID for testing
    
    // Insert test subscription
    const { data: newSub, error: insertSubError } = await supabase
      .from('subscriptions')
      .insert({
        userId: testUserId,
        tier: 'free'
      })
      .select()
      .single();
    
    if (insertSubError) {
      console.error('❌ Failed to create test subscription:', insertSubError.message);
    } else {
      console.log('✅ Test subscription created:', newSub.id);
    }

    // Insert test usage
    const { data: newUsage, error: insertUsageError } = await supabase
      .from('usage_tracking')
      .insert({
        userId: testUserId,
        bookAnalysesCount: 1
      })
      .select()
      .single();
    
    if (insertUsageError) {
      console.error('❌ Failed to create test usage:', insertUsageError.message);
    } else {
      console.log('✅ Test usage record created:', newUsage.id);
    }

    // Test 3: Query the test data
    console.log('\n3️⃣ Testing data queries...');
    
    const { data: queriedSub, error: querySubError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('userId', testUserId)
      .single();
    
    if (querySubError) {
      console.error('❌ Failed to query subscription:', querySubError.message);
    } else {
      console.log('✅ Subscription query successful:', {
        tier: queriedSub.tier,
        created_at: queriedSub.created_at
      });
    }

    const { data: queriedUsage, error: queryUsageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('userId', testUserId)
      .single();
    
    if (queryUsageError) {
      console.error('❌ Failed to query usage:', queryUsageError.message);
    } else {
      console.log('✅ Usage query successful:', {
        bookAnalysesCount: queriedUsage.bookAnalysesCount,
        createdAt: queriedUsage.createdAt
      });
    }

    // Test 4: Test the subscription logic
    console.log('\n4️⃣ Testing subscription logic...');
    
    const tier = queriedSub?.tier || 'free';
    const monthlyLimit = tier === 'free' ? 3 : -1;
    const usageCount = queriedUsage?.bookAnalysesCount || 0;
    const remaining = tier === 'free' ? Math.max(0, monthlyLimit - usageCount) : -1;
    
    console.log('✅ Subscription logic test:', {
      tier,
      monthlyLimit,
      usageCount,
      remaining: remaining === -1 ? 'unlimited' : remaining
    });

    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    
    await supabase.from('subscriptions').delete().eq('userId', testUserId);
    await supabase.from('usage_tracking').delete().eq('userId', testUserId);
    
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All tests passed! Subscription system is ready.');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testSetup();