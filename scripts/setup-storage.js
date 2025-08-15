// Setup Supabase Storage bucket for book files
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'book-files');

    if (!bucketExists) {
      // Create bucket
      const { data, error } = await supabase.storage.createBucket('book-files', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['text/plain', 'application/pdf', 'text/html']
      });

      if (error) {
        console.error('Error creating bucket:', error);
      } else {
        console.log('✅ Created book-files storage bucket');
      }
    } else {
      console.log('✅ book-files bucket already exists');
    }

  } catch (error) {
    console.error('Setup error:', error);
  }
}

setupStorage();