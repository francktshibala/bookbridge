-- Add review stats columns to books table if they don't exist
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;