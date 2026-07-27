# Agent 2 — Data & Value Requirements Findings (Teacher Dashboard v2)

**Scope**: which additional data points for Teacher Dashboard v2 are genuine teacher value vs. clutter, grounded in what this codebase actually stores and actually writes.

**Method**: read the Prisma schema, every migration under `prisma/migrations/` and `supabase/migrations/`, the live roster code path, the quiz system, and the reading-position write path. Every claim below is traced to a file. Where I could not confirm something from code (production row counts), I say so explicitly.

---

## Executive Summary

**The headline finding is not about which metric to add. It is that the metric v1 already ships is almost certainly broken in production.**

`lib/classes/get-class-roster.ts` computes `booksRead` and `lastActivity` from the `reading_sessions` table. A repo-wide search for that table and for the `ReadingSession` Prisma model returns **exactly one reference in application code — the roster read itself**:

```
$ grep -rln "reading_sessions|ReadingSession" (excluding node_modules, .next)
prisma/schema.prisma
lib/classes/get-class-roster.ts
lib/predictive-prefetch.ts      <- false positive: local var `lastReadingSession`
```

Nothing in the app ever inserts a `ReadingSession`. There is also **no migration anywhere in the repo that creates the `reading_sessions` table** (`prisma/migrations/` creates `reading_progress`, `bookmarks`, `user_preferences`, `reading_positions`, the book-catalog tables, `classes`, `enrollments` — and nothing else). The model is declared in `prisma/schema.prisma:233-253` but was never migrated and is never written.

Consequence: unless `reading_sessions` was created out-of-band and is being populated by something outside this repo, **every student on every roster shows "0 books read" with no last-active date**, permanently. The production verification recorded in `TEACHER_DASHBOARD_COMPLETION_SUMMARY.md` confirmed only that "the student's name and email appeared correctly" — it did not confirm the reading signal was non-zero, and with a fresh test student it would have read `0 books read` either way, which looks correct.

This inverts the v2 priority order. **The highest-value data work is not adding metrics — it is repointing the two metrics that already exist at tables that contain data.**

The good news: the data teachers asked for does exist, in two tables the plan documents don't mention at all.

| Original survey ask (`TEACHER_FEATURES_FEASIBILITY.md:22`) | v1 claims | Reality |
|---|---|---|
| Completed books | `booksRead` on roster | Broken — sourced from empty `reading_sessions`. Real source is `reading_positions.completion_percentage` |
| Reading progress | not delivered | **Available now** — `reading_positions.completion_percentage` + `sentences_read`, per book, real data |
| Comprehension results | not delivered | **Available now** — `user_scores` (quiz system, Sprint 2), real data, with caveats |
| Time spent | not delivered | **Not available at any fidelity.** No table stores elapsed reading time. Requires new instrumentation |

Three of the four survey asks are one query away from real. The fourth (time spent) is the one everybody assumes is easy and is actually the only genuine greenfield build.

---

## Recommendations

### Build first (real data exists today; high teacher value)

1. **Repoint `booksRead` / `lastActivity` at `reading_positions`.** This is a bug fix disguised as a feature. `booksRead` becomes `COUNT(DISTINCT book_id) WHERE completion_percentage >= <threshold>`, `lastActivity` becomes `MAX(last_accessed)`. Same 2-query shape, same `student_id` join (both are `TEXT` = Supabase auth uid — see "Join keys" below). Nothing else on this list matters until this is done, because everything else inherits the same join.

2. **"In progress" per student — book title + % complete for the 1–3 most recent books.** From `reading_positions` (`book_id`, `completion_percentage`, `last_accessed`), titles from `featured_books.slug`. This is the single most actionable thing for an ESL teacher: it answers "what is this student actually reading right now, and are they stuck?" — which is the question a roster row of aggregate counts cannot answer. It also makes `lastActivity` interpretable instead of ambiguous (see Risks §1).

3. **Comprehension: latest score per book, not a per-student average.** From `user_scores` joined via `quizzes.book_id`. Shown as `"The Necklace (A1) — 4/5"`, with the book and level always visible. See Detailed Findings §3 for why the per-student average is the wrong framing here and is actively misleading given 5-question quizzes.

### Build second (real data, but needs a design decision or a small write first)

4. **Reading level (CEFR) per student, and level movement over time.** `reading_positions.cefr_level` is written on every level change (`contexts/AudioContext.tsx:150-176` persists it explicitly). Nothing in the dashboard surfaces it. For an ESL platform this is arguably a better teacher signal than book count — "3 students are still on A1 after six weeks" is a teaching decision; "Maria read 4 books" is not. Cheap: one more column on the existing query. **This is the biggest under-considered data point in the schema and it is not in the v2 candidate list.**

5. **Time spent — only if instrumented properly.** There is no shortcut here, and the plausible shortcuts are all wrong (§4). If built: a small append-only session table written by the reading UI with explicit start/heartbeat/end, then surfaced as *minutes per week*, never as a lifetime total.

### Defer

6. **Assignment due-date / completion tracking.** Correct to build — it converts the dashboard from a report into a workflow, which is what drives repeat visits. But it is blocked on `BookAssignment` existing, and the schema hook as currently drafted has a **book-identity bug that must be fixed before it is migrated** (§5). Defer until #1–#3 are live, and fix the FK first.

7. **Class-level aggregate view.** Premature at current scale, with one exception (§6).

### Avoid entirely

8. **A single per-student "comprehension average" number.** With 5-question quizzes, unlimited retakes, and the correct answers exposed in the client payload, this number cannot bear the weight a teacher would put on it (§3, Risks §2–§3).

9. **Words read / reading speed (WPM) / vocabulary lookups.** `ReadingSession.wordsRead`, `avgReadingSpeed`, `vocabularyLookups` are never written and there is no instrumentation to write them. Even if there were: WPM on a self-paced audio-assisted ESL reader measures playback speed setting, not reading ability. Classic vanity metric — precise-looking, uninterpretable, and inviting exactly the wrong comparison between students.

10. **`timeOnSimplified` vs `timeOnOriginal` split.** Never written, and `AudioBookPlayer` hardcodes `contentMode: 'simplified'` (`lib/audio/AudioBookPlayer.ts:155`), so even the mode the student is in isn't tracked accurately. Presenting "time on simplified vs. original" would be inventing a distinction the system does not observe.

---

## Detailed Findings

### 1. What is actually written to the database

I traced every write path. This is the authoritative picture.

**Tables with real production data:**

| Table | Written by | Fields that carry real values |
|---|---|---|
| `reading_positions` | `lib/audio/AudioBookPlayer.ts:190,217` → `lib/services/reading-position.ts:92` → `app/api/reading-position/[bookId]/route.ts` (upsert) | `book_id` (slug), `sentences_read`, `current_sentence_index`, `completion_percentage`, `cefr_level`, `last_accessed`, `device_type`, `playback_time`, `total_time` |
| `user_scores` | `app/api/quiz/score/route.ts` (insert on quiz submit) | `user_id`, `quiz_id`, `score`, `total_questions`, `completed_at` |
| `classes`, `enrollments`, `users` | teacher-dashboard v1 routes | all |

**Tables that are declared but dead:**

| Table | Status |
|---|---|
| `reading_sessions` | No migration creates it. Zero writers. Only reader is `get-class-roster.ts`. |
| `esl_vocabulary_progress` | No migration creates it. Zero writers (`grep eslVocabularyProgress` → no application hits). |
| `reading_progress` | Table exists (`prisma/migrations/20240830_add_background_sync_tables`), but its API route `app/api/reading-progress/route.ts` is a **no-op stub** that returns `{ok:true}` and discards the body, and its writer component is commented out at `app/library/[id]/read/page.tsx:14,720-732`. |

**Fields on `reading_positions` that look useful and are not:**

- `session_duration` — the write path never sets it; `app/api/reading-position/[bookId]/route.ts:108` defaults it to `sessionDuration = 0` and `AudioBookPlayer` never populates it. **Always 0.**
- `total_time` — despite the schema comment "Total book duration", it is `this.manager.getTotalTime()` (`lib/audio/AudioBookPlayer.ts:153`), i.e. the duration of the *currently loaded audio bundle*. Not cumulative, not time spent.
- `content_mode` — hardcoded `'simplified'` at `lib/audio/AudioBookPlayer.ts:155` with the comment `// Default - can be enhanced`.

**Coverage caveat on `reading_positions`**: position tracking is wired into audio callbacks (`setupPositionTracking()`, `lib/audio/AudioBookPlayer.ts:125-137`) — `onSentenceStart` and `onTimeUpdate`. A student who reads silently in `/read/[slug]` without ever starting playback may produce no rows. This should be verified against production data before the dashboard implies "no rows = didn't read."

