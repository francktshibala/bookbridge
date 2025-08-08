-- Fix conversation database schema
-- Run this in Supabase SQL Editor

-- 1. Fix conversations table to auto-generate IDs
ALTER TABLE conversations 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure proper constraints
ALTER TABLE conversations 
ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "bookId" SET NOT NULL;

-- 2. Create episodic_memory table
CREATE TABLE IF NOT EXISTS episodic_memory (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" TEXT NOT NULL,
  timestamp TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  "bookPassage" TEXT,
  "userReaction" TEXT,
  concepts JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_episodic_memory_conversation ON episodic_memory("conversationId");
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages("conversationId");

-- 4. Add embedding column to messages if missing
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS embedding JSONB;