# Sprint 2 — Daniel's Handoff Guide

**Your role:** Build the quiz UI components using mock data.
**Your branch:** `feature/sprint2-quiz-ui`
**Works off:** `feature/sprint2-quiz-backend` (Franck's branch)

---

## Step 1 — Get the branch

```bash
git fetch origin
git checkout -b feature/sprint2-quiz-ui origin/feature/sprint2-quiz-backend
```

Verify you see these files before writing any code:
- `types/quiz.ts` — your contract, read this first
- `app/api/quiz/[bookId]/route.ts`
- `app/api/quiz/generate/route.ts`
- `app/api/quiz/score/route.ts`

---

## Step 2 — Read these files before touching anything

| File | Why |
|------|-----|
| `types/quiz.ts` | Every component you build uses these types — know them cold |
| `docs/implementation/SPRINT2_QUIZ_SYSTEM_PLAN.md` | Full plan, your tasks are in Phase 2B |
| `docs/implementation/ARCHITECTURE_OVERVIEW.md` | Understand the two reading systems — build quiz for the PRIMARY system (bundle/featured books) |

---

## Step 3 — Files you will create (in this order)

Work one file at a time. Build → check → commit before moving to the next.

### 3.1 Mock data first
**File:** `components/quiz/__mocks__/sampleQuiz.ts`

This is your foundation. All other components import from here during development.

```typescript
import { QuizWithQuestions } from '@/types/quiz'

export const sampleQuiz: QuizWithQuestions = {
  id: 'mock-quiz-1',
  book_id: 'the-necklace-a1',
  cefr_level: 'A1',
  created_at: new Date().toISOString(),
  questions: [
    {
      id: 'mock-q-1',
      quiz_id: 'mock-quiz-1',
      question_text: 'What does Mathilde want most in life?',
      correct_answer: 'To be rich and admired',
      position: 0,
      created_at: new Date().toISOString(),
      answers: [
        { id: 'a1', question_id: 'mock-q-1', answer_text: 'To be rich and admired', is_correct: true },
        { id: 'a2', question_id: 'mock-q-1', answer_text: 'To travel the world', is_correct: false },
        { id: 'a3', question_id: 'mock-q-1', answer_text: 'To become a teacher', is_correct: false },
        { id: 'a4', question_id: 'mock-q-1', answer_text: 'To live in the country', is_correct: false },
      ]
    },
    {
      id: 'mock-q-2',
      quiz_id: 'mock-quiz-1',
      question_text: 'What does Mathilde borrow from her friend?',
      correct_answer: 'A necklace',
      position: 1,
      created_at: new Date().toISOString(),
      answers: [
        { id: 'a5', question_id: 'mock-q-2', answer_text: 'A necklace', is_correct: true },
        { id: 'a6', question_id: 'mock-q-2', answer_text: 'A dress', is_correct: false },
        { id: 'a7', question_id: 'mock-q-2', answer_text: 'A ring', is_correct: false },
        { id: 'a8', question_id: 'mock-q-2', answer_text: 'A bracelet', is_correct: false },
      ]
    }
  ]
}
```

**Commit message:** `Add mock quiz data for UI development`

---

### 3.2 Quiz Results screen
**File:** `components/quiz/QuizResults.tsx`

Build this second — it's the simplest and gives you a feel for the types.

Props it receives:
```typescript
interface QuizResultsProps {
  score: number
  totalQuestions: number
  userBestScore: number | null  // previous best, null if first attempt
  onRetry: () => void
  onClose: () => void
}
```

Shows:
- "You got X/Y correct!"
- Personal best (if `userBestScore` is not null and is higher than current `score`)
- "Try Again" button → calls `onRetry`
- "Back to Reading" button → calls `onClose`

**Commit message:** `Add QuizResults component`

---

### 3.3 Quiz Modal with question display
**File:** `components/quiz/QuizModal.tsx`

This is the main component. It manages quiz state internally.

Props it receives:
```typescript
interface QuizModalProps {
  quiz: QuizWithQuestions          // from types/quiz.ts
  userBestScore: UserScore | null  // from types/quiz.ts
  onClose: () => void
  onScoreSubmit: (score: number, totalQuestions: number) => void
}
```

Internal state to manage:
- `currentQuestionIndex` — which question is showing (0-based)
- `selectedAnswerId` — what the user clicked
- `showFeedback` — whether to show correct/incorrect colors
- `score` — running count of correct answers
- `isFinished` — whether to show QuizResults instead

Flow:
1. Show question text
2. Show 4 answer cards (shuffle order using `answers` array)
3. User clicks answer → highlight green (correct) or red (incorrect)
4. "Next" button appears → advance to next question
5. After last question → call `onScoreSubmit(score, totalQuestions)` → show `QuizResults`

Import mock data during development:
```typescript
// TEMP: swap this out in Phase 3
import { sampleQuiz } from './__mocks__/sampleQuiz'
```

**Commit message:** `Add QuizModal component with question display and answer feedback`

---

### 3.4 Quiz entry point
**File:** `components/quiz/QuizEntry.tsx`

The button that opens the quiz. Placed at the bottom of the reading interface.

Props it receives:
```typescript
interface QuizEntryProps {
  bookId: string
  cefrLevel: CefrLevel  // from types/quiz.ts
}
```

Internal state:
- `isOpen` — controls whether QuizModal is shown

For now, pass `sampleQuiz` directly to `QuizModal`. In Phase 3 this will be a real `fetch` call.

```typescript
// TEMP: swap this for real API call in Phase 3
import { sampleQuiz } from './__mocks__/sampleQuiz'
```

**Commit message:** `Add QuizEntry component to trigger quiz from reading interface`

---

### 3.5 Wire into reading page
**File:** `app/featured-books/page.tsx`

Find the bottom of the reading content area and add:

```tsx
import { QuizEntry } from '@/components/quiz/QuizEntry'

// Add near the end of the reading content, after the last sentence renders:
<QuizEntry bookId={bookId} cefrLevel={currentCefrLevel} />
```

Do not modify any other logic in this file. One line addition only.

**Commit message:** `Wire QuizEntry into featured books reading page`

---

## Workflow rules (follow these exactly)

1. **One file per commit** — never commit two components together
2. **Run build before every commit:**
   ```bash
   npm run build
   ```
   If it fails, fix it before committing. Never commit a broken build.
3. **Never touch these files:**
   - Anything in `app/api/`
   - `supabase/migrations/`
   - `types/quiz.ts` — if you think it needs a change, talk to Franck first
4. **Stay in your lane:**
   - Your files live in `components/quiz/`
   - One addition to `app/featured-books/page.tsx` (Step 3.5 only)
5. **Use the types** — import from `@/types/quiz` for everything, don't define your own shapes

---

## When you're done

Tell Franck all 4 commits are pushed:
```bash
git push -u origin feature/sprint2-quiz-ui
```

Then you both sit together for Phase 3 (integration) — Franck merges your branch and you swap mock data for real API calls together.
