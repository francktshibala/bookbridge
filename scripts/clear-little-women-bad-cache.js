const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🧹 CLEARING BAD LITTLE WOMEN CACHE (Quality=1.0)')
  
  // Clear Little Women entries with quality=1.0 (failed simplifications)
  const result = await prisma.bookSimplification.deleteMany({
    where: {
      bookId: 'gutenberg-514',
      qualityScore: 1.0
    }
  })
  
  console.log(`✅ Deleted ${result.count} bad cache entries for Little Women`)
  
  // Also clear any entries where simplified = original text  
  const result2 = await prisma.bookSimplification.deleteMany({
    where: {
      bookId: 'gutenberg-514',
      simplifiedText: {
        equals: prisma.bookSimplification.fields.originalText
      }
    }
  })
  
  console.log(`✅ Deleted ${result2.count} identical text entries`)
  
  // Check final count
  const remaining = await prisma.bookSimplification.count({
    where: {
      bookId: 'gutenberg-514'
    }
  })
  
  console.log(`📊 Remaining Little Women simplifications: ${remaining}`)
  
  await prisma.$disconnect()
}

main().catch(console.error)