**Join keys** (needed by every query below):
- `users.id` is `TEXT` and equals the Supabase auth uid — confirmed by the RLS policy `auth.uid()::text = user_id` (`prisma/migrations/20250928_add_reading_positions/migration.sql:48`).
- `enrollments.student_id` is `TEXT` FK → `users.id`.
- `reading_positions.user_id` is `TEXT` → joins directly.
- `user_scores.user_id` is **`uuid`** referencing `auth.users(id)` (`supabase/migrations/20260324_create_quiz_tables.sql:33`) → **requires an explicit `::text` cast** to join `enrollments`. Get this wrong and the query silently returns zero rows, which will look exactly like "no student has taken a quiz."
- Book identity across `reading_positions`, `quizzes` and the reading route is the **slug** (`the-necklace`), confirmed by `components/reading/BundleReadingInterface.tsx:688` (`selectedBook.id !== bookSlug`) and the seed list in `scripts/seed-quiz-questions.js`. Titles come from `featured_books.slug`.

**Security note**: `user_scores` RLS is `scores_read_own` — `auth.uid() = user_id` only (`supabase/migrations/20260324_quiz_rls_policies.sql:26-27`). A teacher reading student scores must go through `servicePrisma`/service role, which bypasses RLS entirely. The database therefore provides **no** protection against a teacher reading another teacher's students; the `authorizeTeacherClass` check in the route is the only thing standing between them. That is the existing pattern and it is correct, but it becomes load-bearing for genuinely sensitive assessment data the moment comprehension scores are added.

### 2. Reading progress / completed books

**Verdict: build first. This is the survey ask that is closest to free and it is currently mis-sourced.**

`reading_positions` gives per-student, per-book `completion_percentage` (REAL, 0–100, CHECK-constrained) and `sentences_read`, updated throughout reading, plus `last_accessed`.

A "completed book" needs a threshold decision. `completion_percentage` is computed from sentence index over total sentences, so a student who reaches the last sentence lands near but rarely exactly at 100. Recommend `>= 95` and — importantly — **label it "finished" rather than "completed," and show the in-progress books alongside it.** A bare count of finished books discards the more useful signal: the student who is 60% through a hard book is doing better work than the student who finished three A1 stories, and only the per-book view shows that.

Per-book rows also solve a real teacher problem that no aggregate can: identifying the student who has been stuck at 40% of the same book for two weeks. That is a genuinely actionable intervention trigger and it falls out of data that already exists.

### 3. Comprehension score — which framing is actionable

**Verdict: show the latest score per book+level. Do not show a per-student average. Do not show a trend line.**

What the quiz system actually is (`app/api/quiz/generate/route.ts`, `supabase/migrations/20260324_create_quiz_tables.sql`, `components/quiz/QuizEntry.tsx`):

- **5 questions per quiz**, fixed (`Generate exactly 5 multiple-choice reading comprehension questions`, `app/api/quiz/generate/route.ts:57`). Score granularity is therefore 0 / 20 / 40 / 60 / 80 / 100 — six possible values, ±20 percentage points of quantization on a single attempt.
- **One quiz per book per CEFR level**, restricted to `A1|A2|B1` (`cefr_level text not null check (cefr_level in ('A1','A2','B1'))`). There are **no quizzes at B2/C1/C2 at all** — the CHECK constraint forbids them.
- **Coverage is heavily A1-skewed.** `scripts/seed-quiz-questions.js` seeds 39 quizzes across 28 distinct books: 24 A1, 12 A2, 3 B1 — against ~47 books in `lib/config/books.ts`.
- **Unlimited retakes.** `app/api/quiz/score/route.ts` inserts a new row per attempt with no cap and no attempt number. The student UI shows *best* score (`app/api/quiz/[bookId]/route.ts:54-60`, `order('score', desc).limit(1)`).
- **The correct answers are in the client payload.** `GET /api/quiz/[bookId]` returns `questions(*, answers(*))` — including `answers.is_correct` and `questions.correct_answer`. Anyone who opens devtools can score 5/5.

These properties are all fine for a formative self-check, which is what the quiz was built as. They are disqualifying for a summative metric that a teacher uses to judge a student.

So the framing matters enormously:

