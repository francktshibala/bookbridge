async function createTablesDirectly() {
  console.log('🛠️  Creating precompute tables via direct SQL...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const tables = [
    {
      name: 'BookContent',
      sql: `
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
      `
    },
    {
      name: 'BookChunk', 
      sql: `
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
      `
    },
    {
      name: 'BookAudio',
      sql: `
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
      `
    },
    {
      name: 'AudioSegment',
      sql: `
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
      `
    },
    {
      name: 'PrecomputeQueue',
      sql: `
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
    }
  ];

  for (const table of tables) {
    try {
      console.log(`Creating table: ${table.name}...`);
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey
        },
        body: JSON.stringify({ sql: table.sql })
      });

      if (response.ok) {
        console.log(`✅ ${table.name} created successfully`);
      } else {
        const error = await response.text();
        console.error(`❌ Failed to create ${table.name}: ${error}`);
      }
    } catch (error) {
      console.error(`❌ Error creating ${table.name}:`, error.message);
    }
  }

  console.log('🎉 Table creation process complete!');
}

// Run the script
createTablesDirectly().catch(console.error);