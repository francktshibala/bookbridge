# Auth Email Configuration Fix

## Issues Found

1. **Two Emails Being Sent**:
   - Supabase sends confirmation email (with actual verification link)
   - Resend sends welcome email (without verification link, just links to login)
   - This causes confusion and duplicate emails

2. **Wrong Redirect URL**:
   - Supabase redirects to `bookbridge-six.vercel.app` instead of `bookbridge.app`
   - This causes 404 errors and expired link issues

3. **Expired Links**:
   - Links expire because they point to wrong domain
   - Users can't verify their email

## Fixes Applied

### 1. Disabled Resend Welcome Email (in code)
- Commented out Resend email sending in signup page
- Supabase confirmation email is sufficient
- Can re-enable if needed later

### 2. Fixed Redirect URL in Code
- Updated signup to use `NEXT_PUBLIC_APP_URL` environment variable
- Falls back to `window.location.origin` if not set
- Ensures correct domain is used

### 3. Required Supabase Dashboard Configuration

**You must configure these in Supabase Dashboard:**

1. **Go to Supabase Dashboard → Authentication → URL Configuration**

2. **Set Site URL:**
   ```
   https://bookbridge.app
   ```

3. **Add Redirect URLs:**
   ```
   https://bookbridge.app/auth/callback
   https://bookbridge.app/**
   ```

4. **Email Templates → Confirm Signup:**
   - Check that redirect URL uses: `{{ .SiteURL }}/auth/callback?type=signup`
   - Or manually set: `https://bookbridge.app/auth/callback?type=signup`

5. **Environment Variables (Vercel):**
   ```
   NEXT_PUBLIC_APP_URL=https://bookbridge.app
   ```

## How It Works Now

1. **User signs up** → Supabase sends ONE confirmation email
2. **User clicks link** → Redirects to `https://bookbridge.app/auth/callback?code=...`
3. **Callback route** → Exchanges code for session
4. **User redirected** → To `/library?verified=true`

## Testing

1. Create new account
2. Check email - should receive ONE email from Supabase
3. Click confirmation link
4. Should redirect to `bookbridge.app/auth/callback` (not vercel.app)
5. Should successfully verify and redirect to library

## If Still Having Issues

1. **Check Supabase Dashboard**:
   - Authentication → URL Configuration
   - Make sure Site URL is `https://bookbridge.app`
   - Make sure redirect URLs include `https://bookbridge.app/auth/callback`

2. **Check Vercel Environment Variables**:
   - `NEXT_PUBLIC_APP_URL=https://bookbridge.app`

3. **Check Email Template**:
   - Supabase Dashboard → Authentication → Email Templates
   - Confirm Signup template should use `{{ .SiteURL }}/auth/callback`

4. **Clear Browser Cache**:
   - Old redirect URLs might be cached

