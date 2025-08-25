-- Check Romeo & Juliet status
SELECT 'audio_assets' as table_name, count(*) as count FROM audio_assets WHERE book_id = 'gutenberg-1513';

SELECT 'book_chunks' as table_name, count(*) as count FROM book_chunks WHERE book_id = 'gutenberg-1513' AND audio_file_path IS NOT NULL;

-- Sample audio_assets entries
SELECT 'sample_assets' as type, cefr_level, chunk_index, 
       RIGHT(audio_url, 40) as url_end 
FROM audio_assets 
WHERE book_id = 'gutenberg-1513' 
LIMIT 5;

-- Sample book_chunks entries  
SELECT 'sample_chunks' as type, cefr_level, chunk_index,
       RIGHT(audio_file_path, 40) as path_end
FROM book_chunks 
WHERE book_id = 'gutenberg-1513' 
  AND audio_file_path IS NOT NULL
LIMIT 5;