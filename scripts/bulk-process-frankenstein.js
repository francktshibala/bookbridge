const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Configuration for Frankenstein
const BOOK_ID = 'gutenberg-84' // Frankenstein
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const BASE_URL = 'http://localhost:3005'  // UPDATE THIS TO YOUR SERVER PORT
const BATCH_SIZE = 3 // Production mode - process 3 at a time
const DELAY_BETWEEN_BATCHES = 8000 // 8 seconds between batches (avoid usage limit)
const MAX_RETRIES = 2
const DELAY_BETWEEN_REQUESTS = 2000 // 2s between individual requests (conservative)
const TEST_MODE = false // PRODUCTION: Process all chunks

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getBookChunkCount() {
  try {
    console.log('  🔍 Testing API to find actual chunk count...')
    
    let minChunkCount = Infinity
    
    for (const level of CEFR_LEVELS.slice(0, 2)) { // Test first 2 levels only
      const response = await fetch(`${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=999&useAI=false`)
      
      if (!response.ok) {
        const data = await response.json()
        if (data.error && data.error.includes('has') && data.error.includes('chunks')) {
          const match = data.error.match(/has (\d+) chunks/)
          if (match) {
            const chunkCount = parseInt(match[1])
            console.log(`    ${level}: ${chunkCount} chunks available`)
            minChunkCount = Math.min(minChunkCount, chunkCount)
          }
        }
      }
    }
    
    if (minChunkCount === Infinity) {
      throw new Error('Could not determine chunk count from API')
    }
    
    console.log(`  ✅ Detected chunk count: ${minChunkCount}`)
    return minChunkCount
  } catch (error) {
    console.error('Failed to get book chunk count:', error)
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
      chunkIndex: true,
      qualityScore: true,
      originalText: true,
      simplifiedText: true
    }
  })
  
  // Check for identical text (failed simplifications)
  const identicalCount = existing.filter(item => 
    item.originalText === item.simplifiedText
  ).length
  
  const existingMap = new Set()
  existing.forEach(item => {
    existingMap.add(`${item.targetLevel}-${item.chunkIndex}`)
  })
  
  const missing = []
  for (const level of CEFR_LEVELS) {
    for (let chunk = 0; chunk < totalChunks; chunk++) {
      const key = `${level}-${chunk}`
      if (!existingMap.has(key)) {
        missing.push({ level, chunkIndex: chunk })
      }
    }
  }
  
  return { 
    existing: existing.length, 
    missing,
    identicalCount,
    validSimplifications: existing.length - identicalCount
  }
}

