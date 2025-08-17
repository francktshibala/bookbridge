// Test the books API endpoint
const fetch = require('node-fetch');

async function testBooksAPI() {
  console.log('Testing /api/books endpoint...\n');

  try {
    // First, we need to get an auth token
    // For testing, we'll use the service role to create a test session
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get a test user or create one
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error listing users:', usersError);
      return;
    }

    let testUser = users[0];
    
    if (!testUser) {
      console.log('No users found. Please sign up first through the app.');
      return;
    }

    console.log(`Using test user: ${testUser.email}`);

    // Create a session for the user
    const { data: session, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: testUser.email,
    });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return;
    }

    // Make request to the API endpoint
    const response = await fetch('http://localhost:3000/api/books', {
      headers: {
        'Cookie': `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').split('.')[0]}-auth-token=${session.properties.hashed_token}`,
      }
    });

    if (!response.ok) {
      console.error(`API returned ${response.status}: ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('API Response:');
    console.log(`- Total books: ${data.pagination.total}`);
    console.log(`- Books returned: ${data.books.length}`);
    console.log('\nBooks:');
    
    data.books.forEach((book, index) => {
      console.log(`\n${index + 1}. ${book.title}`);
      console.log(`   Author: ${book.author}`);
      console.log(`   ID: ${book.id}`);
    });

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testBooksAPI();