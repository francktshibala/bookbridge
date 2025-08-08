const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupTestESLUser() {
  try {
    console.log('=== Setting up test ESL user ===');
    
    // Get the first user from the users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, esl_level')
      .limit(1);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ No users found. Please create a user account first.');
      return;
    }
    
    const user = users[0];
    console.log(`📧 Found user: ${user.email} (${user.id})`);
    
    // Update user with ESL profile
    const { error: updateError } = await supabase
      .from('users')
      .update({
        esl_level: 'B1',
        native_language: 'Spanish',
        learning_goals: JSON.stringify([
          'Improve reading comprehension',
          'Learn academic vocabulary',
          'Understand cultural references'
        ]),
        reading_speed_wpm: 120
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return;
    }
    
    console.log('✅ User updated with ESL profile:');
    console.log('   ESL Level: B1 (Intermediate)');
    console.log('   Native Language: Spanish');
    console.log('   Reading Speed: 120 WPM');
    console.log('   Learning Goals: Set');
    
    // Verify the update
    const { data: updatedUser, error: verifyError } = await supabase
      .from('users')
      .select('esl_level, native_language, learning_goals, reading_speed_wpm')
      .eq('id', user.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }
    
    console.log('\n🔍 Verification - User ESL Profile:');
    console.log('   ESL Level:', updatedUser.esl_level);
    console.log('   Native Language:', updatedUser.native_language);
    console.log('   Reading Speed WPM:', updatedUser.reading_speed_wpm);
    console.log('   Learning Goals:', JSON.parse(updatedUser.learning_goals || '[]'));
    
    console.log('\n🎯 Test Instructions:');
    console.log('1. Visit: http://localhost:3000/library/gutenberg-100/read');
    console.log('2. Login with this user account');
    console.log('3. Look for the ESL controls floating widget');
    console.log('4. Toggle ESL mode and check the level indicator');
    console.log('\n✅ Test user setup complete!');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

setupTestESLUser();