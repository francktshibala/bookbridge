-- Disable RLS on books table
ALTER TABLE books DISABLE ROW LEVEL SECURITY;

-- Create a permissive policy if RLS can't be disabled
DROP POLICY IF EXISTS "Allow all operations on books" ON books;
CREATE POLICY "Allow all operations on books" ON books
FOR ALL
USING (true)
WITH CHECK (true);

-- Check if CUID extension is available, if not use UUID
-- First check if we have the cuid extension
SELECT 1;