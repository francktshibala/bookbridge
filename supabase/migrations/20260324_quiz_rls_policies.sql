-- Grant table access to Supabase roles
grant all on quizzes     to service_role, authenticated;
grant all on questions   to service_role, authenticated;
grant all on answers     to service_role, authenticated;
grant all on user_scores to service_role, authenticated;

-- Enable RLS
alter table quizzes     enable row level security;
alter table questions   enable row level security;
alter table answers     enable row level security;
alter table user_scores enable row level security;

-- quizzes: anyone authenticated can read
create policy "quizzes_read" on quizzes
  for select to authenticated using (true);

-- questions: anyone authenticated can read
create policy "questions_read" on questions
  for select to authenticated using (true);

-- answers: anyone authenticated can read
create policy "answers_read" on answers
  for select to authenticated using (true);

-- user_scores: users can read and insert their own scores
create policy "scores_read_own" on user_scores
  for select to authenticated using (auth.uid() = user_id);

create policy "scores_insert_own" on user_scores
  for insert to authenticated with check (auth.uid() = user_id);
