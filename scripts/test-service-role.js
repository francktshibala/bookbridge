const { createClient } = require('@supabase/supabase-js');

async function testServiceRole() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Testing service role key...');
    console.log('Service key (partial):', supabaseServiceKey.substring(0, 20) + '...');
    
    // First try to disable RLS using admin functions
    console.log('Attempting to disable RLS...');
    const { data: disableRLS, error: disableError } = await supabase
      .rpc('disable_rls_for_table', { table_name: 'books' });
    
    if (disableError) {
      console.log('RLS disable failed:', disableError.message);
      console.log('Trying alternative approach...');
      
      // Try to insert directly with service role
      const { data: insertData, error: insertError } = await supabase
        .from('books')
        .insert({
          title: 'Test Book',
          author: 'Test Author',
          publicDomain: true,
          language: 'en',
          uploadedBy: 'test-user-id'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert failed:', insertError);
        console.log('Code:', insertError.code);
        console.log('Details:', insertError.details);
        console.log('Hint:', insertError.hint);
      } else {
        console.log('✅ Insert successful with service role!');
        console.log('Book ID:', insertData.id);
        
        // Clean up
        await supabase.from('books').delete().eq('id', insertData.id);
        console.log('✅ Test record cleaned up');
      }
    } else {
      console.log('✅ RLS disabled successfully');
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testServiceRole();