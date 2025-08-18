-- Progressive Voice Pre-Generation Database Schema
-- Migration for BookBridge enhanced books audio system

-- Table for storing pre-generated audio assets
CREATE TABLE audio_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id VARCHAR(255) NOT NULL,
    cefr_level VARCHAR(10) NOT NULL,
    chunk_index INTEGER NOT NULL,
    sentence_index INTEGER NOT NULL,
    provider VARCHAR(20) NOT NULL, -- 'openai' | 'elevenlabs'
    voice_id VARCHAR(50) NOT NULL,
    
    -- Audio file details
    audio_url TEXT NOT NULL,
    audio_blob BYTEA, -- Optional: store blob directly
    duration DECIMAL(6,3) NOT NULL, -- seconds with millisecond precision
    file_size INTEGER NOT NULL, -- bytes
    format VARCHAR(10) DEFAULT 'mp3',
    
    -- Word timing data (JSON array)
    word_timings JSONB NOT NULL,
    
    -- Cache management
    cache_key VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    
    -- Indexes for fast lookups
    CONSTRAINT unique_audio_asset UNIQUE(book_id, cefr_level, chunk_index, sentence_index, provider, voice_id)
);

-- Table for pre-generation queue management
CREATE TABLE pre_generation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id VARCHAR(255) NOT NULL,
    cefr_level VARCHAR(10) NOT NULL,
    chunk_index INTEGER NOT NULL,
    sentence_indices INTEGER[] NOT NULL, -- Array of sentence indexes to generate
    provider VARCHAR(20) NOT NULL,
    voice_id VARCHAR(50) NOT NULL,
    
    -- Queue management
    priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'urgent' | 'high' | 'normal' | 'background'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
    
    -- Processing details
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Estimated costs (in cents)
    estimated_cost_cents INTEGER,
    actual_cost_cents INTEGER
);

-- Table for tracking book pre-generation status
CREATE TABLE book_pregeneration_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id VARCHAR(255) NOT NULL,
    
    -- Overall progress
    total_combinations INTEGER NOT NULL, -- Total CEFR × Voice × Chunk combinations
    completed_combinations INTEGER DEFAULT 0,
    failed_combinations INTEGER DEFAULT 0,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'in_progress' | 'completed' | 'failed'
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Priority levels completed
    popular_combinations_done BOOLEAN DEFAULT FALSE, -- B1, B2 + default voices
    all_combinations_done BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_total_cost_cents INTEGER,
    actual_total_cost_cents INTEGER DEFAULT 0,
    
    UNIQUE(book_id)
);

-- Performance indexes
CREATE INDEX idx_audio_assets_lookup ON audio_assets(book_id, cefr_level, chunk_index, sentence_index);
CREATE INDEX idx_audio_assets_cache_key ON audio_assets(cache_key);
CREATE INDEX idx_audio_assets_expires ON audio_assets(expires_at);
CREATE INDEX idx_audio_assets_accessed ON audio_assets(last_accessed);

CREATE INDEX idx_queue_processing ON pre_generation_queue(status, priority, created_at);
CREATE INDEX idx_queue_book ON pre_generation_queue(book_id, status);

CREATE INDEX idx_book_status_lookup ON book_pregeneration_status(book_id, status);

-- Trigger to update last_accessed on audio retrieval
CREATE OR REPLACE FUNCTION update_audio_access()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed = NOW();
    NEW.access_count = OLD.access_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_audio_access
    BEFORE UPDATE ON audio_assets
    FOR EACH ROW
    WHEN (OLD.last_accessed IS DISTINCT FROM NEW.last_accessed)
    EXECUTE FUNCTION update_audio_access();

-- Example word timing JSON structure:
/*
{
  "words": [
    {
      "word": "It",
      "startTime": 0.0,
      "endTime": 0.2,
      "wordIndex": 0,
      "confidence": 0.99
    },
    {
      "word": "is", 
      "startTime": 0.2,
      "endTime": 0.35,
      "wordIndex": 1,
      "confidence": 0.98
    }
  ],
  "method": "elevenlabs-websocket",
  "accuracy": 0.99,
  "generatedAt": "2025-08-18T12:00:00Z"
}
*/

-- Sample data for Pride & Prejudice setup
INSERT INTO book_pregeneration_status (book_id, total_combinations, status) 
VALUES ('pride-prejudice', 16596, 'pending') -- 6 CEFR × 6 voices × 459 chunks
ON CONFLICT (book_id) DO NOTHING;

-- Priority combinations for immediate generation
INSERT INTO pre_generation_queue (book_id, cefr_level, chunk_index, sentence_indices, provider, voice_id, priority)
VALUES 
    -- High priority: B2 level with default voice for first 3 chapters
    ('pride-prejudice', 'B2', 0, ARRAY[0, 1, 2], 'openai', 'nova', 'urgent'),
    ('pride-prejudice', 'B2', 1, ARRAY[0, 1, 2], 'openai', 'nova', 'urgent'),
    ('pride-prejudice', 'B2', 2, ARRAY[0, 1, 2], 'openai', 'nova', 'urgent'),
    
    -- Medium priority: B1 level 
    ('pride-prejudice', 'B1', 0, ARRAY[0, 1, 2], 'openai', 'nova', 'high'),
    ('pride-prejudice', 'B1', 1, ARRAY[0, 1, 2], 'openai', 'nova', 'high'),
    ('pride-prejudice', 'B1', 2, ARRAY[0, 1, 2], 'openai', 'nova', 'high')
ON CONFLICT DO NOTHING;