const { createClient } = require('@supabase/supabase-js');

// Service role client for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createPrecomputeTables() {
  console.log('🛠️  Creating precompute tables via Supabase...');

  const queries = [
    // BookContent table
    `
    CREATE TABLE IF NOT EXISTS "BookContent" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "bookId" TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author TEXT,
      "fullText" TEXT NOT NULL,
      era TEXT,
      "wordCount" INTEGER,
      "totalChunks" INTEGER NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
    `,
    
    // BookChunk table
    `
    CREATE TABLE IF NOT EXISTS "BookChunk" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "bookId" TEXT NOT NULL,
      "cefrLevel" TEXT NOT NULL,
      "chunkIndex" INTEGER NOT NULL,
      "chunkText" TEXT NOT NULL,
      "wordCount" INTEGER,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE("bookId", "cefrLevel", "chunkIndex")
    );
    `,
    
    // BookAudio table
    `
    CREATE TABLE IF NOT EXISTS "BookAudio" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "bookId" TEXT NOT NULL,
      "cefrLevel" TEXT NOT NULL,
      "voiceId" TEXT NOT NULL,
      "audioBlob" BYTEA,
      duration DECIMAL,
      "fileSize" INTEGER,
      format TEXT DEFAULT 'mp3',
      "createdAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE("bookId", "cefrLevel", "voiceId")
    );
    `,
    
    // AudioSegment table
    `
    CREATE TABLE IF NOT EXISTS "AudioSegment" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "bookId" TEXT NOT NULL,
      "audioId" TEXT NOT NULL,
      "chunkId" TEXT NOT NULL,
      "startTime" DECIMAL NOT NULL,
      "endTime" DECIMAL NOT NULL,
      "wordTimings" TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW()
    );
    `,
    
    // PrecomputeQueue table
    `
    CREATE TABLE IF NOT EXISTS "PrecomputeQueue" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "bookId" TEXT NOT NULL,
      "cefrLevel" TEXT NOT NULL,
      "chunkIndex" INTEGER NOT NULL,
      priority TEXT DEFAULT 'normal',
      "taskType" TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE("bookId", "cefrLevel", "chunkIndex", "taskType")
    );
    `
  ];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const tableName = query.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)[1];
    
    try {
      console.log(`Creating table: ${tableName}...`);
      const { data, error } = await supabase.rpc('exec_sql', { sql: query });
      
      if (error) {
        console.error(`❌ Failed to create ${tableName}:`, error.message);
        return false;
      } else {
        console.log(`✅ ${tableName} created successfully`);
      }
    } catch (error) {
      console.error(`❌ Error creating ${tableName}:`, error.message);
      return false;
    }
  }

  console.log('🎉 All precompute tables created successfully!');
  return true;
}

// Run the script
createPrecomputeTables()
  .then(success => {
    if (success) {
      console.log('✅ Database setup complete');
    } else {
      console.log('❌ Database setup failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });