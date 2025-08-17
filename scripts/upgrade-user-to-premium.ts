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

async function upgradeUserToPremium(userId: string) {
  console.log(`🚀 Upgrading user to premium: ${userId}`)

  try {
    // Update subscription to premium
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .update({
        tier: 'premium',
        status: 'active',
        updatedAt: new Date().toISOString()
      })
      .eq('userId', userId)
      .select()
      .single()

    if (subError) {
      console.error('❌ Error updating subscription:', subError)
      return
    }

    console.log('✅ Subscription upgraded to premium!')
    console.log('   Tier:', subscription.tier)
    console.log('   Status:', subscription.status)

    // Reset usage count (give fresh start)
    const { error: usageError } = await supabase
      .from('usage')
      .update({
        queries: 0,
        tokens: 0,
        cost: 0
      })
      .eq('userId', userId)

    if (usageError) {
      console.log('ℹ️  Could not reset usage (might not exist yet):', usageError.message)
    } else {
      console.log('✅ Usage counts reset for fresh start')
    }

    console.log('\n🎉 Premium upgrade complete!')
    console.log('📚 You now have:')
    console.log('   • Unlimited book analyses')
    console.log('   • Voice features enabled')
    console.log('   • Note export capabilities')
    console.log('   • Priority support')
    console.log('   • Unlimited access to all book sources')

  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

// Run the upgrade for your user ID
upgradeUserToPremium('750ecd93-5bc3-44bb-bc49-b03e165e386a')