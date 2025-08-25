-- Populate audio_assets for Romeo & Juliet and Pride & Prejudice only

-- Romeo & Juliet (gutenberg-1513)
INSERT INTO audio_assets (id, book_id, cefr_level, chunk_index, sentence_index, audio_url, provider, voice_id, created_at, updated_at)
SELECT 
  gen_random_uuid() as id,
  'gutenberg-1513' as book_id,
  bc.cefr_level,
  bc.chunk_index,
  0 as sentence_index,
  bc.audio_file_path as audio_url,
  'openai' as provider,
  'alloy' as voice_id,
  now() as created_at,
  now() as updated_at
FROM book_chunks bc
WHERE bc.book_id = 'gutenberg-1513'
  AND bc.audio_file_path IS NOT NULL
  AND bc.cefr_level != 'original';

-- Pride & Prejudice (gutenberg-1342)
INSERT INTO audio_assets (id, book_id, cefr_level, chunk_index, sentence_index, audio_url, provider, voice_id, created_at, updated_at)
SELECT 
  gen_random_uuid() as id,
  'gutenberg-1342' as book_id,
  bc.cefr_level,
  bc.chunk_index,
  0 as sentence_index,
  bc.audio_file_path as audio_url,
  'openai' as provider,
  'alloy' as voice_id,
  now() as created_at,
  now() as updated_at
FROM book_chunks bc
WHERE bc.book_id = 'gutenberg-1342'
  AND bc.audio_file_path IS NOT NULL
  AND bc.cefr_level != 'original';