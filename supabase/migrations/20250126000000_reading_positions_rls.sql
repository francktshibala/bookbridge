-- Fix for auto-resume: Add RLS policies for reading_positions table
-- This resolves the "permission denied for table reading_positions" error

-- Enable RLS on reading_positions table
ALTER TABLE public.reading_positions ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own reading positions
CREATE POLICY rp_select ON public.reading_positions
  FOR SELECT
  USING ((auth.uid())::text = user_id);

-- Allow users to insert their own reading positions
CREATE POLICY rp_insert ON public.reading_positions
  FOR INSERT
  WITH CHECK ((auth.uid())::text = user_id);

-- Allow users to update their own reading positions
CREATE POLICY rp_update ON public.reading_positions
  FOR UPDATE
  USING ((auth.uid())::text = user_id)
  WITH CHECK ((auth.uid())::text = user_id);

-- Allow users to delete their own reading positions
CREATE POLICY rp_delete ON public.reading_positions
  FOR DELETE
  USING ((auth.uid())::text = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS rp_user_book_idx
  ON public.reading_positions(user_id, book_id);

-- Optional: If you want to allow anonymous users (not logged in) to use localStorage fallback
-- You can add a policy that allows reading_positions operations when auth.uid() is null
-- Uncomment if needed:
-- CREATE POLICY rp_anon_all ON public.reading_positions
--   FOR ALL
--   USING (auth.uid() IS NULL)
--   WITH CHECK (auth.uid() IS NULL);
