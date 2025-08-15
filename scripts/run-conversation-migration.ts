import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('Running conversation memory migration...')

  try {
    // Add embedding column to messages table
    const { error: alterError } = await supabase
      .from('messages')
      .select('id')
      .limit(1)

    if (!alterError) {
      console.log('Messages table exists, checking if we need to add embedding column...')
      
      // Try to insert a test record with embedding to see if column exists
      const testId = 'test-' + Date.now()
      const { error: testError } = await supabase
        .from('messages')
        .insert({
          id: testId,
          conversationId: 'test',
          content: 'test',
          sender: 'test',
          embedding: [1, 2, 3]
        })

      if (testError && testError.message.includes('column')) {
        console.log('Embedding column does not exist, need to add it manually via Supabase dashboard')
        console.log('Please add a JSONB column named "embedding" to the messages table')
      } else {
        // Clean up test record
        await supabase.from('messages').delete().eq('id', testId)
        console.log('Embedding column already exists')
      }
    }

    // Check if episodic_memory table exists
    const { error: checkError } = await supabase
      .from('episodic_memory')
      .select('id')
      .limit(1)

    if (checkError && checkError.message.includes('relation')) {
      console.log('Episodic memory table does not exist')
      console.log('Please create it manually in Supabase dashboard with these columns:')
      console.log('- id (text, primary key)')
      console.log('- conversationId (text)')
      console.log('- timestamp (timestamp)')
      console.log('- query (text)')
      console.log('- response (text)')
      console.log('- bookPassage (text, nullable)')
      console.log('- userReaction (text, nullable)')
      console.log('- concepts (jsonb, nullable)')
      console.log('- createdAt (timestamp)')
    } else {
      console.log('Episodic memory table already exists')
    }

    console.log('\nMigration check complete!')
    console.log('\nNext steps:')
    console.log('1. If tables/columns are missing, add them via Supabase dashboard')
    console.log('2. Run "npx prisma db pull" to sync your schema')
    console.log('3. Run "npx prisma generate" to update the Prisma client')

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

runMigration()