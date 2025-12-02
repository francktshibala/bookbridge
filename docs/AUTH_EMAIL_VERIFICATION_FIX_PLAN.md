# Email Verification Fix Plan

## Problem Analysis

**Current Issue:**
- User receives Supabase confirmation email ✅
- Email link redirects to `http://localhost:3000/auth/callback` ❌
- Should redirect to `https://bookbridge.app/auth/callback` ✅

**Root Cause:**
1. `NEXT_PUBLIC_APP_URL` not set in production (Render)
2. Code falls back to `window.location.origin` which might be wrong
3. Supabase Site URL might not be configured correctly
4. Supabase validates redirect URLs against Site URL and allowed redirect URLs

**Email Link Structure:**
```
https://[project].supabase.co/auth/v1/verify?token=...&redirect_to=http://localhost:3000/auth/callback?type=signup
```

## Solution Plan

### Phase 1: Fix Code (Immediate)

**1.1 Improve URL Detection**
- Detect production vs development better
- Use environment-aware URL selection
- Add fallback chain: `NEXT_PUBLIC_APP_URL` → `VERCEL_URL` → detect from request

**1.2 Server-Side URL Detection**
- For signup, detect the actual production URL
- Don't rely on client-side `window.location.origin` in production

### Phase 2: Supabase Configuration (Required)

**2.1 Set Supabase Site URL**
- Go to Supabase Dashboard → Authentication → URL Configuration
- Set Site URL: `https://bookbridge.app`
- This is the base URL Supabase uses for redirects

**2.2 Configure Allowed Redirect URLs**
- Add to Redirect URLs list:
  ```
  https://bookbridge.app/auth/callback
  https://bookbridge.app/**
  http://localhost:3000/auth/callback  (for local dev)
  ```

**2.3 Update Email Template (Optional)**
- Go to Authentication → Email Templates → Confirm Signup
- Ensure it uses: `{{ .SiteURL }}/auth/callback?type=signup`
- Or use: `{{ .ConfirmationURL }}` which includes the redirect_to parameter

### Phase 3: Environment Variables (Required)

**3.1 Render Environment Variables**
Add to Render dashboard:
```
NEXT_PUBLIC_APP_URL=https://bookbridge.app
```

**3.2 Local Development (.env.local)**
Already set:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Phase 4: Testing Strategy

**4.1 Local Testing**
1. Sign up locally → should use `localhost:3000`
2. Check email link → should redirect to `localhost:3000/auth/callback`
3. Verify it works

**4.2 Production Testing**
1. Set `NEXT_PUBLIC_APP_URL` in Render
2. Configure Supabase Site URL and redirect URLs
3. Sign up from production → should use `bookbridge.app`
4. Check email link → should redirect to `bookbridge.app/auth/callback`
5. Verify it works

## Implementation Steps

### Step 1: Fix Code (Do First)

Update `app/auth/signup/page.tsx` to better detect production URL:

```typescript
// Better URL detection
const getAppUrl = () => {
  // 1. Check explicit env var (highest priority)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // 2. Check Vercel URL (if on Vercel)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  // 3. Check if we're in production (not localhost)
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // If not localhost, use it (production)
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin;
    }
  }
  
  // 4. Fallback to localhost for dev
  return 'http://localhost:3000';
};
```

### Step 2: Configure Supabase (Do Second)

1. **Site URL:**
   - Supabase Dashboard → Authentication → URL Configuration
   - Site URL: `https://bookbridge.app`

2. **Redirect URLs:**
   - Add: `https://bookbridge.app/auth/callback`
   - Add: `https://bookbridge.app/**`
   - Add: `http://localhost:3000/auth/callback` (for dev)

### Step 3: Set Environment Variable (Do Third)

**Render Dashboard:**
- Environment → Add Variable
- Key: `NEXT_PUBLIC_APP_URL`
- Value: `https://bookbridge.app`
- Redeploy

### Step 4: Test (Do Last)

1. **Local:**
   - Sign up → check email → link should go to `localhost:3000`

2. **Production:**
   - Sign up → check email → link should go to `bookbridge.app`
   - Click link → should verify and redirect to library

## Why This Happened

1. **Original Implementation:**
   - Used Supabase default emails (went to spam)
   - Added Resend for better deliverability (but didn't include verification link)

2. **Current Issue:**
   - Disabled Resend email (good)
   - But `emailRedirectTo` uses `window.location.origin` which can be wrong
   - Supabase Site URL not configured → validates against wrong domain

3. **Fix:**
   - Better URL detection in code
   - Configure Supabase properly
   - Set environment variable

## Verification Checklist

- [ ] Code updated with better URL detection
- [ ] Supabase Site URL set to `https://bookbridge.app`
- [ ] Supabase redirect URLs include `https://bookbridge.app/auth/callback`
- [ ] `NEXT_PUBLIC_APP_URL` set in Render
- [ ] Local testing works (localhost redirects)
- [ ] Production testing works (bookbridge.app redirects)
- [ ] Email verification completes successfully

## Notes

- Supabase validates redirect URLs against Site URL and allowed redirect URLs list
- If redirect URL doesn't match, Supabase will reject it
- `emailRedirectTo` parameter in signup is what gets embedded in the email link
- Supabase Site URL is used as fallback if redirect URL is invalid

