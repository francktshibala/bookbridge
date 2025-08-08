-- Add embedding column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS embedding JSONB;

-- Create episodic_memory table
CREATE TABLE IF NOT EXISTS episodic_memory (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" TEXT NOT NULL,
  timestamp TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  "bookPassage" TEXT,
  "userReaction" TEXT,
  concepts JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_episodic_memory_conversation ON episodic_memory("conversationId");
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages("conversationId");