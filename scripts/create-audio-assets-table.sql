-- Create audio_assets table for pre-generated audio storage
CREATE TABLE IF NOT EXISTS audio_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id VARCHAR(255) NOT NULL,
  cefr_level VARCHAR(10) NOT NULL,
  chunk_index INTEGER NOT NULL,
  sentence_index INTEGER DEFAULT 0 NOT NULL,
  provider VARCHAR(20) NOT NULL DEFAULT 'openai',
  voice_id VARCHAR(50) NOT NULL,
  cache_key VARCHAR(64) UNIQUE,
  audio_url TEXT NOT NULL,
  duration FLOAT DEFAULT 60.0,
  word_timings JSONB,
  file_size INTEGER,
  format VARCHAR(10) DEFAULT 'mp3',
  expires_at TIMESTAMPTZ DEFAULT '2030-12-31'::timestamptz,
  last_accessed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, cefr_level, chunk_index, sentence_index, voice_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_audio_assets_lookup 
  ON audio_assets(book_id, cefr_level, chunk_index, voice_id);

CREATE INDEX IF NOT EXISTS idx_audio_assets_cache_key 
  ON audio_assets(cache_key);

CREATE INDEX IF NOT EXISTS idx_audio_assets_expires 
  ON audio_assets(expires_at);