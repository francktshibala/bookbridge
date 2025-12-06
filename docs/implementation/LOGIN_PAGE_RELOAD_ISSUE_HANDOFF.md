# Login Page Reload Issue - GPT Agent Handoff

**Date**: December 5, 2025  
**Status**: 🔴 **CRITICAL BUG** - Login page reloads after successful login  
**Priority**: HIGH - Blocks user access to catalog

---

## Problem Description

After entering credentials and clicking "Sign in", the login page reloads instead of redirecting to the catalog page, creating a login loop.

### Current User Flow (Broken)

1. **User not logged in** → Opens `bookbridge.app` → ✅ **WORKS**: Shows homepage
2. **User clicks "Library" or "Catalog"** → ✅ **WORKS**: Redirects to `/auth/login?redirectTo=/catalog`
3. **User enters email/password and clicks "Sign in"** → ❌ **BROKEN**: Login page reloads (doesn't redirect to catalog)
4. **User remains on login page** → ❌ **BROKEN**: Stuck in loop

### Expected Behavior

After successful login, user should be redirected to `/catalog` (or the `redirectTo` URL) and see the catalog page, not reload the login page.

---

## Files to Review

### **Primary Files** (Must Read)

1. **`app/auth/login/page.tsx`** (Lines 44-233)
   - Contains `waitForStableSession()` function that waits for Supabase session
   - Login form submission handler (`handleSubmit`)
   - Redirect logic after successful login
   - **Current Issue**: May be redirecting before session is fully established, or redirect is failing

2. **`app/catalog/page.tsx`** (Lines 19-71)
   - Auth check logic using `useAuth()` hook
   - Has timeout fallback (2 seconds)
   - Redirects to login if `!user` after loading completes
   - **Current Issue**: May be redirecting back to login if auth state isn't ready

3. **`components/AuthProvider.tsx`** (Lines 32-98)
   - Auth state management
   - Session check logic (`getSession()`)
   - `onAuthStateChange` listener
   - **Current Issue**: May have timing issues with state updates after login

### **Related Files** (Context)

4. **`hooks/useRequireAuth.ts`** (Lines 7-26)
   - Auth requirement hook pattern (reference)

5. **`app/page.tsx`** (Lines 12-50)
   - Homepage redirect logic for logged-in users

---

## Current Status

### **What Works**
- ✅ Homepage shows correctly for non-logged-in users
- ✅ Clicking "Library/Catalog" redirects to login page
- ✅ Login form accepts credentials
- ✅ Login API call succeeds (user sees email/name in popup)

### **What's Broken**
- ❌ After successful login, login page reloads instead of redirecting to catalog
- ❌ User gets stuck on login page
- ❌ Cannot access catalog after login

---

## Previous Attempts to Fix

### **Attempt 1: Added redirectTo Parameter Support**
- **File**: `app/auth/login/page.tsx`
- **Change**: Added `redirectTo` query parameter reading
- **Result**: ✅ Parameter is read, but redirect still fails

### **Attempt 2: Changed to Full Page Reload**
- **File**: `app/auth/login/page.tsx`
- **Change**: Changed from `router.push('/catalog')` to `window.location.href = redirectTo`
- **Reason**: Force full page reload to refresh auth state
- **Result**: ❌ Still reloads login page

### **Attempt 3: Added Delay Before Redirect**
- **File**: `app/auth/login/page.tsx`
- **Change**: Added 100ms `setTimeout` before redirect
- **Reason**: Give AuthProvider time to update state
- **Result**: ❌ Still reloads login page

### **Attempt 4: Implemented waitForStableSession()**
- **File**: `app/auth/login/page.tsx`
- **Change**: Added comprehensive session waiting function that:
  - Polls Supabase session
  - Subscribes to `SIGNED_IN`/`TOKEN_REFRESHED` events
  - Has 3-second fallback timeout
- **Result**: ❌ Still reloads login page after session is confirmed

### **Attempt 5: Fixed Catalog Auth Check**
- **File**: `app/catalog/page.tsx`
- **Change**: Added timeout fallback and improved session polling
- **Result**: ✅ Prevents infinite spinner, but doesn't fix login redirect

---

## Root Cause Hypothesis

The issue appears to be one of these scenarios:

### **Hypothesis 1: Redirect Happens But Catalog Redirects Back**
1. Login succeeds → Session created
2. `waitForStableSession()` confirms session
3. Redirect to `/catalog` happens
4. Catalog page loads but `useAuth()` still shows `loading: true` or `user: null`
5. Catalog redirects back to login
6. **Loop repeats**

### **Hypothesis 2: Redirect URL Issue**
1. Login succeeds → Session confirmed
2. `window.location.href = redirectTo` executes
3. But `redirectTo` might be malformed or relative URL issue
4. Browser reloads current page instead of navigating

### **Hypothesis 3: Form Submission Preventing Redirect**
1. Login form submits
2. Form's default behavior might be preventing redirect
3. Page reloads due to form submission
4. Redirect never happens

### **Hypothesis 4: AuthProvider State Not Updating**
1. Login succeeds → Supabase session exists
2. But `AuthProvider` context doesn't update fast enough
3. Catalog page checks auth → sees `user: null` → redirects back
4. **Loop repeats**

---

## Investigation Steps

### **Step 1: Add Detailed Logging**
Add console logging to trace the exact flow:
- Log when `waitForStableSession()` resolves
- Log the exact `redirectTo` URL being used
- Log when `window.location.href` is set
- Log catalog page auth state when it loads

**Files to modify**:
- `app/auth/login/page.tsx` - Add logging before/after redirect
- `app/catalog/page.tsx` - Log auth state on mount

### **Step 2: Verify Redirect URL**
Check if `redirectTo` is correct:
- Log the full URL before redirect
- Ensure it's absolute (starts with `/`)
- Verify no query parameter issues

**Files to modify**:
- `app/auth/login/page.tsx` - Log and validate redirectTo

### **Step 3: Prevent Form Reload**
Ensure form submission doesn't cause page reload:
- Verify `e.preventDefault()` is called
- Check if form has any default submission behavior
- Consider using `router.push()` instead of `window.location.href`

**Files to modify**:
- `app/auth/login/page.tsx` - Review form submission handler

### **Step 4: Wait for AuthProvider Update**
Ensure AuthProvider state is updated before redirecting:
- Wait for `onAuthStateChange` to fire `SIGNED_IN` event
- Verify `user` is set in context before redirect
- Add delay after session confirmation

**Files to modify**:
- `app/auth/login/page.tsx` - Wait for AuthProvider update
- `components/AuthProvider.tsx` - Ensure state updates immediately

---

## Recommended Solution Approach

### **Option 1: Use Router Instead of Window Location (Recommended)**
Use Next.js router which handles client-side navigation better:

```typescript
// In app/auth/login/page.tsx after waitForStableSession()
await waitForStableSession();

// Wait a moment for AuthProvider to update
await new Promise(resolve => setTimeout(resolve, 300));

// Use router.push instead of window.location.href
logAuthFlow('Session confirmed, performing redirect', { redirectTo });
router.push(redirectTo);
```

### **Option 2: Verify Session Before Redirect**
Double-check session exists and is accessible:

```typescript
// In app/auth/login/page.tsx
await waitForStableSession();

// Verify session one more time
const { data: { session } } = await supabase.auth.getSession();
if (!session?.user) {
  console.error('[Login] Session lost before redirect!');
  return;
}

// Now redirect
window.location.href = redirectTo;
```

### **Option 3: Make Catalog Page More Patient**
Increase timeout in catalog page and wait longer for auth:

```typescript
// In app/catalog/page.tsx
useEffect(() => {
  // Wait longer for auth state to settle
  if (loading) {
    const timeout = setTimeout(() => {
      if (!user && !loading) {
        router.push('/auth/login?redirectTo=/catalog');
      }
    }, 3000); // Increased from 2000
    return () => clearTimeout(timeout);
  }
}, [loading, user, router]);
```

### **Option 4: Server-Side Redirect (Most Reliable)**
Use Next.js middleware or server action to handle redirect:

```typescript
// Create app/auth/login/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function loginAction(email: string, password: string, redirectTo: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    return { error: error.message };
  }
  
  // Server-side redirect
  redirect(redirectTo || '/catalog');
}
```

---

## Testing Checklist

After implementing fix, verify:

- [ ] **Test 1**: Login from homepage → catalog redirect
  - Log out → Go to homepage → Click "Library" → Login → Should see catalog (not login page)

- [ ] **Test 2**: Direct catalog access → login → catalog redirect
  - Log out → Go directly to `/catalog` → Login → Should see catalog

- [ ] **Test 3**: Login with redirectTo parameter
  - Log out → Go to `/auth/login?redirectTo=/catalog` → Login → Should see catalog

- [ ] **Test 4**: No page reload after login
  - After clicking "Sign in", verify page doesn't reload
  - Check browser console for redirect logs
  - Verify URL changes to `/catalog`

- [ ] **Test 5**: Auth state consistency
  - After login, verify `useAuth()` returns user in catalog
  - Check PostHog events show `user_logged_in` or `first_login`
  - Verify user can navigate catalog without re-authentication

---

## Success Criteria

✅ **FIXED** when:
1. User logs in successfully → Redirects to `/catalog` (or `redirectTo` URL)
2. Catalog page loads and shows book catalog
3. Login page does NOT reload after successful login
4. User remains authenticated for subsequent navigation
5. No redirect loop back to login page

---

## Your Task

1. **Read all files listed above** to understand current implementation
2. **Add detailed logging** to trace the exact redirect flow
3. **Test each hypothesis** systematically
4. **Implement fix** using one of the recommended approaches (or your own solution)
5. **Test thoroughly** using the checklist above
6. **Run build** to ensure no compilation errors: `npm run build`
7. **Push to GitHub** so user can test: `git add -A && git commit -m "fix: [describe your fix]" && git push origin main`
8. **Document your solution** in this file

**Priority**: Fix this immediately - it blocks all user access to the catalog.

**Key Points**:
- The login API call succeeds (user sees email/name)
- Session is confirmed by `waitForStableSession()`
- But redirect fails or catalog redirects back
- Need to ensure smooth transition from login → catalog

---

**Handoff Date**: December 5, 2025  
**Assigned To**: GPT Agent  
**Status**: 🔴 **AWAITING FIX**

