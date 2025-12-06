# Login Redirect Issue - GPT Agent Handoff

**Date**: December 5, 2025  
**Status**: 🟡 **FIX IMPLEMENTED – NEEDS VERIFICATION** (Dec 6, 2025)  
**Priority**: HIGH - Blocks user access to catalog

---

## Problem Description

After successful login, users are redirected back to the login page instead of the catalog, creating a redirect loop.

### Current User Flow (Broken)

1. **User not logged in** → Opens `bookbridge.app` → ✅ **WORKS**: Shows homepage
2. **User clicks "Library" or "Catalog"** → ✅ **WORKS**: Redirects to `/auth/login?redirectTo=/catalog`
3. **User enters email/password and clicks "Sign in"** → ✅ **WORKS**: Login succeeds, user sees email/name in popup
4. **After login** → ❌ **BROKEN**: Page reloads and shows login page again (redirect loop)

### Expected Behavior

After successful login, user should be redirected to `/catalog` (or the `redirectTo` URL) and see the catalog page, not the login page again.

---

## Files to Review

### **Primary Files** (Must Read)

1. **`app/auth/login/page.tsx`** (Lines 133-134)
   - Current redirect logic after successful login
   - Uses `window.location.href` with 100ms delay
   - Should respect `redirectTo` query parameter

2. **`app/catalog/page.tsx`** (Lines 18-58)
   - Auth check logic using `useAuth()` hook
   - Has 2-second timeout fallback
   - Redirects to login if `!user` after loading completes

3. **`components/AuthProvider.tsx`** (Lines 32-94)
   - Auth state management
   - Session check logic
   - `onAuthStateChange` listener
   - May have timing issues with state updates

4. **`hooks/useRequireAuth.ts`** (Lines 7-26)
   - Auth requirement hook (not currently used in catalog, but reference)
   - Shows pattern for auth checks

### **Related Files** (Context)

5. **`app/page.tsx`** (Lines 12-50)
   - Homepage redirect logic for logged-in users
   - Uses `useAuth()` hook

6. **`app/auth/callback/route.ts`**
   - Email verification callback
   - May have similar redirect patterns

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
- **Result**: ❌ Still redirects back to login

### **Attempt 3: Added Delay Before Redirect**
- **File**: `app/auth/login/page.tsx`
- **Change**: Added 100ms `setTimeout` before redirect
- **Reason**: Give AuthProvider time to update state
- **Result**: ❌ Still redirects back to login

### **Attempt 4: Added Timeout Fallback in Catalog**
- **File**: `app/catalog/page.tsx`
- **Change**: Added 2-second timeout fallback for auth check
- **Result**: ✅ Prevents infinite spinner, but doesn't fix redirect loop

---

## Root Cause Hypothesis

The issue appears to be a **race condition** between:
1. Login success → Session created in Supabase
2. Redirect to `/catalog` → Page loads
3. Catalog page checks auth → `useAuth()` hook may not have updated yet
4. Auth check finds `!user` → Redirects back to login
5. **Loop repeats**

### Possible Causes

1. **AuthProvider state not updating fast enough**
   - `onAuthStateChange` listener may not fire immediately after `signInWithPassword`
   - Session may exist but `user` state in context is still `null`

2. **Timing issue with `window.location.href`**
   - Full page reload may happen before Supabase session is fully established
   - Browser may not have session cookie yet

3. **Catalog page auth check too aggressive**
   - Checks auth immediately on mount
   - Doesn't wait for auth state to stabilize

4. **Session cookie not set**
   - Supabase session may not be persisted to cookies before redirect
   - Next page load doesn't see the session

---

## Investigation Steps

### **Step 1: Check Auth State After Login**
Add console logging to verify:
- Is `user` set in AuthProvider after login?
- Does `onAuthStateChange` fire with `SIGNED_IN` event?
- Is session cookie set before redirect?

**Files to modify**:
- `components/AuthProvider.tsx` - Add detailed logging
- `app/auth/login/page.tsx` - Log auth state before redirect

### **Step 2: Verify Session Persistence**
Check if Supabase session is persisted:
- After `signInWithPassword`, verify `supabase.auth.getSession()` returns session
- Check if session cookie exists before redirect
- Verify session persists across page reload

**Files to modify**:
- `app/auth/login/page.tsx` - Add session verification before redirect

### **Step 3: Fix Catalog Auth Check Timing**
Make catalog page wait for auth state to stabilize:
- Don't redirect immediately if `loading` is true
- Wait for auth state to settle before checking
- Add retry logic or longer timeout

**Files to modify**:
- `app/catalog/page.tsx` - Improve auth check timing

### **Step 4: Alternative Approach - Server-Side Redirect**
Consider server-side redirect after login:
- Use Next.js middleware to check auth
- Redirect at server level before page renders
- Avoids client-side race conditions

**Files to create/modify**:
- `middleware.ts` - Add auth check for `/catalog` route
- `app/auth/login/page.tsx` - Use server-side redirect pattern

