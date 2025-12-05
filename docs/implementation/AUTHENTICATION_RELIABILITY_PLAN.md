# Authentication Reliability & Conversion Tracking Implementation Plan

## 📚 Context & Goals

### **Current State**
- ✅ Email confirmation working (Resend API sending emails successfully)
- ✅ PostHog foundation implemented (Increment 1 complete)
- ✅ Basic signup tracking (`trackSignupStarted`, `trackUserSignedUp`, `trackSignupAbandoned`)
- ❌ **Password not saved** when Supabase signup fails with email error
- ❌ **No password reset** functionality
- ❌ **Email verification not tracked** in PostHog
- ❌ **Incomplete conversion funnel** measurement

### **End Goal**
**Reliable authentication system with full conversion tracking:**
- Users can sign up, confirm email, and log in with password reliably
- Password reset available for account recovery
- Complete conversion funnel tracking (Signup → Email Verified → First Login → First Use → Wow → Retention)
- Measure and optimize signup funnel drop-offs

### **PostHog Integration Goals**
Track all 4 conversion gates as defined in `POSTHOG_ANALYTICS_IMPLEMENTATION_PLAN.md`:
- **Gate 1 – Signup**: Signup Started → Signup Submitted → Email Sent → Email Verified → First Login
- **Gate 2 – First Use**: First Book Opened, First Chapter Started
- **Gate 3 – Wow Moment**: Chapter Completed, AI Simplification Used, Audio Played
- **Gate 4 – Retention**: Daily/Weekly Return, Book Continued, Subscription Upgraded

**Target Conversion Rates** (from PostHog plan):
- Signup → First Use: **70%**
- First Use → Wow: **55%**
- Wow → D7 Retention: **50%**
- Overall Signup → D7: **≥19%**

---

## 🔗 Related Documentation

### **Email Confirmation Fixes** (Foundation - Already Implemented)
- **`docs/research/CONFIRMATION_EMAIL_SOLUTION.md`** - Root cause analysis and solution for email delivery failures
- **`docs/research/CONFIRMATION_EMAIL_FINAL_PLAN.md`** - Action plan for email confirmation fixes (Fix 1 ✅, Fix 2 ⏳)
- **`docs/research/Agent1_Email_Service_Findings.md`** - Resend API restrictions and domain verification requirements
- **`docs/research/Agent2_Supabase_Auth_Findings.md`** - Supabase auth API usage patterns and best practices
- **`docs/research/SPF_VERIFICATION_INVESTIGATION.md`** - DNS migration to Cloudflare and domain verification status

### **PostHog Analytics** (Tracking Foundation)
- **`docs/research/POSTHOG_ANALYTICS_IMPLEMENTATION_PLAN.md`** - Complete PostHog implementation strategy with 4 conversion gates
- **`docs/research/POSTHOG_ANALYTICS_INCREMENTAL_PLAN.md`** - Detailed 2-3 day increment breakdown
- **`lib/analytics/posthog.ts`** - PostHog event tracking utilities (Gate 1 events already implemented)

### **Current Implementation Files**
- **`app/auth/signup/page.tsx`** - Signup form with PostHog tracking (needs password saving fix)
- **`app/auth/login/page.tsx`** - Login form (needs password reset link)
- **`app/auth/callback/route.ts`** - Email confirmation callback (needs `trackEmailVerified` call)
- **`app/api/auth/send-confirmation/route.ts`** - Resend API integration (working ✅)

---

## 🎯 Implementation Phases

### **Phase 1: Fix Password Saving** ✅ **COMPLETED**
**Goal**: Ensure password is saved even when Supabase email sending fails

**Status**: ✅ **COMPLETE** - Password saving working, login successful in production

**Solution Implemented**:
1. Created `/api/auth/create-user` endpoint using Supabase Admin API
2. Signup flow now ensures password is saved via Admin API if Supabase signup fails
3. Added PostHog tracking for password save events

**Files Modified**:
- ✅ `app/auth/signup/page.tsx` - Added password verification/fallback logic
- ✅ `app/api/auth/create-user/route.ts` - New endpoint to ensure password saved
- ✅ `lib/analytics/posthog.ts` - Added `trackPasswordSaved` function

