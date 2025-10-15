-- Create reading positions table for cross-device position tracking
CREATE TABLE IF NOT EXISTS reading_positions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,

    -- Position tracking
    current_sentence_index INTEGER NOT NULL DEFAULT 0,
    current_bundle_index INTEGER NOT NULL DEFAULT 0,
    current_chapter INTEGER NOT NULL DEFAULT 1,
    playback_time REAL NOT NULL DEFAULT 0, -- Current position in seconds
    total_time REAL NOT NULL DEFAULT 0,    -- Total book duration

    -- Settings at time of save
    cefr_level TEXT NOT NULL DEFAULT 'B2',
    playback_speed REAL NOT NULL DEFAULT 1.0,
    content_mode TEXT NOT NULL DEFAULT 'simplified', -- 'simplified' | 'original'

    -- Metadata
    last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    session_duration INTEGER NOT NULL DEFAULT 0, -- seconds spent in this session
    device_type TEXT, -- 'mobile' | 'desktop' | 'tablet'

    -- Reading progress
    completion_percentage REAL NOT NULL DEFAULT 0,
    sentences_read INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT reading_positions_user_book_unique UNIQUE (user_id, book_id),
    CONSTRAINT reading_positions_completion_check CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    CONSTRAINT reading_positions_speed_check CHECK (playback_speed >= 0.5 AND playback_speed <= 3.0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reading_positions_user_id ON reading_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_positions_book_id ON reading_positions(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_positions_last_accessed ON reading_positions(last_accessed);
CREATE INDEX IF NOT EXISTS idx_reading_positions_user_last_accessed ON reading_positions(user_id, last_accessed);

-- Row Level Security
ALTER TABLE reading_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own reading positions" ON reading_positions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own reading positions" ON reading_positions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own reading positions" ON reading_positions
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own reading positions" ON reading_positions
    FOR DELETE USING (auth.uid()::text = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_reading_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reading_positions_updated_at
    BEFORE UPDATE ON reading_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_reading_positions_updated_at();