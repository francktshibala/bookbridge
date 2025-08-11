const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== DEBUGGING AI SIMPLIFICATION ===');
  
  // Test the API endpoint directly
  const testUrl = 'http://localhost:3000/api/books/gutenberg-100/simplify?level=B1&chunk=4';
  
  try {
    console.log('🔥 Testing API endpoint:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Full API Response:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('\n🔍 Key fields to check:');
      console.log('- Source:', data.source);
      console.log('- AI Metadata:', data.aiMetadata);
      console.log('- Micro Hint:', data.microHint);
      console.log('- Quality Score:', data.qualityScore);
      console.log('- Content length:', data.content?.length);
      
      // Check if AI was actually used
      if (data.source === 'ai_simplified') {
        console.log('🎉 AI simplification SUCCESS!');
      } else {
        console.log('❌ AI simplification NOT used. Source:', data.source);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ API Error:', errorText);
    }
    
  } catch (error) {
    console.log('💥 Request failed:', error.message);
  }
  
  console.log('\n=== DEBUGGING AUTH STATUS ===');
  
  // Check current auth state
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.log('❌ Auth error:', error.message);
    } else if (user) {
      console.log('✅ User authenticated:', user.id, user.email);
    } else {
      console.log('❌ No authenticated user');
    }
  } catch (authError) {
    console.log('💥 Auth check failed:', authError.message);
  }
  
})();