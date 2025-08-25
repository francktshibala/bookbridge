-- Check all audio references for Pride & Prejudice
SELECT 'book_chunks' as table_name, book_id, cefr_level, chunk_index, audio_file_path 
FROM book_chunks 
WHERE book_id = 'gutenberg-1342' AND audio_file_path IS NOT NULL
LIMIT 10;

-- Check if there are multiple audio_assets entries
SELECT 'audio_assets' as table_name, book_id, cefr_level, chunk_index, audio_url
FROM audio_assets 
WHERE book_id = 'gutenberg-1342'
LIMIT 10;

-- Check if Pride audio might be under wrong book_id
SELECT 'suspicious_paths' as table_name, book_id, cefr_level, chunk_index, audio_file_path
FROM book_chunks 
WHERE audio_file_path LIKE '%gutenberg-1342%' AND book_id != 'gutenberg-1342'
LIMIT 10;