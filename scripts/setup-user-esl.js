const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupUserESL() {
  try {
    console.log('=== SETTING UP ESL FOR YOUR ACCOUNT ===');
    
    const email = 'siassiasoukimiaanota@gmail.com';
    
    // First, check if user exists
    const { data: users, error: findError } = await supabase
      .from('users')
      .select('id, email, esl_level')
      .eq('email', email);
    
    if (findError) {
      console.error('Error finding user:', findError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log(`❌ User ${email} not found in database.`);
      console.log('Please make sure you are registered and logged in first.');
      return;
    }
    
    const user = users[0];
    console.log(`📧 Found user: ${user.email} (${user.id})`);
    
    if (user.esl_level) {
      console.log(`✅ User already has ESL level: ${user.esl_level}`);
      return;
    }
    
    // Add ESL profile
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
      .eq('id', user.id);
    
    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return;
    }
    
    console.log('✅ ESL Profile added successfully!');
    console.log('   📚 ESL Level: B2 (Upper Intermediate)');
    console.log('   🌍 Native Language: French');
    console.log('   📖 Reading Speed: 140 WPM');
    console.log('   🎯 Learning Goals: Set');
    
    console.log('\n🎉 Ready to test!');
    console.log('1. Go to: http://localhost:3000/library/gutenberg-100/read');
    console.log('2. Look for ESL controls in bottom-right corner');
    console.log('3. Toggle ESL mode - you should see "Level B2"');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

setupUserESL();