const { createClient } = require('@supabase/supabase-js');

async function fixStorageRLS() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if RLS policies exist and create if needed
    console.log('Setting up storage RLS policies...');
    
    // Create a policy to allow authenticated users to upload to book-files
    const { data: policies, error: policyError } = await supabase
      .rpc('create_storage_policy', {
        bucket_name: 'book-files',
        policy_name: 'Allow authenticated uploads',
        definition: 'auth.role() = \'authenticated\''
      });

    if (policyError) {
      console.log('Policy might already exist or RLS is disabled:', policyError.message);
    } else {
      console.log('✅ Storage RLS policy created');
    }

    // Test upload with service role
    console.log('Testing upload with service role...');
    const testContent = 'Test file content';
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('book-files')
      .upload(`test-${Date.now()}.txt`, testContent, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful');
      
      // Clean up test file
      await supabase.storage.from('book-files').remove([uploadData.path]);
      console.log('✅ Test file cleaned up');
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

fixStorageRLS();