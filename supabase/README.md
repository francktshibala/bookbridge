# Supabase Database Migrations

## Running Migrations

To apply the subscription system migrations to your Supabase database:

1. **Option 1: Using Supabase Dashboard (Recommended for first-time setup)**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor
   - Copy the contents of `migrations/001_add_subscription_system.sql`
   - Paste and run the SQL in the editor

2. **Option 2: Using the migration script**
   ```bash
   # Make sure you have SUPABASE_SERVICE_ROLE_KEY in your .env.local
   npx ts-node scripts/run-migrations.ts
   ```

## Migration Overview

The subscription system migration creates:

### Tables
- **subscriptions**: Stores user subscription tiers and Stripe data
- **usage_tracking**: Tracks monthly book analysis usage
- **payment_history**: Records all payment transactions
- **analyzed_books**: Logs all books analyzed by users

### Features
- Automatic subscription/usage record creation for new users
- Row Level Security (RLS) policies for data protection
- Indexes for optimal query performance
- Updated_at triggers for automatic timestamp updates

### Subscription Tiers
- **Free**: 3 book analyses per month (unlimited public domain)
- **Premium**: $4/month - Unlimited analyses + voice features
- **Student**: $2/month - Same as premium with .edu verification

## Environment Variables

Add these to your `.env.local`:

```env
# Existing Supabase vars
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# For migrations (get from Supabase dashboard > Settings > API)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For Stripe (will be added in Phase 2)
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
```

## Testing the Setup

After running migrations, test that everything works:

1. Sign up a new user
2. Check that subscription and usage_tracking records are created
3. Verify RLS policies by trying to access another user's data (should fail)

## Troubleshooting

If migrations fail:
1. Check that your service role key has admin privileges
2. Ensure no conflicting tables exist
3. Run migrations one at a time if needed
4. Check Supabase logs for detailed error messages