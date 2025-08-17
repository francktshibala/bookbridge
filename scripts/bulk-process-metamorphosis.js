const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Configuration for Metamorphosis
const BOOK_ID = 'gutenberg-5200' // Metamorphosis by Franz Kafka
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const BASE_URL = 'http://localhost:3006'
const BATCH_SIZE = 3 // Conservative for stability
const DELAY_BETWEEN_BATCHES = 8000 // 8 seconds between batches (avoid usage limit)
const MAX_RETRIES = 2

// ANSI color codes for better visibility
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/books/${BOOK_ID}/content-fast`)
    return response.ok
  } catch (error) {
    return false
  }
}

async function getExistingSimplifications() {
  try {
    const simplifications = await prisma.bookSimplification.findMany({
      where: { bookId: BOOK_ID },
      select: {
        chunkIndex: true,
        targetLevel: true,
        originalText: true,
        simplifiedText: true,
        qualityScore: true
      }
    })
    
    const existing = {}
    let identicalCount = 0
    
    simplifications.forEach(s => {
      const key = `${s.targetLevel}-${s.chunkIndex}`
      existing[key] = s
      
      if (s.originalText === s.simplifiedText || s.qualityScore === 1) {
        identicalCount++
      }
    })
    
    return { existing, total: simplifications.length, identicalCount }
  } catch (error) {
    console.error('Error checking existing simplifications:', error)
    return { existing: {}, total: 0, identicalCount: 0 }
  }
}

async function detectChunkCount() {
  console.log(`${colors.cyan}📊 Analyzing book structure...${colors.reset}`)
  console.log(`  🔍 Testing API to find actual chunk count...`)
  
  const maxChunks = 150 // Maximum to check (Metamorphosis is a novella, moderate length)
  let detectedCount = 0
  
  // Test with A1 and A2 to verify consistency
  for (const level of ['A1', 'A2']) {
    let lastValidChunk = -1
    
    // Binary search approach for efficiency
    let low = 0
    let high = maxChunks
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      
      try {
        const response = await fetch(
          `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${mid}&useAI=false`
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.content && data.content.length > 100) {
            lastValidChunk = mid
            low = mid + 1
          } else {
            high = mid - 1
          }
        } else {
          high = mid - 1
        }
      } catch (error) {
        high = mid - 1
      }
    }
    
    const chunksForLevel = lastValidChunk + 1
    console.log(`    ${level}: ${chunksForLevel} chunks available`)
    
    if (chunksForLevel > detectedCount) {
      detectedCount = chunksForLevel
    }
  }
  
  return detectedCount
}

async function processSimplification(level, chunkIndex, retryCount = 0) {
  const url = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${chunkIndex}&useAI=true`
  
  console.log(`    📝 Processing: ${colors.cyan}${level} chunk ${chunkIndex}${colors.reset}...`)
  console.log(`      🤖 Calling: ${url}`)
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const result = await response.json()
    
    // Validate the result
    const isAIProcessed = result.source === 'ai_simplified' || 
                         (result.source === 'cache' && result.qualityScore < 1.0)
    const isDifferentFromOriginal = result.aiMetadata?.passedSimilarityGate !== false
    
    if (isAIProcessed && isDifferentFromOriginal) {
      const similarity = result.aiMetadata?.similarity || result.qualityScore || 'N/A'
      console.log(`      ${colors.green}✅ Success: source=${result.source}, quality=${result.qualityScore}, similarity=${similarity}${colors.reset}`)
      return { success: true, data: result }
    } else {
      console.log(`      ${colors.yellow}⚠️  Warning: Not properly simplified (source=${result.source}, quality=${result.qualityScore})${colors.reset}`)
      
      if (retryCount < MAX_RETRIES) {
        console.log(`      🔄 Retrying (${retryCount + 1}/${MAX_RETRIES})...`)
        await sleep(2000)
        return processSimplification(level, chunkIndex, retryCount + 1)
      } else {
        return { success: false, error: 'Not properly simplified after retries' }
      }
    }
  } catch (error) {
    console.log(`      ${colors.red}❌ Error: ${error.message}${colors.reset}`)
    
    if (retryCount < MAX_RETRIES) {
      console.log(`      🔄 Retrying (${retryCount + 1}/${MAX_RETRIES})...`)
      await sleep(2000)
      return processSimplification(level, chunkIndex, retryCount + 1)
    } else {
      return { success: false, error: error.message }
    }
  }
}