**PostHog Events**:
- ✅ `signup_password_saved` - Tracking successful password creation
- ✅ `signup_password_failed` - Tracking password save failures

**Success Criteria**:
- ✅ User can log in with password after signup (even if email failed) - **VERIFIED IN PRODUCTION**
- ⚠️ Email delivery still failing (separate issue - Resend domain verification needed)

---

### **Phase 2: Add Password Reset** (Priority 2 - Recovery Path) ⚠️ **PARTIALLY COMPLETE**
**Goal**: Allow users to reset forgotten passwords

**Status**: 🔴 **BLOCKING ISSUE** - Reset links redirect to login instead of confirm page

**Implementation**:
1. ✅ Add "Forgot password?" link on login page
2. ✅ Create `/auth/reset-password` page with email input
3. ✅ Create `/api/auth/send-password-reset` route:
   - Generate reset link via Supabase Admin API (`generateLink({ type: 'recovery' })`)
   - Send reset email via Resend API
4. ✅ Create `/auth/reset-password/confirm` page with new password form
5. ⚠️ Handle reset callback in `/auth/callback` route - **REDIRECT DETECTION FAILING**

**Files Created**:
- ✅ `app/auth/reset-password/page.tsx` - Request reset page (Neo-Classic styling)
- ✅ `app/auth/reset-password/confirm/page.tsx` - Set new password page (Neo-Classic styling)
- ✅ `app/api/auth/send-password-reset/route.ts` - Send reset email API
- ✅ `lib/services/auth-email-service.ts` - Added `sendPasswordResetEmail()` function

**PostHog Events**:
- ✅ `password_reset_requested` - Track reset requests
- ✅ `password_reset_email_sent` - Track email delivery
- ✅ `password_reset_completed` - Track successful resets

**Known Issue**:
- ❌ **Password reset links redirect to `/auth/login` instead of `/auth/reset-password/confirm`**
- **Root Cause**: Supabase's `generateLink({ type: 'recovery' })` doesn't preserve `type=password_reset` query parameter through redirect chain
- **Attempts Made**: URL param detection, hash fragment detection, session type detection (all failed)
- **Investigation**: See `docs/implementation/PASSWORD_RESET_REDIRECT_ISSUE.md` for full context
- **Status**: 🔴 **DEFERRED** - Need expert investigation of Supabase recovery flow (GPT-5 also unable to solve)

**Success Criteria**:
- ✅ Users can request password reset from login page
- ✅ Reset emails sent via Resend (with Supabase fallback)
- ❌ Users cannot set new password via reset link (redirects to login)
- ✅ PostHog tracks reset funnel (requested → sent → completed)
- ✅ Neo-Classic styling applied (matches login/signup pages)
- ✅ Architecture patterns followed (service layer, pure composition)

---

### **Phase 3: Track Email Verification** (Priority 3 - Conversion Measurement) ✅ **COMPLETED**
**Goal**: Measure signup → email verified conversion rate

**Status**: ✅ **COMPLETE** - Email verification tracking implemented and verified in production

**Implementation**:
1. ✅ Created server-side `trackEmailVerifiedServer()` function using PostHog HTTP API
2. ✅ Called in `/auth/callback` after successful `exchangeCodeForSession`
3. ✅ Made tracking non-blocking (fire-and-forget) to prevent timeout issues
4. ✅ Only tracks for email verification (excludes password reset flows)
5. ✅ Includes user properties: `user_id`, `email` (partial for privacy)

**Files Modified**:
- ✅ `app/auth/callback/route.ts` - Added server-side PostHog tracking after email verification (non-blocking)
- ✅ `lib/analytics/posthog.ts` - Client-side helper already exists (for future client-side tracking)

**PostHog Events**:
- ✅ `email_verified` - Tracked server-side via HTTP API with user_id and partial email
- ✅ **VERIFIED IN PRODUCTION** - Events appearing in PostHog dashboard

