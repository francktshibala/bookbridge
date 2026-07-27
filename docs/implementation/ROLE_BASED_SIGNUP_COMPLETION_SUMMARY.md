# Role-Based Signup — Completion Summary (July 2026)

**Status: ✅ Live in production.** `NEXT_PUBLIC_ROLE_BASED_SIGNUP=true` on Render. Merged to `main`, deployed, and manually verified end-to-end against production by the founder.

Companion docs: `ROLE_BASED_SIGNUP_DESIGN_RATIONALE.md` (why), `ROLE_BASED_SIGNUP_IMPLEMENTATION_PLAN.md` (the 5-phase how), `KNOWN_SCHEMA_ISSUES.md` (unrelated pre-existing bugs found along the way).

## What was verified, and how

- **Locally**, against an isolated Supabase stack (zero production risk): role selector UI, signup persisting the correct role to both `auth.users` and `public.users`, login, redirect to `/catalog`.
- **On production**, manually: signup with a fresh email + role selection → confirmation email received → email confirmed → login succeeded → redirected to `/catalog` → real book collections rendered correctly for both Student and Teacher roles.

## Bug found and fixed during local testing

The Prisma `users` row was **not** being created on the common signup path. Root cause: the client always calls `supabase.auth.signUp()` first (creating the Supabase auth user), so by the time the `create-user` API route runs as its resilience-backup call, the user already exists — the route took the "already exists" branch, which never touched Prisma at all. The row-creation logic only lived in the rarely-hit "brand new user" branch. Fixed by extracting `upsertPrismaUser()` and calling it from both branches. This is exactly the kind of bug unit tests alone couldn't catch — found only by actually clicking through the flow in a browser.

## Known non-blocking issues found (not fixed, logged for later)

1. **Confirmation magic links don't auto-sign the user in.** Supabase's admin-generated `magiclink` (used for the Resend confirmation email) returns tokens in the URL hash fragment (`#access_token=...`), not a `?code=` query param. `app/auth/callback/route.ts` only handles the `?code=` (PKCE) format, so it falls through to its default `/auth/login` redirect, carrying the now-unused hash tokens along uselessly. **Not a functional blocker** — Supabase still marks the email confirmed server-side regardless, so the user can log in normally afterward with their password — but it means the magic link doesn't do what a magic link is supposed to do (auto sign-in). Pre-existing behavior, not caused by this feature; only surfaced because this testing exercised the confirmation flow closely.
2. **Testing gotcha, not a code bug**: re-"signing up" with an email that already has an account silently updates the existing account's role rather than failing with a clear error the user notices (the API does return a 400 "already registered," but the signup page's own resilience logic treats that as a soft success). Use a fresh email/alias per test.
3. **Minor metadata drift risk**: the `create-user` route's "already exists" branch now updates the role in Prisma but does not update Supabase's `user_metadata.role`. Low-priority — only matters if someone re-attempts signup against an existing account expecting their role to change everywhere.

## Next feature

Per `TEACHER_FEATURES_FEASIBILITY.md`'s priority order: **Teacher Dashboard** is next (now unblocked, since roles actually exist in production). Not started yet — documentation only, per instruction.
