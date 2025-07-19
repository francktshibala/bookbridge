const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBooks() {
  console.log('Checking books in database...\n');

  // Get all books using service role (bypasses RLS)
  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Error fetching books:', error);
    return;
  }

  console.log(`Found ${books.length} books in the database:\n`);
  
  books.forEach((book, index) => {
    console.log(`${index + 1}. ${book.title} by ${book.author}`);
    console.log(`   ID: ${book.id}`);
    console.log(`   Uploaded by: ${book.uploadedBy}`);
    console.log(`   Created at: ${book.createdAt}`);
    console.log(`   File: ${book.filename || 'No file'}`);
    console.log('');
  });

  // Check RLS policies
  console.log('\nChecking RLS policies...');
  const { data: policies, error: policyError } = await supabase.rpc('get_policies', {
    table_name: 'books'
  }).catch(() => ({ data: null, error: 'RLS check not available' }));

  if (policies) {
    console.log('RLS policies:', policies);
  } else {
    console.log('Could not retrieve RLS policies');
  }
}

checkBooks().catch(console.error);