**Success Criteria**:
- ✅ Email verification tracked in PostHog (server-side via HTTP API)
- ✅ Only tracks email verification (not password reset)
- ✅ Non-blocking implementation prevents timeout issues
- ✅ Conversion Funnel dashboard can now show signup → email verified rate
- ✅ Can measure drop-off between signup and email verification
- ✅ **PRODUCTION VERIFIED** - Events confirmed in PostHog (December 5, 2025)

---

### **Phase 4: Improve Error Handling** (Priority 4 - Better UX) ✅ **COMPLETED**
**Goal**: Clear error messages and recovery options for each failure point

**Status**: ✅ **COMPLETE** - Error handling improved with user-friendly messages and PostHog tracking

**Implementation Steps**:

#### **Step 1: Map Error Scenarios & Create Error Handler** (30 min)
**Action**: Create centralized error mapping utility
**Location**: `lib/utils/auth-errors.ts` (new file)

**Error Scenarios to Map**:

**Signup Errors**:
- `User already registered` → "This email is already registered. Try logging in instead."
- `Password should be at least 6 characters` → "Password must be at least 6 characters long."
- `Invalid email` → "Please enter a valid email address."
- `Network error` → "Connection failed. Please check your internet and try again."

**Email Errors**:
- `Email not sent` → "We couldn't send the email. Click 'Resend' to try again."
- `Expired link` → "This verification link has expired. Request a new one below."
- `Invalid link` → "This link is invalid. Request a new verification email."

**Login Errors**:
- `Invalid login credentials` → "Email or password is incorrect. Check your credentials or reset your password."
- `Email not confirmed` → "Please verify your email first. Check your inbox or request a new confirmation email."
- `Too many requests` → "Too many login attempts. Please wait a few minutes and try again."

**Password Reset Errors**:
- `Email not found` → "No account found with this email. Check your email or sign up."
- `Expired link` → "This reset link has expired. Request a new password reset."
- `Invalid link` → "This reset link is invalid. Request a new password reset."

**Code Pattern**:
```typescript
// lib/utils/auth-errors.ts
export interface AuthError {
  userMessage: string;
  recoveryAction?: 'resend_email' | 'reset_password' | 'contact_support' | 'try_again';
  errorType: string;
}

export function mapAuthError(error: Error | string): AuthError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();
  
  // Signup errors
  if (lowerMessage.includes('already registered') || lowerMessage.includes('user already exists')) {
    return {
      userMessage: "This email is already registered. Try logging in instead.",
      recoveryAction: undefined,
      errorType: 'email_exists',
    };
  }
  
  if (lowerMessage.includes('password') && lowerMessage.includes('6')) {
    return {
      userMessage: "Password must be at least 6 characters long.",
      recoveryAction: 'try_again',
      errorType: 'weak_password',
    };
  }
  
  // Login errors
  if (lowerMessage.includes('invalid login') || lowerMessage.includes('invalid credentials')) {
    return {
      userMessage: "Email or password is incorrect. Check your credentials or reset your password.",
      recoveryAction: 'reset_password',
      errorType: 'invalid_credentials',
    };
  }
  
  if (lowerMessage.includes('email not confirmed') || lowerMessage.includes('not verified')) {
    return {
      userMessage: "Please verify your email first. Check your inbox or request a new confirmation email.",
      recoveryAction: 'resend_email',
      errorType: 'email_not_verified',
    };
  }
  
  // Default fallback
  return {
    userMessage: "Something went wrong. Please try again.",
    recoveryAction: 'try_again',
    errorType: 'unknown',
  };
}
```

**Files Created**:
- ✅ `lib/utils/auth-errors.ts` - Centralized error mapping utility

**Implementation Complete**:
- ✅ Created `AuthError` interface with `userMessage`, `recoveryAction`, and `errorType`
- ✅ Implemented `mapAuthError()` function covering all error scenarios (signup, login, email, password reset)
- ✅ Added PostHog error tracking helpers (`trackSignupError`, `trackLoginError`, `trackEmailError`)
- ✅ Updated signup page to use mapped errors + PostHog tracking
- ✅ Updated login page to use mapped errors + PostHog tracking (including recovery action buttons)
- ✅ Updated callback route to use mapped errors for redirect messages

