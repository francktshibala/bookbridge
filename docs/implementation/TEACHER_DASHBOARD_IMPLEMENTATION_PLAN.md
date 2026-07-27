# Teacher Dashboard — Implementation Plan (July 2026)

**Status: 📋 PLANNED — not started, pending approval to begin Phase 0.**

Next feature per the priority order in `TEACHER_FEATURES_FEASIBILITY.md`, which becomes possible now that `role` exists on `User` (see `ROLE_BASED_SIGNUP_IMPLEMENTATION_PLAN.md`).

**Workflow per phase**: write the test first (red) → implement (green) → run the full test suite → commit. Same discipline as the role-based signup branch — small, independently-revertable commits, not one giant commit at the end.

## How this plan was produced

Two independent research passes (Gemini, Copilot) were run against the same context brief (BookBridge stack, existing `role` field, the three-feature dependency chain: dashboard → book assignment → reading lists) and asked to propose a data model, v1 scope, enrollment flow, permission model, and build order. Both converged independently on the same core architecture — `Class` + `Enrollment` as explicit join tables, join-code enrollment, server-scoped queries — which is a reasonable sanity check on the overall shape.

That output was then verified line-by-line against the actual schema and auth code in this repo, not taken as-is. Five corrections came out of that verification:

1. **ID default**: use `@default(cuid())`, not `uuid()` — every existing model in `prisma/schema.prisma` uses `cuid()`; one of the two proposals didn't know that.
2. **Auth pattern**: neither tool could see this codebase. The real pattern (`app/api/auth/set-role/route.ts`) is `createClient()` from `@/lib/supabase/server` → `supabase.auth.getUser()` for the authenticated identity, and `servicePrisma` (not a bare Prisma client) for writes. New routes here follow that, not generic `session.user.id` pseudocode.
3. **`BookAssignment.bookId`**: a real `Book` model already exists (`prisma/schema.prisma:51`). This must be an actual Prisma relation to `Book.id`, not a loose annotated string field.
4. **Enrollment status**: one proposal's v1 scope included a "remove student from roster" action but its own schema had no field to support a soft removal — adopted the other proposal's `EnrollmentStatus` enum (`ACTIVE` / `ARCHIVED`) to close that gap.
5. **Naming convention**: newer models (`ESLVocabularyProgress`, `ReadingSession`, `AppTestimonial`) map camelCase fields to snake_case columns via `@map(...)`; older ones (`User`, `Book`) don't. `Class`/`Enrollment` follow the newer convention.

## A scope finding, not from either AI tool

`TEACHER_FEATURES_FEASIBILITY.md` originally described this feature as "reading progress, time spent, completed books, comprehension results — read-only aggregation, low risk" — i.e. a report screen over data that already exists per-user. It didn't account for the fact that **no teacher↔student relationship exists anywhere in the schema.** `User.role` just marks an account as `TEACHER` or `STUDENT`; there is no way today to know which students belong to which teacher. Both research passes independently caught this. So this feature is honestly foundational — closer in size to role-based signup than to a simple report screen — not scope creep introduced by the research.

## Data model

```prisma
model Class {
  id          String       @id @default(cuid())
  name        String
  code        String       @unique
  teacherId   String       @map("teacher_id")
  teacher     User         @relation("TeacherClasses", fields: [teacherId], references: [id], onDelete: Cascade)
  enrollments Enrollment[]
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  @@index([teacherId])
  @@map("classes")
}

model Enrollment {
  id        String           @id @default(cuid())
  classId   String           @map("class_id")
  studentId String           @map("student_id")
  class     Class            @relation(fields: [classId], references: [id], onDelete: Cascade)
  student   User             @relation("StudentEnrollments", fields: [studentId], references: [id], onDelete: Cascade)
  status    EnrollmentStatus @default(ACTIVE)
  joinedAt  DateTime         @default(now()) @map("joined_at")

  @@unique([classId, studentId])
  @@index([classId])
  @@index([studentId])
  @@map("enrollments")
}

enum EnrollmentStatus {
  ACTIVE
  ARCHIVED
}
```

`User` gains two back-relations (`taughtClasses Class[] @relation("TeacherClasses")`, `enrollments Enrollment[] @relation("StudentEnrollments")`) — purely additive, no existing query changes behavior.

**Why explicit join table, not implicit `students User[]` on `Class`**: an implicit M:N can't hold `status`/`joinedAt` metadata. Adding that later means a destructive migration to rewrite it into an explicit table — cheaper to start explicit.

**Why `Class` as the anchor, not a direct `Teacher–Student` link**: a direct link breaks the moment a student has more than one teacher, changes teachers between years, or belongs to more than one class. Both `BookAssignment` (next feature) and shared reading lists (feature after that) attach naturally to `Class`, not to a teacher-student pair — so anchoring here now avoids a redesign for either.

## Scope — v1

**In scope:**
- Teacher creates a class (name + generated invite code)
- Student joins a class by entering the code
- Teacher views roster (students currently `ACTIVE` in a class)
- Teacher removes a student from roster (sets `ARCHIVED`, not a hard delete)
- Basic per-student reading signal on the roster (books read / last activity — computed from existing `ReadingSession` data, not denormalized/cached yet)

