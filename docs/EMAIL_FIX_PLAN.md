# Email Fix Plan - Step by Step

## Problem Summary
- ❌ Confirmation emails not working
- ❌ Feedback emails not working (both widget and leave feedback)
- **Root Cause**: Likely `RESEND_API_KEY` missing in Vercel production environment

## Step-by-Step Fix Plan

### Step 1: Verify Environment Variable in Vercel ⚠️ CRITICAL
**Goal**: Check if `RESEND_API_KEY` is set in production

**Action**:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Look for `RESEND_API_KEY`
3. Check if it's set for Production environment
4. Value should be: `re_jcJmgbT8_Dx9TfC5gJfXPqDrdkb5QqKeT`

**If Missing**:
- Click "Add New"
- Key: `RESEND_API_KEY`
- Value: `re_jcJmgbT8_Dx9TfC5gJfXPqDrdkb5QqKeT`
- Select: Production, Preview, Development
- Click "Save"
- **Redeploy** (or wait for next deployment)

**Expected Result**: Variable exists in Vercel

---

### Step 2: Test Resend API Directly 🔍
**Goal**: Verify Resend API key works

**Action**: Use test endpoint
- Visit: `https://your-domain.com/api/test-email`
- Or run locally: `curl http://localhost:3000/api/test-email`

**Check Response**:
- ✅ Success: Email sent, check inbox
- ❌ Error: Check error message

**Expected Result**: Test email arrives in inbox

---

### Step 3: Fix Confirmation Emails 📧
**Goal**: Get signup confirmation emails working

**What to Check**:
1. Check Vercel logs after signup attempt
2. Look for `[send-confirmation]` logs
3. Check if `RESEND_API_KEY` is detected

**If Still Failing**:
- Check logs for specific error
- Verify user lookup works
- Verify link generation works

**Expected Result**: Confirmation email arrives after signup

---

### Step 4: Fix Feedback Emails 📬
**Goal**: Get feedback emails working again

**What to Check**:
1. Submit feedback via widget
2. Check Vercel logs for `[API /feedback]` logs
3. Check if `RESEND_API_KEY` is detected

**If Still Failing**:
- Check logs for specific error
- Verify email service is called
- Check Resend API response

**Expected Result**: Feedback email arrives after submission

---

## Diagnostic Endpoints

### Test Resend API
```
GET /api/test-email
```
Tests if Resend API key works

### Check Environment Variables (New - to create)
```
GET /api/check-env
```
Shows which env vars are set (without exposing values)

---

## Common Issues & Fixes

### Issue 1: RESEND_API_KEY Not Set in Vercel
**Symptom**: All emails fail, logs show "RESEND_API_KEY not configured"
**Fix**: Add variable in Vercel dashboard (Step 1)

### Issue 2: Wrong API Key
**Symptom**: Resend API returns 401/403 error
**Fix**: Verify API key in Resend dashboard, regenerate if needed

### Issue 3: Rate Limiting
**Symptom**: Resend API returns 429 error
**Fix**: Wait a few minutes, check Resend dashboard for limits

### Issue 4: Email Domain Not Verified
**Symptom**: Emails sent but not delivered
**Fix**: Verify domain in Resend dashboard (or use onboarding@resend.dev)

---

## Verification Checklist

- [ ] Step 1: RESEND_API_KEY exists in Vercel
- [ ] Step 2: Test email endpoint works
- [ ] Step 3: Confirmation emails work
- [ ] Step 4: Feedback emails work

---

## Next Steps After Fix

1. Monitor Resend dashboard for email delivery
2. Check Vercel logs for any errors
3. Test both features end-to-end
4. Document any remaining issues