**PostHog Events**:
- ✅ `signup_error` - Track signup errors with error type and recovery action
- ✅ `login_error` - Track login errors with error type and recovery action
- ✅ `email_error` - Track email delivery errors (ready for future use)

**Success Criteria**:
- ✅ User-facing error messages are clear and helpful
- ✅ Recovery actions provided where applicable (e.g., "Resend Email" button)
- ✅ Error rates tracked in PostHog for analysis
- ✅ Consistent error handling across all auth flows

---

#### **Step 2: Improve Signup Error Handling** (20 min) ✅ **COMPLETED**
**Location**: `app/auth/signup/page.tsx`
**Action**: 
- Import `mapAuthError` from `lib/utils/auth-errors.ts`
- Replace generic error messages (line ~176-178) with mapped user-friendly messages
- Add PostHog tracking for signup errors
- Show recovery actions when applicable

**Code Pattern**:
```typescript
// In handleSubmit catch block (around line 175)
catch (error) {
  const authError = mapAuthError(error);
  setError(authError.userMessage);
  
  // Track error in PostHog
  trackEvent('signup_error', {
    error_type: authError.errorType,
    error_message: typeof error === 'string' ? error : error.message,
    recovery_action: authError.recoveryAction,
  });
  
  announceToScreenReader(authError.userMessage, 'assertive');
}
```

**Files to Modify**:
- `app/auth/signup/page.tsx` - Replace error handling with mapped errors + PostHog tracking

---

#### **Step 3: Improve Login Error Handling** (25 min)
**Location**: `app/auth/login/page.tsx`
**Action**:
- Import `mapAuthError` from `lib/utils/auth-errors.ts`
- Replace generic error messages (line ~91-93) with mapped user-friendly messages
- Add PostHog tracking for login errors
- Show recovery action buttons (e.g., "Resend Confirmation Email" for unverified email)

**Code Pattern**:
```typescript
// In handleSubmit catch block (around line 90)
catch (error) {
  const authError = mapAuthError(error);
  setError(authError.userMessage);
  
  // Track error in PostHog
  trackEvent('login_error', {
    error_type: authError.errorType,
    error_message: typeof error === 'string' ? error : error.message,
    recovery_action: authError.recoveryAction,
  });
  
  // Show recovery action button if applicable
  if (authError.recoveryAction === 'resend_email') {
    // Show "Resend Confirmation Email" button (already exists, line ~316-344)
  }
  
  announceToScreenReader(authError.userMessage, 'assertive');
}
```

**Files to Modify**:
- `app/auth/login/page.tsx` - Replace error handling with mapped errors + PostHog tracking

---

#### **Step 4: Improve Callback Error Handling** (20 min)
**Location**: `app/auth/callback/route.ts`
**Action**:
- Import `mapAuthError` from `lib/utils/auth-errors.ts`
- Improve error messages in redirect URLs (lines ~84-110)
- Add PostHog tracking for callback errors
- Ensure error messages are user-friendly in redirects

**Code Pattern**:
```typescript
// In error handling section (around line 84)
if (error === 'access_denied' && errorDescription?.includes('expired')) {
  const authError = mapAuthError('Expired link');
  
  // Track error
  await trackCallbackErrorServer('expired_link', errorDescription);
  
  if (isPasswordReset) {
    return NextResponse.redirect(
      `${baseUrl}/auth/reset-password?error=expired_link&message=${encodeURIComponent(authError.userMessage)}`
    );
  } else {
    return NextResponse.redirect(
      `${baseUrl}/auth/login?error=expired_link&message=${encodeURIComponent(authError.userMessage)}`
    );
  }
}
```

**Files Modified**:
- ✅ `app/auth/callback/route.ts` - Improved error messages using mapped errors

---

#### **Step 5: Add PostHog Error Tracking Helpers** (15 min)
**Location**: `lib/analytics/posthog.ts`
**Action**: Add error tracking helper functions

