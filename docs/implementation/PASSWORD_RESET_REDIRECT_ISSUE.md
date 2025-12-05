# Password Reset Redirect Issue - Expert Investigation Needed

## 🎯 Problem Statement

**Issue**: When users click password reset links from email, they are redirected to `/auth/login` instead of `/auth/reset-password/confirm` to set their new password.

**Expected Behavior**: Click reset link → Redirect to `/auth/reset-password/confirm` → User sets new password → Redirect to login

**Actual Behavior**: Click reset link → Redirect to `/auth/login` with error message

**User Report**: "I got a reset email message, but when I click on it it takes me to the log in page, it does not take me where I should reset the password"

**Error URL Observed**: `https://bookbridge.app/auth/login#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`

---

## ✅ What Has Been Completed (Phase 2: Password Reset)

### **Phase 2 Implementation Status**: ✅ **COMPLETED** (except redirect issue)

1. **Email Service Function** ✅
   - `lib/services/auth-email-service.ts` - Added `sendPasswordResetEmail()` function
   - Neo-Classic styled email template matching signup confirmation emails

2. **API Route** ✅
   - `app/api/auth/send-password-reset/route.ts` - Generates reset link via Supabase Admin API
   - Uses `generateLink({ type: 'recovery' })` with `redirectTo: ${appUrl}/auth/callback?type=password_reset`
   - Sends email via Resend API

3. **Login Page Update** ✅
   - `app/auth/login/page.tsx` - Added "Forgot password?" link
   - Links to `/auth/reset-password`

4. **Reset Password Request Page** ✅
   - `app/auth/reset-password/page.tsx` - Email input form
   - Success state with confirmation message
   - PostHog tracking: `password_reset_requested`, `password_reset_email_sent`
   - Reads error messages from URL params

5. **Reset Password Confirmation Page** ✅
   - `app/auth/reset-password/confirm/page.tsx` - New password form
   - Password validation and confirmation matching
   - Session validation (checks for valid reset link)
   - PostHog tracking: `password_reset_completed`
   - Auto-redirect to login after success

6. **Callback Route Updates** ✅ (Partially - redirect detection failing)
   - `app/auth/callback/route.ts` - Attempted to handle `type=password_reset`
   - Error handling redirects password reset errors to `/auth/reset-password` (not login)

---

## 🔍 Attempts to Solve Redirect Issue

### **Attempt 1: URL Parameter Detection**
**What We Tried**: Check `type=password_reset` from URL query parameter
**Code**: `if (type === 'password_reset') { redirect to confirm page }`
**Result**: ❌ Failed - Parameter not preserved through Supabase redirect

### **Attempt 2: Error Message Detection**
**What We Tried**: Detect password reset from error description containing "password" or "reset"
**Code**: `errorDescription?.toLowerCase().includes('password')`
**Result**: ✅ Partial - Works for errors, but not for successful code exchange

### **Attempt 3: Session Type Detection**
**What We Tried**: Check `data.session?.type === 'recovery'`
**Code**: `const isPasswordReset = data.session?.type === 'recovery'`
**Result**: ❌ Failed - TypeScript error: `Property 'type' does not exist on type 'Session'`

### **Attempt 4: Hash Fragment Detection**
**What We Tried**: Check URL hash fragment for `type=password_reset`
**Code**: Parse `requestUrl.hash` for type parameter
**Result**: ❌ Still redirecting to login (current state)

---

## 📁 Relevant Files

### **Core Files**
1. **`app/auth/callback/route.ts`** - Main callback handler (needs fix)
   - Lines 7-125: Handles all auth callbacks
   - Lines 89-110: Password reset detection logic (currently failing)
   - Lines 100-104: Redirect logic based on `isPasswordReset` flag

2. **`app/api/auth/send-password-reset/route.ts`** - Generates reset links
   - Lines 54-60: Uses `generateLink({ type: 'recovery' })`
   - Line 58: Sets `redirectTo: ${appUrl}/auth/callback?type=password_reset`