- **Per-student average across books — avoid.** It mixes A1 and B1 quizzes into one number, quietly rewards students who only read A1 books (where coverage is densest and questions are easiest), penalises the advanced student for whom no quiz exists at their level, and averages over a metric with ±20pp quantization and unlimited retakes. It is the single most misleading number available in this dataset.
- **Trend over time — avoid for now.** A trend implies enough points to see a slope. Most students will have 1–3 attempts across 1–3 books at different levels. A three-point "trend" over three different books at two different CEFR levels is noise rendered as a line, and a line is far more persuasive to a reader than three numbers.
- **Per-book, latest attempt, with book and level always shown — build this.** `"The Necklace (A1) — 4/5, 2 days ago"` is interpretable. The teacher can see what was read, at what level, how recently, and can act on it. Show `4/5` rather than `80%` — the raw fraction carries its own sample size and resists over-reading in a way a percentage does not.
- If a rollup is unavoidable for a compact roster row, use **"quizzes passed: 3 of 4 taken"**, never a mean.

Also required: **display attempt count**, and decide whether "latest" or "best" is shown — and label it. Best-of-N on an open-book quiz with visible answers converges on 5/5 for every student who figures it out, which makes the metric useless *and* unfairly advantages the tech-savvy student over the diligent one. Latest-attempt is the more honest default.

### 4. Time spent reading

**Verdict: genuinely missing, cannot be faked from existing data, and is the lowest value-per-unit-of-work item of the four survey asks.**

There is no table that stores elapsed reading time. Every candidate is a dead end, and each dead end is a plausible trap:

- `ReadingSession.timeOnSimplified` / `timeOnOriginal` — table never created, never written.
- `reading_positions.session_duration` — hardcoded to 0 on every write.
- `reading_positions.total_time` — audio bundle duration, not time spent.
- `reading_progress.reading_time` — the API that would write it is a no-op stub and its writer component is commented out.

Deriving it from `last_accessed` deltas would be wrong: the write is throttled (5s, `lib/services/reading-position.ts:39`) and upserts a single row per (user, book), so there is no session history to difference — only one timestamp per book, overwritten forever.

Building it properly means new instrumentation: an append-only session table with start/heartbeat/end, plus an idle timeout so a tab left open overnight doesn't record eight hours. That is a real feature, not a query.

If built, the presentation rules matter more than the number:
- **Raw seconds — never.** "127,483 seconds" is user-hostile.
- **Lifetime total — avoid.** It only ever grows, so it reads as a ranking of who joined earliest, and it becomes a leaderboard between students that the teacher did not ask for.
- **Minutes this week — yes.** Bounded, comparable week over week, resets, and answers the actual question ("is this student engaging?").
- **Compared to class average — no, not at this scale.** With ~5–25 students, one absent student drags the mean visibly, and the comparison invites the teacher to read variance as effort. If a reference point is needed, use the student's own prior week.

Honest recommendation: given that reading progress and comprehension are one query away from real and time spent is a from-scratch instrumentation build, **time spent should be last of the four**, despite being second in the survey phrasing. Progress + comprehension already answer "is this student engaging?" better than a minute count does.

### 5. Comprehension skill-type breakdown (main idea / vocabulary / inference)

**Verdict: hard-blocked, and the dependency is larger than "the question-type-selector doesn't exist yet."**

The blocker is in the data model. `supabase/migrations/20260324_create_quiz_tables.sql:13-20` — the `questions` table has `id, quiz_id, question_text, correct_answer, position, created_at`. **There is no skill/type column.** `user_scores` stores only a total (`score`, `total_questions`) — per-question responses are never persisted at all.

So a skill breakdown needs all four of:
1. A `question_type` column on `questions` (migration).
2. Regeneration or backfill-classification of the ~39 existing seeded quizzes, since none carry a type.
3. Generation-prompt changes in `app/api/quiz/generate/route.ts` to produce typed questions.
4. **A new per-question response table** — without it there is no way to know *which* questions a student got wrong, only how many. This is the piece most likely to be missed in planning, and nothing in the current system captures it.

Even with all four, the statistics do not support the display. 5 questions per quiz means roughly 1–2 questions per skill type. "Inference: 50%" from two questions is not a finding about a student, it is a coin flip with a label. A credible skill breakdown needs either longer quizzes or aggregation across many quizzes — and quiz coverage is currently 24 A1 / 12 A2 / 3 B1.

**Recommendation: do not scope this for v2.** It is the most impressive-sounding item on the candidate list and the furthest from deliverable. If it is eventually built, the per-question response table should be added *first*, so that data starts accumulating while the rest is designed.

### 6. Assignment due-date / completion tracking

**Verdict: right idea, defer — and fix the schema hook before migrating it.**

