# Agent 3 — Teacher Dashboard v2: Technical Architecture & Scalability Findings

**Scope**: query / caching / aggregation strategy for Teacher Dashboard v2 (comprehension averages, time-spent sums, assignment completion rates) at BookBridge's real and plausible future scale.
**Method**: read the live implementation (`lib/classes/get-class-roster.ts`, the `/api/classes` routes, `prisma/schema.prisma`, `supabase/migrations/`), audited the codebase for existing background-job/cache infrastructure, and reasoned about Postgres cost from the actual index definitions and realistic row counts. No production database was queried — all row-count figures below are derived estimates and are labelled as such.

---

## Executive Summary

**The scalability question is not the binding constraint. Three other things are.**

1. **`reading_sessions` has no writer.** A repo-wide grep for `reading_sessions` / `readingSession` returns exactly three hits: `prisma/schema.prisma`, one doc, and `lib/classes/get-class-roster.ts` — the *reader*. Nothing in the application ever inserts a row. Every field v2 is planned around (`comprehensionScore`, `timeOnSimplified`, `timeOnOriginal`, `wordsRead`, `avgReadingSpeed`) is a column that has never been populated. The v1 roster's `booksRead` and `lastActivity` almost certainly render `0` / `—` for every student in production today. **v2 cannot be a query-strategy project until this is a data-collection project first.**

2. **Comprehension data does exist — in a different table, on a different ID type, outside Prisma.** `supabase/migrations/20260324_create_quiz_tables.sql` creates `user_scores(user_id uuid → auth.users, quiz_id, score, total_questions, completed_at)`, and `app/api/quiz/score/route.ts` actively writes to it via supabase-js. This is the only real comprehension signal in the system. It is **not in `prisma/schema.prisma`**, and its `user_id` is `uuid` while `enrollments.student_id` / `users.id` are `TEXT`. Joining them requires an explicit cast and defeats a plain index unless handled deliberately.

3. **Latency is dominated by round trips, not rows.** A single roster request today costs ~6 sequential network hops (1 Supabase Auth `getUser()` + 5 DB queries). Naively adding four metrics adds four more queries — a ~2x latency regression driven entirely by per-hop network cost, while the actual Postgres aggregate work stays in the single-digit-milliseconds range at any scale this app will plausibly reach.

**Recommendation in one line:** keep read-time aggregation, but collapse *all* per-student metrics into **one** parameterised `$queryRaw` with CTEs, add two indexes, and do not introduce a background job, cache layer, or denormalised counter. At 259 students the headroom is roughly three orders of magnitude; the escalation ladder below says exactly when that stops being true.

---

## Recommendations

### Primary approach for current scale: real-time aggregation, one statement

Keep the existing pattern — "aggregate at read time, N queries independent of roster size" — but tighten it from *two aggregate queries* to *one*, so adding metrics costs zero additional round trips.

**Target shape for `getClassRoster` (2 DB queries total, regardless of how many metrics v2 adds):**

```sql
-- Query 2 of 2: every per-student metric in one statement, one round trip.
WITH sessions AS (
  SELECT user_id,
         COUNT(DISTINCT book_id)                        AS distinct_books,
         MAX(session_start)                             AS last_activity,
         AVG(comprehension_score)                       AS avg_comprehension,
         SUM(time_on_simplified + time_on_original)     AS total_seconds
  FROM reading_sessions
  WHERE user_id = ANY($1)
  GROUP BY user_id
),
quizzes AS (
  SELECT us.user_id::text AS user_id,
         AVG(us.score::numeric / NULLIF(us.total_questions, 0)) AS avg_quiz_pct,
         COUNT(*)                                                AS quiz_attempts
  FROM user_scores us
  WHERE us.user_id::text = ANY($1)
  GROUP BY us.user_id
)
SELECT u.id, s.*, q.avg_quiz_pct, q.quiz_attempts
FROM unnest($1::text[]) AS u(id)
LEFT JOIN sessions s ON s.user_id = u.id
LEFT JOIN quizzes  q ON q.user_id = u.id;
```

Why this specific shape:
- **`unnest($1) LEFT JOIN`** means students with no activity come back as explicit `NULL` rows rather than being absent from the result, which removes the `?? 0` / `?? null` defaulting the current code does in JS.
- **CTEs, not subquery-per-metric**, so Postgres aggregates each table exactly once.
- **Still one `$queryRaw` tagged template** — parameterised, consistent with the existing `= ANY(${studentIds})` pattern, no string interpolation.