**Code Pattern**:
```typescript
// Add to lib/analytics/posthog.ts

export function trackSignupError(errorType: string, errorMessage: string, recoveryAction?: string) {
  trackEvent('signup_error', {
    error_type: errorType,
    error_message: errorMessage,
    recovery_action: recoveryAction,
    timestamp: new Date().toISOString(),
  });
}

export function trackLoginError(errorType: string, errorMessage: string, recoveryAction?: string) {
  trackEvent('login_error', {
    error_type: errorType,
    error_message: errorMessage,
    recovery_action: recoveryAction,
    timestamp: new Date().toISOString(),
  });
}

// Server-side helper for callback errors
export async function trackCallbackErrorServer(errorType: string, errorDescription?: string) {
  // Similar to trackEmailVerifiedServer - use PostHog HTTP API
}
```

**Files to Modify**:
- `lib/analytics/posthog.ts` - Add error tracking helper functions

---

**Files to Create/Modify**:
- ✅ `lib/utils/auth-errors.ts` - **NEW FILE** - Centralized error mapping (Step 1)
- ✅ `app/auth/signup/page.tsx` - Improve error messages + tracking (Step 2)
- ✅ `app/auth/login/page.tsx` - Improve error messages + tracking (Step 3)
- ✅ `app/auth/callback/route.ts` - Improve error messages + tracking (Step 4)
- ✅ `lib/analytics/posthog.ts` - Add error tracking helpers (Step 5)

**PostHog Events to Track**:
- `signup_error` - Track signup errors with error type (Step 2)
- `login_error` - Track login errors with error type (Step 3)
- `callback_error` - Track callback errors (Step 4)

**Success Criteria**:
- ✅ All error scenarios mapped to user-friendly messages
- ✅ Recovery actions shown for each error type
- ✅ Error rates tracked in PostHog with error types
- ✅ Users understand what went wrong
- ✅ Users know how to recover from errors

---

### **Phase 5: Complete Conversion Funnel Tracking** (Priority 5 - Analytics)
**Goal**: Measure complete signup → first use funnel

**Status**: ⏳ **PENDING** - Ready for implementation

**Implementation Steps**:

#### **Step 1: Track `email_sent` Event** (15 min)
**Location**: `app/api/auth/send-confirmation/route.ts`
**Action**: 
- After successful Resend email send (line ~100-130), track `email_sent` event
- Use server-side PostHog HTTP API (similar to `trackEmailVerifiedServer` in callback route)
- Track when `emailResult?.data` exists (email successfully sent)
- Include properties: `user_id` (if available), `email` (partial), `method: 'resend'`

**Code Pattern**:
```typescript
// After line 100 (successful Resend send)
if (emailResult?.data && !emailResult?.error) {
  // Track email_sent event via PostHog HTTP API
  await trackEmailSentServer(email, userId); // Create this helper function
}
```

**Files to Modify**:
- `app/api/auth/send-confirmation/route.ts` - Add `trackEmailSentServer()` call after successful email send

---

#### **Step 2: Track `first_login` Event** (30 min)
**Location**: `app/auth/login/page.tsx`
**Action**:
- After successful login (line ~73-86), check if this is user's first login
- Check Supabase user metadata or PostHog user properties for `first_login_date`
- If not set, this is first login → track `first_login` event
- Set user property `first_login_date` in PostHog to prevent duplicate tracking
- Use client-side PostHog tracking (`trackEvent` from `lib/analytics/posthog.ts`)

**Detection Logic**:
```typescript
// After successful login (line 82-86)
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  // Check if first login (check PostHog user properties or Supabase metadata)
  const isFirstLogin = !user.user_metadata?.first_login_date;
  
  if (isFirstLogin) {
    trackEvent('first_login', {
      user_id: user.id,
      email: user.email ? user.email.substring(0, 3) + '***' : undefined,
      time_since_signup: calculateTimeSinceSignup(user.created_at),
      timestamp: new Date().toISOString(),
    });
    
    // Set user property to prevent duplicate tracking
    posthog.identify(user.id, {
      first_login_date: new Date().toISOString(),
    });
  }
}
```

**Files to Modify**:
- `app/auth/login/page.tsx` - Add first login detection and tracking
- `lib/analytics/posthog.ts` - Add helper function `trackFirstLogin()` if needed

