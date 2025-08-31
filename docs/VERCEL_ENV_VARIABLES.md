# Vercel Environment Variables Configuration

## Required Environment Variables for Production

### 1. Database Connection (CRITICAL - Missing this causes reading page to fail)
```
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**How to get this:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to Settings → Database
4. Under "Connection string" select "Transaction" mode (for serverless)
5. Copy the entire connection string
6. **Important**: Use port 6543 (transaction pooler) not 5432

### 2. Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
```

### 3. OpenAI API
```
OPENAI_API_KEY=[YOUR-OPENAI-API-KEY]
```

### 4. Optional: Voice Service
```
NEXT_PUBLIC_VOICE_SERVICE_URL=[YOUR-VOICE-SERVICE-URL]
```

## How to Add in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to Settings → Environment Variables
4. For each variable:
   - Click "Add New"
   - Enter the Key (e.g., `DATABASE_URL`)
   - Enter the Value
   - Select all environments (Production, Preview, Development)
   - Click "Save"

## Troubleshooting

### "Database not initialized" Error
- **Cause**: Missing `DATABASE_URL` environment variable
- **Fix**: Add the DATABASE_URL from Supabase as shown above

### PWA Not Installing
- **Cause**: Service worker or HTTPS issues
- **Fix**: Ensure HTTPS is enabled and service worker is registered

### Reading Page Works Locally but Not in Production
- **Cause**: Database connection string differs between environments
- **Fix**: Use the transaction pooler URL (port 6543) for Vercel serverless functions

## Verification

After adding variables, redeploy your project:
```bash
vercel --prod
```

Or trigger a redeployment from the Vercel dashboard.