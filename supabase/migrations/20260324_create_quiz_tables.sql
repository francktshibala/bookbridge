-- Sprint 2: Comprehension Quiz System
-- Creates tables for quizzes, questions, answers, and user scores

-- quizzes: one quiz per book per CEFR level
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  book_id text not null,
  cefr_level text not null check (cefr_level in ('A1', 'A2', 'B1')),
  created_at timestamptz default now()
);

-- questions: multiple choice questions per quiz
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  question_text text not null,
  correct_answer text not null,
  position int not null,
  created_at timestamptz default now()
);

-- answers: the answer choices per question (typically 4 options)
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  answer_text text not null,
  is_correct boolean not null default false
);

-- user_scores: track each user's quiz attempts
create table if not exists user_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  quiz_id uuid references quizzes(id) on delete cascade,
  score int not null,
  total_questions int not null,
  completed_at timestamptz default now()
);

-- Indexes for common lookups
create index if not exists idx_quizzes_book_id on quizzes(book_id);
create index if not exists idx_questions_quiz_id on questions(quiz_id);
create index if not exists idx_answers_question_id on answers(question_id);
create index if not exists idx_user_scores_user_id on user_scores(user_id);
create index if not exists idx_user_scores_quiz_id on user_scores(quiz_id);
