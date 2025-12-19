# Supabase Email & Infrastructure Issues

**Date Identified:** December 14, 2025
**Status:** In Progress - Collecting all issues before implementing fixes
**Branch:** `fix/supabase-email-and-infrastructure` (not merged to main)

---

## Issue #1: High Bounce Rate - Email Sending Restricted

**Source:** Supabase email notification
**Project:** xsolwqqdbsuydwmmwtsl

### Problem
- Unusually high number of bounced emails from transactional emails
- Temporary restriction placed on email-sending privileges
- High spam complaint rate affecting shared email service

### Root Cause
Likely causes:
1. Testing with fake/invalid email addresses during development
2. User typos during signup (invalid email addresses)
3. Old/deleted email accounts in database
4. Test accounts with non-existent emails

### Impact
- Email delivery blocked temporarily
- Affects all transactional emails (signup, password reset, etc.)
- Risk of emails going to spam for legitimate users

### Recommended Solution
Supabase recommends:
1. **Use custom SMTP provider (Resend)** - better control, higher limits, separate reputation
2. Review email sending practices
3. Verify email addresses in application workflows
4. Use valid test addresses during development
5. Limit testing on live addresses

### Implementation Plan
- [ ] Re-enable custom SMTP (Resend) for all auth emails
- [ ] Add email validation to signup flow
- [ ] Clean up test/invalid user accounts from database
- [ ] Update development testing practices (use valid test emails only)
- [ ] Add email verification step before sending transactional emails

### Related Context
- We recently disabled custom SMTP to fix password reset (caused 5-min delays)
- This created a circular dependency: need custom SMTP for reliability AND compliance

---

## Issue #2: Security Advisor - 11 Critical Errors

**Source:** Supabase Security Advisor Dashboard
**Severity:** CRITICAL

### Errors Found

#### 1. Security Definer View
- **Entity:** `public.usage_tracking`
- **Issue:** View defined with SECURITY DEFINER property
- **Risk:** These views enforce Postgres permissions and row level security policies

#### 2-11. Row Level Security (RLS) Disabled on Public Tables
**Issue:** RLS not enabled on tables exposed to PostgREST API

**Affected Tables:**
1. `public.conversations`
2. `public.app_testimonials`
3. `public.books`
4. `public.usage`
5. `public.book_cache`
6. `public.system_usage`
7. `public.messages`
8. `public.users`
9. `public.subscriptions`
10. `public.audio_assets`

**Risk:** Without RLS, any authenticated user could potentially read/modify data in these tables through the API.

### Implementation Plan
- [ ] Enable RLS on all 10 public tables
- [ ] Create appropriate RLS policies for each table based on use case:
  - User-specific tables (users, messages, subscriptions) → only owner can access
  - Public read tables (books, audio_assets) → anyone can read, only admins can write
  - Usage tracking tables → only system can write
- [ ] Review and fix `usage_tracking` security definer view
- [ ] Test all API endpoints after enabling RLS

---

## Issue #3: Security Advisor - 10 Warnings

**Source:** Supabase Security Advisor Dashboard
**Severity:** HIGH

### Warnings Found

#### 1-7. Function Search Path Mutable
**Issue:** Functions where `search_path` parameter is not set
**Risk:** Security vulnerability if function behavior depends on search path

**Affected Functions:**
1. `public.update_audio_access`
2. `public.update_reading_positions_updated_at`
3. `public.handle_updated_at`
4. `public.cleanup_expired_audio_cache`
5. `public.update_featured_book_search_vector`
6. `public.invalidate_book_audio_cache`
7. `public.get_audio_cache_stats`

#### 8. Auth OTP Long Expiry
- **Entity:** Auth
- **Issue:** OTP expiry exceeds recommended threshold
- **Risk:** Longer OTP validity = higher risk of unauthorized access

#### 9. Leaked Password Protection Disabled
- **Entity:** Auth
- **Issue:** Leaked password protection is currently disabled
- **Risk:** Users can sign up with passwords known to be compromised

#### 10. Postgres Version Security Patches Available
- **Entity:** Config
- **Issue:** Upgrade postgres database to apply important security patches
- **Risk:** Known vulnerabilities may be exploitable

### Implementation Plan
- [ ] Add `SECURITY INVOKER` or set `search_path` on all 7 functions
- [ ] Reduce OTP expiry time to recommended threshold (check Supabase docs)
- [ ] Enable leaked password protection in Auth settings
- [ ] Upgrade Postgres version (may require maintenance window)

---

## Combined Fix Strategy

**Branch:** `fix/supabase-email-and-infrastructure`
**Approach:** Fix all issues together, test thoroughly, then merge to main

### Steps:
1. ✅ Document all issues (this file)
2. [ ] Create fix branch
3. [ ] Implement fixes for all issues
4. [ ] Test each fix in development
5. [ ] Push to GitHub (branch only)
6. [ ] Test in production (branch deployment if available)
7. [ ] Merge to main only when ALL fixes verified

---

## Notes

- Do NOT merge partial fixes to main
- Keep fixes isolated in branch until fully tested
- User will provide additional Supabase messages for documentation