---

#### **Step 3: Track `first_book_opened` Event** (45 min)
**Location**: Book reading pages (`app/read/[slug]/page.tsx` and `app/library/[id]/read/page.tsx`)
**Action**:
- Track when user opens a book for the first time
- Check if user has opened any book before (check PostHog events or Supabase)
- If this is first book → track `first_book_opened` event
- Use existing `trackFirstBookOpened()` function from `lib/analytics/posthog.ts`

**Detection Logic**:
```typescript
// In book reading page component (on mount or when book loads)
useEffect(() => {
  if (user && bookId && bookTitle) {
    // Check if user has opened any book before
    // Option 1: Check PostHog user properties
    const hasOpenedBook = posthog.getFeatureFlag('has_opened_book'); // Not ideal
    
    // Option 2: Check Supabase ReadingPosition table
    const checkFirstBook = async () => {
      const { data: positions } = await supabase
        .from('reading_positions')
        .select('book_id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (!positions || positions.length === 0) {
        // This is first book opened
        trackFirstBookOpened(bookId, bookTitle);
        
        // Set user property to prevent duplicate tracking
        posthog.identify(user.id, {
          first_book_opened: true,
          first_book_id: bookId,
          first_book_title: bookTitle,
        });
      }
    };
    
    checkFirstBook();
  }
}, [user, bookId, bookTitle]);
```

**Files to Modify**:
- `app/read/[slug]/page.tsx` - Add first book tracking (unified reading route)
- `app/library/[id]/read/page.tsx` - Add first book tracking (legacy library route)
- `lib/analytics/posthog.ts` - Verify `trackFirstBookOpened()` function exists (already exists ✅)

---

#### **Step 4: Create PostHog Funnel Dashboard** (30 min)
**Action**: Create funnel visualization in PostHog UI
**Steps**:
1. Go to PostHog Dashboard → Create New Funnel
2. Add funnel steps in order:
   - `signup_started`
   - `user_signed_up` (or `signup_submitted`)
   - `email_sent`
   - `email_verified`
   - `first_login`
   - `first_book_opened`
3. Set conversion window (e.g., 7 days)
4. Save as "Signup → First Use Funnel"
5. Add drop-off analysis between steps

**PostHog Dashboard**:
- Create Conversion Funnel dashboard with all steps
- Add drop-off analysis between steps
- Set up alerts for drop-off spikes (>20% drop-off between steps)

---

**Files to Modify**:
- ✅ `app/api/auth/send-confirmation/route.ts` - Add `email_sent` tracking (Step 1)
- ✅ `app/auth/login/page.tsx` - Add `first_login` tracking (Step 2)
- ✅ `app/read/[slug]/page.tsx` - Add `first_book_opened` tracking (Step 3)
- ✅ `app/library/[id]/read/page.tsx` - Add `first_book_opened` tracking (Step 3)
- ✅ `lib/analytics/posthog.ts` - Verify helpers exist (already exist ✅)

**PostHog Events to Track**:
- `email_sent` - Track when Resend API succeeds (Step 1) - **NEEDS HELPER FUNCTION**
- `first_login` - Track when user logs in for first time (Step 2) - **NEEDS HELPER FUNCTION**
- `first_book_opened` - Track when user opens first book (Step 3) - ✅ Function exists (`trackFirstBookOpened()`)

**Helper Functions Needed**:
- `trackEmailSentServer()` - Server-side function for `app/api/auth/send-confirmation/route.ts`
- `trackFirstLogin()` - Client-side function for `app/auth/login/page.tsx` (or use `trackEvent` directly)

**Success Criteria**:
- ✅ Complete funnel tracked from signup to first use
- ✅ All 6 funnel steps tracked: signup_started → signup_submitted → email_sent → email_verified → first_login → first_book_opened
- ✅ PostHog funnel dashboard shows conversion rates at each step
- ✅ Can identify where users drop off
- ✅ Can measure impact of improvements

---

## 📊 Success Metrics

