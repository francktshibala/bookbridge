-- Add preview column to book_content table
ALTER TABLE book_content ADD COLUMN IF NOT EXISTS preview TEXT;

