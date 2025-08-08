const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupAllUsersESL() {
  try {
    console.log('=== Setting up ESL profiles for all users ===');
    
    // Get all users without ESL profiles
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, esl_level')
      .is('esl_level', null);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('✅ All users already have ESL profiles!');
      return;
    }
    
    console.log(`📧 Found ${users.length} users without ESL profiles:`);
    users.forEach(u => console.log(`   - ${u.email} (${u.id})`));
    
    // Set up different ESL levels for variety
    const eslLevels = ['A2', 'B1', 'B2', 'C1'];
    const nativeLanguages = ['Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean'];
    const learningGoals = [
      ['Improve reading comprehension', 'Learn academic vocabulary'],
      ['Understand cultural references', 'Improve grammar'],
      ['Expand vocabulary', 'Better understanding of idioms'],
      ['Advanced writing skills', 'Professional communication']
    ];
    
    // Update each user with ESL profile
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const level = eslLevels[i % eslLevels.length];
      const language = nativeLanguages[i % nativeLanguages.length];
      const goals = learningGoals[i % learningGoals.length];
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          esl_level: level,
          native_language: language,
          learning_goals: JSON.stringify(goals),
          reading_speed_wpm: Math.floor(Math.random() * 50) + 100 // 100-150 WPM
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error(`❌ Error updating user ${user.email}:`, updateError);
      } else {
        console.log(`✅ Updated ${user.email}: Level ${level}, Native: ${language}`);
      }
    }
    
    console.log('\n🎯 All users now have ESL profiles!');
    console.log('\n📱 Testing Instructions:');
    console.log('1. Visit: http://localhost:3000/library/gutenberg-100/read');
    console.log('2. Make sure you are logged in');
    console.log('3. Look for ESL controls in bottom-right corner');
    console.log('4. Toggle ESL mode and see your level indicator');
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

setupAllUsersESL();