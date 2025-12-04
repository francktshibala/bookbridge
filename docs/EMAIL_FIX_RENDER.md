# Email Fix Plan for Render

## Problem Summary
- ❌ Confirmation emails not working
- ❌ Feedback emails not working
- **Root Cause**: `RESEND_API_KEY` might not be set in Render production environment

## Step-by-Step Fix Plan

### Step 1: Check Environment Variables in Render ⚠️ CRITICAL

**Action**:
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your BookBridge service
3. Go to **Environment** tab (left sidebar)
4. Look for `RESEND_API_KEY` in the list

**If Missing**:
- Click **"Add Environment Variable"** or **"Add Variable"**
- Key: `RESEND_API_KEY`
- Value: `re_jcJmgbT8_Dx9TfC5gJfXPqDrdkb5QqKeT`
- Click **"Save Changes"**
- Render will automatically redeploy

**If Exists**:
- Verify the value is correct: `re_jcJmgbT8_Dx9TfC5gJfXPqDrdkb5QqKeT`
- If wrong, click edit and update it
- Click **"Save Changes"**

---

### Step 2: Verify Deployment Restarted

**Action**:
1. After saving environment variables, Render should show "Deploying..."
2. Wait for deployment to complete (usually 2-5 minutes)
3. Check the **Events** or **Logs** tab to see deployment status

**Expected**: Deployment completes successfully

---

### Step 3: Test Environment Variable Access

**After deployment completes**, visit:
```
https://your-render-domain.onrender.com/api/check-env
```

**Expected Response**:
```json
{
  "success": true,
  "checks": {
    "resend": {
      "configured": true,
      "length": 40,
      "prefix": "re_jcJmg..."
    }
  }
}
```

**If `resend.configured` is `false`**:
- Variable might not be saved correctly
- Try removing and re-adding it
- Redeploy manually if needed

---

### Step 4: Test Resend API Directly

**Visit**:
```
https://your-render-domain.onrender.com/api/test-email
```

**Expected**:
- Success response
- Email arrives at `franck1tshibala@gmail.com` (check spam folder)

**If it fails**, check the error message in the response.

---

### Step 5: Check Render Logs

**After trying to send an email** (signup or feedback):

1. Go to Render Dashboard → Your Service → **Logs** tab
2. Look for recent log entries
3. Search for:
   - `[send-confirmation]` (for signup)
   - `[API /feedback]` (for feedback)
   - `[EmailService]`
   - `[AuthEmailService]`

**What to look for**:
- `hasApiKey: false` → Variable not accessible
- `RESEND_API_KEY not configured` → Variable missing
- Resend API errors → Check error message

---

## Common Issues & Fixes

### Issue 1: Variable Not Saved
**Symptom**: Variable shows in UI but `resend.configured: false`
**Fix**: 
- Remove the variable
- Add it again
- Save and wait for redeploy

### Issue 2: Deployment Not Restarted
**Symptom**: Variable added but old code still running
**Fix**: 
- Go to **Manual Deploy** → **Deploy latest commit**
- Or wait for auto-deploy (should happen automatically)

### Issue 3: Wrong Environment
**Symptom**: Variable set but not accessible
**Fix**: 
- Make sure you're editing the **Production** service
- Not a preview/staging service

### Issue 4: Resend API Key Invalid
**Symptom**: `/api/test-email` returns 401/403 error
**Fix**: 
- Check Resend dashboard
- Verify API key is active
- Regenerate if needed

---

## Render-Specific Notes

1. **Auto-Redeploy**: Render automatically redeploys when you save environment variables
2. **Build Time**: Environment variables are available at build time and runtime
3. **Logs**: Check Render logs tab for real-time output
4. **Manual Deploy**: If needed, trigger manual deploy from dashboard

---

## Verification Checklist

- [ ] Step 1: `RESEND_API_KEY` exists in Render Environment tab
- [ ] Step 2: Deployment completed successfully
- [ ] Step 3: `/api/check-env` shows `resend.configured: true`
- [ ] Step 4: `/api/test-email` sends email successfully
- [ ] Step 5: Check logs for any errors

---

## Next Steps

1. ✅ Check Render Environment tab for `RESEND_API_KEY`
2. ⏳ Save if missing or incorrect
3. ⏳ Wait for deployment (2-5 minutes)
4. ⏳ Test `/api/check-env` endpoint
5. ⏳ Test `/api/test-email` endpoint
6. ⏳ Check Render logs after trying signup/feedback

---

## If Still Not Working

After completing all steps:

1. Share response from `/api/check-env`
2. Share response from `/api/test-email`
3. Share relevant Render log entries
4. Check Resend dashboard → Logs for errors