This is the one candidate that changes what the dashboard *is*: from a report a teacher reads once to a workflow they return to, because a due date creates a reason to check back. That is a strong argument for building it, just not first.

**The drafted `BookAssignment` hook has a book-identity bug.** `TEACHER_DASHBOARD_IMPLEMENTATION_PLAN.md:113-128` specifies `book Book @relation(fields: [bookId], references: [id])`, and lists as correction #3 that "a real `Book` model already exists... This must be an actual Prisma relation to `Book.id`, not a loose annotated string field."

That correction points at the wrong table. `Book` (`prisma/schema.prisma:87`) is the legacy upload/ingest model — its only application uses are `app/api/books/upload`, `lib/book-processor.ts`, and `lib/services/conversation-service.ts`. **The books students actually read are `FeaturedBook`, keyed by `slug`**, and everything student-facing keys on that slug: `/read/[slug]`, `reading_positions.book_id`, `quizzes.book_id`.

If `BookAssignment.bookId` FKs to `Book.id`, an assignment can never be joined to reading progress or quiz results — which is the entire point of assignment tracking. It should reference `FeaturedBook` (by `id`, carrying `slug`, or by `slug` directly). **Fix this before the migration is written**, because changing an FK afterwards is exactly the destructive migration the original plan's "start explicit" reasoning was trying to avoid.

Once fixed, completion is computable with no additional writes: assignment → slug → `reading_positions.completion_percentage` for each enrolled student, plus `user_scores` via `quizzes.book_id` for the quiz. Note the level mismatch to handle: an assignment has no CEFR level, but quizzes are per book *and* level, and students read at different levels — so "did the student complete the assigned quiz" must resolve against whatever level that student was reading at, and may be unanswerable for a B2 student since no B2 quizzes exist.

### 7. Class-level aggregate view

**Verdict: premature as a dashboard, with one narrow exception.**

Aggregates earn their place when a roster is too long to scan. At BookBridge's scale — a class is one teacher's students, joined by a shared code — a teacher can read 5–25 rows directly, and the rows carry more information than any mean of them. A class average also actively destroys the signal a teacher needs: an ESL class is heterogeneous by design (that is why the platform has CEFR levels at all), so the mean sits between two clusters and describes nobody.

Statistically it is also unsound here: with n=5–25 and the ±20pp quantization on quiz scores, a class comprehension average moves visibly when one student retakes one quiz.

**The exception — build this instead**: a small "needs attention" summary at the top of the roster. Not a mean; a filtered count with names attached, e.g. *"3 students haven't read this week"*, *"2 students stuck on the same book for 14+ days."* Same aggregation work, but it points at students rather than summarising them, and it is the thing that makes a teacher open the page tomorrow. This is worth building at any class size and gets better, not worse, as classes grow.

### 8. Under-considered items found in the schema

