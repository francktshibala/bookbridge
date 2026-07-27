# Teacher Dashboard v2 — Implementation Plan

**Status: 🔨 NOT STARTED — blocked on Phase 0 below.** Synthesizes 3-agent research (`docs/research/Agent1/2/3_Teacher_Dashboard_*_Findings.md`) plus direct production verification. Read those files for full detail and evidence; this is the synthesis and build order.

## Phase 0 — BLOCKING: fix the data pipeline before building any UI

**Confirmed directly against production** (not inferred): `reading_sessions` = 0 rows (no writer anywhere in the app — v1's `booksRead`/`lastActivity` are showing 0/blank for every real student today). `reading_positions` = 0 rows **despite a fully-wired write path existing** (`lib/audio/AudioBookPlayer.ts` → `lib/services/reading-position.ts` → `app/api/reading-position/[bookId]/route.ts`). Only `user_scores` (quiz system) has real data — 15 rows, confirmed.

This means all three research agents' top recommendation ("repoint the roster query at `reading_positions`, it has real data") is not sufficient on its own — that table is also empty in production. **This is a live bug in a working-looking feature, not a query-sourcing problem.**

**Investigate before building anything else:**
1. Is the write path actually being invoked client-side (add logging / check browser network tab on a real read session)?
2. Is the write request reaching the API route and failing there (server logs)?
3. Is RLS silently rejecting the insert/upsert (this app has documented, deferred RLS gaps — leading hypothesis, unconfirmed)?
4. Does `reading_positions` require audio playback specifically (`setupPositionTracking()` hooks into audio callbacks per Agent 2) — if a student reads silently without starting audio, does *anything* get written? This may be a coverage gap, not just a bug.

## Phase 1 — Once Phase 0 data actually flows: consolidate the roster query

Per Agent 3, collapse all per-student metrics into one parameterized `$queryRaw` (CTEs, `unnest($1) LEFT JOIN` so inactive students return explicit NULLs, not absence). Fold the ownership check into the enrollment query to drop a round trip. Add two indexes: `reading_positions (user_id, book_id)` (already covered by the existing `@@unique`) and `user_scores (user_id, completed_at DESC)`. Cast `user_scores.user_id` to `uuid[]` at the parameter, not the column, to keep the index usable. Every `COUNT`/`SUM` needs `Number()`; every `AVG` needs `Number()` on the `Decimal` — BigInt/Decimal serialization is flagged by Agent 3 as the most likely day-one production break.

**No caching/job infrastructure needed at this scale** (259 students, 3 schools) — confirmed by an infrastructure audit (no queue/cron/worker exists anywhere in this codebase; introducing one is a new architectural commitment, not a small tweak). Escalation ladder and concrete trigger conditions are in `Agent3_Teacher_Dashboard_Technical_Findings.md` if scale changes.

## Phase 2 — Data points, in value order (per Agent 2)

**Build:**
1. Per-book reading progress (title, % complete, level, last accessed) from `reading_positions` — answers "what is this student actually reading, and are they stuck?"
2. Comprehension: **latest** quiz score per book, shown as `4/5` with book + level always visible. **Never a per-student average** — 5-question quizzes with unlimited retakes make an average actively misleading (details in Agent 2's findings, §3).
3. `reading_positions.cefr_level` per student — currently written, never surfaced. Agent 2 flags this as the most pedagogically meaningful unused field in the schema.

**Defer:**
- Assignment due-date/completion tracking — right idea, but fix the `BookAssignment` schema hook first: it currently FKs to `Book` (the legacy upload model), but students actually read `FeaturedBook` (keyed by slug) — as drafted, an assignment could never join to progress or quiz data. Fix before migrating.
- Class-level aggregates — premature at 5–25 students per class; a filtered "3 students haven't read this week" list beats an average.
- Time-spent reading — genuinely unavailable at any fidelity; every apparent shortcut in the current schema is a trap (hardcoded 0s, audio-bundle duration mislabeled as time spent). Would need real new instrumentation — scope as its own feature, not a v2 line item.
- Comprehension skill-type breakdown — blocked deeper than "the question-type-selector doesn't exist": there's no per-question response table at all today, and 5-question quizzes can't support a credible per-skill statistic anyway.

**Security note carried over**: `user_scores` RLS only allows a user to read their own rows — teacher-side reads must go through the service-role client, same pattern as existing routes. Also: close the quiz-answer leak (`GET /api/quiz/[bookId]` currently returns `is_correct`/`correct_answer` to the client) before displaying quiz scores as anything resembling assessment data.

## Phase 3 — UX: action panel, not a stats grid

Per Agent 1's competitive research (Google Classroom, Lexia, Microsoft Reading Progress, Learning A-Z all independently converge on this): lead with a short, named list of students bucketed by what the teacher should do, not a metrics dashboard.

- **Stalled** (7+ days no activity) → nudge/reassign
- **Struggling** (recent quiz below ~60%) → re-teach
- **Finished since last checked** → celebrate/assign next

Auto-hide empty buckets (Google's rule). Hard-code thresholds; don't build a settings UI — validate the numbers with 2-3 real teachers at the pilot schools instead (cheap, and it's the participatory design step the research literature says actually drives adoption).

**Reframe the success metric**: "daily opens" is likely the wrong target for a reading platform — even Lexia (better-resourced, more mature) markets a weekly cadence. Instrument weekly-active teachers and actions-taken-from-the-panel, not daily opens.

**Cheap, genuinely gratifying quick win**: "questions your class got wrong most often" from quiz data (verifiably populated) — the vocabulary-lookup equivalent Agent 1 originally wanted turned out to be unwritten data too (`ESLVocabularyProgress` has zero code references anywhere).

## What's explicitly out of scope for v2

School/org-level rollup views, configurable dashboards, real-time activity feeds, skill-type breakdowns, gamification/leaderboards, parent-facing features. All assessed by Agent 1 as over-engineering at BookBridge's actual scale (259 students, 3 schools) — full reasoning in the findings doc if/when scale changes.
