const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSimplification() {
  try {
    // First authenticate as a user or create test user
    let authData, authError;
    
    // Try to sign in first
    ({ data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test-simplification@example.com',
      password: 'TestPassword123!'
    }));
    
    // If user doesn't exist, create them
    if (authError && authError.message.includes('Invalid')) {
      console.log('Creating test user...');
      ({ data: authData, error: authError } = await supabase.auth.signUp({
        email: 'test-simplification@example.com',
        password: 'TestPassword123!'
      }));
    }

    if (authError) {
      console.error('Auth failed:', authError);
      return;
    }

    console.log('Authenticated as:', authData.user.email);
    const token = authData.session.access_token;

    // Test the simplification API
    const response = await fetch('http://localhost:3000/api/books/gutenberg-1342/simplify?level=A1&chunk=0&ai=true', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    console.log('\n=== SIMPLIFICATION TEST RESULTS ===');
    console.log('Source:', data.source);
    console.log('Level:', data.level);
    
    if (data.aiMetadata) {
      console.log('\n--- AI Metadata ---');
      console.log('Era detected:', data.aiMetadata.detectedEra);
      console.log('Similarity:', data.aiMetadata.similarity);
      console.log('Quality:', data.aiMetadata.quality);
      console.log('Temperature used:', data.aiMetadata.temperature);
      console.log('Passed gate:', data.aiMetadata.passedSimilarityGate);
    }
    
    console.log('\n--- Content Comparison ---');
    
    // Get original text for comparison
    const origResponse = await fetch('http://localhost:3000/api/books/gutenberg-1342/content-fast');
    const origData = await origResponse.json();
    const originalChunk = origData.content.split(' ').slice(0, 400).join(' ');
    
    console.log('Original (first 150 chars):', originalChunk.substring(0, 150));
    console.log('\nSimplified (first 150 chars):', data.content.substring(0, 150));
    
    // Calculate difference
    const origWords = originalChunk.toLowerCase().split(/\s+/);
    const simpWords = data.content.toLowerCase().split(/\s+/);
    const commonWords = origWords.filter(w => simpWords.includes(w));
    const similarity = commonWords.length / origWords.length;
    
    console.log('\n--- Analysis ---');
    console.log('Word overlap:', (similarity * 100).toFixed(1) + '%');
    console.log('Text changed:', ((1 - similarity) * 100).toFixed(1) + '%');
    
    if (similarity > 0.9) {
      console.log('⚠️  WARNING: Text is nearly identical! Simplification may have failed.');
    } else if (similarity < 0.6) {
      console.log('✅ SUCCESS: Text has been significantly simplified!');
    } else {
      console.log('✓ Text has been moderately simplified.');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSimplification();