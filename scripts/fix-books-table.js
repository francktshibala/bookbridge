const { createClient } = require('@supabase/supabase-js');

async function fixBooksTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Fixing books table...');
    
    // First disable RLS if it exists
    console.log('Disabling RLS on books table...');
    const { error: rlsError } = await supabase
      .from('books')
      .select('id')
      .limit(1);
    
    if (rlsError && rlsError.code === '42501') {
      console.log('RLS is enabled, but continuing with service role...');
    }
    
    // Test inserting with explicit ID (UUID)
    const crypto = require('crypto');
    const testId = crypto.randomUUID();
    
    console.log('Testing insert with explicit UUID:', testId);
    
    const { data: insertData, error: insertError } = await supabase
      .from('books')
      .insert({
        id: testId,
        title: 'Test Book with UUID',
        author: 'Test Author',
        publicDomain: true,
        language: 'en',
        uploadedBy: 'test-user-id'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert failed:', insertError);
    } else {
      console.log('✅ Insert successful with explicit UUID!');
      console.log('Book ID:', insertData.id);
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('books')
        .delete()
        .eq('id', insertData.id);
      
      if (deleteError) {
        console.error('Cleanup failed:', deleteError);
      } else {
        console.log('✅ Test record cleaned up');
      }
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

fixBooksTable();