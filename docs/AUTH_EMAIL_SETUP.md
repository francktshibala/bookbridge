# Auth Email Setup - Improving Confirmation Email Deliverability

## Problem
Sign-up confirmation emails from Supabase's default email service often go to spam or don't arrive.

## Current Implementation
- **Resend Welcome Email**: Sent via Resend API (better deliverability)
- **Supabase Confirmation**: Still sent by Supabase (may go to spam)

## Best Solution: Configure Supabase SMTP (Recommended)

**Complexity:** Low (5 minutes in Supabase Dashboard)

**Steps:**
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Click "SMTP Settings"
3. Enter Resend SMTP credentials:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) or `587` (TLS)
   - **Username:** `resend`
   - **Password:** Your Resend API key
   - **Sender Email:** `BookBridge <onboarding@resend.dev>` (or your verified domain)
4. Save settings

**Result:** All Supabase auth emails (confirmation, password reset) will use Resend SMTP, ensuring better deliverability.

## Alternative: Current Implementation (Backup)

The current code sends a Resend welcome email that:
- Ensures users get at least one email (from Resend)
- Provides instructions to check spam folder
- Links to login page if confirmation email doesn't arrive

**Files:**
- `lib/services/auth-email-service.ts` - Resend email service
- `app/api/auth/send-confirmation/route.ts` - API route
- `app/auth/signup/page.tsx` - Calls API after signup

## Environment Variables

No new variables needed - uses existing `RESEND_API_KEY`.

Optional:
- `AUTH_FROM_EMAIL` - Custom sender (defaults to `BookBridge <onboarding@resend.dev>`)
- `NEXT_PUBLIC_APP_URL` - App URL for links (defaults to localhost in dev)

## Testing

1. Sign up with a test email
2. Check inbox for Resend welcome email (should arrive immediately)
3. Check spam folder for Supabase confirmation email
4. After configuring Supabase SMTP, both emails should arrive in inbox

