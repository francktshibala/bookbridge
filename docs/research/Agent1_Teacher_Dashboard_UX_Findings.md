# Agent 1 — Teacher Dashboard UX & Retention Findings

**Scope**: competitive analysis of teacher-facing dashboards, instant-gratification UI patterns, and what is realistic at BookBridge's scale (259 active students / 3 schools).
**Method**: web research against primary vendor documentation where reachable (Google, Microsoft, Lexia, Newsela, Epic, Learning A-Z, Clever, Beanstack), plus peer-reviewed learning-analytics research, cross-checked against this repo's actual schema and API routes. Where a claim could not be verified from a primary source it is labelled as such.

---

## Executive Summary

Every mature teacher dashboard we could verify leads with a **work queue, not a chart** — Google Classroom's new homepage hero is "Recently Due" (up to 5 items needing review), Lexia's is a "Class Action Plan" to-do list, Raz-Kids' is an "In Basket." None of them lead with aggregate statistics, and the most mature literacy product in the set (Lexia) explicitly markets a **weekly**, not daily, teacher cadence — so "opens it daily" is likely the wrong success metric for a reading platform, and chasing it risks building the wrong thing.

More urgently: while grounding recommendations against the codebase, I found that **the v1 roster reads `reading_sessions`, a table that no code in this repo writes to** — while live reading activity is actually being written to a different table (`reading_positions`), and comprehension quiz results to a third (`user_scores`). If that holds in production, today's roster shows "0 books read / no last-activity" for every student, which is a bigger problem than anything on the v2 feature list.

---

## Recommendations

### Primary: a "Needs your attention" action panel above the roster

Replicate the pattern that Google Classroom, Lexia, and Learning A-Z all independently converged on: the top of the screen is a short, named list of students bucketed by *what the teacher should do about them*, not a metrics grid.

Three buckets, matched to data BookBridge actually collects:

| Bucket | Source | Teacher action |
|---|---|---|
| **Stalled** — started a book, no activity in 7+ days | `reading_positions.last_accessed` + `completion_percentage` | nudge / reassign |
| **Struggling** — most recent quiz below ~60% | `user_scores.score / total_questions` | re-teach, drop a CEFR level |
| **Finished since you last looked** | `reading_positions.completion_percentage >= ~95%` | celebrate / assign next book |

Design rules copied directly from verified competitor behaviour:
- **Auto-hide empty modules.** Google Classroom's documented rule: "If a module does not have current content… it automatically hides from your homepage." A dashboard with three empty red boxes is worse than one with a single green "everyone's on track."
- **Names, not counts.** Lexia's Action Plan names students; a "3 students struggling" tile forces a second click and kills the instant-value effect.
- **Every bucket carries its action.** The CADA study's central failure mode is a dashboard that shows "how things are" but gives "few insights on what should be done." Bucket headers should be verbs.

Why primary: it is the one pattern with genuine cross-product convergence, it works at a 15–30 student roster (the list is short enough to read), and it is the only shape that makes a *reading* platform worth reopening — the teacher returns because the list refills, not because a number moved.

### Backup: a class "this week" strip

If the action plumbing (or the data-source fix below) is not ready, ship a four-tile strip above the roster: books completed this week, total reading time this week, class average quiz score, active students / total — each with a week-over-week delta. Cheaper, no new interaction model, and it is the thing teachers screenshot for a department head. It is *comprehensive*, not *gratifying* — it tells the teacher what is, not what to do — so treat it as the fallback, not the goal.

### Quick win: "Words your class found hardest"

The single cheapest immediately-gratifying feature, and the one with the closest verified precedent. Microsoft's Reading Progress Insights shows a **Challenging Words word cloud** ("the larger the word, the more students struggled to pronounce it correctly") and attaches a one-click "Create challenge assignment" to it. That is the archetype of instant gratification: an aggregate the teacher could not possibly compute themselves, delivered with zero configuration, immediately usable in tomorrow's lesson.

BookBridge's ESL-native equivalent: **the top 10 words looked up most across the class this week**, from vocabulary-lookup data. One `GROUP BY word` over enrolled students. No schema change, no new page, no teacher setup. A teacher opens the dashboard, sees ten words their class is stuck on, and has a warm-up activity — in about four seconds.

