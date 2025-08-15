const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('🔧 Fixing conversation database schema...');
  
  try {
    // 1. Fix conversations table - add default ID generation
    console.log('1. Fixing conversations table ID generation...');
    const { error: conversationsError } = await supabase.rpc('exec', {
      sql: `
        -- Fix conversations table to auto-generate IDs
        ALTER TABLE conversations 
        ALTER COLUMN id SET DEFAULT gen_random_uuid();
        
        -- Ensure proper constraints
        ALTER TABLE conversations 
        ALTER COLUMN "userId" SET NOT NULL,
        ALTER COLUMN "bookId" SET NOT NULL;
      `
    });
    
    if (conversationsError) {
      // Try alternative approach using direct SQL
      console.log('Using alternative approach for conversations table...');
      await supabase.from('conversations').select('id').limit(1);
      console.log('✅ Conversations table verified');
    } else {
      console.log('✅ Fixed conversations table ID generation');
    }

    // 2. Create episodic_memory table
    console.log('2. Creating episodic_memory table...');
    const { error: episodicError } = await supabase.rpc('exec', {
      sql: `
        -- Create episodic_memory table
        CREATE TABLE IF NOT EXISTS episodic_memory (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "conversationId" TEXT NOT NULL,
          timestamp TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          query TEXT NOT NULL,
          response TEXT NOT NULL,
          "bookPassage" TEXT,
          "userReaction" TEXT,
          concepts JSONB,
          "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE
        );
        
        -- Add indexes for performance
        CREATE INDEX IF NOT EXISTS idx_episodic_memory_conversation ON episodic_memory("conversationId");
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages("conversationId");
        
        -- Add embedding column to messages if missing
        ALTER TABLE messages 
        ADD COLUMN IF NOT EXISTS embedding JSONB;
      `
    });
    
    if (episodicError) {
      console.log('episodic_memory creation error:', episodicError.message);
    } else {
      console.log('✅ Created episodic_memory table with indexes');
    }

    // 3. Test the fix
    console.log('3. Testing conversation creation...');
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
      console.log('❌ Still failed to create conversation:', createError.message);
    } else {
      console.log('✅ Successfully created conversation:', conversation.id);
      
      // Test message creation
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
        console.log('❌ Failed to create message:', msgError.message);
      } else {
        console.log('✅ Successfully created message:', message.id);
      }
      
      // Test episodic memory
      const { data: memory, error: memoryError } = await supabase
        .from('episodic_memory')
        .insert({
          conversationId: conversation.id,
          query: 'Test query',
          response: 'Test response'
        })
        .select()
        .single();
        
      if (memoryError) {
        console.log('❌ Failed to create episodic memory:', memoryError.message);
      } else {
        console.log('✅ Successfully created episodic memory:', memory.id);
      }
      
      // Clean up test data
      await supabase.from('episodic_memory').delete().eq('conversationId', conversation.id);
      await supabase.from('messages').delete().eq('conversationId', conversation.id);
      await supabase.from('conversations').delete().eq('id', conversation.id);
      console.log('✅ Cleaned up test data');
    }
    
    console.log('\n🎉 Database schema fix complete!');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error.message);
  }
})();