3. **`app/auth/reset-password/confirm/page.tsx`** - Password reset confirmation page
   - Lines 14-20: Checks for valid session from reset link
   - Lines 22-30: Validates session exists before showing form

4. **`app/auth/reset-password/page.tsx`** - Request reset page
   - Lines 14-30: Reads error messages from URL params
   - Handles expired/invalid link errors

### **Related Files**
5. **`lib/services/auth-email-service.ts`** - Email sending service
   - Lines 161-258: `sendPasswordResetEmail()` function

6. **`app/auth/login/page.tsx`** - Login page with "Forgot password?" link
   - Line ~349: Link to `/auth/reset-password`

7. **`app/auth/signup/page.tsx`** - Reference for similar callback handling
   - Similar pattern for signup confirmation

---

## 🔬 Current Implementation Details

### **Reset Link Generation** (`app/api/auth/send-password-reset/route.ts`)
```typescript
const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
  type: 'recovery',
  email: email,
  options: {
    redirectTo: `${appUrl}/auth/callback?type=password_reset`,
  },
});
```

### **Callback Route Detection** (`app/auth/callback/route.ts`)
```typescript
// Current implementation (NOT WORKING)
const urlTypeParam = type || requestUrl.searchParams.get('type');
const hashParams = requestUrl.hash ? new URLSearchParams(requestUrl.hash.substring(1)) : null;
const hashType = hashParams?.get('type');
const isPasswordReset = urlTypeParam === 'password_reset' || hashType === 'password_reset';

if (isPasswordReset) {
  return NextResponse.redirect(`${baseUrl}/auth/reset-password/confirm`);
}
```

### **Problem**: 
- Supabase's `generateLink` with `type: 'recovery'` creates a link that redirects through Supabase's servers
- The `type=password_reset` query parameter is likely being stripped or not preserved
- When callback receives the code, it has no way to know this is a password reset vs signup

---

## 🎯 What Needs to Be Fixed

**Root Cause Hypothesis**: Supabase's password reset flow doesn't preserve custom query parameters through its redirect chain. The `type=password_reset` parameter is lost.

**Possible Solutions to Investigate**:

1. **Check Supabase Session Metadata**: After `exchangeCodeForSession`, check if session has recovery-specific metadata
2. **Use Different Redirect Pattern**: Store reset intent in a different way (cookie, session storage, or Supabase metadata)
3. **Check Auth State Change Events**: Listen for `PASSWORD_RECOVERY` event in auth state change (see `app/test-auth-monitor/page.tsx` line 125)
4. **Use Hash-Based Detection**: Supabase might put recovery info in URL hash differently
5. **Check User Metadata**: After code exchange, check if user needs password reset (e.g., `user.app_metadata` or `user.user_metadata`)

---

## 🛡️ Constraints - DO NOT BREAK

### **Working Features That Must Continue Working**:
1. ✅ **Signup Flow**: `/auth/signup` → Email confirmation → `/auth/callback?type=signup` → `/catalog`
2. ✅ **Email Verification**: Existing users verifying email → `/auth/callback` → `/catalog`
3. ✅ **Login Flow**: `/auth/login` → Works correctly
4. ✅ **Error Handling**: Expired links redirect with helpful messages
5. ✅ **PostHog Tracking**: All auth events tracked correctly

### **Architecture Patterns to Follow**:
- Service layer pattern (API routes handle business logic)
- Pure composition (pages dispatch to APIs)
- Neo-Classic styling (CSS variables, theme-aware)
- Single Source of Truth (Supabase Auth)

---

## 📊 Debugging Information Needed

**To Debug This Issue, Check**:
1. **Server Logs**: Look for `[auth/callback]` entries showing:
   - What `type` parameter is received (if any)
   - What `code` parameter looks like
   - Full callback URL structure
   - What `isPasswordReset` evaluates to

2. **Reset Link Structure**: Inspect the actual reset link from email:
   - Does it contain `type=password_reset`?
   - What does Supabase's redirect URL look like?
   - Is the parameter in query string or hash?