**Caveat, and it is load-bearing**: `ESLVocabularyProgress` exists in `prisma/schema.prisma:205` but has **zero code references anywhere in the repo** — nothing writes it and nothing reads it. `ReadingSession.vocabularyLookups` likewise is never written. So this quick win is only cheap *if* lookup events are being captured somewhere I did not find; otherwise the cheap version is the same panel built from **quiz item data** (`questions` / `user_scores`) — "questions your class got wrong most often" — which is verifiably populated.

---

## Detailed Findings

### Google Classroom — the clearest evidence of what "hero" means

Google recently replaced the flat grid of class cards with a role-specific homepage. Per Google's own help documentation, the teaching view's modules, in order, are:

1. **Recently Due** — "shows up to 5 assignments due in the last 7 days that need your review"
2. **Class highlights** — student-performance analytics, each item clicking straight through to the grading tool
3. **Feature spotlight** — links to AI tools, video activities, practice sets, Read Along
4. **Classes** — the active class cards

Three things matter here. First, **the hero is a review queue, and its window is 7 days, not 1** — even Google does not model teacher attention as daily. Second, **analytics rank second and are click-through shortcuts**, not read-only charts. Third, the documented **auto-hide rule** for empty modules, plus remembered collapse preferences.

Inside an assignment, the at-a-glance layer is numeric counts over status labels — Assigned / Turned in / Graded / Returned — with colour coding: red = missing, green = turned in or draft grade, black = returned. The return driver is unambiguous: **student work arrives and creates an obligation**. Nothing about the analytics brings a teacher back; the ungraded pile does.

### Microsoft Reading Progress / Reading Coach — closest domain match, best action pattern

The most transferable product in the set, because it is reading + language learners rather than general classroom management. The Insights dashboard shows:

- **Average accuracy rate** — bar graph by assignment, hover reveals error types and occurrence counts
- **Words per minute** — line graph of the trend over time, hover shows assignment name, genre, exact WPM
- **Challenging words** — word cloud sized by how many students mispronounced each word
- **Expression / prosody** — monotone reading, long pauses, missed punctuation pauses, inflection on question and exclamation marks

Errors are auto-categorised as mispronunciations, omissions, insertions, repetitions, self-corrections. Crucially, the dashboard does not stop at description: teachers filter and hit **"Create challenge assignment"** to generate targeted practice for an individual, a reading-level group, or the whole class, and the docs pair the data with named strategies (supplement background knowledge; prioritise phonics based on mispronunciation patterns).

**Takeaway for BookBridge**: the pairing "surprising aggregate + one-click action attached to it" is the highest-value pattern found in this entire review, and it is the one an ESL reading product can most naturally imitate.

### Lexia (myLexia) — the strongest evidence against a "daily" target

myLexia's teacher homepage leads with a **Class Action Plan**, described by Lexia as a to-do list that surfaces:
- who needs more time online to hit usage goals,
- who is struggling and needs a Lexia Lesson,
- who has mastered skills and is ready for a Skill Builder or an achievement certificate.

Students carry an **Instructional Priority** flag (an exclamation mark whose colour and shape encode urgency). The class table shows program status, grade level of material, usage, and units gained that week.

Two facts worth weighing heavily:
1. Lexia tells teachers to check the Action Plan **"at least once a week."**
2. Lexia markets the value proposition as logging in **"in as little as 5 minutes per week."**

This is a mature, well-funded literacy product optimising for *low-friction weekly* teacher time, not daily habit. The Lexia English report (their explicit ESL product) breaks accuracy into **Speaking, Listening, and Grammar**, and auto-recommends lessons below an 80% threshold with priority flagging below 50% — i.e. thresholds are hard-coded into the product so the teacher never configures anything.

### ClassDojo — the one product teachers genuinely open daily, and why that does not transfer

