# Teacher Dashboard — Completion Summary (July 2026)

**Status: ✅ Live in production.** `NEXT_PUBLIC_TEACHER_DASHBOARD=true` on Render. Merged to `main` via PR #39, deployed, and manually verified end-to-end against production.

Companion doc: `TEACHER_DASHBOARD_IMPLEMENTATION_PLAN.md` (the 6-phase how, schema/architecture rationale).

## What was verified, and how

- **Locally**, against an isolated Supabase stack (zero production risk): schema/migration, TDD'd pure functions (invite-code generation, teacher-ownership authorization), all API routes exercised directly against a seeded local database (correct distinct-book counting, cross-teacher authorization rejection, archive/rejoin lifecycle), full browser click-through of the teacher and student UI, and both states of the feature flag (on/off).
- **On production**, manually: signed up and logged in as a teacher → landed on `/dashboard` → created a class → got a real invite code. Signed up and logged in as a student → navigated to `/join` → entered the code → enrolled successfully. Back on the teacher's roster → the student's name and email appeared correctly.

## Issues found along the way (fixed)

1. **Local Supabase auth redirect allow-list rejected the app's callback URL.** `supabase/config.toml`'s `additional_redirect_urls` had no wildcard and a scheme/host mismatch against `NEXT_PUBLIC_APP_URL`, so GoTrue silently fell back to the bare home page after email confirmation instead of reaching `/auth/callback`. Fixed with wildcarded entries covering both `localhost`/`127.0.0.1`. Local-only; production's redirect allow-list lives in the Supabase Dashboard and was unaffected.
2. **Signup role-radio "bug" investigated, found to be a testing artifact, not a real bug** — coordinate-based browser-automation clicks weren't reliably registering, not a React state issue. Applied a cheap, unrelated-but-worthwhile UX improvement anyway: the signup submit button is now disabled until a role is selected, instead of only surfacing an error after a failed submit attempt.

## Known non-blocking issues found (not fixed, logged for later)

1. **`/join` has no in-app entry point.** It's a standalone page not linked from `/catalog` (deliberately — `/catalog`'s auth logic is complex session-polling code not worth the risk of touching for this feature). Students can only reach it by direct URL today. Needs either a small isolated link/banner added to `/catalog` for STUDENT-role users, or a documented manual workaround (share the `/join` URL alongside the class code) until that's built.
2. **Google OAuth login for an existing teacher doesn't redirect to `/dashboard`.** `app/auth/callback/route.ts` never adopted `resolvePostLoginDestination` — it hardcodes `/catalog` for the "already has a role" case. Pre-existing gap from the role-based signup work, not introduced here. Only the password-login path currently picks up the Teacher Dashboard redirect; a teacher can still reach `/dashboard` directly by URL regardless of how they logged in.
3. **Production's `_prisma_migrations` history has pre-existing drift**, unrelated to this feature: a `manual_add_preview` migration appears twice, both marked "not finished." Discovered only because it was checked before applying this feature's migration. Not investigated further.

## Next feature

Per `TEACHER_FEATURES_FEASIBILITY.md`'s priority order: **one-click book assignment** — a teacher assigns a book to a class, students see it in their own view. Not started; schema hook (`BookAssignment`, FK'd to the existing `Class` and `Book` models) already anticipated in `TEACHER_DASHBOARD_IMPLEMENTATION_PLAN.md` but not created.
