const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('🔧 Creating episodic_memory table using Supabase REST...');
  
  try {
    // Test if episodic_memory table exists by trying to select from it
    const { data, error } = await supabase
      .from('episodic_memory')
      .select('id')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      console.log('❌ episodic_memory table does not exist');
      console.log('📝 Please run this SQL in Supabase SQL Editor:');
      console.log(`
CREATE TABLE episodic_memory (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" TEXT NOT NULL,
  timestamp TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  "bookPassage" TEXT,
  "userReaction" TEXT,
  concepts JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_episodic_memory_conversation ON episodic_memory("conversationId");
      `);
    } else {
      console.log('✅ episodic_memory table exists');
    }
    
    // Now test the fixed conversation service
    console.log('\n🧪 Testing conversation creation with fixes...');
    
    const testUserId = '750ecd93-5bc3-44bb-bc49-b03e165e386a';
    const testBookId = 'gutenberg-64317';
    
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        id: conversationId,
        userId: testUserId,
        bookId: testBookId,
        title: 'Test Conversation',
        createdAt: now,
        updatedAt: now
      })
      .select()
      .single();
      
    if (createError) {
      console.log('❌ Failed to create conversation:', createError.message);
    } else {
      console.log('✅ Successfully created conversation:', conversation.id);
      
      // Test message creation
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          conversationId: conversation.id,
          content: 'Test message',
          sender: 'user',
          createdAt: now,
          updatedAt: now
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
      
      console.log('\n🎉 Conversation system is now working!');
      console.log('Next: Create episodic_memory table using the SQL above');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();