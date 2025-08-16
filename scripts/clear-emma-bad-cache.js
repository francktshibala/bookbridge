const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearBadCache() {
  console.log('🧹 Clearing bad cache entries for Emma...')
  
  try {
    // Delete entries with quality score of 1.0 (identical text - failed simplifications)
    const result = await prisma.bookSimplification.deleteMany({
      where: {
        bookId: 'gutenberg-158',
        qualityScore: 1.0
      }
    })
    
    console.log(`✅ Deleted ${result.count} bad cache entries (quality=1.0)`)
    
    // Also check for any entries with null quality scores
    const nullQuality = await prisma.bookSimplification.deleteMany({
      where: {
        bookId: 'gutenberg-158',
        qualityScore: null
      }
    })
    
    if (nullQuality.count > 0) {
      console.log(`✅ Deleted ${nullQuality.count} entries with null quality scores`)
    }
    
    // Show current status
    const remaining = await prisma.bookSimplification.count({
      where: {
        bookId: 'gutenberg-158'
      }
    })
    
    console.log(`\n📊 Current status:`)
    console.log(`   ${remaining} valid simplifications remain in cache`)
    
    // Show quality distribution
    const samples = await prisma.bookSimplification.findMany({
      where: {
        bookId: 'gutenberg-158'
      },
      select: {
        targetLevel: true,
        qualityScore: true
      },
      take: 20
    })
    
    if (samples.length > 0) {
      console.log(`\n📈 Sample quality scores:`)
      const byLevel = {}
      samples.forEach(s => {
        if (!byLevel[s.targetLevel]) {
          byLevel[s.targetLevel] = []
        }
        byLevel[s.targetLevel].push(s.qualityScore)
      })
      
      Object.entries(byLevel).forEach(([level, scores]) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        console.log(`   ${level}: ${avg.toFixed(2)} average`)
      })
    }
    
    console.log('\n✅ Cache cleaned! Ready for bulk processing.')
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearBadCache()