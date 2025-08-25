-- Fix Pride & Prejudice audio paths to use book-specific URLs
UPDATE book_chunks 
SET audio_file_path = REPLACE(
  audio_file_path,
  '/audio-files/' || LOWER(cefr_level) || '/chunk_',
  '/audio-files/gutenberg-1342/' || LOWER(cefr_level) || '/chunk_'
)
WHERE book_id = 'gutenberg-1342' 
  AND audio_file_path IS NOT NULL
  AND audio_file_path NOT LIKE '%gutenberg-1342%';

-- Also fix audio_assets entries
UPDATE audio_assets
SET audio_url = REPLACE(
  audio_url,
  '/audio-files/' || LOWER(cefr_level) || '/chunk_',
  '/audio-files/gutenberg-1342/' || LOWER(cefr_level) || '/chunk_'
)
WHERE book_id = 'gutenberg-1342'
  AND audio_url NOT LIKE '%gutenberg-1342%';