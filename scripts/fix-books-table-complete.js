const { createClient } = require('@supabase/supabase-js');

async function fixBooksTableComplete() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Fixing books table completely...');
    
    // Test inserting with all required fields including updatedAt
    const crypto = require('crypto');
    const testId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    console.log('Testing insert with all fields:', testId);
    
    const { data: insertData, error: insertError } = await supabase
      .from('books')
      .insert({
        id: testId,
        title: 'Test Book Complete',
        author: 'Test Author',
        publicDomain: true,
        language: 'en',
        uploadedBy: 'test-user-id',
        createdAt: now,
        updatedAt: now
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert failed:', insertError);
    } else {
      console.log('✅ Insert successful with all fields!');
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

fixBooksTableComplete();