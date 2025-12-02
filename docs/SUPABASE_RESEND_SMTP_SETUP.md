# Supabase SMTP Configuration with Resend

## Why This Setup?

- ✅ **Professional email design** (Resend templates)
- ✅ **Fast delivery** (seconds instead of minutes)
- ✅ **Better deliverability** (less spam)
- ✅ **No code changes** (Supabase handles everything)

## Step-by-Step Instructions

### Step 1: Get Resend SMTP Credentials

1. Go to [Resend Dashboard](https://resend.com/emails)
2. Navigate to **Settings** → **SMTP**
3. Copy these values:
   - **Host:** `smtp.resend.com`
   - **Port:** `587` (TLS) or `465` (SSL)
   - **Username:** `resend`
   - **Password:** Your Resend API key (starts with `re_`)

### Step 2: Configure Supabase SMTP

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Email Templates**
4. Click **"SMTP Settings"** (top right or in settings)
5. Fill in the form:

   **SMTP Host:**
   ```
   smtp.resend.com
   ```

   **SMTP Port:**
   ```
   587
   ```
   (or `465` for SSL)

   **SMTP User:**
   ```
   resend
   ```

   **SMTP Password:**
   ```
   [Your Resend API key - starts with re_]
   ```

   **Sender Email:**
   ```
   BookBridge <onboarding@resend.dev>
   ```
   (or your verified domain if you have one)

   **Sender Name:**
   ```
   BookBridge
   ```

6. Click **"Save"** or **"Test Connection"** first to verify

### Step 3: Customize Email Template (Optional)

1. Still in **Authentication** → **Email Templates**
2. Click **"Confirm Signup"** template
3. Customize the design to match your brand
4. Use template variables:
   - `{{ .ConfirmationURL }}` - The verification link
   - `{{ .SiteURL }}` - Your site URL (bookbridge.app)
   - `{{ .Email }}` - User's email

### Step 4: Test

1. Sign up with a test email
2. Check inbox - should arrive in **seconds** (not minutes)
3. Email should look professional (Resend design)
4. Click link - should verify and redirect to `/catalog`

## Troubleshooting

**Email not arriving:**
- Check Resend dashboard → Emails (see delivery status)
- Verify SMTP credentials are correct
- Check spam folder

**Connection test fails:**
- Verify port: `587` for TLS or `465` for SSL
- Check Resend API key is correct
- Ensure no firewall blocking SMTP

**Still slow delivery:**
- Check Resend dashboard for delivery logs
- Some email providers (corporate) may delay emails
- Resend typically delivers in <10 seconds

## Result

After setup:
- ✅ Confirmation emails use Resend SMTP
- ✅ Professional design
- ✅ Fast delivery (seconds)
- ✅ Better inbox rates
- ✅ No code changes needed

## Notes

- Supabase still handles the auth flow
- Resend just provides the email delivery
- You can customize templates in Supabase dashboard
- All auth emails (signup, password reset) will use Resend