---

## Recommended Solution Approach

### **Option 1: Wait for Auth State Update (Recommended)**
Wait for `onAuthStateChange` to fire `SIGNED_IN` event before redirecting:

```typescript
// In app/auth/login/page.tsx
const { data: { session } } = await supabase.auth.signInWithPassword({...});

// Wait for auth state change event
await new Promise((resolve) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
      subscription.unsubscribe();
      resolve(true);
    }
  });
  
  // Timeout fallback
  setTimeout(() => resolve(true), 2000);
});

// Now redirect
window.location.href = redirectTo;
```

### **Option 2: Verify Session Before Redirect**
Explicitly verify session exists before redirecting:

```typescript
// In app/auth/login/page.tsx
const { data: { session }, error } = await supabase.auth.getSession();
if (session && !error) {
  // Session confirmed, safe to redirect
  window.location.href = redirectTo;
} else {
  // Wait and retry
  setTimeout(() => {
    window.location.href = redirectTo;
  }, 500);
}
```

### **Option 3: Make Catalog Page More Patient**
Increase timeout and add retry logic in catalog page:

```typescript
// In app/catalog/page.tsx
useEffect(() => {
  let retries = 0;
  const maxRetries = 5;
  
  const checkAuth = async () => {
    if (!loading) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // User authenticated, show catalog
        return;
      } else if (retries < maxRetries) {
        // Retry after delay
        retries++;
        setTimeout(checkAuth, 200);
        return;
      }
      // No session after retries, redirect to login
      router.push('/auth/login?redirectTo=/catalog');
    }
  };
  
  checkAuth();
}, [loading, router]);
```

---

## Testing Checklist

After implementing fix, verify:

- [ ] **Test 1**: Login from homepage → catalog redirect
  - Log out → Go to homepage → Click "Library" → Login → Should see catalog

- [ ] **Test 2**: Direct catalog access → login → catalog redirect
  - Log out → Go directly to `/catalog` → Login → Should see catalog

- [ ] **Test 3**: Login with redirectTo parameter
  - Log out → Go to `/auth/login?redirectTo=/catalog` → Login → Should see catalog

- [ ] **Test 4**: No redirect loop
  - After login, verify page doesn't reload back to login
  - Check browser console for errors
  - Verify session persists across page loads

- [ ] **Test 5**: Auth state consistency
  - After login, verify `useAuth()` returns user
  - Check PostHog events show `user_logged_in` or `first_login`
  - Verify user can navigate catalog without re-authentication

---

## Success Criteria

✅ **FIXED** when:
1. User logs in successfully → Redirects to `/catalog` (or `redirectTo` URL)
2. Catalog page loads and shows book catalog
3. No redirect loop back to login page
4. User remains authenticated for subsequent navigation
5. Auth state is consistent across page loads

---

## Fix and Testing Notes (Dec 6, 2025)

### What Changed
- Added detailed `[Login]`, `[Catalog]`, and `[AuthProvider]` console logging to trace auth state transitions end-to-end.
- Updated `app/auth/login/page.tsx` to wait for Supabase `SIGNED_IN` events or successful session polling before redirecting, preventing navigation before cookies persist.
- Made `app/catalog/page.tsx` poll Supabase for a short period before forcing a logout redirect, avoiding false negatives while AuthProvider hydrates.
- Documented context updates inside `components/AuthProvider.tsx` so we can correlate provider state with catalog/login logs.

### Testing Status
- [ ] Test 1: Homepage → login → catalog (pending Supabase creds)
- [ ] Test 2: Direct `/catalog` → login → catalog (pending)
- [ ] Test 3: Direct `/auth/login?redirectTo=/catalog` (pending)
- [ ] Test 4: Confirm no redirect loop post-login (pending)
- [ ] Test 5: Auth state consistency + PostHog events (pending)

> Manual login requires live Supabase credentials; please run through the checklist in a connected environment to mark these off.

---

## Additional Context

### **Architecture Patterns**
- Uses `useAuth()` hook from `AuthProvider` for client-side auth
- Follows Neo-Classic styling patterns
- Uses Next.js 15 App Router with client components

### **Related Issues**
- Similar redirect issue may exist in other protected pages
- Email verification callback (`/auth/callback`) may have similar timing issues
- Consider fixing auth state management holistically

### **Previous Related Fixes**
- Homepage loading state fixed (removed blocking loader)
- Catalog auth protection added (with timeout fallback)
- Login redirectTo parameter support added (but not working)

---

## Next Steps for GPT Agent

1. **Read all files listed above** to understand current implementation
2. **Add detailed logging** to trace auth state flow
3. **Test each hypothesis** systematically
4. **Implement fix** using one of the recommended approaches
5. **Test thoroughly** using the checklist above
6. **Document the solution** in this file

**Priority**: Fix this immediately - it blocks all user access to the catalog.

---

**Handoff Date**: December 5, 2025  
**Assigned To**: GPT Agent  
**Status**: 🔴 **AWAITING FIX**

