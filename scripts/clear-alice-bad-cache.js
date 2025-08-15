const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🧹 CLEARING BAD ALICE IN WONDERLAND CACHE (Quality=1.0)')
  
  // Clear Alice entries with quality=1.0 (failed simplifications)
  const result = await prisma.bookSimplification.deleteMany({
    where: {
      bookId: 'gutenberg-11',
      qualityScore: 1.0
    }
  })
  
  console.log(`✅ Deleted ${result.count} bad cache entries for Alice in Wonderland`)
  
  // Also clear any entries where simplified = original text  
  const result2 = await prisma.bookSimplification.deleteMany({
    where: {
      bookId: 'gutenberg-11',
      simplifiedText: {
        equals: prisma.bookSimplification.fields.originalText
      }
    }
  })
  
  console.log(`✅ Deleted ${result2.count} identical text entries`)
  
  // Check final count
  const remaining = await prisma.bookSimplification.count({
    where: {
      bookId: 'gutenberg-11'
    }
  })
  
  console.log(`📊 Remaining Alice in Wonderland simplifications: ${remaining}`)
  
  await prisma.$disconnect()
}

main().catch(console.error)