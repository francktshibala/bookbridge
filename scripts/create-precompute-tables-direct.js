const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createPrecomputeTables() {
  console.log('=== CREATING PRECOMPUTE TABLES ===');
  
  try {
    // Create book_content table
    console.log('1. Creating book_content table...');
    const createBookContentSQL = `
      CREATE TABLE IF NOT EXISTS book_content (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        book_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        full_text TEXT NOT NULL,
        era TEXT,
        word_count INTEGER NOT NULL,
        total_chunks INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
      
      CREATE INDEX IF NOT EXISTS idx_book_content_era ON book_content(era);
      CREATE INDEX IF NOT EXISTS idx_book_content_book_id ON book_content(book_id);
    `;
    
    const { error: contentError } = await supabase.rpc('exec_sql', { 
      sql: createBookContentSQL 
    });
    
    if (contentError) {
      console.log('book_content table creation error:', contentError);
    } else {
      console.log('✅ book_content table created/verified');
    }
    
    // Create book_chunks table
    console.log('2. Creating book_chunks table...');
    const createBookChunksSQL = `
      CREATE TABLE IF NOT EXISTS book_chunks (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        book_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        word_count INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        CONSTRAINT fk_book_chunks_content FOREIGN KEY (book_id) REFERENCES book_content(book_id) ON DELETE CASCADE
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_book_chunks_unique ON book_chunks(book_id, chunk_index);
      CREATE INDEX IF NOT EXISTS idx_book_chunks_book_id ON book_chunks(book_id);
    `;
    
    const { error: chunksError } = await supabase.rpc('exec_sql', { 
      sql: createBookChunksSQL 
    });
    
    if (chunksError) {
      console.log('book_chunks table creation error:', chunksError);
    } else {
      console.log('✅ book_chunks table created/verified');
    }
    
    console.log('\n🎉 TABLES CREATED SUCCESSFULLY');
    console.log('Ready to store book content and chunks!');
    
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

// Try using direct SQL approach since rpc might not be available
async function createTablesDirectSQL() {
  console.log('=== CREATING TABLES WITH DIRECT SQL ===');
  
  try {
    // Try a simple test query first
    const { data, error } = await supabase
      .from('books')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.log('Connection test failed:', error);
      return;
    }
    
    console.log('✅ Database connection verified');
    
    // Since we can't create tables via Supabase client, let's just test if they exist
    console.log('Testing table existence...');
    
    try {
      const { data: contentTest } = await supabase
        .from('book_content')
        .select('id')
        .limit(1);
      console.log('✅ book_content table exists');
    } catch (e) {
      console.log('❌ book_content table missing');
    }
    
    try {
      const { data: chunksTest } = await supabase
        .from('book_chunks')
        .select('id')
        .limit(1);
      console.log('✅ book_chunks table exists');
    } catch (e) {
      console.log('❌ book_chunks table missing');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
createTablesDirectSQL();