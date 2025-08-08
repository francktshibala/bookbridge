-- ESL Master Implementation Plan - Phase 1 Database Migrations
-- Week 1: ESL Intelligence Infrastructure
-- Date: January 2025

-- 1. Extend existing users table with ESL fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS esl_level VARCHAR(2) DEFAULT NULL; -- A1, A2, B1, B2, C1, C2
ALTER TABLE users ADD COLUMN IF NOT EXISTS native_language VARCHAR(10) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_goals JSON DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reading_speed INTEGER DEFAULT 150; -- WPM baseline

-- Add comment for ESL level values
COMMENT ON COLUMN users.esl_level IS 'CEFR level: A1 (Beginner), A2 (Elementary), B1 (Intermediate), B2 (Upper-Intermediate), C1 (Advanced), C2 (Proficient)';

-- 2. Enhance existing episodic_memory table for vocabulary tracking
ALTER TABLE episodic_memory ADD COLUMN IF NOT EXISTS vocabulary_introduced JSON DEFAULT '[]';
ALTER TABLE episodic_memory ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(2) DEFAULT NULL;
ALTER TABLE episodic_memory ADD COLUMN IF NOT EXISTS comprehension_score DECIMAL(3,2) DEFAULT NULL;

-- Add comments for new episodic_memory columns
COMMENT ON COLUMN episodic_memory.vocabulary_introduced IS 'Array of vocabulary words introduced in this interaction';
COMMENT ON COLUMN episodic_memory.difficulty_level IS 'CEFR level of content discussed';
COMMENT ON COLUMN episodic_memory.comprehension_score IS 'User comprehension score (0.00-1.00)';

-- 3. Create ESL-specific tables

-- ESL Vocabulary Progress tracking
CREATE TABLE IF NOT EXISTS esl_vocabulary_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    definition TEXT,
    difficulty_level VARCHAR(2), -- CEFR level
    encounters INTEGER DEFAULT 1,
    mastery_level INTEGER DEFAULT 0, -- 0-5 scale
    first_seen TIMESTAMP DEFAULT NOW(),
    last_reviewed TIMESTAMP DEFAULT NOW(),
    next_review TIMESTAMP DEFAULT NOW() + INTERVAL '1 day',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, word)
);

-- Reading Sessions tracking
CREATE TABLE IF NOT EXISTS reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id VARCHAR NOT NULL,
    session_start TIMESTAMP DEFAULT NOW(),
    session_end TIMESTAMP,
    words_read INTEGER DEFAULT 0,
    avg_reading_speed INTEGER, -- WPM
    difficulty_level VARCHAR(2),
    comprehension_score DECIMAL(3,2),
    vocabulary_lookups INTEGER DEFAULT 0,
    time_on_simplified INTEGER DEFAULT 0, -- seconds
    time_on_original INTEGER DEFAULT 0, -- seconds
    created_at TIMESTAMP DEFAULT NOW()
);

-- Book Simplifications storage
CREATE TABLE IF NOT EXISTS book_simplifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id VARCHAR NOT NULL,
    target_level VARCHAR(2) NOT NULL, -- A1, A2, B1, B2, C1, C2
    chunk_index INTEGER NOT NULL,
    original_text TEXT NOT NULL,
    simplified_text TEXT NOT NULL,
    vocabulary_changes JSON DEFAULT '[]',
    cultural_annotations JSON DEFAULT '[]',
    quality_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(book_id, target_level, chunk_index)
);

-- 4. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_vocab_progress_user_word ON esl_vocabulary_progress(user_id, word);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_book ON reading_sessions(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_book_simplifications_lookup ON book_simplifications(book_id, target_level);
CREATE INDEX IF NOT EXISTS idx_vocab_next_review ON esl_vocabulary_progress(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_date ON reading_sessions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_book_simplifications_updated ON book_simplifications(updated_at);

-- 5. Add helpful comments to tables
COMMENT ON TABLE esl_vocabulary_progress IS 'Tracks individual user vocabulary learning progress with spaced repetition';
COMMENT ON TABLE reading_sessions IS 'Records detailed reading session analytics for ESL progress tracking';
COMMENT ON TABLE book_simplifications IS 'Stores pre-processed simplified book content for different CEFR levels';

-- 6. Create useful views for analytics
CREATE OR REPLACE VIEW esl_user_progress AS
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    u.esl_level,
    u.native_language,
    u.reading_speed,
    COUNT(DISTINCT evp.word) as vocabulary_size,
    AVG(evp.mastery_level) as avg_mastery_level,
    COUNT(DISTINCT rs.id) as total_reading_sessions,
    AVG(rs.avg_reading_speed) as current_reading_speed,
    AVG(rs.comprehension_score) as avg_comprehension_score
FROM users u
LEFT JOIN esl_vocabulary_progress evp ON u.id = evp.user_id
LEFT JOIN reading_sessions rs ON u.id = rs.user_id
WHERE u.esl_level IS NOT NULL
GROUP BY u.id, u.email, u.name, u.esl_level, u.native_language, u.reading_speed;

COMMENT ON VIEW esl_user_progress IS 'Comprehensive view of ESL user learning progress and statistics';

-- 7. Insert sample data for testing (optional - can be run separately)
-- This section can be uncommented for development/testing purposes
/*
-- Sample ESL user
INSERT INTO users (id, email, name, esl_level, native_language, learning_goals, reading_speed) 
VALUES (
    'test-esl-user-001', 
    'esl.test@bookbridge.com', 
    'ESL Test User',
    'B1',
    'es',
    '["Improve academic vocabulary", "Read classic literature", "Prepare for exams"]',
    120
) ON CONFLICT (id) DO NOTHING;

-- Sample vocabulary progress
INSERT INTO esl_vocabulary_progress (user_id, word, definition, difficulty_level, encounters, mastery_level)
VALUES 
    ('test-esl-user-001', 'eloquent', 'Speaking fluently and persuasively', 'C1', 3, 2),
    ('test-esl-user-001', 'magnificent', 'Extremely beautiful or impressive', 'B2', 5, 4),
    ('test-esl-user-001', 'understand', 'To comprehend the meaning of something', 'A2', 10, 5)
ON CONFLICT (user_id, word) DO NOTHING;

-- Sample reading session
INSERT INTO reading_sessions (user_id, book_id, words_read, avg_reading_speed, difficulty_level, comprehension_score, vocabulary_lookups)
VALUES (
    'test-esl-user-001',
    'gutenberg-1342', -- Pride and Prejudice
    850,
    115,
    'B1',
    0.78,
    12
) ON CONFLICT DO NOTHING;
*/

-- 8. Performance and maintenance
-- Set up automatic cleanup for old data (optional)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-old-sessions', '0 2 * * *', 'DELETE FROM reading_sessions WHERE created_at < NOW() - INTERVAL ''1 year'';');

-- Grant permissions for application user (adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON esl_vocabulary_progress TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON reading_sessions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON book_simplifications TO your_app_user;
-- GRANT SELECT ON esl_user_progress TO your_app_user;

-- Migration complete
SELECT 'ESL database migration completed successfully!' as status;