async function main() {
  console.log(`${colors.magenta}🟡 Checking server at ${BASE_URL}...${colors.reset}`)
  
  if (!(await checkServer())) {
    console.log(`${colors.red}❌ Server not running at ${BASE_URL}${colors.reset}`)
    console.log('Please start the server with: npm run dev')
    process.exit(1)
  }
  
  console.log(`${colors.green}✅ Server is running${colors.reset}`)
  console.log(`${colors.bright}🪲 BULK PROCESSING METAMORPHOSIS${colors.reset}`)
  console.log('='.repeat(62))
  console.log(`  Book ID: ${BOOK_ID}`)
  console.log(`  Author: Franz Kafka`)
  console.log(`  Type: Existential Novella`)
  console.log(`  Server: ${BASE_URL}`)
  console.log(`  CEFR Levels: ${CEFR_LEVELS.join(', ')}`)
  console.log('')
  
  try {
    // Step 1: Detect chunk count
    const totalChunks = await detectChunkCount()
    const maxSimplifications = totalChunks * CEFR_LEVELS.length
    const estimatedMinutes = Math.ceil(maxSimplifications / 3 * (DELAY_BETWEEN_BATCHES / 1000) / 60)
    
    console.log(`  ✅ Detected chunk count: ${totalChunks}`)
    console.log(`  Total chunks: ${totalChunks}`)
    console.log(`  Maximum possible simplifications: ${maxSimplifications}`)
    console.log(`  ⏰ Estimated processing time: ${estimatedMinutes} minutes`)
    console.log('')
    
    // Step 2: Check existing simplifications
    console.log(`${colors.cyan}🔍 Checking existing simplifications...${colors.reset}`)
    const { existing, total, identicalCount } = await getExistingSimplifications()
    
    console.log(`  Already processed: ${total}`)
    console.log(`  Valid simplifications: ${total - identicalCount}`)
    console.log(`  Identical text (failed): ${identicalCount}`)
    
    if (identicalCount > 0) {
      console.log(`${colors.yellow}⚠️  Warning: ${identicalCount} failed simplifications detected${colors.reset}`)
      console.log('   These show identical text and will be replaced during processing')
      console.log('')
    }
    
    // Step 3: Find missing simplifications
    const missing = []
    const missingByLevel = {}
    
    CEFR_LEVELS.forEach(level => {
      missingByLevel[level] = 0
      for (let chunk = 0; chunk < totalChunks; chunk++) {
        const key = `${level}-${chunk}`
        const existingItem = existing[key]
        
        // Consider it missing if it doesn't exist or has identical text
        if (!existingItem || existingItem.originalText === existingItem.simplifiedText || existingItem.qualityScore === 1) {
          missing.push({ level, chunkIndex: chunk })
          missingByLevel[level]++
        }
      }
    })
    
    console.log(`  Missing: ${missing.length}`)
    console.log('')
    console.log(`${colors.cyan}📊 Missing by level:${colors.reset}`)
    CEFR_LEVELS.forEach(level => {
      console.log(`  ${level}: ${missingByLevel[level]} chunks`)
    })
    console.log('')
    
    if (missing.length === 0) {
      console.log(`${colors.green}🎉 All simplifications are already complete!${colors.reset}`)
      return
    }
    
    // Step 4: Process missing simplifications
    console.log(`${colors.cyan}📝 Processing missing simplifications...${colors.reset}`)
    console.log(`  Batch size: ${BATCH_SIZE}`)
    console.log(`  Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`)
    console.log(`  Delay between requests: 2000ms`)
    console.log(`  Estimated time: ${Math.ceil(missing.length / BATCH_SIZE * DELAY_BETWEEN_BATCHES / 1000 / 60)} minutes`)
    console.log('')
    
    let successful = 0
    let failed = 0
    const totalBatches = Math.ceil(missing.length / BATCH_SIZE)
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batch = missing.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE)
      
      console.log(`${colors.bright}📦 Batch ${batchIndex + 1}/${totalBatches} (${batch.length} items):${colors.reset}`)
      
      let batchSuccessful = 0
      let batchFailed = 0
      
      for (const item of batch) {
        const result = await processSimplification(item.level, item.chunkIndex)
        
        if (result.success) {
          successful++
          batchSuccessful++
        } else {
          failed++
          batchFailed++
        }
        
        // Add delay between requests within the same batch
        if (item !== batch[batch.length - 1]) {
          console.log(`      ⏱️  Waiting 2000ms...`)
          await sleep(2000)
        }
      }
      
      console.log(`  Batch results: ${batchSuccessful} successful, ${batchFailed} failed`)
      console.log(`  Overall progress: ${((successful / missing.length) * 100).toFixed(1)}% (${successful}/${missing.length} successful)`)
      
      // Add delay between batches
      if (batchIndex < totalBatches - 1) {
        console.log(`  ⏱️  Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
        await sleep(DELAY_BETWEEN_BATCHES)
      }
    }
    
    console.log('')
    console.log('='.repeat(62))
    console.log(`${colors.bright}📊 FINAL SUMMARY:${colors.reset}`)
    console.log(`  Total processed: ${successful + failed}`)
    console.log(`  Successful: ${successful}`)
    console.log(`  Failed: ${failed}`)
    console.log('')
    
    // Final verification
    const { total: finalTotal } = await getExistingSimplifications()
    console.log(`${colors.green}✅ Final status:${colors.reset}`)
    console.log(`  Total simplifications in database: ${finalTotal}`)
    console.log(`  Expected maximum: ${maxSimplifications}`)
    
    const remaining = maxSimplifications - finalTotal
    if (remaining > 0) {
      console.log(`  Remaining missing: ${remaining}`)
    } else {
      console.log(`${colors.green}🎉 METAMORPHOSIS FULLY PROCESSED!${colors.reset}`)
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)