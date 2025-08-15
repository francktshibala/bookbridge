-- BookBridge Subscription System Database Setup (CamelCase Version)
-- Execute this SQL in Supabase Dashboard > SQL Editor

-- Drop existing tables if they exist with wrong schema
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.usage_tracking CASCADE;
DROP TABLE IF EXISTS public.payment_history CASCADE;
DROP TABLE IF EXISTS public.analyzed_books CASCADE;

-- Drop existing type if it exists
DROP TYPE IF EXISTS subscription_tier CASCADE;

-- Create subscription tiers enum
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'student');

-- Create subscriptions table with camelCase columns
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier subscription_tier DEFAULT 'free' NOT NULL,
  stripeCustomerId TEXT,
  stripeSubscriptionId TEXT,
  currentPeriodStart TIMESTAMP WITH TIME ZONE,
  currentPeriodEnd TIMESTAMP WITH TIME ZONE,
  cancelAtPeriodEnd BOOLEAN DEFAULT FALSE,
  isStudentVerified BOOLEAN DEFAULT FALSE,
  studentEmail TEXT,
  studentVerificationDate TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage tracking table with camelCase columns
CREATE TABLE public.usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bookAnalysesCount INTEGER DEFAULT 0,
  lastResetDate TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  currentMonthStart TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment history table
CREATE TABLE public.payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripePaymentIntentId TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,
  description TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analyzed books tracking table
CREATE TABLE public.analyzed_books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bookId TEXT NOT NULL,
  bookTitle TEXT,
  bookSource TEXT, -- 'uploaded', 'gutenberg', 'openlibrary', 'googlebooks'
  analyzedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  isPublicDomain BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyzed_books ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = userId);

CREATE POLICY "Users can insert their own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update their own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = userId);

CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Create RLS policies for usage tracking
CREATE POLICY "Users can view their own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = userId);

CREATE POLICY "Users can insert their own usage tracking" ON public.usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update their own usage tracking" ON public.usage_tracking
  FOR UPDATE USING (auth.uid() = userId);

CREATE POLICY "Service role can manage usage tracking" ON public.usage_tracking
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Create RLS policies for payment history
CREATE POLICY "Users can view their own payment history" ON public.payment_history
  FOR SELECT USING (auth.uid() = userId);

CREATE POLICY "Users can insert their own payment history" ON public.payment_history
  FOR INSERT WITH CHECK (auth.uid() = userId);

CREATE POLICY "Service role can manage payment history" ON public.payment_history
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Create RLS policies for analyzed books
CREATE POLICY "Users can view their own analyzed books" ON public.analyzed_books
  FOR SELECT USING (auth.uid() = userId);

CREATE POLICY "Users can insert their own analyzed books" ON public.analyzed_books
  FOR INSERT WITH CHECK (auth.uid() = userId);

CREATE POLICY "Service role can manage analyzed books" ON public.analyzed_books
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_subscriptions_userId ON public.subscriptions(userId);
CREATE INDEX idx_subscriptions_stripeCustomerId ON public.subscriptions(stripeCustomerId);
CREATE INDEX idx_usage_tracking_userId ON public.usage_tracking(userId);
CREATE INDEX idx_payment_history_userId ON public.payment_history(userId);
CREATE INDEX idx_analyzed_books_userId ON public.analyzed_books(userId);
CREATE INDEX idx_analyzed_books_analyzedAt ON public.analyzed_books(analyzedAt);

-- Create function to automatically create subscription and usage records for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create subscription record
  INSERT INTO public.subscriptions (userId, tier)
  VALUES (NEW.id, 'free');
  
  -- Create usage tracking record
  INSERT INTO public.usage_tracking (userId)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after user signup (drop existing first)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedAt = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updatedAt triggers
CREATE TRIGGER handle_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();