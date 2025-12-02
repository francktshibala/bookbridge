# Email Not Sending - Troubleshooting Guide

## Problem
Account created successfully, but no confirmation email received.

## Possible Causes

### 1. SMTP Configuration Not Active
**Check:** Supabase might not have saved/enabled SMTP settings

**Fix:**
- Go to Supabase Dashboard → Authentication → Email Templates
- Check if SMTP is actually enabled (should see "Custom SMTP" status)
- If not enabled, re-save SMTP settings
- Look for a toggle or "Enable Custom SMTP" button

### 2. SMTP Connection Failed
**Check:** Resend SMTP credentials might be wrong

**Fix:**
- Verify Resend API key is correct (from Resend dashboard)
- Try port `465` instead of `587` (or vice versa)
- Check username is exactly `resend` (lowercase)
- Verify host is exactly `smtp.resend.com`

### 3. Email Going to Spam
**Check:** Email might be delivered but filtered

**Fix:**
- Check spam/junk folder
- Check all email folders
- Wait 5-10 minutes (some providers delay)

### 4. Supabase Using Default Email Service
**Check:** SMTP might not be enabled, using Supabase default

**Fix:**
- Supabase default emails have low rate limits
- Must explicitly enable custom SMTP
- Check Supabase dashboard for SMTP status

### 5. Email Provider Blocking
**Check:** Resend might be blocking the connection

**Fix:**
- Check Resend dashboard → Emails (see if emails are being sent)
- Check Resend dashboard → Logs (see SMTP connection errors)
- Verify API key is active in Resend

## Step-by-Step Diagnosis

### Step 1: Verify SMTP is Enabled
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Look for "SMTP Settings" or "Custom SMTP"
3. Should show "Enabled" or "Active" status
4. If not, click "Enable" or "Save" again

### Step 2: Test SMTP Connection
1. In Supabase SMTP settings, look for "Test Connection" button
2. Click it - should show success or error
3. If error, check the error message

### Step 3: Check Resend Dashboard
1. Go to [Resend Dashboard](https://resend.com/emails)
2. Check "Emails" tab - see if any emails were sent
3. Check "Logs" tab - see SMTP connection attempts
4. If no emails, SMTP isn't working

### Step 4: Verify Credentials
Double-check these exact values:
- **Host:** `smtp.resend.com` (no http://, no trailing slash)
- **Port:** `587` (TLS) or `465` (SSL)
- **Username:** `resend` (lowercase, exactly)
- **Password:** Your full Resend API key (starts with `re_`)
- **Sender:** `onboarding@resend.dev` (or your verified domain)

### Step 5: Check Supabase Logs
1. Go to Supabase Dashboard → Logs
2. Filter for "auth" or "email"
3. Look for SMTP errors or email sending errors

## Quick Fixes

### Fix 1: Re-save SMTP Settings
Sometimes Supabase doesn't activate SMTP until you save twice:
1. Go to SMTP settings
2. Re-enter all values
3. Click "Save" or "Test Connection"
4. Wait 1-2 minutes
5. Try signup again

### Fix 2: Try Different Port
If port 587 doesn't work:
1. Change port to `465`
2. Save settings
3. Test again

### Fix 3: Use Resend API Directly (Temporary)
If SMTP keeps failing, we can send emails via Resend API:
- Already have Resend integration code
- Can generate confirmation links manually
- More reliable but requires code changes

## What to Check Right Now

1. **Supabase Dashboard:**
   - Authentication → Email Templates → SMTP Settings
   - Is SMTP enabled/active?
   - Any error messages?

2. **Resend Dashboard:**
   - [resend.com/emails](https://resend.com/emails)
   - Are any emails showing as sent?
   - Any errors in logs?

3. **Email Inbox:**
   - Check spam folder
   - Wait 5-10 minutes
   - Check all folders

## Next Steps

If SMTP still doesn't work:
1. We can implement Resend API fallback (send email directly)
2. Or use Supabase default emails temporarily
3. Or investigate Resend SMTP connection issues

Tell me what you find in Supabase and Resend dashboards.

