// Simple test to check if books can be fetched
const { createClient } = require('@supabase/supabase-js');

async function testAPI() {
  console.log('Testing books fetch with service role...\n');

  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test the same query used in the API
    const { data: books, error, count } = await serviceSupabase
      .from('books')
      .select('*', { count: 'exact' })
      .order('createdAt', { ascending: false })
      .range(0, 9);

    if (error) {
      console.error('Query error:', error);
      return;
    }

    console.log(`✅ Query successful!`);
    console.log(`Found ${count} total books`);
    console.log(`Returned ${books.length} books\n`);

    books.forEach((book, index) => {
      console.log(`${index + 1}. ${book.title} by ${book.author}`);
      console.log(`   ID: ${book.id}`);
      console.log(`   Created: ${book.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAPI();