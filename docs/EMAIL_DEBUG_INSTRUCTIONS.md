# Email Debugging Instructions for GPT Agent

## Problem
Confirmation emails are not appearing in Resend dashboard after signup, even though:
- Resend API fallback code is implemented
- Code is deployed to production
- Supabase SMTP is configured correctly

## Current Implementation

### Code Flow
1. User signs up → `app/auth/signup/page.tsx`
2. Account created in Supabase
3. Frontend calls `/api/auth/send-confirmation`
4. API route generates Supabase confirmation link
5. Sends email via Resend API

### Files Involved
- `app/api/auth/send-confirmation/route.ts` - API endpoint
- `lib/services/auth-email-service.ts` - Resend email service
- `app/auth/signup/page.tsx` - Signup page (calls API)

## Debugging Steps

### 1. Check if API Route is Being Called
- Open browser DevTools → Network tab
- Create a new account
- Look for `/api/auth/send-confirmation` request
- Check:
  - Is the request being made?
  - What's the response status?
  - What's the response body?

### 2. Check Server Logs
- Check Vercel logs (if deployed)
- Look for console.log statements:
  - `[send-confirmation] ✅ Confirmation email sent via Resend to:`
  - `[AuthEmailService] ✅ Confirmation email sent successfully to:`
  - Any error messages

### 3. Verify Environment Variables
Check if `RESEND_API_KEY` is set in production:
- Vercel Dashboard → Settings → Environment Variables
- Should be: `re_jcJmgbT8_Dx9TfC5gJfXPqDrdkb5QqKeT`
- Make sure it's set for Production environment

### 4. Test Resend API Directly
Use the test endpoint:
```bash
curl -X POST https://your-domain.com/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

### 5. Check Resend Dashboard
- Go to resend.com/emails
- Check if ANY emails are being sent
- Check Logs tab for errors
- Verify API key is active

## Potential Issues

### Issue 1: API Route Not Being Called
**Symptoms:** No `/api/auth/send-confirmation` request in Network tab
**Fix:** Check signup page code - ensure fetch call is not commented out

### Issue 2: Environment Variable Missing
**Symptoms:** API returns 500 error, logs show "RESEND_API_KEY not configured"
**Fix:** Add `RESEND_API_KEY` to Vercel environment variables

### Issue 3: User Not Found Error
**Symptoms:** API returns 404 "User not found"
**Fix:** The user lookup might be failing. Check if user exists in Supabase before calling API

### Issue 4: Resend API Error
**Symptoms:** Resend throws error, email not sent
**Fix:** Check Resend dashboard logs, verify API key is correct

### Issue 5: Silent Failure
**Symptoms:** No errors, but no email sent
**Fix:** Add more logging, check if `sendSignupConfirmationEmail` is actually being called

## Code to Check

### In `app/api/auth/send-confirmation/route.ts`:
- Line 37: `listUsers()` - might fail if user just created
- Line 54: User lookup by email - might not find user immediately
- Line 65: `generateLink()` - might fail if password is wrong format
- Line 89: `sendSignupConfirmationEmail()` - actual Resend call

### In `lib/services/auth-email-service.ts`:
- Line 46: Check if `RESEND_API_KEY` exists
- Line 120: `resend.emails.send()` - actual API call

## Recommended Fixes

### Fix 1: Add More Logging
Add console.log statements at each step to see where it fails:
```typescript
console.log('[send-confirmation] Step 1: Received request for:', email);
console.log('[send-confirmation] Step 2: Listing users...');
console.log('[send-confirmation] Step 3: Found user:', user?.id);
console.log('[send-confirmation] Step 4: Generating link...');
console.log('[send-confirmation] Step 5: Sending email...');
```

### Fix 2: Handle User Not Found Better
The user might not exist immediately after signup. Add retry logic or wait a bit:
```typescript
// Wait 1 second for user to be created
await new Promise(resolve => setTimeout(resolve, 1000));
```

### Fix 3: Simplify User Lookup
Instead of listing all users, use Supabase admin API to get user by email directly:
```typescript
const { data: user, error } = await supabaseAdmin.auth.admin.getUserByEmail(email);
```

### Fix 4: Test Resend Directly
Create a simple test endpoint that sends email without Supabase:
```typescript
// Test if Resend works at all
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: 'BookBridge <onboarding@resend.dev>',
  to: email,
  subject: 'Test Email',
  html: '<p>Test</p>',
});
```

## Next Steps

1. **Check Vercel logs** - See what errors are happening
2. **Add more logging** - Track each step of the process
3. **Test Resend API directly** - Verify API key works
4. **Check user creation timing** - User might not exist immediately
5. **Verify environment variables** - Make sure RESEND_API_KEY is set in production

## Files to Modify

1. `app/api/auth/send-confirmation/route.ts` - Add logging, fix user lookup
2. `lib/services/auth-email-service.ts` - Add error handling, logging
3. `app/auth/signup/page.tsx` - Add error logging for API call

## Expected Behavior

After signup:
1. User account created in Supabase ✅
2. Frontend calls `/api/auth/send-confirmation` ✅
3. API finds user in Supabase ✅
4. API generates confirmation link ✅
5. API sends email via Resend ✅
6. Email appears in Resend dashboard ✅
7. User receives email ✅

If any step fails, check logs to see where.