- **`reading_positions.cefr_level` (recommended, §Build second #4)** — the level each student reads each book at, written on every level change. Not currently surfaced anywhere teacher-facing. For an ESL product this is the most pedagogically meaningful field in the database and it is absent from the v2 candidate list.
- **`reading_positions.device_type`** — auto-detected mobile/desktop (`app/api/reading-position/[bookId]/route.ts:115-118`). Not teacher-facing value; useful to the team for deciding where to invest UI work. Keep it out of the dashboard.
- **`featured_books.reading_time_minutes` and `difficulty_score`** — per-book metadata already in the catalog. Useful as *context* next to a student's progress ("40% of a 25-minute book") to stop a raw percentage being read as effort. Cheap, and it directly mitigates Risks §1.
- **`featured_books.completion_rate` / `total_reads`** — platform-wide book stats. Interesting to the team, noise on a teacher's roster.
- **`Feedback` model** — student-submitted NPS and free text. Do not surface to teachers; students answered it believing it went to the product team, and re-routing it to their teacher would be a consent violation.

---

## Risks & Concerns

**1. `lastActivity` is ambiguous and will be over-read.** A date alone cannot distinguish "hasn't opened the app in three weeks" from "read yesterday but only for two minutes" from "is deliberately working slowly through a hard book." Teachers make attendance-adjacent and effort judgements from a date like this. Mitigation: never show `lastActivity` alone — pair it with what they were reading and how far in (§2). "Last active: Jul 12 · The Necklace, 40%" supports a decision; "Last active: Jul 12" invites a guess.

**2. Small-n comprehension averages.** A student with one 5-question quiz has a "comprehension score" of 60% that is indistinguishable, as displayed, from a student with twelve quizzes averaging 60%. Mitigation: show the fraction (`3/5`) not the percentage, always show attempt count, and suppress any rollup below a minimum of ~3 attempts rather than showing a fragile one. **A blank cell with "not enough data yet" is a better teacher experience than a confident wrong number** — this is the core data-literacy principle for this dashboard.

**3. Quiz scores are gameable and will be presented as assessment.** Correct answers ship in the `GET /api/quiz/[bookId]` payload, and retakes are unlimited. The moment these scores appear on a teacher dashboard, their meaning changes from "self-check" to "grade," and students will treat them accordingly. Mitigations, in order of preference: (a) stop returning `is_correct` / `correct_answer` to the client and score server-side; (b) record and display attempt number; (c) label the metric "practice quiz" in the UI so its status is unambiguous. At minimum do (c) before shipping — but note (a) is a small change and is the only one that makes the number defensible.

**4. Absent data will read as absent effort.** Three separate sources of false zeros: `reading_positions` may not be written for silent (non-audio) reading; no quiz exists for 19 of ~47 books, and none at all above B1; and a student reading at B2 has *no way* to produce a comprehension score. All three produce an empty cell that looks identical to "did nothing." Mitigation: distinguish "no quiz available for this book/level" from "not attempted" in the UI copy. This is not cosmetic — it is the difference between a teacher chasing a student who did nothing wrong and one who correctly identifies a gap.

**5. The `user_scores.user_id` uuid ↔ `enrollments.student_id` text mismatch fails silently.** A missing cast yields zero rows, not an error, and zero rows renders as "no student has taken a quiz." Any query joining these must be tested against seeded data with known non-empty results, not just checked for absence of exceptions.

**6. `reading_sessions` is referenced by production code but has no migration.** Whatever the resolution, the schema and the migration history disagree, and `get-class-roster.ts` issues raw SQL against a table the repo never creates. This should be reconciled deliberately (either drop the model or migrate it), not left as ambient drift — the completion summary already notes pre-existing `_prisma_migrations` drift in production.

**7. Metric selection is a pedagogical choice, not a display choice.** Whatever appears on the roster becomes what teachers optimise for and what students are judged on. Book count rewards reading many short easy books. Time spent rewards leaving a tab open. Quiz average rewards retaking a quiz with visible answers. Of the available metrics, **progress-through-a-level-appropriate-book** is the one whose incentive gradient points at actual learning — which is the strongest argument for §Build second #4 and against the single-number rollups.

---

## Next Steps

1. **Verify against production before any build.** Three counts settle most of this: `SELECT count(*) FROM reading_sessions` (expected: table missing, or 0), `SELECT count(*) FROM reading_positions`, `SELECT count(*) FROM user_scores`. Also check whether `reading_positions` rows exist for students who never used audio — that determines whether progress data has a coverage hole.
2. **Fix `getClassRoster` to read `reading_positions`.** Smallest change with the largest correctness gain; unblocks everything else; same 2-query shape so Agent 3's architecture work carries over unchanged.
3. **Add per-book progress rows** (title + % + level + last accessed) under each roster entry. Delivers "reading progress" and makes "completed books" and "last active" honest at the same time.
4. **Add per-book quiz results** (latest attempt, `n/5`, book + level shown, attempt count). Before shipping, decide latest-vs-best and label the metric "practice quiz."
5. **Close the quiz-answer leak** (`app/api/quiz/[bookId]/route.ts` returning `is_correct`) — small change, and it is what makes step 4 defensible as assessment data.
6. **Correct the `BookAssignment` hook** in `TEACHER_DASHBOARD_IMPLEMENTATION_PLAN.md` to reference `FeaturedBook`, not `Book`, *before* that model is migrated.
7. **Add a per-question response table** if a skill-type breakdown is ever wanted, so data accumulates ahead of the feature.
8. **Treat time-spent instrumentation as its own scoped feature**, sequenced after 2–5.

**Open questions for the synthesis pass** (flagging rather than guessing):
- What completion threshold counts as "finished"? Recommend 95%, needs a product call.
- Latest attempt or best attempt for quiz display? Recommend latest; it is a values decision about what the dashboard is for.
- Is `reading_positions` written for silent readers? Answerable only from production data.
- Was `reading_sessions` ever created out-of-band, or is v1's reading signal confirmed dead?
