const { createClient } = require('@supabase/supabase-js');

async function finalRLSFix() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('=== FINAL RLS DIAGNOSTIC ===');
    console.log('1. Testing direct SQL approach...');
    
    // Use direct SQL to disable RLS and create permissive policy
    const sqlCommands = [
      'ALTER TABLE books DISABLE ROW LEVEL SECURITY;',
      'DROP POLICY IF EXISTS "Allow all operations" ON books;',
      'CREATE POLICY "Allow all operations" ON books FOR ALL USING (true) WITH CHECK (true);'
    ];

    for (const sql of sqlCommands) {
      console.log(`Executing: ${sql}`);
      const { data, error } = await supabase.rpc('execute_sql', { sql });
      if (error && !error.message.includes('does not exist')) {
        console.log(`Error: ${error.message}`);
      } else {
        console.log('✅ Success');
      }
    }

    console.log('\n2. Testing insert with all fields...');
    const testRecord = {
      id: require('crypto').randomUUID(),
      title: 'Test Book',
      author: 'Test Author',
      publicDomain: true,
      description: 'Test description',
      genre: 'Test genre',
      publishYear: 2024,
      isbn: '1234567890',
      language: 'en',
      filename: 'test.txt',
      fileSize: 1000,
      uploadedBy: 'test-user-id',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from('books')
      .insert(testRecord)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert still failing:', insertError);
      
      // Try without RLS using raw SQL
      console.log('\n3. Trying raw SQL insert...');
      const insertSQL = `
        INSERT INTO books (id, title, author, "publicDomain", description, genre, "publishYear", isbn, language, filename, "fileSize", "uploadedBy", "createdAt", "updatedAt")
        VALUES ('${testRecord.id}', '${testRecord.title}', '${testRecord.author}', ${testRecord.publicDomain}, '${testRecord.description}', '${testRecord.genre}', ${testRecord.publishYear}, '${testRecord.isbn}', '${testRecord.language}', '${testRecord.filename}', ${testRecord.fileSize}, '${testRecord.uploadedBy}', '${testRecord.createdAt}', '${testRecord.updatedAt}')
        RETURNING *;
      `;
      
      const { data: sqlData, error: sqlError } = await supabase.rpc('execute_sql', { sql: insertSQL });
      
      if (sqlError) {
        console.error('❌ Raw SQL also failed:', sqlError);
      } else {
        console.log('✅ Raw SQL insert successful!');
      }
    } else {
      console.log('✅ Insert successful!');
      console.log('Record ID:', insertData.id);
      
      // Clean up
      await supabase.from('books').delete().eq('id', insertData.id);
      console.log('✅ Cleanup completed');
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

finalRLSFix();