# Sprint 2: Comprehension Quiz System — Implementation Plan

**Sprint Goal:** Add interactive quizzes to test reading comprehension at A1/A2/B1 levels
**Total Estimated Hours:** 20 hours
**Team:** Franck Tshibala (backend) + Daniel Adetaba (frontend)
**Approach:** Option A — Backend-first, incremental, parallel work after Phase 1

---

## Overview of Phases

```
Phase 1 (Franck alone)   →   Phase 2 (Parallel)   →   Phase 3 (Together)
2-3 hrs                       ~14 hrs                    ~2 hrs
Schema + Types                Backend || UI              Integrate + Test
```

---

## Phase 1 — Foundation (Franck Only)

> **Daniel does NOT start yet.** Wait for Franck to complete and push Phase 1.

**Branch:** `feature/sprint2-quiz-backend`

### Step 1.1 — Supabase Schema (Est: 2hr)

Create migration file: `supabase/migrations/[timestamp]_create_quiz_tables.sql`

```sql
-- quizzes: one quiz per book
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  book_id text not null,
  cefr_level text not null check (cefr_level in ('A1', 'A2', 'B1')),
  created_at timestamptz default now()
);

-- questions: multiple choice questions per quiz
create table questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  question_text text not null,
  correct_answer text not null,
  position int not null,
  created_at timestamptz default now()
);

-- answers: the answer choices per question (3-4 options)
create table answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  answer_text text not null,
  is_correct boolean not null default false
);

-- user_scores: track each user's quiz attempts
create table user_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  quiz_id uuid references quizzes(id) on delete cascade,
  score int not null,
  total_questions int not null,
  completed_at timestamptz default now()
);
```

### Step 1.2 — TypeScript Types (Est: 30min)

Create: `types/quiz.ts`

```typescript
export type CefrLevel = 'A1' | 'A2' | 'B1'

export interface Quiz {
  id: string
  book_id: string
  cefr_level: CefrLevel
  created_at: string
}

export interface Answer {
  id: string
  question_id: string
  answer_text: string
  is_correct: boolean
}

export interface Question {
  id: string
  quiz_id: string
  question_text: string
  correct_answer: string
  position: number
  answers: Answer[]
}

export interface QuizWithQuestions extends Quiz {
  questions: Question[]
}

export interface UserScore {
  id: string
  user_id: string
  quiz_id: string
  score: number
  total_questions: number
  completed_at: string
}

// API response shape — Daniel builds UI against this
export interface QuizApiResponse {
  quiz: QuizWithQuestions
  userBestScore: UserScore | null
}
```

### Step 1.3 — API Contract Doc (Est: 15min)

Document the three endpoints Daniel will call from the UI:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/quiz/[bookId]` | GET | Returns `QuizApiResponse` for a book at a given CEFR level |
| `/api/quiz/generate` | POST | Triggers Claude AI to generate questions, stores in DB |
| `/api/quiz/score` | POST | Saves a user's completed quiz score |

**Query params for GET `/api/quiz/[bookId]`:**
- `level` — `A1` | `A2` | `B1` (default: `A1`)

---

> ### 🚦 Daniel Starts Here
> Once Franck pushes `types/quiz.ts` and creates the branch, Daniel branches off from `feature/sprint2-quiz-backend` and begins Phase 2 UI work.
> **Branch name for Daniel:** `feature/sprint2-quiz-ui`
> **Full instructions:** [`SPRINT2_DANIEL_HANDOFF.md`](SPRINT2_DANIEL_HANDOFF.md)

---

## Phase 2 — Parallel Work

Both team members work simultaneously on separate files. Zero overlap.

---

### Phase 2A — Franck: Backend (Est: 9hr)

**Branch:** `feature/sprint2-quiz-backend`

#### Step 2A.1 — GET `/api/quiz/[bookId]` route (Est: 2hr)

File: `app/api/quiz/[bookId]/route.ts`

- Accept `level` query param
- Query Supabase: fetch quiz + questions + answers for the book
- Return `QuizApiResponse`
- If no quiz exists yet, return `{ quiz: null, userBestScore: null }`

#### Step 2A.2 — POST `/api/quiz/generate` route (Est: 4hr)

File: `app/api/quiz/generate/route.ts`

- Accept: `{ bookId, level, bookText }` in request body
- Call Claude API with prompt to generate 5 multiple-choice questions at the given CEFR level
- Parse Claude response into structured question/answer objects
- Insert into Supabase: `quizzes` → `questions` → `answers`
- Return the generated `QuizWithQuestions`

**Claude prompt template:**
```
You are an ESL quiz generator. Generate 5 multiple-choice comprehension questions
at the [LEVEL] CEFR level based on this text. For each question provide:
- question_text
- correct_answer
- 3 wrong but plausible answers

Return as JSON array matching this shape: [{ question_text, correct_answer, wrong_answers: [string, string, string] }]