**Also collapse the ownership check.** `app/api/classes/[classId]/roster/route.ts` currently does a `class.findUnique` and then `getClassRoster` does an independent `enrollment.findMany`. Fold the ownership predicate into the enrollment query (`where: { classId, status: 'ACTIVE', class: { teacherId } }`) and return 404 on an empty-and-unowned result. That removes a round trip while *keeping* the server-scoped-query invariant the implementation plan calls out as a correctness requirement, not a style choice.

Net effect: v1 costs 5 DB queries and shows 2 metrics. v2 would cost **3 DB queries and show 6+ metrics**.

### Indexes to add (do these with the v2 migration, not later)

```sql
-- MAX(session_start) per user currently has no supporting index; the planner
-- falls back to (user_id, book_id) or (user_id, created_at) and reads the heap.
CREATE INDEX reading_sessions_user_id_session_start_idx
  ON reading_sessions (user_id, session_start DESC);

-- user_scores has only a plain (user_id) index and no time-window support.
CREATE INDEX idx_user_scores_user_id_completed_at
  ON user_scores (user_id, completed_at DESC);
```

If v2 adds a "last 30 days" window (recommended — see Risk 6), both indexes become load-bearing rather than nice-to-have.

### Explicitly do NOT do, at current scale

| Option | Verdict | Reason |
|---|---|---|
| Periodic aggregation job / worker | **No** | No infrastructure exists to host it (see audit below). Introducing one is a permanent operational commitment to solve a problem that is ~1000x away. |
| Materialized view + scheduled refresh | **No, but keep it as the escape hatch** | Correct eventual answer for an org-level rollup; premature for per-class views. |
| Denormalised counters on `Enrollment`, updated on write | **No — and this one is actively unsafe here** | There is no single write choke point. Reading positions and quiz scores are written with **supabase-js**; classes/enrollments with **Prisma `servicePrisma`**. A counter maintained in application code would be silently wrong the moment a write goes through the other client. Doing it correctly would require Postgres triggers, which moves business logic out of the repo entirely. |
| Redis caching | **No** | `redis@^5.6.0` is a dependency but is only used in `lib/ai/service.ts` and `lib/ai/claude-service.ts`, both gated behind `if (process.env.REDIS_URL)`. It is an optional AI-response cache, not a general cache layer, and may not even be provisioned in production. |

### Trigger conditions — revisit the strategy when *any* of these is true

Concrete, checkable, in priority order:

1. **p95 latency of `GET /api/classes/[classId]/roster` exceeds 500ms** and Supabase query stats attribute >150ms of it to the aggregate statement (not to `auth.getUser()`).
2. **The scan set for a single dashboard view exceeds ~250,000 rows.** For a 30-student class that means ~8,300 sessions per student — implausible. For a school-wide view of 1,000 students it means 250 sessions each — **very plausible**, which is why the org-level view is the real trigger, not roster growth.
3. **`reading_sessions` passes ~5M rows total** (see growth math below — this is roughly 25x the current student body running for 3 school years).
4. **A cross-class / school-wide / district view ships.** This is a different query grain, and it is the first feature that genuinely warrants a materialized view.
5. **Any dashboard view starts issuing a query per class or per student.** That is the failure mode the v1 design deliberately avoided; it should be treated as a regression, not a scaling event.

### Escalation ladder (cheapest first — climb only on a trigger)

1. Single-statement aggregation + the two indexes above. ← **do this now**
2. Time-window the aggregates (`WHERE session_start > now() - interval '30 days'`) — better teacher signal *and* bounds the scan set permanently.
3. HTTP response caching on the roster route: `Cache-Control: private, max-age=30`. Zero infrastructure, and a teacher refreshing a dashboard tolerates 30s staleness fine.
4. `pg_cron` + a materialized view **inside Supabase**. This is the correct first "background job" for this codebase specifically, because it requires *no application infrastructure at all* — no worker, no queue, no Render cron service, no deploy-time change. It is available on Supabase Postgres.
5. Postgres triggers maintaining denormalised counters — only if writes must be reflected instantly and step 4's staleness is unacceptable.
6. A real job runner. Only if the product has grown into something else entirely.

---

## Detailed Findings

### 1. What the existing implementation actually does

