-- Apple In-App Purchase schema additions (camelCase)
-- Execute in Supabase SQL Editor

-- Add Apple fields to subscriptions table if not present
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS appleOriginalTransactionId TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS appleLatestTransactionId TEXT,
  ADD COLUMN IF NOT EXISTS appleEnvironment TEXT,
  ADD COLUMN IF NOT EXISTS appleExpiresDate TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS appleIsInBillingRetry BOOLEAN,
  ADD COLUMN IF NOT EXISTS appleStatus TEXT,
  ADD COLUMN IF NOT EXISTS appleProductId TEXT,
  ADD COLUMN IF NOT EXISTS appleOfferType TEXT,
  ADD COLUMN IF NOT EXISTS appleRevocationReason TEXT,
  ADD COLUMN IF NOT EXISTS appleRevocationDate TIMESTAMP WITH TIME ZONE;

-- Create apple_transactions table to store history of transactions
CREATE TABLE IF NOT EXISTS public.apple_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userId UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  originalTransactionId TEXT NOT NULL,
  transactionId TEXT NOT NULL,
  bundleId TEXT,
  productId TEXT,
  purchaseDate TIMESTAMP WITH TIME ZONE,
  expiresDate TIMESTAMP WITH TIME ZONE,
  environment TEXT,
  ownershipType TEXT,
  signedPayload TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apple_txn_original ON public.apple_transactions(originalTransactionId);
CREATE INDEX IF NOT EXISTS idx_apple_txn_user ON public.apple_transactions(userId);

-- RLS
ALTER TABLE public.apple_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage apple transactions" ON public.apple_transactions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');


