# Role-Based Signup — Implementation Plan (July 2026)

Companion to `ROLE_BASED_SIGNUP_DESIGN_RATIONALE.md` (the why). This is the how — five phases, each independently testable and low blast-radius. Built on branch `feature/role-based-signup`, off `main`, against a non-production Supabase project before merge.

**Out of scope by explicit decision**: `components/AuthProvider.tsx` (the dead/parallel homepage-only auth provider) is not touched, removed, or consolidated as part of this work. Everything here reads/writes through `SimpleAuthProvider` only.

**Workflow per phase**: write the test first (red) → implement (green) → run the full test suite, not just the new tests → commit.

## Phase 0 — Schema only, no behavior change

Add a nullable `role` enum (`TEACHER` / `STUDENT`) to the Prisma `User` model. Purely additive — existing rows get `null`, no existing query changes behavior. No app code changes yet.

**Verification**: migration applies cleanly; existing test suite still passes untouched (proves zero behavioral impact).

## Phase 1 — TDD the role decision logic

New `lib/auth/resolve-signup-role.ts` + `lib/auth/__tests__/resolve-signup-role.test.ts`, modeled directly on the existing `lib/auth/password-reset-intent.ts` / `lib/__tests__/password-reset-intent.test.ts` pattern — pure function, no Supabase mocking needed.

Tests written first, covering:
- explicit role submitted on email/password signup → accepted
- missing/invalid role on email/password signup → rejected
- OAuth signup (no role available yet) → "needs role prompt" result
- existing user re-authenticating → never overwrites an already-set role

## Phase 2 — Persist role through the existing resilient path

Extend `app/api/auth/create-user/route.ts` (the admin-API path that already guarantees password survives email failures — see design rationale, past incident #3) to also store `role`, and to create the real Prisma `User` row at signup with the actual email, replacing the lazy placeholder-email upsert in `lib/ai/claude-service.ts:640` as the primary creation path (that upsert stays as a harmless no-op fallback).

Signup UI (`app/auth/signup/page.tsx`) gets a role selector wired into this call.

**TDD angle**: extract "what should be written to Prisma given email/name/role" into a small pure function, test that in isolation; the route itself stays a thin, untested I/O wrapper (consistent with how this codebase already treats Supabase calls).

## Phase 3 — Handle Google OAuth's missing role

Google sign-in (`components/auth/GoogleSignInButton.tsx`) redirects straight to `/auth/callback` with no pre-step to collect a role. Add a "needs role prompt" pure function (tested the same way, living next to `detectPasswordResetIntent`), used in `app/auth/callback/route.ts`: if the authenticated user has no role yet, redirect to a new `/auth/select-role` page instead of today's hardcoded `/catalog?verified=true`. Must not disturb the existing password-reset branch in that file.

## Phase 4 — Differentiated experience by role

Role-based post-login redirect (teacher → dashboard placeholder, student → catalog as today), sourced from `SimpleAuthProvider` only. Redirect decision is another pure, tested function (role → destination path).

## Phase 5 — Rollout safety

- All of the above built and verified against a separate Supabase project/branch, not production.
- Manual regression checklist on staging: existing email/password signup, Google sign-in, Resend confirmation emails, password reset — all must work unchanged for a user with `role = null`.
- New role-picker UI behind a feature flag, killable instantly.
- Merge to `main` only after the checklist passes.

## What's next after this feature

Per the priority/dependency order worked out in `TEACHER_FEATURES_FEASIBILITY.md`: **Teacher Dashboard** next (depends on roles existing), then one-click book assignment, then shared reading lists. Content pipeline, question-type selector, and student vocabulary list don't depend on roles and can be parallelized anytime. The CEFR level-switching bug fix (originally priority #1) is still outstanding and independent of all auth work — not blocked by this branch.
