const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Configuration
const BOOK_ID = 'gutenberg-1342' // Pride & Prejudice
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const BASE_URL = 'http://localhost:3004'
const BATCH_SIZE = 5 // Process 5 chunks at a time
const DELAY_BETWEEN_BATCHES = 3000 // 3 seconds between batches
const MAX_RETRIES = 3

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getBookChunkCount() {
  try {
    // Get the book content to determine total chunks
    const response = await fetch(`${BASE_URL}/api/books/${BOOK_ID}/content-fast`)
    const data = await response.json()
    const fullText = data.context || data.content
    
    // Calculate chunks for A1 (400 words per chunk - all levels use same chunking now)
    const words = fullText.split(/\s+/)
    const totalChunks = Math.ceil(words.length / 400)
    
    return totalChunks
  } catch (error) {
    console.error('Failed to get book content:', error)
    throw error
  }
}

async function checkExistingSimplifications(totalChunks) {
  const existing = await prisma.bookSimplification.findMany({
    where: {
      bookId: BOOK_ID
    },
    select: {
      targetLevel: true,
      chunkIndex: true
    }
  })
  
  // Create a map of existing simplifications
  const existingMap = new Set()
  existing.forEach(item => {
    existingMap.add(`${item.targetLevel}-${item.chunkIndex}`)
  })
  
  // Find missing simplifications
  const missing = []
  for (const level of CEFR_LEVELS) {
    for (let chunk = 0; chunk < totalChunks; chunk++) {
      const key = `${level}-${chunk}`
      if (!existingMap.has(key)) {
        missing.push({ level, chunkIndex: chunk })
      }
    }
  }
  
  return { existing: existing.length, missing }
}

async function processSimplification(level, chunkIndex, retryCount = 0) {
  try {
    const url = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunkIndex=${chunkIndex}&useAI=true`
    console.log(`  Processing: ${level} chunk ${chunkIndex}...`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`    ❌ Failed: ${response.status} - ${errorText.substring(0, 100)}`)
      
      if (retryCount < MAX_RETRIES) {
        console.log(`    🔄 Retrying (${retryCount + 1}/${MAX_RETRIES})...`)
        await sleep(2000)
        return processSimplification(level, chunkIndex, retryCount + 1)
      }
      return false
    }
    
    const result = await response.json()
    
    // Check if it's actually simplified (not identical)
    if (result.source === 'ai_simplified' || result.source === 'cache') {
      console.log(`    ✅ Success: ${result.source}, quality=${result.qualityScore?.toFixed(3) || 'N/A'}`)
      return true
    } else {
      console.log(`    ⚠️  Fallback to chunked text (no AI processing)`)
      return false
    }
    
  } catch (error) {
    console.error(`    ❌ Error: ${error.message}`)
    
    if (retryCount < MAX_RETRIES) {
      console.log(`    🔄 Retrying (${retryCount + 1}/${MAX_RETRIES})...`)
      await sleep(2000)
      return processSimplification(level, chunkIndex, retryCount + 1)
    }
    return false
  }
}

async function processBatch(batch) {
  const promises = batch.map(item => 
    processSimplification(item.level, item.chunkIndex)
  )
  
  const results = await Promise.all(promises)
  const successful = results.filter(r => r).length
  const failed = results.filter(r => !r).length
  
  return { successful, failed }
}

async function main() {
  console.log('🚀 BULK PROCESSING PRIDE & PREJUDICE SIMPLIFICATIONS')
  console.log('='*60)
  
  try {
    // Step 1: Get total chunks
    console.log('\n📊 Analyzing book structure...')
    const totalChunks = await getBookChunkCount()
    console.log(`  Total chunks: ${totalChunks}`)
    console.log(`  CEFR levels: ${CEFR_LEVELS.join(', ')}`)
    console.log(`  Maximum possible simplifications: ${totalChunks * CEFR_LEVELS.length}`)
    
    // Step 2: Check existing simplifications
    console.log('\n🔍 Checking existing simplifications...')
    const { existing, missing } = await checkExistingSimplifications(totalChunks)
    console.log(`  Already processed: ${existing}`)
    console.log(`  Missing: ${missing.length}`)
    
    if (missing.length === 0) {
      console.log('\n✅ All simplifications already complete!')
      await prisma.$disconnect()
      return
    }
    
    // Step 3: Process missing simplifications in batches
    console.log('\n📝 Processing missing simplifications...')
    console.log(`  Batch size: ${BATCH_SIZE}`)
    console.log(`  Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`)
    console.log(`  Estimated time: ${Math.ceil(missing.length / BATCH_SIZE) * (10 + DELAY_BETWEEN_BATCHES/1000)}s`)
    
    let totalSuccessful = 0
    let totalFailed = 0
    
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(missing.length / BATCH_SIZE)
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} items):`)
      
      const { successful, failed } = await processBatch(batch)
      totalSuccessful += successful
      totalFailed += failed
      
      console.log(`  Batch results: ${successful} successful, ${failed} failed`)
      
      // Progress update
      const progress = ((i + batch.length) / missing.length * 100).toFixed(1)
      console.log(`  Overall progress: ${progress}% (${totalSuccessful} successful, ${totalFailed} failed)`)
      
      // Delay between batches (except for the last one)
      if (i + BATCH_SIZE < missing.length) {
        console.log(`  Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
        await sleep(DELAY_BETWEEN_BATCHES)
      }
    }
    
    // Step 4: Final summary
    console.log('\n' + '='*60)
    console.log('📊 FINAL SUMMARY:')
    console.log(`  Total processed: ${totalSuccessful + totalFailed}`)
    console.log(`  Successful: ${totalSuccessful}`)
    console.log(`  Failed: ${totalFailed}`)
    
    // Verify completion
    const { existing: finalExisting, missing: finalMissing } = await checkExistingSimplifications(totalChunks)
    console.log(`\n✅ Final status:`)
    console.log(`  Total simplifications in database: ${finalExisting}`)
    console.log(`  Remaining missing: ${finalMissing.length}`)
    
    if (finalMissing.length === 0) {
      console.log('\n🎉 PRIDE & PREJUDICE FULLY PROCESSED!')
    } else {
      console.log('\n⚠️  Some simplifications still missing. You may need to run again.')
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Check if server is running
fetch(`${BASE_URL}/api/health`)
  .then(() => {
    console.log('✅ Server is running on port 3004')
    main()
  })
  .catch(() => {
    console.error('❌ Server is not running. Please ensure the dev server is running on port 3004')
    console.error('   Current server is on port 3004 (check if it changed)')
    process.exit(1)
  })