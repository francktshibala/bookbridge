const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== INVESTIGATING DATABASE TABLES ===');
  
  // Check conversations table
  try {
    const { data: convs, error: convError } = await supabase.from('conversations').select('*').limit(1);
    console.log('conversations table exists:', convs !== null);
    if (convError) console.log('conversations error:', convError.message);
  } catch (e) {
    console.log('conversations table missing or error:', e.message);
  }
  
  // Check messages table
  try {
    const { data: msgs, error: msgError } = await supabase.from('messages').select('*').limit(1);
    console.log('messages table exists:', msgs !== null);
    if (msgError) console.log('messages error:', msgError.message);
  } catch (e) {
    console.log('messages table missing or error:', e.message);
  }
  
  // Check episodic_memory table
  try {
    const { data: ep, error: epError } = await supabase.from('episodic_memory').select('*').limit(1);
    console.log('episodic_memory table exists:', ep !== null);
    if (epError) console.log('episodic_memory error:', epError.message);
  } catch (e) {
    console.log('episodic_memory table missing or error:', e.message);
  }
  
  // Test if we can create a conversation
  try {
    console.log('\n=== TESTING CONVERSATION CREATION ===');
    const testUserId = '750ecd93-5bc3-44bb-bc49-b03e165e386a';
    const testBookId = 'gutenberg-64317';
    
    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        userId: testUserId,
        bookId: testBookId,
        title: 'Test Conversation'
      })
      .select()
      .single();
      
    if (createError) {
      console.log('Failed to create conversation:', createError.message);
    } else {
      console.log('Successfully created conversation:', conversation.id);
      
      // Test adding a message
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversationId: conversation.id,
          content: 'Test message',
          sender: 'user'
        })
        .select()
        .single();
        
      if (msgError) {
        console.log('Failed to create message:', msgError.message);
      } else {
        console.log('Successfully created message:', message.id);
      }
      
      // Clean up
      await supabase.from('messages').delete().eq('conversationId', conversation.id);
      await supabase.from('conversations').delete().eq('id', conversation.id);
      console.log('Cleaned up test data');
    }
  } catch (e) {
    console.log('Error testing conversation creation:', e.message);
  }
})();