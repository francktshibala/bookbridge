// Test script for audio backfill endpoint
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testBackfill() {
  console.log('Testing audio backfill endpoint...\n');

  // Test 1: Global backfill (no filters)
  console.log('Test 1: Global backfill (no filters)');
  try {
    const response = await fetch(`${API_URL}/api/admin/audio/backfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const result = await response.json();
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Book-specific backfill (all levels)
  console.log('Test 2: Book-specific backfill (all levels)');
  try {
    const response = await fetch(`${API_URL}/api/admin/audio/backfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId: 'gutenberg-84'
      })
    });
    const result = await response.json();
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Book-specific with level filter
  console.log('Test 3: Book-specific with level filter');
  try {
    const response = await fetch(`${API_URL}/api/admin/audio/backfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId: 'gutenberg-84',
        levels: ['A1', 'A2']
      })
    });
    const result = await response.json();
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the test
testBackfill().catch(console.error);