ClassDojo's daily use is real but comes from a mechanism BookBridge does not have and should not fake. The teacher is the **producer**, not a consumer of analytics: Class Story is a photo/video feed teachers post to roughly once or twice a day, and there is two-way parent messaging. Reporting from ClassDojo's own district materials indicates teachers posting to Class Story 3–5 times a week correlate with the highest parent-satisfaction scores — note that this is vendor-published, so treat the strength of the correlation as marketing rather than evidence.

Reviews (Capterra ~4.7/5 across ~1,038 reviews as surfaced in search) consistently credit communication and the points/behaviour loop, and consistently complain about notification reliability — delayed, grouped, or missed alerts.

**Takeaway**: daily teacher return in ed-tech is driven by a *communication loop the teacher personally participates in*, or a *work queue that refills*. It is not driven by dashboards. Also, the recurring complaint is instructive — if BookBridge ever adds notifications, unreliable ones actively damage trust.

### Duolingo for Schools — activity feed, weekly summaries (partially verified)

Duolingo's own help centre returned HTTP 403 to automated fetching, so the following comes from search-result summaries of those pages rather than direct reading; treat as **medium confidence**. The dashboard reportedly includes an **activity log as a right-hand sidebar** that updates in real time, showing assignment completion, XP earned, and which unit each student is on; clicking a student opens an individual report covering current and past assignments. Teachers also reportedly receive **weekly skill and lesson summary reports** that can be shared with parents.

If accurate, two patterns are relevant: a **persistent activity feed** as ambient evidence the class is alive, and a **weekly email digest** as the actual return trigger — the dashboard does not have to earn the reopen on its own.

### Newsela — the "Binder" as the organising metaphor

Newsela consolidates teacher-facing data into a **Binder** with a Reading Summary tab: a summary of all student activity, performance on reading skills, and a per-student Reading Summary showing reading levels, average quiz scores, and article Lexile levels. Per assignment, teachers see the **class quiz average** and the **number of quizzes completed**; clicking a score drills into the student's answers question by question, and the per-student summary aggregates quizzes across other teachers' classes and independent reading as well.

Their Independent Reading Challenge is a monthly, student-led token/badge program — notably, Newsela's own documentation says teachers **cannot assign it**, only encourage it, and does not document any teacher-facing leaderboard. Worth knowing before assuming gamification automatically produces a teacher-facing artifact.

**Takeaway**: "class average + completion count, click to drill into wrong answers" is a modest, well-proven unit of teacher value — and BookBridge already has the underlying data.

### Learning A-Z (Raz-Kids/Raz-Plus) — the "In Basket"

The teacher hub for student submissions is an **In Basket** reached from Manage Students: recordings and constructed responses queue up, the teacher plays a recording and marks errors directly in the text. Reports cover student activity, assignment progress, level progress, reading rate, quizzes, and skills accuracy.

Same shape as Google Classroom's review queue: **an inbox that fills up**. This is the single most reliable daily-return mechanic in the entire competitive set — and it requires students to produce something a teacher must respond to.

### Epic — assignment + activity log, minimal analytics

Teachers assign books or collections to individuals or the whole class (filterable by age, reading level, language, quiz availability), then track daily and weekly reading. Per-student "View Activity" shows reading activity, quiz scores, and progress on assigned books; "View Reading Log" gives a week-by-week list of books read. Deliberately lightweight — closest in ambition to where BookBridge realistically sits.

### Clever — not a comparable, do not model on it