Text: [BOOK_TEXT]
```

#### Step 2A.3 — POST `/api/quiz/score` route (Est: 1hr)

File: `app/api/quiz/score/route.ts`

- Accept: `{ quizId, score, totalQuestions }`
- Insert into `user_scores` with authenticated user's ID
- Return the saved score record

#### Step 2A.4 — Generate questions for 5 books (Est: 2hr)

Run the generate endpoint manually for 5 books at A1 level to seed the database. Verify data in Supabase dashboard.

---

### Phase 2B — Daniel: Frontend UI (Est: 5hr)

**Branch:** `feature/sprint2-quiz-ui`

> Build all components using **mock data** that matches `types/quiz.ts` exactly. Real API swap happens in Phase 3.

#### Step 2B.1 — Quiz Entry Component (Est: 1hr)

File: `components/quiz/QuizEntry.tsx`

- "Take Quiz" button shown at the end of a book/chapter
- Shows CEFR level selector (A1 / A2 / B1)
- On click, opens the quiz modal

#### Step 2B.2 — Quiz Modal with Question Display (Est: 2hr)

File: `components/quiz/QuizModal.tsx`

- Shows one question at a time
- Displays 4 answer choices as selectable cards
- On selection: shows correct (green) / incorrect (red) feedback instantly
- "Next Question" button advances to next question
- Progress indicator: "Question 2 of 5"

#### Step 2B.3 — Quiz Results Screen (Est: 1hr)

File: `components/quiz/QuizResults.tsx`

- Shows final score: "You got 4/5 correct!"
- Shows personal best if they've taken it before
- "Try Again" and "Back to Reading" buttons

#### Step 2B.4 — Mock data file (Est: 30min)

File: `components/quiz/__mocks__/sampleQuiz.ts`

- One complete `QuizWithQuestions` object matching the types exactly
- Used by all components during Phase 2 — swapped out in Phase 3

#### Step 2B.5 — Wire QuizEntry into reading page (Est: 30min)

Add `<QuizEntry bookId={bookId} cefrLevel={currentLevel} />` at the bottom of the featured books reading interface.

---

## Phase 3 — Integration (Together, Est: 2hr)

**Who:** Both Franck and Daniel in the same session

### Step 3.1 — Merge branches
```bash
git checkout feature/sprint2-quiz-backend
git merge feature/sprint2-quiz-ui
```

### Step 3.2 — Swap mock data for real API calls (Est: 1hr)

In `QuizModal.tsx` and `QuizEntry.tsx`:
- Replace mock import with `fetch('/api/quiz/[bookId]?level=A1')`
- Add loading state while fetch resolves
- Handle `quiz: null` case (show "Quiz coming soon" message)
- Wire "Submit score" to `POST /api/quiz/score` on quiz completion

### Step 3.3 — End-to-end test (Est: 1hr)

Test the full flow:
- [ ] Open a featured book
- [ ] Click "Take Quiz" at end of chapter
- [ ] Select A1 level
- [ ] Answer 5 questions — verify feedback shows correctly
- [ ] Submit — verify score saves to Supabase `user_scores`
- [ ] Retake — verify personal best updates

---

## Teacher Dashboard (Franck, Est: 5hr)

> Build this AFTER Phase 3 integration is stable.

File: `app/teacher/page.tsx`

- Protected route (teacher role check)
- Table view: student name | book | score | date
- Filter by: student / book / date range
- Export to CSV button

---

## File Map — Who Owns What

| File | Owner | Phase |
|------|-------|-------|
| `supabase/migrations/[ts]_create_quiz_tables.sql` | Franck | 1 |
| `types/quiz.ts` | Franck | 1 |
| `app/api/quiz/[bookId]/route.ts` | Franck | 2A |
| `app/api/quiz/generate/route.ts` | Franck | 2A |
| `app/api/quiz/score/route.ts` | Franck | 2A |
| `components/quiz/QuizEntry.tsx` | Daniel | 2B |
| `components/quiz/QuizModal.tsx` | Daniel | 2B |
| `components/quiz/QuizResults.tsx` | Daniel | 2B |
| `components/quiz/__mocks__/sampleQuiz.ts` | Daniel | 2B |
| `app/teacher/page.tsx` | Franck | Post-Phase 3 |

---

## Hours Summary

| Phase | Who | Est. Hours |
|-------|-----|-----------|
| Phase 1: Schema + Types | Franck | 3hr |
| Phase 2A: Backend routes | Franck | 9hr |
| Phase 2B: UI components | Daniel | 5hr |
| Phase 3: Integration | Both | 2hr |
| Teacher Dashboard | Franck | 5hr |
| **Total** | | **~20hr** |

---

## Branch Checklist

- [x] Franck creates `feature/sprint2-quiz-backend` from `main`
- [x] Franck pushes `types/quiz.ts` and migration → notifies Daniel
- [x] Daniel creates `feature/sprint2-quiz-ui` from `feature/sprint2-quiz-backend`
- [x] Franck completes all API routes
- [x] Daniel completes all UI components
- [x] Both merge and integrate in Phase 3 session
- [ ] PR from `feature/sprint2-quiz-backend` → `main`
