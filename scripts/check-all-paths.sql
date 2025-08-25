-- Check all books for correct book-specific paths
SELECT 
  book_id,
  COUNT(*) as total_files,
  COUNT(CASE WHEN audio_file_path LIKE '%' || book_id || '%' THEN 1 END) as correct_paths,
  COUNT(CASE WHEN audio_file_path NOT LIKE '%' || book_id || '%' THEN 1 END) as generic_paths
FROM book_chunks 
WHERE audio_file_path IS NOT NULL
GROUP BY book_id
ORDER BY book_id;