### **Reliability Metrics**
- **Password Save Success Rate**: ≥99% (password saved even if email fails)
- **Password Reset Success Rate**: ≥95% (reset emails delivered, links work)
- **Login Success Rate**: ≥98% (users can log in after signup)

### **Conversion Metrics** (from PostHog plan)
- **Signup → Email Verified**: Target ≥85% (currently unknown, need tracking)
- **Email Verified → First Login**: Target ≥90%
- **First Login → First Use**: Target ≥70% (Gate 1 → Gate 2)
- **Overall Signup → D7 Retention**: Target ≥19%

### **Error Tracking**
- **Signup Error Rate**: <2%
- **Email Delivery Error Rate**: <1% (Resend API)
- **Login Error Rate**: <3%

---

## 🗓️ Implementation Timeline

| Phase | Duration | Priority | Dependencies |
|-------|----------|----------|--------------|
| Phase 1: Fix Password Saving | 1-2 days | 🔴 Critical | None |
| Phase 2: Add Password Reset | 2-3 days | 🟡 High | Phase 1 complete |
| Phase 3: Track Email Verification | 1 day | 🟡 High | Phase 1 complete |
| Phase 4: Improve Error Handling | 1-2 days | 🟢 Medium | Phases 1-3 complete |
| Phase 5: Complete Funnel Tracking | 1-2 days | 🟢 Medium | Phases 1-3 complete |

**Total Estimated Time**: 6-10 days

---

## 🔄 Cross-References

### **Related Implementation Plans**
- **PostHog Analytics**: See `docs/research/POSTHOG_ANALYTICS_IMPLEMENTATION_PLAN.md` for complete analytics strategy
- **Email Confirmation**: See `docs/research/CONFIRMATION_EMAIL_FINAL_PLAN.md` for email delivery fixes

### **Related Research**
- **Email Service**: `docs/research/Agent1_Email_Service_Findings.md` - Resend API details
- **Supabase Auth**: `docs/research/Agent2_Supabase_Auth_Findings.md` - Auth API patterns
- **DNS/Email Setup**: `docs/research/SPF_VERIFICATION_INVESTIGATION.md` - Domain verification

### **Code References**
- **Signup Flow**: `app/auth/signup/page.tsx` - Current implementation
- **Login Flow**: `app/auth/login/page.tsx` - Current implementation
- **Email API**: `app/api/auth/send-confirmation/route.ts` - Resend integration
- **Callback Handler**: `app/auth/callback/route.ts` - Email confirmation
- **PostHog Utils**: `lib/analytics/posthog.ts` - Event tracking helpers

---

## ✅ Definition of Done

**Phase 1 Complete When**:
- ✅ Users can log in with password after signup (even if email failed)
- ✅ Password save success rate ≥99%
- ✅ PostHog tracks password save events

**Phase 2 Complete When**:
- ✅ Password reset flow works end-to-end
- ✅ Reset emails sent via Resend
- ✅ PostHog tracks reset funnel

**Phase 3 Complete When**:
- ✅ Email verification tracked in PostHog
- ✅ Conversion Funnel dashboard shows verification rate
- ✅ Can measure signup → verified drop-off

**Phase 4 Complete When**:
- ✅ All error scenarios have clear messages
- ✅ Recovery options available for each error
- ✅ Error rates tracked in PostHog

**Phase 5 Complete When**:
- ✅ Complete funnel tracked (signup → first use)
- ✅ PostHog dashboard shows all funnel steps
- ✅ Can identify and measure drop-off points

---

## 🚨 Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Password still not saved | High | Test password login immediately after signup, add fallback Admin API call |
| Reset emails not delivered | Medium | Use same Resend API pattern as confirmation emails (already working) |
| PostHog events not firing | Medium | Test events in PostHog dashboard, add console logging |
| User confusion with errors | Low | Clear error messages, recovery options, support contact |

---

## 📝 Notes

- **Current Status**: Email confirmation working ✅, password saving broken ❌
- **Next Step**: Phase 1 - Fix password saving (highest priority)
- **Testing**: Use `francoismatenda022+test1@gmail.com` alias for testing
- **PostHog**: Events already defined in `lib/analytics/posthog.ts`, need to call them at right times

