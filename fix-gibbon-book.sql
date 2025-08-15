-- SQL commands to fix the Gibbon book cache issue
-- Run these in your Supabase SQL editor

-- 1. First, check what's in the cache for Gibbon's book
SELECT 
    bc.id,
    bc."bookId",
    b.title,
    bc."totalChunks",
    bc."lastProcessed"
FROM book_cache bc
JOIN books b ON b.id = bc."bookId"
WHERE b.title LIKE '%Decline and Fall%';

-- 2. Delete the incorrect cache entry
DELETE FROM book_cache 
WHERE "bookId" = 'ac3bf0f7-db2d-45cf-a994-e824e4146fe9';

-- 3. Check the filename for this book
SELECT id, title, filename, "fileSize" 
FROM books 
WHERE id = 'ac3bf0f7-db2d-45cf-a994-e824e4146fe9';