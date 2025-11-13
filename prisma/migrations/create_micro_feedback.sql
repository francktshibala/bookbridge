-- Create micro_feedback table
CREATE TABLE IF NOT EXISTS public.micro_feedback (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'pause_moment',
  nps_score INTEGER,
  sentiment TEXT,
  feedback_text TEXT,
  email TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  device_type TEXT,
  session_duration INTEGER,
  last_book_id TEXT,
  last_level TEXT,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS micro_feedback_created_at_idx ON public.micro_feedback(created_at);
CREATE INDEX IF NOT EXISTS micro_feedback_city_idx ON public.micro_feedback(city);
CREATE INDEX IF NOT EXISTS micro_feedback_type_created_at_idx ON public.micro_feedback(type, created_at);

-- Add comment
COMMENT ON TABLE public.micro_feedback IS 'Micro-feedback system: lightweight user feedback collected during pause moments';
