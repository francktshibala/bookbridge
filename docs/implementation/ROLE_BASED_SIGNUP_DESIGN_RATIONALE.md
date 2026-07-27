# Role-Based Signup — Design Rationale (July 2026)

Why we're changing signup this specific way, grounded in what's actually broken/fragile today and what's gone wrong with this auth system before. Written before implementation so decisions are on record, not re-derived later.

## Past auth incidents this design must not repeat

Pulled from `docs/research/CONFIRMATION_EMAIL_SOLUTION.md`, `Agent1_Email_Service_Findings.md`, `Agent2_Supabase_Auth_Findings.md`, `SPF_VERIFICATION_INVESTIGATION.md`, and `docs/implementation/AUTHENTICATION_RELIABILITY_PLAN.md`:

1. **Confirmation emails silently never sent.** Root cause: `generateLink({ type: 'signup' })` fails for a user that already exists → falls back to Supabase's own resend → Resend API never actually gets called. Fixed by switching to `generateLink({ type: 'magiclink' })` for existing users. *Lesson: don't assume a fallback path is being exercised — trace it end to end.*
2. **Resend free-tier domain restriction.** `onboarding@resend.dev` can only deliver to the account owner, not arbitrary signups, so real users got nothing even though logs looked fine. Fixed via domain verification (SPF/DKIM) after DNS migration to Cloudflare. *Lesson: "no error thrown" isn't the same as "delivered."*
3. **Password saving depended on email succeeding.** Signup used to fail (or partially fail) when Supabase's confirmation email step errored, even though the account creation itself should have been independent. Fixed by `app/api/auth/create-user/route.ts`, which calls `supabaseAdmin.auth.admin.createUser()` directly and **always** persists the password, regardless of whether email delivery works. *This is the pattern role-based signup must preserve: role must be saved through this same resilient path, not bolted onto the fragile client-side `supabase.auth.signUp()` call that email failures already broke once.*
4. **Password reset is still incomplete.** `AUTHENTICATION_RELIABILITY_PLAN.md` documents Phase 2 (password reset) as ⚠️ partially complete, blocked on a redirect issue, and deferred. `app/auth/callback/route.ts` currently branches on `detectPasswordResetIntent()` to route reset flows correctly. *Any change to callback redirect logic for role-based routing must not touch or further break this existing branch.*
5. **RLS policies: 11 known errors, deferred.** `fix/supabase-security-phase1` (Dec 2025) explicitly deferred RLS fixes, originally flagged as "critical before payment features." **Per current direction, Stripe/monetization is inactive and unfinished — the app is free — so this urgency no longer applies.** RLS gaps are out of scope for this feature unless they'd block role-based data isolation later (e.g., a teacher only seeing their own students' data), which is a future-feature concern, not a signup-feature one.
6. **Auth security baseline already improved** (same Dec 2025 phase): leaked-password protection (HaveIBeenPwned) enabled, OTP expiry reduced to 1 hour, custom SMTP (Resend) enabled. Nothing here needs to change for this feature — noted so we don't accidentally revisit settled work.

## Landmines found during this investigation, not documented anywhere else

These aren't in the overview doc — found by reading the actual auth code directly:

- **Two independent auth-state providers exist.** `SimpleAuthProvider` (`components/SimpleAuthProvider.tsx`) wraps the whole app via `app/layout.tsx` and is the real one. `AuthProvider` (`components/AuthProvider.tsx`) is a second, separate `useAuth()` implementation with its own session polling, imported only in `app/page.tsx` (homepage). Undocumented and easy to build role-awareness into the wrong one. **Decision needed**: retire `AuthProvider` or explicitly keep both in sync.
- **The `User` DB row isn't created at signup at all.** It's lazily upserted on first AI chat message (`lib/ai/claude-service.ts:640`) with a placeholder email (`user-<id>@temp.com`). Since role needs to exist immediately after signup for differentiated UX, this work has to fix that gap directly — not a scope-creep addition, a precondition for the feature to work.
- **`middleware.ts` is fully disabled** ("COMPLETELY DISABLED FOR DEBUGGING — BYPASS ALL LOGIC"). No route protection exists anywhere today. Role-gating teacher-only pages needs either re-enabling middleware or page-level guards — undocumented gap, not a regression we'd be causing.
- **`isStudent` on the Prisma `User` model is a subscription pricing-tier flag**, unrelated to account role. Since Stripe/subscriptions are inactive, this field is currently dead weight too, but it must not be conflated with or reused for the new `role` field.

## Design principles this implies

1. Create the `User` row at signup, with the real email — fixing the placeholder-email bug as part of this work.
2. Persist `role` through the resilient admin-API path (`create-user` route), the same place that already guarantees password survives email failures — not through the fragile client-side call alone.
3. Leave `isStudent` and Stripe-related code untouched; role is a new, separate concept.
4. Resolve the dual-provider situation before writing any role-aware redirect logic — pick one source of truth for session state app-wide.
5. `role` is nullable/defaulted so existing users are unaffected — no backfill required to keep current login working.
6. Don't attempt to fix RLS (#5 above) or password reset (#4) as part of this feature — both are known, separately-tracked gaps; touching them here would expand scope on the riskiest part of the app.
7. Build and test against a non-production Supabase project/branch, with regression coverage on existing signup/login, before this touches production.
