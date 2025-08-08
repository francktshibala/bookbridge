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

async function fixUserSubscription(userId: string) {
  console.log(`Fixing subscription for user: ${userId}`)

  try {
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.log('User not found, creating user record...')
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: 'user@example.com', // You may need to update this
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (createUserError) {
        console.error('Error creating user:', createUserError)
        return
      }
      console.log('User created successfully')
    } else {
      console.log('User found:', user.email)
    }

    // Check if subscription exists
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('userId', userId)
      .single()

    if (subError || !subscription) {
      console.log('Subscription not found, creating free tier subscription...')
      const { error: createSubError } = await supabase
        .from('subscriptions')
        .insert({
          userId: userId,
          tier: 'free',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      
      if (createSubError) {
        console.error('Error creating subscription:', createSubError)
        return
      }
      console.log('Subscription created successfully')
    } else {
      console.log('Subscription found:', subscription.tier, subscription.status)
    }

    // Check if usage_tracking exists
    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('userId', userId)
      .single()

    if (usageError || !usage) {
      console.log('Usage tracking not found, creating...')
      const { error: createUsageError } = await supabase
        .from('usage_tracking')
        .insert({
          userId: userId,
          bookAnalysesCount: 0,
          queriesCount: 0,
          totalCost: 0,
          lastResetDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      
      if (createUsageError) {
        console.error('Error creating usage tracking:', createUsageError)
        
        // Try the usage table instead
        console.log('Trying usage table instead...')
        const { error: createUsageError2 } = await supabase
          .from('usage')
          .insert({
            id: `usage-${Date.now()}`,
            userId: userId,
            date: new Date().toISOString(),
            queries: 0,
            tokens: 0,
            cost: 0
          })
        
        if (createUsageError2) {
          console.error('Error creating usage:', createUsageError2)
        } else {
          console.log('Usage record created in usage table')
        }
      } else {
        console.log('Usage tracking created successfully')
      }
    } else {
      console.log('Usage tracking found:', usage.bookAnalysesCount, 'analyses used')
    }

    console.log('\nAll done! User should now be able to use the AI chat.')
    
    // Verify the fix
    console.log('\nVerifying...')
    const { data: finalSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('userId', userId)
      .single()
    
    // Check both tables
    const { data: finalUsage } = await supabase
      .from('usage')
      .select('*')
      .eq('userId', userId)
      .order('date', { ascending: false })
      .limit(1)
    
    const { data: finalUsageTracking } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('userId', userId)
      .single()
    
    console.log('Final subscription:', finalSub?.tier, finalSub?.status)
    console.log('Final usage record:', finalUsage?.[0] ? 'Found' : 'Not found')
    console.log('Final usage_tracking view:', finalUsageTracking?.bookAnalysesCount || 'Not found')

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the fix for the user
fixUserSubscription('750ecd93-5bc3-44bb-bc49-b03e165e386a')