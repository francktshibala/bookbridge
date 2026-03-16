# Authentication Sprint Plan
**Goal**: Add Google Sign-In + Fix Password Reset Email Flow
**Branch**: `feature/auth-improvements`
**Status**: 🟢 Complete — pending final regression tests

---

## Branch Setup

- [x] Create branch: `git checkout -b feature/auth-improvements`

---

## Task 1: Fix Password Reset Email Flow (Priority: HIGH)

**Root Cause (Diagnosed & Fixed)**
The reset route was using `supabase.auth.resetPasswordForEmail()` which goes through Supabase's built-in SMTP — emails never arrived. Signup works because it explicitly calls Resend. Password reset was missing that same Resend integration.

**The Fix**
Rewrote `send-password-reset/route.ts` to mirror the signup pattern: generate the link via Admin API, send via Resend.

### Step 1 — Rewrite reset API route to use Resend ✅
- [x] File: `app/api/auth/send-password-reset/route.ts`
- [x] Replaced `supabase.auth.resetPasswordForEmail()` with Admin API + Resend
- [x] `redirectTo` points to `${appUrl}/auth/callback/reset`
- [x] Added `export const runtime = 'nodejs'` (required for Resend)

### Step 2 — Verify confirm page and dedicated reset callback ✅
- [x] `/app/auth/callback/reset/route.ts` — correct, no changes needed
- [x] `/app/auth/reset-password/confirm/page.tsx` — correct, no changes needed

### Step 3 — Clean up dead detection code in shared callback
- [ ] File: `app/auth/callback/route.ts`
- [ ] Remove the `isPasswordReset` detection block (lines ~325–345) — no longer needed
- [ ] Keep error handling for expired links

### Step 4 — Test password reset end-to-end
- [x] Request password reset with test email
- [x] Confirm email arrives (Resend dashboard or inbox)
- [x] Click reset link → lands on `/auth/reset-password/confirm` (not login)
- [x] Set new password → redirects to login with success message
- [x] Log in with new password successfully
- [ ] **Regression**: Confirm signup confirmation emails still work
- [ ] **Regression**: Confirm login flow still works

---

## Task 2: Implement Google Sign-In

### Step 1 — Configure Google OAuth (Manual — outside code)
- [x] Go to [Google Cloud Console](https://console.cloud.google.com) → Create OAuth 2.0 credentials
- [x] Set Authorized Redirect URI to: `https://xsolwqqdbsuydwmmwtsl.supabase.co/auth/v1/callback`
- [x] Copy Client ID and Client Secret
- [x] Go to Supabase Dashboard → Authentication → Providers → Google
- [x] Enable Google provider and paste Client ID + Client Secret
- [x] Save

### Step 2 — Verify the auth callback handles OAuth
- [x] File: `app/auth/callback/route.ts`
- [x] The existing `exchangeCodeForSession(code)` already handles OAuth codes — no changes needed here
- [x] Confirm redirect after Google login goes to `/catalog` (same as email login) ✅

### Step 3 — Create the Google Sign-In button component
- [x] Create file: `components/auth/GoogleSignInButton.tsx`
- [x] Calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '${appUrl}/auth/callback' } })`
- [x] Style: matches the existing Neo-Classic design system (CSS variables, theme-aware)
- [x] Shows Google logo + "Continue with Google" text
- [x] Handles loading state during redirect

### Step 4 — Add button to Login page
- [x] File: `app/auth/login/page.tsx`
- [x] Add visual divider: "— or —" between Google button and email/password form
- [x] Place `<GoogleSignInButton />` above the divider
- [x] Add PostHog tracking: `google_signin_attempted` on click

### Step 5 — Add button to Signup page
- [x] File: `app/auth/signup/page.tsx`
- [x] Same divider pattern as login page
- [x] Place `<GoogleSignInButton />` above the divider
- [x] Add PostHog tracking: `google_signup_attempted` on click

### Step 6 — Test Google Sign-In end-to-end
- [x] New user: Sign up with Google → confirm user appears in Supabase users table
- [x] Returning user: Sign in with Google → confirm redirected to `/catalog`
- [ ] Verify no duplicate users created for same Google account
- [ ] Test on mobile viewport
- [ ] **Regression**: Confirm email/password login still works

---

## Final Checklist Before Merging to Main

- [ ] All tasks above checked off
- [ ] No TypeScript errors (`npm run build` passes)
- [ ] Password reset flow works end-to-end
- [ ] Google Sign-In works for new and returning users
- [ ] Signup email confirmation still works (no regression)
- [ ] Login with email/password still works (no regression)
- [ ] Open PR from `feature/auth-improvements` → `main`
- [ ] Merge after review

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/api/auth/send-password-reset/route.ts` | Generates reset link — **needs redirectTo fix** |
| `app/auth/callback/reset/route.ts` | Dedicated reset callback — already correct |
| `app/auth/callback/route.ts` | Shared callback — needs dead code removed |
| `app/auth/reset-password/confirm/page.tsx` | Password form after clicking reset link |
| `app/auth/login/page.tsx` | Login page — needs Google button |
| `app/auth/signup/page.tsx` | Signup page — needs Google button |
| `components/auth/GoogleSignInButton.tsx` | **New file** — Google OAuth button |
| `lib/supabase/client.ts` | Browser Supabase client (used for OAuth call) |

---

## Known Constraints — Do Not Break

1. ✅ Signup flow: `/auth/signup` → email confirmation → `/auth/callback` → `/catalog`
2. ✅ Login flow: `/auth/login` → works correctly
3. ✅ PostHog tracking on all auth events
4. ✅ Neo-Classic styling (CSS variables, theme-aware components)
5. ✅ Error handling: expired links redirect with helpful messages