Clever is fundamentally SSO and rostering. The teacher lands on an icon grid of district-enabled apps; Teacher Analytics shows which students logged in and which apps they used; the standout teacher feature is operational (generate a 20-minute backup login code when a student can't get in). There is no reading or learning analytic here. **Excluded as a design model** — its inclusion in the brief is worth correcting.

### Beanstack — engagement mechanics, weaker instructional value

Admin dashboard covers active readers, minutes logged, and badges earned in near-real-time, by class/grade/group; students build **reading streaks** from consecutive logging days and earn badges at milestones; class-level leaderboards celebrate top readers weekly. Tracking is configurable by minutes, pages, or books with daily baseline goals.

The streak/leaderboard machinery is aimed at students, and it depends on **self-reported logging** — which BookBridge does not need, since it can observe actual reading. That is an advantage worth exploiting rather than an idea worth copying.

### Research evidence — why most teacher dashboards fail

- Learning-analytics dashboards have been studied for over a decade, yet **everyday adoption remains limited**, typically because insights are not actionable or do not fit teacher workflow.
- The CADA study captures the failure precisely: the dashboard showed "how things are" but offered "few insights on what should be done to improve students' learning," and a teacher's summary — *"if I see Student X, she is participating, but what she could do to get better is not clear."*
- Derived principles: teacher agency over which indicators appear; participatory design; data-literacy support (teachers are often sceptical of data or lack the skills to act on it); privacy by design; alignment with the actual learning design.
- Product-side UX writing on ed-tech onboarding converges on **time-to-first-win under ~5 minutes** and on treating **empty states as onboarding surfaces** — "design for the empty state, not the ideal state." (Practitioner blogs, not peer-reviewed; directionally consistent with the academic work.)

---

## Instant gratification vs. comprehensive — the distinction

**Instant gratification** (value inside the first few seconds, zero configuration, zero learning curve):

| Pattern | Verified precedent |
|---|---|
| Named list of students needing action, visible on open | Lexia Class Action Plan; Google "Recently Due" |
| A surprising aggregate the teacher could not compute alone | Reading Progress "Challenging Words" cloud |
| One-click action attached to that aggregate | "Create challenge assignment" |
| Counts + colour status, no chart to interpret | Classroom's Assigned/Turned in/Graded, red = missing |
| Auto-hiding empty modules | Google Classroom homepage |
| Ambient live activity feed | Duolingo activity log (medium confidence) |
| Hard-coded, sensible thresholds instead of teacher-configured ones | Lexia's 80% / 50% flags |

**Comprehensive but not gratifying** (real value, but earns nothing in the first session):

- Per-student drill-down reports (Newsela Reading Summary, Epic activity view) — indispensable *after* the teacher already cares
- Longitudinal trend charts (WPM over time) — need weeks of data before they say anything
- Exportable/printable reports for parents or admin — occasional, not habitual
- Skill-type breakdowns (Lexia's Speaking/Listening/Grammar split) — high value, high build cost, needs an assessment model BookBridge does not have
- Configurable dashboards, custom indicators, goal-setting — the academic literature wants teacher agency, but configuration is the *opposite* of instant value; ship opinionated defaults first
- Streaks, badges, leaderboards — student-facing motivation, not teacher value

---

## What is realistic for BookBridge specifically

**Applies at this scale (259 students, 3 schools, single-teacher-owned classes):**
- The action panel. A 15–30 student roster means "who needs attention" is a readable list, not a data-mining problem. Lexia's pattern, at a scale where it is *easier* than it is for Lexia.
- The class-level aggregate + one action (Reading Progress pattern), because BookBridge is ESL-native and vocabulary/comprehension aggregates are exactly the shape ESL teachers act on.
- Opinionated hard-coded thresholds (7 days inactive, 60% quiz score). At three schools you can tune these by asking the teachers directly, which is the participatory design the literature recommends — and it costs a conversation, not a settings UI.
- A weekly email digest as the true return trigger. Cheap relative to any dashboard feature, and it removes the burden of the dashboard having to earn the reopen by itself. **Note**: I could not find rigorous evidence quantifying digest effectiveness in ed-tech specifically — this is a reasoned inference from the Duolingo/ClassDojo patterns, not a verified finding.
- Empty-state design. With 3 schools, a meaningful share of teachers will see an empty or near-empty dashboard. This is not a polish item, it is the first impression.

**Over-engineering at this scale:**
- School/district/org rollup views. Three schools do not need a hierarchy; the single-teacher-owns-class model is fine and closing that "gap" is premature.
- Configurable dashboards, custom metrics, saved views. Solves a problem created by having thousands of heterogeneous teachers.
- Real-time streaming/websocket activity feeds. Duolingo's real-time log serves a very different scale and session pattern; refresh-on-load is sufficient.
- Skill-type comprehension breakdown (the noted "gap"). Requires tagging every quiz question by skill and enough attempts per skill for the numbers to mean anything. At current volume the per-skill sample sizes would be noise. Defer.
- Gamification/leaderboards on the teacher side. Beanstack's leaderboards are student-facing; Newsela does not even let teachers assign their reading challenge.
- Parent-facing communication (the actual ClassDojo daily driver). A whole second product surface and a compliance question. Out of scope.

---

## Risks & Concerns

1. **CRITICAL — the roster may be reading a table nothing writes.** `lib/classes/get-class-roster.ts` computes `booksRead` and `lastActivity` from `reading_sessions`. Grepping the entire repo (excluding `node_modules`/`.next`), the **only** references to `reading_sessions` / `readingSession` are that file's two queries. Meanwhile live reading activity is upserted to a Supabase table `reading_positions` (`app/api/reading-position/[bookId]/route.ts`) with `user_id`, `book_id`, `current_chapter`, `completion_percentage`, `sentences_read`, `total_time`, `session_duration`, `cefr_level`, `content_mode`, `device_type`, `last_accessed`. If no historical process populated `reading_sessions`, **every student on every roster currently reads "0 books read"**, and no v2 feature matters until that is fixed. Verify with a production row count on `reading_sessions` before anything else. (Hand to Agent 2/Agent 3 — it invalidates the premise that `ReadingSession.comprehensionScore`, `wordsRead`, `timeOnSimplified`, etc. are "existing unused data"; they are unwritten columns, not unused data.)

2. **Comprehension data lives outside Prisma.** Quiz results are in raw Supabase tables — `quizzes(book_id, cefr_level ∈ A1/A2/B1)`, `questions`, `answers`, `user_scores(user_id, quiz_id, score, total_questions, completed_at)` (`supabase/migrations/20260324_create_quiz_tables.sql`). Any teacher-facing comprehension metric crosses the Prisma/Supabase boundary. The good news: `user_scores.user_id` references `auth.users(id)`, and `Enrollment.studentId` is the same Supabase auth UID, so the join is direct — but it cannot be a Prisma relation, and RLS (`scores_read_own`) means teacher-side reads must go through the service role, deliberately and reviewed.

3. **Quizzes only exist for A1/A2/B1.** The `cefr_level` CHECK constraint excludes B2/C1/C2. A quiz-score-based "struggling" bucket will be silently blank for higher-level students — an inconsistent hero metric is worse than an absent one.

4. **"Daily" may be an unachievable target for a reading product.** Lexia — far better resourced — targets 5 minutes per *week*. Optimising for daily opens risks manufactured urgency (badges, streaks, red flags on normal behaviour) that erodes trust. Recommend restating the goal as *"a teacher opens it every Monday and it changes what they do that week"* and instrumenting weekly-active teachers as the success metric.

5. **Small-N noise.** With 15–30 students, "class average quiz score" swings wildly on two absences. Display denominators (`12 of 18 students`) and suppress aggregates below a minimum count.

6. **False-alarm cost.** The literature is explicit that trust collapses when flags are wrong. "Stalled" must exclude students who legitimately finished, and school holidays will light up the entire panel — worth a calendar-aware suppression or at least honest copy.

7. **Vocabulary data may not exist.** `ESLVocabularyProgress` has zero code references; `ReadingSession.vocabularyLookups` is never written. Confirm before committing to the vocabulary quick win; fall back to quiz-item analysis.

8. **Verification gaps, stated plainly.** Duolingo for Schools help pages returned 403 to fetching (search summaries only). The myLexia PDF report guides could not be text-extracted (no `pdftotext`/poppler available) — Lexia claims come from Lexia's own blog and community articles. ClassDojo posting-frequency correlation is vendor-published. Newsela's Independent Reading Challenge documentation does **not** specify teacher-visible leaderboards or metrics, so no claim is made about them.

---

## Next Steps

1. **Before scoping v2**: run a row count on production `reading_sessions` and on `reading_positions`. If concern #1 confirms, repointing the roster at `reading_positions` becomes v2's first ticket and is independently the highest-value change on this list — it turns a dead roster into a live one and unlocks `completion_percentage` and `last_accessed`, which the entire action panel depends on.
2. Confirm the comprehension join is viable end-to-end: `Enrollment.studentId` → `user_scores.user_id` → `quizzes.book_id`, under the service role, with an accurate per-student latest-score.
3. Spec the action panel against the three buckets above, with the auto-hide rule, named students, and one action per bucket. Hard-code thresholds; do not build settings.
4. Take the thresholds to two or three real teachers at the pilot schools before building — participatory design is the one adoption factor the research consistently supports, and at three schools it is a phone call.
5. Ship the quick win (challenging words, or hardest quiz questions) in the same release. It is the piece that makes the first open feel like a gift rather than a report.
6. Define success as **weekly-active teachers** and **actions taken from the panel**, not daily opens. Instrument both from day one.
7. Hand concerns #1, #2, #3 to Agents 2 and 3 — they change the data inventory and the query strategy those agents are working from.

---

## Sources

- [Navigate your Classroom Homepage — Google Classroom Help](https://support.google.com/edu/classroom/answer/17231999?hl=en)
- [Grade & return an assignment — Google Classroom Help](https://support.google.com/edu/classroom/answer/6020294?hl=en&co=GENIE.Platform%3DDesktop)
- [View Reading Progress data in Insights — Microsoft Support](https://support.microsoft.com/en-US/education/teams/view-reading-progress-data-in-insights)
- [Introducing Reading Coach… updates to Reading Progress — Microsoft Tech Community](https://techcommunity.microsoft.com/blog/educationblog/introducing-reading-coach-for-personalized-practice-and-other-major-updates-to-r/3223533)
- [Monitoring your Students' Progress — Lexia](https://www.lexialearning.com/blog/monitoring-your-students-progress)
- [myLexia Reports: Lexia English Student Overview — Lexia Community](https://community.lexialearning.com/student-progress-reports-98/mylexia-reports-lexia-english-student-overview-1595)
- [Assignments and Reports: Reviewing and Grading Student Work — Newsela Help](https://help.newsela.com/en/articles/13656248-assignments-and-reports-reviewing-and-grading-student-work)
- [Independent Reading Challenge — Newsela Help](https://help.newsela.com/en/articles/13656091-independent-reading-challenge)
- [Reviewing Student Activity (In Basket) — Learning A-Z Help](https://help.learninga-z.com/en/articles/13754363-reviewing-student-activity-in-basket)
- [How can I view my students' reading activity? — Epic Help Center](https://support.getepic.com/hc/en-us/articles/115001044886-How-can-I-view-my-students-reading-activity)
- [Clever Analytics](https://www.clever.com/products/clever-analytics) · [Clever Portal](https://www.clever.com/clever-portal)
- [Beanstack — Improve Reading Outcomes](https://www.beanstack.com/solutions/improve-reading-outcomes) · [Gain Reading Data & Insights](https://www.beanstack.com/solutions/gain-reading-data)
- [What is the Duolingo for Schools activity log? — Duolingo (403 to fetch; search summary only)](https://duolingoschools.zendesk.com/hc/en-us/articles/6894350549773-What-is-the-Duolingo-for-Schools-activity-log)
- [CADA: a teacher-facing learning analytics dashboard — PMC8982662](https://pmc.ncbi.nlm.nih.gov/articles/PMC8982662/)
- [Exploring Teachers' Adoption of Learning Analytics Enhanced Pedagogical Practices — Springer](https://link.springer.com/article/10.1007/s10758-025-09896-w)
- [A Learning Analytics Dashboard for K-12 English Teachers — ACM UMAP 2024 (403 to fetch; abstract via search)](https://dl.acm.org/doi/10.1145/3631700.3665228)
- [Empty States as Onboarding: A Practical UX Playbook — 72Technologies](https://www.72technologies.com/blog/empty-states-as-onboarding-surface)
- [How Spring ISD turned one-way communication into real, two-way engagement — ClassDojo (vendor)](https://essential.classdojo.com/how-spring-isd-turned-one-way-communication-into-real-two-way-engagement/)

Repo evidence: `lib/classes/get-class-roster.ts`, `app/api/reading-position/[bookId]/route.ts`, `app/api/quiz/score/route.ts`, `supabase/migrations/20260324_create_quiz_tables.sql`, `prisma/schema.prisma:205-253`.
