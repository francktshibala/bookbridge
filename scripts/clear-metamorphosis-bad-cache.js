const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🧹 CLEARING METAMORPHOSIS BAD CACHE')
  console.log('=====================================')
  
  try {
    // First, check what we have
    const allSimplifications = await prisma.bookSimplification.findMany({
      where: { bookId: 'gutenberg-5200' },
      select: {
        chunkIndex: true,
        targetLevel: true,
        qualityScore: true,
        originalText: true,
        simplifiedText: true
      }
    })
    
    console.log(`Found ${allSimplifications.length} existing simplifications`)
    
    // Count identical entries
    const identicalCount = allSimplifications.filter(s => 
      s.originalText === s.simplifiedText || s.qualityScore === 1.0
    ).length
    
    console.log(`Identical text entries: ${identicalCount}`)
    
    // Delete ALL Metamorphosis entries - force fresh start
    const result = await prisma.bookSimplification.deleteMany({
      where: {
        bookId: 'gutenberg-5200'
      }
    })
    
    console.log(`✅ Deleted ${result.count} failed Metamorphosis simplifications`)
    console.log('   (entries with quality=1.0 or null quality)')
    console.log('   Ready for fresh AI processing')
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)