async function processSimplification(level, chunkIndex, retryCount = 0) {
  try {
    const url = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${chunkIndex}&ai=true`
    
    console.log(`    🤖 Calling: ${url}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 second timeout for AI processing
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`    ❌ HTTP ${response.status}: ${errorText.substring(0, 200)}`)
      
      if (retryCount < MAX_RETRIES) {
        console.log(`    🔄 Retrying in 3 seconds... (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`)
        await sleep(3000)
        return processSimplification(level, chunkIndex, retryCount + 1)
      }
      return { success: false, level, chunkIndex, error: `HTTP ${response.status}` }
    }
    
    const result = await response.json()
    
    // Validate the result - same logic as Romeo & Juliet
    const isAIProcessed = result.source === 'ai_simplified' || 
                         (result.source === 'cache' && result.qualityScore < 1.0)
    const hasValidContent = result.content && result.content.length > 0
    const isDifferentFromOriginal = result.aiMetadata?.passedSimilarityGate !== false
    
    // CRITICAL: For Gothic/Romantic texts (Frankenstein), trust AI quality assessments
    const isGothicAndModernized = result.aiMetadata?.quality === 'modernized' ||
                                  result.aiMetadata?.quality === 'acceptable' ||
                                  result.aiMetadata?.quality === 'good' ||
                                  result.aiMetadata?.quality === 'excellent'
    
    // Trust AI for Gothic literature like we did for Shakespeare
    const validSimplification = isGothicAndModernized || 
                               (result.originalText && result.simplifiedText && 
                                result.originalText !== result.simplifiedText)
    
    if (isAIProcessed && hasValidContent && isDifferentFromOriginal && validSimplification) {
      console.log(`    ✅ Success: source=${result.source}, quality=${result.qualityScore?.toFixed(3)}, similarity=${result.aiMetadata?.similarity?.toFixed(3)}`)
      return { 
        success: true, 
        level, 
        chunkIndex, 
        quality: result.qualityScore,
        source: result.source,
        similarity: result.aiMetadata?.similarity
      }
    } else {
      const identicalText = result.originalText === result.simplifiedText
      const errorReason = identicalText ? 'IDENTICAL TEXT' : 'Poor quality'
      console.log(`    ❌ Failed: ${errorReason} - source=${result.source}, similarity=${result.aiMetadata?.similarity?.toFixed(3)}`)
      return { 
        success: false, 
        level, 
        chunkIndex, 
        error: `${errorReason}: ${result.source}, similarity=${result.aiMetadata?.similarity?.toFixed(3)}` 
      }
    }
    
  } catch (error) {
    console.log(`    ❌ Error: ${error.message}`)
    
    if (retryCount < MAX_RETRIES) {
      console.log(`    🔄 Retrying in 3 seconds... (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`)
      await sleep(3000)
      return processSimplification(level, chunkIndex, retryCount + 1)
    }
    return { success: false, level, chunkIndex, error: error.message }
  }
}

async function processBatchSequentially(batch) {
  const results = []
  
  for (const item of batch) {
    console.log(`  📝 Processing: ${item.level} chunk ${item.chunkIndex}...`)
    const result = await processSimplification(item.level, item.chunkIndex)
    results.push(result)
    
    // Delay between requests to avoid rate limits
    if (results.length < batch.length) {
      console.log(`    ⏱️  Waiting ${DELAY_BETWEEN_REQUESTS}ms...`)
      await sleep(DELAY_BETWEEN_REQUESTS)
    }
  }
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  return { successful, failed, results }
}

