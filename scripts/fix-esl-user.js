const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixESLUser() {
  console.log('=== CREATING MISSING USER RECORD ===');
  
  const userId = '696f2932-aaa0-4b4e-8ae1-d828f8ac0e3d';
  const email = 'esltest@gmail.com';
  
  try {
    // Create the user record
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        name: 'ESL Test User',
        createdAt: now,
        updatedAt: now,
        esl_level: 'B2',
        native_language: 'Spanish',
        learning_goals: JSON.stringify([
          'Improve reading comprehension',
          'Learn academic vocabulary'
        ]),
        reading_speed_wpm: 130
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Insert failed:', error);
      return;
    } 
    
    console.log('✅ User record created:', data.email);
    console.log('ESL Level:', data.esl_level);
    console.log('Native Language:', data.native_language);
    
    // Also create subscription record
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        userId: userId,
        tier: 'premium',
        status: 'active'
      });
    
    if (!subError) {
      console.log('✅ Premium subscription added');
    } else {
      console.log('Subscription error (might already exist):', subError.message);
    }
    
    console.log('\n🎯 ESL user ready! Refresh the reading page.');
    
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

fixESLUser();