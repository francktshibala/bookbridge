const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearPoisonedCache() {
  console.log('🧹 Starting cache cleanup...')
  
  try {
    // First, let's see how many poisoned entries we have
    const poisonedEntries = await prisma.bookSimplification.findMany({
      where: {
        qualityScore: 1.0
      },
      select: {
        id: true,
        bookId: true,
        targetLevel: true,
        chunkIndex: true,
        originalText: true,
        simplifiedText: true
      }
    })
    
    console.log(`📊 Found ${poisonedEntries.length} entries with quality=1.0`)
    
    // Check how many are actually identical
    const identicalEntries = poisonedEntries.filter(entry => 
      entry.originalText === entry.simplifiedText
    )
    
    console.log(`🔍 ${identicalEntries.length} entries have identical text`)
    
    // Group by book for reporting
    const bookStats = {}
    identicalEntries.forEach(entry => {
      if (!bookStats[entry.bookId]) {
        bookStats[entry.bookId] = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 }
      }
      bookStats[entry.bookId][entry.targetLevel]++
    })
    
    console.log('\n📚 Affected books:')
    Object.entries(bookStats).forEach(([bookId, levels]) => {
      const total = Object.values(levels).reduce((sum, count) => sum + count, 0)
      console.log(`  ${bookId}: ${total} entries`)
      Object.entries(levels).forEach(([level, count]) => {
        if (count > 0) {
          console.log(`    - ${level}: ${count}`)
        }
      })
    })
    
    // Delete all identical entries
    if (identicalEntries.length > 0) {
      console.log('\n🗑️  Deleting identical entries...')
      
      const deleteResult = await prisma.bookSimplification.deleteMany({
        where: {
          id: {
            in: identicalEntries.map(e => e.id)
          }
        }
      })
      
      console.log(`✅ Deleted ${deleteResult.count} poisoned cache entries`)
    } else {
      console.log('✨ No identical entries found - cache is clean!')
    }
    
    // Also check for entries with very high quality score but different text
    const suspiciousEntries = await prisma.bookSimplification.findMany({
      where: {
        qualityScore: {
          gte: 0.99
        }
      },
      select: {
        id: true,
        bookId: true,
        targetLevel: true,
        qualityScore: true,
        originalText: true,
        simplifiedText: true
      }
    })
    
    const suspiciousDifferent = suspiciousEntries.filter(entry => 
      entry.originalText !== entry.simplifiedText
    )
    
    if (suspiciousDifferent.length > 0) {
      console.log(`\n⚠️  Found ${suspiciousDifferent.length} entries with quality≥0.99 but different text`)
      console.log('These might be legitimate, keeping them for now.')
    }
    
  } catch (error) {
    console.error('❌ Error during cache cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
clearPoisonedCache()