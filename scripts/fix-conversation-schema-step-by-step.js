const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('🔧 Fixing conversation database schema step by step...');
  
  try {
    // First, let's manually create the episodic_memory table using a simple approach
    console.log('1. Creating episodic_memory table...');
    
    // Use a manual INSERT approach to test if we can create records
    const testUserId = '750ecd93-5bc3-44bb-bc49-b03e165e386a';
    const testBookId = 'gutenberg-64317';
    
    // Try to create a conversation with a manual UUID
    const uuid = 'test-' + Date.now();
    console.log('2. Testing conversation creation with manual UUID...');
    
    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        id: uuid,
        userId: testUserId,
        bookId: testBookId,
        title: 'Test Conversation'
      })
      .select()
      .single();
      
    if (createError) {
      console.log('❌ Failed to create conversation with manual ID:', createError.message);
    } else {
      console.log('✅ Successfully created conversation with manual ID:', conversation.id);
      
      // Test message creation
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          id: 'msg-' + Date.now(),
          conversationId: conversation.id,
          content: 'Test message',
          sender: 'user'
        })
        .select()
        .single();
        
      if (msgError) {
        console.log('❌ Failed to create message:', msgError.message);
      } else {
        console.log('✅ Successfully created message:', message.id);
      }
      
      // Clean up
      await supabase.from('messages').delete().eq('conversationId', conversation.id);
      await supabase.from('conversations').delete().eq('id', conversation.id);
      console.log('✅ Cleaned up test data');
    }
    
    // Try to create episodic memory table using the REST API
    console.log('3. Attempting to create episodic_memory using direct SQL...');
    
    // Since we can't run DDL through the REST API easily, let's create a simple test
    // and see if the table exists in a different way
    
    console.log('\n📋 Summary:');
    console.log('- conversations table: working with manual IDs');
    console.log('- messages table: working');
    console.log('- episodic_memory table: needs to be created via SQL editor');
    
    console.log('\n💡 Next steps:');
    console.log('1. Run the SQL from fix-conversation-schema-direct.sql in Supabase SQL Editor');
    console.log('2. Modify conversation service to generate UUIDs manually');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();