const { createClient } = require('@supabase/supabase-js');

async function disableStorageRLS() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Updating storage bucket to allow public access...');
    
    // Update bucket to be public for now (temporary fix)
    const { data, error } = await supabase.storage.updateBucket('book-files', {
      public: true
    });

    if (error) {
      console.error('Error updating bucket:', error);
    } else {
      console.log('✅ Storage bucket updated to public access');
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

disableStorageRLS();