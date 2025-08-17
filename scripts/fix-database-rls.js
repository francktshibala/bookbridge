const { createClient } = require('@supabase/supabase-js');

async function fixDatabaseRLS() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Disabling RLS on books table...');
    
    // Disable RLS on books table
    const { data, error } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE books DISABLE ROW LEVEL SECURITY;'
    });

    if (error) {
      console.log('RLS disable error (might already be disabled):', error.message);
      
      // Try alternative approach - create a permissive policy
      console.log('Creating permissive policy instead...');
      const { data: policyData, error: policyError } = await supabase.rpc('exec_sql', {
        query: `
          CREATE POLICY "Allow all operations on books" ON books
          FOR ALL
          USING (true)
          WITH CHECK (true);
        `
      });

      if (policyError) {
        console.log('Policy creation error:', policyError.message);
      } else {
        console.log('✅ Created permissive policy for books table');
      }
    } else {
      console.log('✅ RLS disabled on books table');
    }

    // Test database insert
    console.log('Testing database insert...');
    const { data: insertData, error: insertError } = await supabase
      .from('books')
      .insert({
        title: 'Test Book',
        author: 'Test Author',
        publicDomain: true,
        uploadedBy: 'test-user'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert test failed:', insertError);
    } else {
      console.log('✅ Database insert test successful');
      
      // Clean up test record
      await supabase.from('books').delete().eq('id', insertData.id);
      console.log('✅ Test record cleaned up');
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

fixDatabaseRLS();