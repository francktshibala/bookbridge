const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Configuration for Emma
const BOOK_ID = 'gutenberg-158' // Emma by Jane Austen
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const BASE_URL = 'http://localhost:3000'  // Your server port
const USER_ID = 'system-gutenberg'  // Bypasses usage limits
const DELAY_MS = 12000  // 12 seconds between requests for rate limiting
const MAX_RETRIES = 3

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getBookChunkCount() {
  console.log('🔍 Determining chunk count for Emma...')
  
  // Test with a high chunk number to get actual count from error
  for (const level of CEFR_LEVELS) {
    try {
      const response = await fetch(
        `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=999&useAI=false`
      )
      const data = await response.json()
      
      if (data.error && data.error.includes('chunks')) {
        const match = data.error.match(/has (\d+) chunks/)
        if (match) {
          const chunkCount = parseInt(match[1])
          console.log(`📚 Emma has ${chunkCount} chunks`)
          return chunkCount
        }
      }
    } catch (error) {
      continue
    }
  }
  
  // Fallback: estimate based on content
  console.log('⚠️ Could not determine exact chunks, estimating...')
  return 280 // Victorian novels typically have ~280 chunks
}

async function checkExistingSimplifications(totalChunks) {
  const existing = await prisma.bookSimplification.findMany({
    where: {
      bookId: BOOK_ID
    },
    select: {
      targetLevel: true,
      chunkIndex: true,
      qualityScore: true
    }
  })
  
  // Create a map of existing simplifications
  const existingMap = new Set()
  let badCache = 0
  
  existing.forEach(item => {
    existingMap.add(`${item.targetLevel}-${item.chunkIndex}`)
    if (item.qualityScore === 1.0) {
      badCache++
    }
  })
  
  if (badCache > 0) {
    console.log(`⚠️ Found ${badCache} bad cache entries (quality=1.0)`)
    console.log('Run: node scripts/clear-emma-bad-cache.js first')
  }
  
  return existingMap
}

async function processChunk(level, chunkIndex, retries = 0) {
  try {
    const url = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${chunkIndex}&useAI=true&userId=${USER_ID}`
    
    console.log(`  📝 Processing chunk ${chunkIndex} for ${level}...`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    // Verify quality
    if (data.source === 'ai_simplified' && data.qualityScore < 1.0) {
      console.log(`    ✅ Success! Quality: ${data.qualityScore?.toFixed(2)}`)
      return true
    } else if (data.source === 'cache') {
      console.log(`    📦 Already cached`)
      return true
    } else {
      console.log(`    ⚠️ Unexpected: source=${data.source}, quality=${data.qualityScore}`)
      return false
    }
    
  } catch (error) {
    console.log(`    ❌ Error: ${error.message}`)
    
    if (retries < MAX_RETRIES) {
      console.log(`    🔄 Retrying (${retries + 1}/${MAX_RETRIES})...`)
      await sleep(5000)
      return processChunk(level, chunkIndex, retries + 1)
    }
    
    return false
  }
}

async function main() {
  console.log('🎯 Emma Bulk Processing Script')
  console.log('================================')
  console.log(`Book: Emma (${BOOK_ID})`)
  console.log(`Server: ${BASE_URL}`)
  console.log(`User: ${USER_ID}`)
  console.log()
  
  try {
    // Get total chunks
    const totalChunks = await getBookChunkCount()
    const totalSimplifications = totalChunks * CEFR_LEVELS.length
    
    console.log(`📊 Total simplifications needed: ${totalSimplifications}`)
    console.log(`   (${totalChunks} chunks × ${CEFR_LEVELS.length} levels)`)
    console.log()
    
    // Check existing
    const existingMap = await checkExistingSimplifications(totalChunks)
    const existingCount = existingMap.size
    const remaining = totalSimplifications - existingCount
    
    console.log(`✅ Already completed: ${existingCount}`)
    console.log(`⏳ Remaining: ${remaining}`)
    console.log()
    
    if (remaining === 0) {
      console.log('🎉 All simplifications already complete!')
      await prisma.$disconnect()
      return
    }
    
    // Process each level
    let processed = 0
    let failed = 0
    
    for (const level of CEFR_LEVELS) {
      console.log(`\n📚 Processing ${level} level...`)
      console.log('─'.repeat(40))
      
      for (let chunk = 0; chunk < totalChunks; chunk++) {
        const key = `${level}-${chunk}`
        
        // Skip if already exists
        if (existingMap.has(key)) {
          continue
        }
        
        const success = await processChunk(level, chunk)
        
        if (success) {
          processed++
        } else {
          failed++
        }
        
        // Progress update
        if ((processed + failed) % 10 === 0) {
          const progress = ((existingCount + processed) / totalSimplifications * 100).toFixed(1)
          console.log(`\n📊 Progress: ${progress}% (${existingCount + processed}/${totalSimplifications})`)
          console.log(`   Processed this session: ${processed}`)
          console.log(`   Failed: ${failed}`)
        }
        
        // Rate limiting
        await sleep(DELAY_MS)
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 EMMA PROCESSING COMPLETE')
    console.log('='.repeat(50))
    console.log(`✅ Successfully processed: ${processed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📚 Total in database: ${existingCount + processed}/${totalSimplifications}`)
    
    // Verify in database
    const finalCount = await prisma.bookSimplification.count({
      where: { bookId: BOOK_ID }
    })
    console.log(`\n🔍 Database verification: ${finalCount} simplifications stored`)
    
    if (finalCount === totalSimplifications) {
      console.log('🎉 EMMA FULLY PROCESSED!')
    } else {
      console.log(`⚠️ Missing ${totalSimplifications - finalCount} simplifications`)
      console.log('Run the script again to complete')
    }
    
  } catch (error) {
    console.error('Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main().catch(console.error)