3. **Session After Exchange**: After `exchangeCodeForSession` succeeds:
   - What does `data.session` contain?
   - Are there any recovery-specific fields?
   - What does `data.user` metadata contain?

---

## 🎯 Expert Investigation Request

**Please investigate as an authentication expert and solve this issue:**

1. **Understand Supabase Recovery Flow**: How does Supabase handle password reset links internally?
2. **Identify Detection Method**: Find a reliable way to detect password reset sessions vs signup sessions
3. **Implement Fix**: Update `app/auth/callback/route.ts` to correctly detect and redirect password resets
4. **Test Thoroughly**: Ensure signup flow, email verification, and error handling still work
5. **Add Logging**: Include detailed logging to help debug future issues

**Key Question**: How can we reliably detect that a callback is from a password reset link vs a signup confirmation link when Supabase doesn't preserve our custom `type` parameter?

---

## 📝 Related Documentation

- **Architecture Patterns**: `docs/implementation/FEATURED_BOOKS_REFACTOR_PLAN.md` - Service layer, pure composition
- **Email Service**: `lib/services/auth-email-service.ts` - Resend integration
- **Auth Plan**: `docs/implementation/AUTHENTICATION_RELIABILITY_PLAN.md` - Overall auth reliability plan
- **Supabase Auth**: `lib/supabase/server.ts` and `lib/supabase/client.ts` - Supabase client setup

---

## ✅ Success Criteria

**Fix is successful when**:
1. ✅ User clicks password reset link from email
2. ✅ Redirects to `/auth/reset-password/confirm` (not login)
3. ✅ User can set new password
4. ✅ Redirects to login with success message
5. ✅ User can log in with new password
6. ✅ Signup flow still works (no regression)
7. ✅ Email verification flow still works (no regression)
8. ✅ Error handling still works (no regression)

---

**Status**: 🔴 **BLOCKING** - Password reset feature incomplete due to redirect issue
**Priority**: **HIGH** - Users cannot reset passwords, blocking account recovery
**Next Step**: Expert investigation needed to find reliable detection method

---

## 📄 Current File Contents

