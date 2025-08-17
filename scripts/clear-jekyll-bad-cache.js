const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearJekyllBadCache() {
  console.log('🧹 CLEARING DR. JEKYLL & HYDE BAD CACHE')
  console.log('========================================')
  
  try {
    // Clear entries with quality=1.0 (failed simplifications)
    const result = await prisma.bookSimplification.deleteMany({
      where: {
        bookId: 'gutenberg-43',
        qualityScore: 1.0
      }
    })
    
    console.log(`✅ Deleted ${result.count} bad cache entries (quality=1.0)`)
    
    // Also clear entries with identical text
    const allSimplifications = await prisma.bookSimplification.findMany({
      where: { bookId: 'gutenberg-43' },
      select: {
        id: true,
        originalText: true,
        simplifiedText: true,
        qualityScore: true
      }
    })
    
    let identicalCount = 0
    for (const s of allSimplifications) {
      if (s.originalText === s.simplifiedText) {
        await prisma.bookSimplification.delete({
          where: { id: s.id }
        })
        identicalCount++
      }
    }
    
    console.log(`✅ Deleted ${identicalCount} identical text entries`)
    console.log(`🎯 Total cleared: ${result.count + identicalCount} bad simplifications`)
    console.log('🚀 Ready for fresh processing!')
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearJekyllBadCache()