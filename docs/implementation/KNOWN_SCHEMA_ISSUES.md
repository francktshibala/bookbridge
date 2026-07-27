# Known Schema Issues (logged, not fixed)

Found while standing up a local Supabase stack to validate the role-based signup Phase 0 migration (`ROLE_BASED_SIGNUP_IMPLEMENTATION_PLAN.md`). Both are pre-existing, unrelated to that feature, and deliberately **not fixed** here to keep that branch scoped. Logged so they aren't lost.

## 1. `Feedback.userId` / `User.id` type mismatch

`prisma/schema.prisma`:
```prisma
model Feedback {
  ...
  userId String? @db.Uuid @map("user_id")
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
}

model User {
  id String @id @default(cuid())   // plain text, no @db.Uuid
  ...
}
```

`Feedback.userId` is explicitly typed `uuid` at the database level; `User.id` is plain `text` (Prisma's default `cuid()`). Running `prisma db push` against a fresh empty database fails outright:

```
Error: ERROR: foreign key constraint "feedback_user_id_fkey" cannot be implemented
DETAIL: Key columns "user_id" and "id" are of incompatible types: uuid and text.
```

**This means the live database and `schema.prisma` may have already drifted apart** — either production's `users.id` column is actually `uuid` (contradicting the schema file), or the `feedback` table's FK constraint doesn't actually exist/enforce in production the way the schema file claims. Worth a direct check against production (`\d feedback` / `\d users` in the Supabase SQL editor) before assuming either side is correct.

**Not fixed here** — needs its own investigation into what production actually has before deciding which side (schema file or live column type) to change.

## 2. Legacy migration can't run against a fresh local Supabase stack

`supabase/migrations/001_add_subscription_system.sql` line 2:
```sql
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data jsonb;
```

Fails locally with `ERROR: must be owner of table users (SQLSTATE 42501)` — the local Supabase CLI's Postgres role isn't the owner of `auth.users` the way whatever ran this against production originally was. Already applied to production, so no live impact, but **no one can currently spin up a fresh local/staging Supabase environment by replaying `supabase/migrations/*.sql` from scratch** — that replay also assumes `public.books` and other Prisma-managed tables already exist (these SQL migrations were written as patches on top of an existing Prisma-created schema, not as a from-scratch bootstrap).

**Workaround used for one-off local verification** (not committed): temporarily moved all `supabase/migrations/*.sql` aside, ran `supabase start` clean, then `prisma db push` to lay down the full Prisma-managed schema directly — this is the actual working order for building a local/staging environment from scratch (Prisma schema first, then these SQL patches on top, if needed).

**Not fixed here** — `raw_user_meta_data` is likely already a default built-in column on modern GoTrue anyway, making the line probably redundant, but that should be verified against production before editing a historical migration file.