### **`app/auth/callback/route.ts`** (Current Implementation)
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('[auth/callback] 📧 Callback received:', {
    code: code ? 'present' : 'missing',
    type,
    error,
    errorDescription,
    origin: requestUrl.origin,
    fullUrl: requestUrl.toString(),
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;

  // Handle errors
  if (error) {
    const isPasswordReset = type === 'password_reset' || 
                            requestUrl.searchParams.get('type') === 'password_reset' ||
                            errorDescription?.toLowerCase().includes('password') ||
                            errorDescription?.toLowerCase().includes('reset');
    
    if (error === 'access_denied' && errorDescription?.includes('expired')) {
      if (isPasswordReset) {
        return NextResponse.redirect(
          `${baseUrl}/auth/reset-password?error=expired_link&message=${encodeURIComponent('Your password reset link has expired. Please request a new one.')}`
        );
      } else {
        return NextResponse.redirect(
          `${baseUrl}/auth/login?error=expired_link&message=${encodeURIComponent('Your verification link has expired. Please request a new confirmation email.')}`
        );
      }
    }
    
    const errorMsg = errorDescription || error;
    if (isPasswordReset) {
      return NextResponse.redirect(
        `${baseUrl}/auth/reset-password?error=${encodeURIComponent(errorMsg)}&message=${encodeURIComponent('Invalid or expired password reset link. Please request a new one.')}`
      );
    } else {
      return NextResponse.redirect(
        `${baseUrl}/auth/login?error=${encodeURIComponent(errorMsg)}`
      );
    }
  }

  // Handle code exchange
  if (code) {
    const supabase = await createClient();
    
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError);
        
        if (exchangeError.message?.includes('expired') || exchangeError.message?.includes('invalid')) {
          return NextResponse.redirect(
            `${baseUrl}/auth/login?error=expired_link&message=${encodeURIComponent('Your verification link has expired. Please request a new confirmation email.')}`
          );
        }
        
        return NextResponse.redirect(
          `${baseUrl}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
        );
      }

      if (data?.user) {
        console.log('[auth/callback] ✅ Session created successfully:', {
          userId: data.user.id,
          email: data.user.email,
          type,
          fullUrl: requestUrl.toString(),
        });
        
        // ⚠️ THIS IS WHERE THE PROBLEM IS - Detection not working
        const urlTypeParam = type || requestUrl.searchParams.get('type');
        const hashParams = requestUrl.hash ? new URLSearchParams(requestUrl.hash.substring(1)) : null;
        const hashType = hashParams?.get('type');
        const isPasswordReset = urlTypeParam === 'password_reset' || hashType === 'password_reset';
        
        console.log('[auth/callback] 🔍 Password reset detection:', {
          urlType: type,
          queryType: requestUrl.searchParams.get('type'),
          hashType: hashType,
          isPasswordReset,
        });
        
        if (isPasswordReset) {
          const resetUrl = `${baseUrl}/auth/reset-password/confirm`;
          console.log('[auth/callback] 🔗 Redirecting to password reset confirmation:', resetUrl);
          return NextResponse.redirect(resetUrl);
        } else {
          const redirectUrl = `${baseUrl}/catalog?verified=true`;
          console.log('[auth/callback] 🔗 Redirecting to:', redirectUrl);
          return NextResponse.redirect(redirectUrl);
        }
      } else {
        console.warn('[auth/callback] ⚠️ No user data after code exchange');
        return NextResponse.redirect(`${baseUrl}/auth/login?error=no_user_data`);
      }
    } catch (err) {
      console.error('Unexpected error in auth callback:', err);
      return NextResponse.redirect(
        `${baseUrl}/auth/login?error=unexpected_error`
      );
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${baseUrl}/auth/login`);
}
```

### **`app/api/auth/send-password-reset/route.ts`** (Reset Link Generation)
```typescript
// Generate password reset link using Supabase Admin API
const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'recovery', // Password reset type
  email: email,
  options: {
    redirectTo: `${appUrl}/auth/callback?type=password_reset`,
  },
});

// Link is sent via Resend email service
await sendPasswordResetEmail({
  email,
  resetLink: linkData.properties.action_link, // Real Supabase reset link
});
```

### **`app/auth/reset-password/confirm/page.tsx`** (Confirmation Page)
- Checks for valid session: `const { data: { session } } = await supabase.auth.getSession()`
- If no session, shows error: "Invalid or expired password reset link"
- If session exists, shows password form
- On submit, calls `supabase.auth.updateUser({ password })`
- Tracks `password_reset_completed` event
- Redirects to login after success

---

## 🔍 Key Investigation Points

1. **Supabase Recovery Flow**: How does Supabase's `generateLink({ type: 'recovery' })` work internally?
2. **Session Metadata**: What does `data.session` contain after `exchangeCodeForSession` for recovery links?
3. **User Metadata**: Does `data.user` have any recovery-specific metadata?
4. **Auth State Events**: Can we detect `PASSWORD_RECOVERY` event before redirect?
5. **URL Structure**: What does the actual reset link URL look like? (Check email or server logs)

---

## 💡 Potential Solutions to Explore

1. **Store Reset Intent in Cookie**: Set cookie before redirect, check in callback
2. **Use Supabase Metadata**: Store reset intent in user metadata before sending link
3. **Check Recovery Token**: Supabase recovery sessions might have specific token structure
4. **Different Redirect Pattern**: Use separate callback route `/auth/reset-callback` instead of `/auth/callback`
5. **Client-Side Detection**: Check auth state change event `PASSWORD_RECOVERY` and redirect client-side

---

**Expert Task**: Investigate Supabase's password recovery flow, find reliable detection method, implement fix without breaking existing signup/verification flows.