`lib/classes/get-class-roster.ts` is well-built and the recommendations above are a tightening of it, not a replacement:

- One `enrollment.findMany` with `include: { student: { select: ... } }` — a single join, explicit column selection, no over-fetch.
- Early return on empty roster — avoids issuing aggregate queries with an empty `ANY(ARRAY[])`.
- Two aggregates in `Promise.all`, so they overlap on the wire rather than serialising.
- Raw SQL for `COUNT(DISTINCT book_id)` with an explanatory comment about *why* (Prisma `groupBy` can't express `COUNT(DISTINCT …)`) — correct, and the reason is still true in Prisma 6.
- `Number(row.distinct_books)` on the raw result. **Keep doing this.** Postgres `COUNT` returns `bigint`, which Prisma surfaces as JS `BigInt`, and `JSON.stringify` — and therefore `NextResponse.json` — throws `TypeError: Do not know how to serialize a BigInt`. Any new `COUNT`/`SUM` column added to the raw query needs the same treatment, and `AVG` returns a Prisma `Decimal` that needs `Number()` too. This is the single most likely way v2 breaks in production on day one.

Full round-trip inventory for one roster page load today:

| # | Hop | Source |
|---|---|---|
| 1 | `supabase.auth.getUser()` — **network call to Supabase Auth, not the DB** | `lib/auth/require-role.ts` |
| 2 | `user.findUnique` (role check) | `lib/auth/require-role.ts` |
| 3 | `class.findUnique` (ownership) | roster route |
| 4 | `enrollment.findMany` | `get-class-roster.ts` |
| 5–6 | 2 aggregates (parallel, ≈1 hop of wall time) | `get-class-roster.ts` |

Hops 1 and 2 are fixed auth cost on every teacher route and likely account for more wall-clock time than all the aggregation combined. Worth measuring before optimising anything else.

### 2. What changes as metrics are added

**Averaging `comprehensionScore`**: `AVG()` over a `Decimal(3,2)` column costs nothing extra once the rows are already being scanned for the distinct-book count — it is the *same* index scan, the *same* group. Adding it to the existing `GROUP BY user_id` is free. Adding it as a *separate query* costs a full extra round trip. This is the entire argument for consolidation.

Two semantic traps, both more important than the performance question:
- `comprehension_score` is nullable. `AVG` skips NULLs, so a student with 40 sessions and 2 scored ones gets an average built from n=2 with no visible indication. The query must return `COUNT(comprehension_score)` alongside the average so the UI can suppress or qualify low-n values.
- A lifetime average is a lagging indicator that stops moving after a few weeks — it will look "broken" to a teacher watching a struggling student improve. A 30-day window is both better pedagogy and better performance.

**Summing `timeOnSimplified` / `timeOnOriginal`**: two `Int` columns, `SUM(a + b)`, same group, also free. Note these are seconds and both `@default(0)`, so `SUM` never returns NULL for a student with rows — but returns NULL for a student with none, hence the `LEFT JOIN … unnest` shape.

**Assignment completion rates** (once `BookAssignment` exists): this is the one metric with a genuinely different shape. It is a *ratio over a cross product* — assignments in the class × students in the class — not an aggregate over one student's rows. The correct form is a `LEFT JOIN` from `book_assignments` (filtered to `class_id`) against whatever defines "completed", producing a `COUNT(*) FILTER (WHERE completed)` per student. It still fits as one more CTE in the same statement.

The unresolved question is **what "completed" means**, and it is a product decision with a direct query cost:
- *Any reading session for that book* → cheapest (`reading_sessions` already indexed on `(user_id, book_id)`), but a student who opened the book for 10 seconds counts as complete.
- *`reading_positions.completion_percentage >= X`* → far better signal, and `reading_positions` is the table that is **actually being written** today (one row per user per book, upserted from `lib/services/reading-position.ts` on a 5s debounce). Needs an index on `reading_positions (user_id, book_id)` — the existing `@@unique([userId, bookId])` already provides one.
- *Quiz passed* → strongest signal, requires the `user_scores` → `quizzes` → `book_id` join and the uuid/text cast.

**Recommendation: define completion off `reading_positions`.** It is the only progress table with live production data, it is one row per student per book (so it never grows unboundedly), and it already carries `completion_percentage`, `total_time`, and `last_accessed` — which between them can back "books read", "time spent", and "last activity" *today*, without waiting for `reading_sessions` to get a writer.

### 3. Scale math

Estimates, derived from the stated 259 active students across 3 schools. Not measured against production.

| Table | Grain | Rows today (est.) | Rows at 10x (2,590 students) | Rows at 100x (25,900) |
|---|---|---|---|---|
| `reading_positions` | 1 per (student, book) | ~5,000 (20 books/student) | ~52,000 | ~520,000 |
| `user_scores` | 1 per quiz attempt | ~5,000–8,000 | ~75,000 | ~750,000 |
| `reading_sessions` *if wired up* | 1 per book-open | 0 today; ~190k/school-year | ~1.9M/yr | ~19M/yr |

For a **per-class roster** the query only ever touches one class's students. With a `(user_id, …)` index the planner does ~30 index scans and aggregates the matching rows:

- 30 students × 700 lifetime sessions = **21,000 rows scanned** → single-digit ms, well under the network round trip.
- At 100x student growth the *per-class* number is **unchanged** — a class is still ~30 students. Only per-student history grows. A student would need ~8,000 sessions (≈ 5 years of heavy daily use) to push one class's scan set to 250,000 rows.

**This is the key structural point: per-class dashboards do not scale with total user count.** They scale with class size × per-student history, both of which are bounded by real-world limits (class sizes don't 100x; a school year doesn't get longer). Postgres will comfortably handle this shape at 100x the current user base with no architectural change.

**What *does* scale with total user count** is any view that spans a whole school or district. 1,000 students × 250 sessions = 250,000 rows per page load, recomputed on every refresh, is where read-time aggregation stops being obviously correct. The implementation plan already notes "no school/org-level view" as a known gap — that gap and the aggregation-strategy question are the same question, and if org-level views are in v2's scope, step 4 of the ladder (pg_cron + matview) should be planned in rather than deferred.

### 4. Existing infrastructure audit

Searched for `node-cron`, `bullmq`, `bull`, `agenda`, `inngest`, `trigger.dev`, `pg-boss`, `graphile-worker`, cron config in `vercel.json`, a `render.yaml`, GitHub Actions `schedule:` triggers, `pg_cron`, and `CREATE MATERIALIZED VIEW`.

**Result: nothing. There is no background job infrastructure of any kind.**

- No queue or scheduler package in `package.json`.
- `vercel.json` contains only two `maxDuration` overrides — no `crons` block.
- No `render.yaml`; the Render service is configured through the dashboard, so adding a Cron Job service is a manual, billable, out-of-repo change.
- `.github/workflows/` contains one file, `mobile-testing.yml.disabled` — disabled, and no `schedule:` trigger anywhere.
- `PrecomputeQueue` (`prisma/schema.prisma:381`) is a *table shaped like* a job queue (`status`, `priority`, `attempts`, `lastError`) for content pre-generation — but there is no worker process consuming it. It is drained by manually-run scripts. It is evidence that this pattern was reached for before and never got a runtime, which is a reason for caution, not a foundation to build on.
- `redis` is present but optional and single-purpose (AI response cache, gated on `REDIS_URL`).
- Caching in the codebase is `export const revalidate = 3600` on ~30 static book-bundle routes plus in-process `lru-cache` in a few libs. Neither generalises to per-teacher, per-request, authenticated data.

**Conclusion:** "add a periodic aggregation job" is not a small tweak in this codebase — it is standing up a new runtime, with its own deploy, failure modes, monitoring, and cost. `pg_cron` inside Supabase is the only variant that avoids all of that, which is why it sits at step 4 of the ladder rather than being dismissed outright.

---

## Risks & Concerns

**1. `reading_sessions` is never written — highest priority.** Every v2 metric planned on it will ship as zeros. Whatever else v2 does, it must either (a) add a writer for `reading_sessions`, or (b) re-source the metrics from `reading_positions` and `user_scores`, which have live data. Option (b) is faster, lower-risk, and I'd recommend it as the v2 default. If (a) is chosen, note that inserting a session row per book-open makes `reading_sessions` the fastest-growing table in the schema — bounding it (a session row per book *per day* rather than per open) is worth deciding up front.

**2. `user_scores` is invisible to Prisma.** The quiz tables live only in `supabase/migrations/`, not `prisma/schema.prisma`. Consequences: Prisma generates no types for them, `prisma migrate dev` may propose destructive changes for tables it doesn't know about, and any dashboard query against them must be raw SQL. Recommended fix: add the four quiz tables to `prisma/schema.prisma` as models (with an empty, no-op migration marking them as already-applied) so schema drift can't bite later.

**3. uuid ↔ text ID mismatch.** `user_scores.user_id` is `uuid` referencing `auth.users(id)`; `users.id` / `enrollments.student_id` are `TEXT` holding the same value as a string (confirmed in `app/api/auth/create-user/route.ts`, which upserts the Prisma row with `id: user.id` from Supabase Auth). Any join needs `us.user_id::text = e.student_id`, and a cast on the indexed side will not use `idx_user_scores_user_id`. Either cast the *parameter* to `uuid[]` instead (`us.user_id = ANY($1::uuid[])`) or add an expression index on `(user_id::text)`. Casting the parameter is the cheaper, correct choice.

**4. `servicePrisma` has no pgbouncer configuration.** `lib/prisma.ts` carefully appends `pgbouncer=true&connection_limit=1&pool_timeout=30`; `lib/prisma-service.ts` — which every teacher-dashboard query uses — takes `DATABASE_URL_SERVICE_ROLE` raw with no such handling. If that URL points at the Supabase transaction pooler (port 6543), Prisma's prepared statements will intermittently fail with "prepared statement already exists". Worth confirming which port that env var targets before v2 increases query volume on this path. Conversely, `connection_limit=1` on the *other* client serialises all its queries through a single connection — on Render's long-lived Node process that is a throughput ceiling, not a safety measure. Both clients' pooling deserve a deliberate second look; neither is a v2 blocker.

**5. BigInt / Decimal serialisation.** `COUNT` → `BigInt` and `AVG` → `Decimal` both throw or misrender through `NextResponse.json`. The existing code handles the one case it has; each new aggregate column is a fresh opportunity to forget.

**6. Aggregate semantics are class-blind, and no caching strategy can fix that.** The current query aggregates a student's *entire* history across *all* books — not "since they joined this class", not "for books assigned in this class". A student enrolled in two classes shows identical numbers to both teachers. Before optimising the query, decide whether metrics are scoped to the class (`session_start >= enrollments.joined_at`, and/or restricted to `book_assignments` for that class). Class-scoping is both more correct *and* strictly cheaper to compute, so this is the rare case where the right product answer is also the faster query.

**7. Metric count inflation is the real risk, not row count.** The plausible failure mode is not "Postgres got slow" — it's "v2 shipped with six metrics as six separate `Promise.all` queries, and later someone adds a per-student sparkline that fetches per row". Making the single-statement pattern explicit in the code (and in a comment, as the current file already does) is the cheapest guardrail available.

---

## Next Steps

1. **Verify the premise before designing anything.** Run `SELECT count(*) FROM reading_sessions;`, `SELECT count(*) FROM reading_positions;`, `SELECT count(*) FROM user_scores;` against production. If `reading_sessions` is 0 as this audit predicts, that single fact should reshape the v2 spec — this is a blocker for Agent 2's data recommendations too, and should be relayed to the synthesis step.
2. **Decide the data source**: re-source v2 metrics onto `reading_positions` + `user_scores` (recommended, ships now), or add a `reading_sessions` writer first (higher fidelity, delays v2, needs a row-growth policy).
3. **Refactor `getClassRoster` to the single-statement CTE shape** above, with `unnest(…) LEFT JOIN`, explicit `Number()` conversion on every `COUNT`/`SUM`/`AVG` column, and an accompanying `COUNT(comprehension_score)` for n-visibility. Keep the existing comment convention explaining the query-count invariant.
4. **Fold the ownership check into the enrollment query** and drop the separate `class.findUnique` — one fewer round trip, same security invariant.
5. **Add the two indexes** in the same migration as the v2 query change.
6. **Bring the quiz tables into `prisma/schema.prisma`** to close the schema-drift gap.
7. **Decide class-scoping semantics** (`joined_at` floor, assignment restriction, 30-day window) before writing the query — it changes both the SQL and the indexes.
8. **Instrument, don't guess.** Log server-side duration for the roster endpoint split between auth and aggregation. The trigger conditions above are only useful if something is measuring them; right now nothing is.
9. **Revisit only on a trigger.** At 259 students, and at 2,590, read-time aggregation is the correct answer. Write it down as a decision with the trigger list attached so the next person doesn't re-litigate it — or, worse, pre-emptively build the job runner.