async function main() {
  console.log('⚡ BULK PROCESSING FRANKENSTEIN')
  console.log('='*50)
  console.log(`  Book ID: ${BOOK_ID}`)
  console.log(`  Server: ${BASE_URL}`)
  console.log(`  CEFR Levels: ${CEFR_LEVELS.join(', ')}`)
  console.log(`  Mode: ${TEST_MODE ? 'TEST' : 'PRODUCTION'}`)
  
  try {
    // Step 1: Get total chunks
    console.log('\n📊 Analyzing book structure...')
    const totalChunks = await getBookChunkCount()
    console.log(`  Total chunks: ${totalChunks}`)
    console.log(`  Maximum possible simplifications: ${totalChunks * CEFR_LEVELS.length}`)
    
    // Step 2: Check existing simplifications
    console.log('\n🔍 Checking existing simplifications...')
    let { existing, missing, identicalCount, validSimplifications } = await checkExistingSimplifications(totalChunks)
    console.log(`  Already processed: ${existing}`)
    console.log(`  Valid simplifications: ${validSimplifications}`)
    console.log(`  Identical text (failed): ${identicalCount}`)
    console.log(`  Missing: ${missing.length}`)
    
    if (identicalCount > 0) {
      console.log(`\n⚠️  Warning: ${identicalCount} failed simplifications detected`)
      console.log(`   Run clear-frankenstein-bad-cache.js to clean before processing`)
    }
    
    if (missing.length === 0) {
      console.log('\n✅ All simplifications already complete!')
      await prisma.$disconnect()
      return
    }
    
    // TEST MODE: Limit to first few chunks for validation
    if (TEST_MODE) {
      const originalLength = missing.length
      console.log(`\n🧪 TEST MODE: Processing first 6 items only`)
      missing = missing.slice(0, 6)
      console.log(`  Reduced from ${originalLength} to ${missing.length} items for testing`)
    }
    
    // Group missing by level for better visibility
    const byLevel = {}
    CEFR_LEVELS.forEach(level => {
      byLevel[level] = missing.filter(m => m.level === level).length
    })
    console.log('\n📊 Missing by level:')
    Object.entries(byLevel).forEach(([level, count]) => {
      console.log(`  ${level}: ${count} chunks`)
    })
    
    // Step 3: Process missing simplifications
    console.log('\n📝 Processing missing simplifications...')
    console.log(`  Batch size: ${BATCH_SIZE}`)
    console.log(`  Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`)
    console.log(`  Delay between requests: ${DELAY_BETWEEN_REQUESTS}ms`)
    console.log(`  Estimated time: ${Math.ceil(missing.length * (15 + DELAY_BETWEEN_REQUESTS/1000) / 60)} minutes`)
    
    let totalSuccessful = 0
    let totalFailed = 0
    const failedItems = []
    
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(missing.length / BATCH_SIZE)
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} items):`)
      
      const { successful, failed, results } = await processBatchSequentially(batch)
      totalSuccessful += successful
      totalFailed += failed
      
      // Track failed items for retry
      results.filter(r => !r.success).forEach(r => failedItems.push(r))
      
      console.log(`  Batch results: ${successful} successful, ${failed} failed`)
      
      // Progress update
      const progress = ((i + batch.length) / missing.length * 100).toFixed(1)
      console.log(`  Overall progress: ${progress}% (${totalSuccessful}/${missing.length} successful)`)
      
      // Stop if too many failures
      if (failed === batch.length && batch.length > 1) {
        console.log('\n⚠️  All items in batch failed. Stopping to prevent further errors.')
        console.log('  Please check server status and usage limits.')
        break
      }
      
      // Delay between batches
      if (i + BATCH_SIZE < missing.length) {
        console.log(`  ⏱️  Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
        await sleep(DELAY_BETWEEN_BATCHES)
      }
    }
    
    // Step 4: Final summary
    console.log('\n' + '='*50)
    console.log('📊 FINAL SUMMARY:')
    console.log(`  Total processed: ${totalSuccessful + totalFailed}`)
    console.log(`  Successful: ${totalSuccessful}`)
    console.log(`  Failed: ${totalFailed}`)
    
    if (failedItems.length > 0) {
      console.log('\n❌ Failed items (for manual retry):')
      failedItems.slice(0, 10).forEach(item => {
        console.log(`  ${item.level} chunk ${item.chunkIndex}: ${item.error}`)
      })
      if (failedItems.length > 10) {
        console.log(`  ... and ${failedItems.length - 10} more`)
      }
    }
    
    // Verify completion
    const { existing: finalExisting, missing: finalMissing } = await checkExistingSimplifications(totalChunks)
    console.log(`\n✅ Final status:`)
    console.log(`  Total simplifications in database: ${finalExisting}`)
    console.log(`  Remaining missing: ${finalMissing.length}`)
    
    if (finalMissing.length === 0) {
      console.log('\n🎉 FRANKENSTEIN FULLY PROCESSED!')
      console.log(`⚡ Mary Shelley's Gothic masterpiece modernized for all CEFR levels!`)
    } else {
      console.log('\n⏳ Processing incomplete. Run script again to continue.')
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Check if server is running before starting
console.log(`🔍 Checking server at ${BASE_URL}...`)
fetch(`${BASE_URL}/api/health`)
  .catch(() => {
    // Try to detect if server is running by calling a simple API
    return fetch(`${BASE_URL}/api/books/${BOOK_ID}/content-fast`)
  })
  .then(() => {
    console.log('✅ Server is running')
    main()
  })
  .catch(() => {
    console.error(`❌ Server is not running at ${BASE_URL}`)
    console.error('   Please ensure the dev server is running with: npm run dev')
    console.error('   If server is on different port, update BASE_URL in script')
    process.exit(1)
  })