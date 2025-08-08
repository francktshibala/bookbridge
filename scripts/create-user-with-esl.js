const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createUserWithESL() {
  try {
    console.log('=== CREATING USER ACCOUNT WITH ESL PROFILE ===');
    
    const email = 'siassiasoukimiaanota@gmail.com';
    
    // Create user in users table (this simulates account creation)
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: email,
        name: 'Test User',
        esl_level: 'B2',
        native_language: 'French',
        learning_goals: JSON.stringify([
          'Improve reading comprehension',
          'Learn academic vocabulary', 
          'Better understanding of cultural references'
        ]),
        reading_speed_wpm: 140
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        console.log('✅ User already exists! Updating with ESL profile...');
        
        // Update existing user
        const { error: updateError } = await supabase
          .from('users')
          .update({
            esl_level: 'B2',
            native_language: 'French',
            learning_goals: JSON.stringify([
              'Improve reading comprehension',
              'Learn academic vocabulary',
              'Better understanding of cultural references'
            ]),
            reading_speed_wpm: 140
          })
          .eq('email', email);
        
        if (updateError) {
          console.error('❌ Error updating user:', updateError);
          return;
        }
      } else {
        console.error('❌ Error creating user:', error);
        return;
      }
    }
    
    console.log('✅ User account ready with ESL profile!');
    console.log(`   📧 Email: ${email}`);
    console.log('   📚 ESL Level: B2 (Upper Intermediate)');
    console.log('   🌍 Native Language: French');
    console.log('   📖 Reading Speed: 140 WPM');
    console.log('   🎯 Learning Goals: Set');
    
    console.log('\n🎉 NOW TEST THE ESL CONTROLS:');
    console.log('1. Make sure you are logged in with this email');
    console.log('2. Go to: http://localhost:3000/library/gutenberg-100/read');
    console.log('3. Look for ESL controls in bottom-right corner');
    console.log('4. Toggle ESL mode - you should see "Level B2"');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

createUserWithESL();