**Explicitly deferred:**
- Book assignment UI (`BookAssignment` model — schema hook only, see below)
- Shared reading lists
- Email-based invites (join-code only for v1; email invite can be added later without a schema change)
- Approval/pending enrollment states (the `EnrollmentStatus` enum leaves room for a future `PENDING` value if needed)
- Multi-teacher class ownership
- Any analytics beyond the basic roster signal above

## Enrollment flow

Join code only, no email delivery, no approval queue:

1. Teacher creates a class → backend generates a short, unique, human-readable code.
2. Teacher shares the code out-of-band (however they already communicate with students).
3. Student enters the code on their own dashboard → `Enrollment` row created immediately, `status = ACTIVE`.

Chosen over email invites specifically because this codebase's email path (Resend) has already caused two production incidents (see `ROLE_BASED_SIGNUP_DESIGN_RATIONALE.md` items 1–2) — a join code has no delivery dependency to fail. Chosen over an approval queue because that requires a state machine and admin UI this feature doesn't need yet; `EnrollmentStatus` leaves the door open if it's ever needed.

## Permissions

No route trusts a client-supplied role or ID. Every teacher-facing query is scoped server-side through the authenticated session, following the exact pattern in `app/api/auth/set-role/route.ts`:

```ts
const supabase = await createClient(); // @/lib/supabase/server
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

const roster = await servicePrisma.enrollment.findMany({
  where: { class: { teacherId: user.id, id: classId } },
  include: { student: { select: { id: true, name: true, email: true } } },
});
```

A class lookup that doesn't also filter on `teacherId: user.id` is a bug, not a style choice — it's how a teacher could see another teacher's roster.

## Extensibility hooks (schema only, not built now)

```prisma
model BookAssignment {
  id         String    @id @default(cuid())
  classId    String    @map("class_id")
  bookId     String    @map("book_id")
  class      Class     @relation(fields: [classId], references: [id], onDelete: Cascade)
  book       Book      @relation(fields: [bookId], references: [id])
  assignedAt DateTime  @default(now()) @map("assigned_at")
  dueDate    DateTime? @map("due_date")

  @@index([classId])
  @@map("book_assignments")
}
```

Not created in Phase 0 — listed here so the `Class`-as-anchor decision is visibly validated against the next feature before Phase 0 ships, per the design principle above. Actual creation happens when book assignment is built.

## Phase 0 — Schema only, no behavior change

Add `Class`, `Enrollment`, `EnrollmentStatus` to `prisma/schema.prisma`. Purely additive — no existing table or query is touched. Migrate and verify locally against the Supabase stack already running from the role-based signup work (`supabase start`), not production.

**Verification**: migration applies cleanly; seed a mock teacher + class + a few students locally; existing test suite still passes untouched.

## Phase 1 — TDD the invite-code and permission logic

New `lib/classes/generate-class-code.ts` (pure function — code generation + collision-check shape) and `lib/classes/authorize-teacher-class.ts` (pure function — given a user id, class id, and class-with-teacherId record, returns authorized/not), tested first, modeled on the existing `lib/auth/resolve-signup-role.ts` precedent (pure functions, no Supabase mocking).

## Phase 2 — API routes

- `POST /api/classes` — create a class (authenticated teacher only)
- `GET /api/classes` — list the authenticated teacher's classes
- `GET /api/classes/[classId]/roster` — roster for one class, teacher-owned only
- `POST /api/classes/join` — student submits a code, creates their `Enrollment`
- `DELETE /api/classes/[classId]/roster/[studentId]` — archive an enrollment (soft remove)

Every route follows the `set-role` auth pattern above. Route handlers stay thin, untested I/O wrappers; the authorization/business logic they call is what's unit-tested (same division as the role-based signup routes).

## Phase 3 — Teacher UI

Dashboard entry point (this is what a `TEACHER`-role user lands on post-login, replacing today's placeholder redirect from `resolve-post-login-destination.ts`): class list, create-class form, roster view per class with the remove-student action.

## Phase 4 — Student UI

"Enter class code" input on the student's own dashboard, immediate feedback on join success/failure (invalid code, already enrolled).

## Phase 5 — Rollout safety

- Built and verified against the local Supabase stack first, same as role-based signup — not production.
- Behind a feature flag, killable instantly, same mechanism as `NEXT_PUBLIC_ROLE_BASED_SIGNUP`.
- Manual regression check: existing student login/catalog flow unaffected; a `role = null` legacy user (if any remain) isn't broken by the new post-login redirect logic.
- Merge to `main` only after a real browser click-through: create class → copy code → join as a second test account → see roster update.

## Before Phase 0 starts

A stale local branch `feature/teacher-dashboard` already exists — it predates the role-based signup work and is missing all of it (no `role` column, no auth changes). It should not be reused as-is. Recommend deleting it and starting this work on a fresh branch off current `main`, but that's a confirmation, not something to do unprompted.

## What's next after this feature

Per `TEACHER_FEATURES_FEASIBILITY.md`: one-click book assignment next (built on the `BookAssignment` hook above), then shared reading lists. CEFR level-switching bug fix remains outstanding and independent of this work.
