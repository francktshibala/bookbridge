import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSubscriptionTables() {
  console.log('🚀 Starting subscription tables setup...');
  
  try {
    // Create subscription tiers enum
    console.log('📝 Creating subscription_tier enum...');
    const { error: enumError } = await supabase.rpc('exec', {
      sql: `CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'student');`
    });
    
    if (enumError && !enumError.message.includes('already exists')) {
      console.error('Enum creation error:', enumError);
    } else {
      console.log('✅ Subscription tier enum ready');
    }

    // Create subscriptions table
    console.log('📝 Creating subscriptions table...');
    const subscriptionsSQL = `
      CREATE TABLE IF NOT EXISTS public.subscriptions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        tier subscription_tier DEFAULT 'free' NOT NULL,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        current_period_start TIMESTAMP WITH TIME ZONE,
        current_period_end TIMESTAMP WITH TIME ZONE,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        is_student_verified BOOLEAN DEFAULT FALSE,
        student_email TEXT,
        student_verification_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { error: subTableError } = await supabase.rpc('exec', { sql: subscriptionsSQL });
    
    if (subTableError) {
      console.error('Subscriptions table error:', subTableError);
    } else {
      console.log('✅ Subscriptions table ready');
    }

    // Create usage tracking table
    console.log('📝 Creating usage_tracking table...');
    const usageSQL = `
      CREATE TABLE IF NOT EXISTS public.usage_tracking (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        book_analyses_count INTEGER DEFAULT 0,
        last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        current_month_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { error: usageTableError } = await supabase.rpc('exec', { sql: usageSQL });
    
    if (usageTableError) {
      console.error('Usage tracking table error:', usageTableError);
    } else {
      console.log('✅ Usage tracking table ready');
    }

    // Test table access
    console.log('🔍 Testing table access...');
    const { data: testSub, error: testSubError } = await supabase
      .from('subscriptions')
      .select('count(*)')
      .single();
    
    const { data: testUsage, error: testUsageError } = await supabase
      .from('usage_tracking')
      .select('count(*)')
      .single();
    
    if (testSubError) {
      console.error('❌ Subscriptions table not accessible:', testSubError.message);
    } else {
      console.log('✅ Subscriptions table accessible');
    }
    
    if (testUsageError) {
      console.error('❌ Usage tracking table not accessible:', testUsageError.message);
    } else {
      console.log('✅ Usage tracking table accessible');
    }

    console.log('\n🎉 Database setup completed!');
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
  }
}

// Alternative method using direct SQL if rpc doesn't work
async function createTablesDirectSQL() {
  console.log('🔄 Trying direct SQL approach...');
  
  // This is a manual fallback - we'll output the SQL for manual execution
  const sql = `
-- Create subscription tiers enum
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier subscription_tier DEFAULT 'free' NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  is_student_verified BOOLEAN DEFAULT FALSE,
  student_email TEXT,
  student_verification_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_analyses_count INTEGER DEFAULT 0,
  last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_month_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view their own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage tracking" ON public.usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage tracking" ON public.usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage tracking" ON public.usage_tracking
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON public.usage_tracking(user_id);

-- Create function to automatically create subscription and usage records for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, tier)
  VALUES (NEW.id, 'free');
  
  INSERT INTO public.usage_tracking (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
  `;
  
  console.log('\n📋 Manual SQL to execute in Supabase Dashboard SQL Editor:');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));
  
  return sql;
}

// Run setup
createSubscriptionTables().then(() => {
  console.log('✨ Setup process completed');
}).catch((error) => {
  console.log('⚠️  RPC method failed, showing manual SQL...');
  createTablesDirectSQL();
});