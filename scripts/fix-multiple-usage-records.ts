import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixMultipleUsageRecords(userId: string) {
  console.log(`Fixing multiple usage records for user: ${userId}`)

  try {
    // First, check all usage records
    const { data: allUsage, error: fetchError } = await supabase
      .from('usage')
      .select('*')
      .eq('userId', userId)
      .order('date', { ascending: false })

    if (fetchError) {
      console.error('Error fetching usage records:', fetchError)
      return
    }

    console.log(`Found ${allUsage?.length || 0} usage records`)

    if (allUsage && allUsage.length > 1) {
      // Keep only the most recent record
      console.log('Multiple records found. Keeping the most recent one...')
      
      // Delete all but the most recent
      const recordsToDelete = allUsage.slice(1)
      for (const record of recordsToDelete) {
        const { error: deleteError } = await supabase
          .from('usage')
          .delete()
          .eq('id', record.id)
        
        if (deleteError) {
          console.error(`Error deleting record ${record.id}:`, deleteError)
        } else {
          console.log(`Deleted duplicate record: ${record.id}`)
        }
      }
    }

    // Verify the fix
    const { data: finalUsage, error: finalError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('userId', userId)

    console.log('\nFinal usage_tracking records:', finalUsage?.length || 0)
    
    if (finalUsage && finalUsage.length === 1) {
      console.log('✅ Success! Now only one record exists')
      console.log('Usage data:', {
        bookAnalysesCount: finalUsage[0].bookAnalysesCount,
        lastResetDate: finalUsage[0].lastResetDate
      })
    } else if (finalError) {
      console.error('Error checking final state:', finalError)
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the fix
fixMultipleUsageRecords('750ecd93-5bc3-44bb-bc49-b03e165e386a')