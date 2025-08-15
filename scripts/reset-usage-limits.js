const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function resetUsageLimits() {
  console.log('🔄 RESETTING USAGE LIMITS FOR system-gutenberg')
  console.log('='*50)
  
  const today = new Date().toISOString().split('T')[0]
  
  try {
    // Check current usage
    const currentUsage = await prisma.usage.findFirst({
      where: {
        userId: 'system-gutenberg',
        date: {
          gte: new Date(today + 'T00:00:00.000Z'),
          lt: new Date(today + 'T23:59:59.999Z')
        }
      }
    })
    
    console.log('Current usage for system-gutenberg:', currentUsage)
    
    // Delete the usage record to reset limits
    if (currentUsage) {
      await prisma.usage.delete({
        where: {
          id: currentUsage.id
        }
      })
      console.log(`✅ Deleted existing usage record`)
      console.log(`   Previous cost: $${currentUsage.cost}`)
      console.log(`   Previous queries: ${currentUsage.queries}`)
      console.log('✅ Usage limits reset to $0')
    } else {
      console.log('✅ No usage record found - limits are already clear')
    }
    
    console.log('\n🚀 Ready for bulk processing!')
    
  } catch (error) {
    console.error('❌ Error resetting usage limits:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetUsageLimits()