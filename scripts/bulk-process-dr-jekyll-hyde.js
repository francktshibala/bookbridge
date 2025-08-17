const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Configuration for Dr. Jekyll & Hyde
const BOOK_ID = 'gutenberg-43' // Dr. Jekyll & Hyde
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const BASE_URL = 'http://localhost:3006'  // Updated to match your server port
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
    // Try the actual book API endpoint instead of health check
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
    
    // Group by chunk and level for easier lookup
    const existing = {}
    let identicalCount = 0
    
    simplifications.forEach(s => {
      const key = `${s.targetLevel}-${s.chunkIndex}`
      existing[key] = s
      
      // Check if the simplification is actually valid
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
  
  const maxChunks = 50 // Maximum to check (Jekyll & Hyde is short)
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
          // Check for content field instead of originalText
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
        await sleep(3000)
        return processSimplification(level, chunkIndex, retryCount + 1)
      }
      
      return { success: false, error: 'Not properly simplified' }
    }
  } catch (error) {
    console.log(`      ${colors.red}❌ Error: ${error.message}${colors.reset}`)
    
    if (retryCount < MAX_RETRIES) {
      console.log(`      🔄 Retrying (${retryCount + 1}/${MAX_RETRIES})...`)
      await sleep(3000)
      return processSimplification(level, chunkIndex, retryCount + 1)
    }
    
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log(`${colors.bright}🔍 Checking server at ${BASE_URL}...${colors.reset}`)
  
  const serverRunning = await checkServer()
  if (!serverRunning) {
    console.log(`${colors.red}❌ Server is not running at ${BASE_URL}${colors.reset}`)
    console.log(`Please start the server with: npm run dev`)
    process.exit(1)
  }
  
  console.log(`${colors.green}✅ Server is running${colors.reset}`)
  
  console.log(`${colors.bright}${colors.magenta}🧪 BULK PROCESSING DR. JEKYLL & MR. HYDE${colors.reset}`)
  console.log('='.repeat(58))
  console.log(`  Book ID: ${BOOK_ID}`)
  console.log(`  Author: Robert Louis Stevenson`)
  console.log(`  Server: ${BASE_URL}`)
  console.log(`  CEFR Levels: ${CEFR_LEVELS.join(', ')}`)
  console.log('')
  
  // Detect actual chunk count
  const chunkCount = await detectChunkCount()
  
  if (chunkCount === 0) {
    console.log(`${colors.red}❌ Could not detect chunk count for book${colors.reset}`)
    process.exit(1)
  }
  
  console.log(`  ${colors.green}✅ Detected chunk count: ${chunkCount}${colors.reset}`)
  console.log(`  Total chunks: ${chunkCount}`)
  console.log(`  Maximum possible simplifications: ${chunkCount * CEFR_LEVELS.length}`)
  
  // Estimate processing time
  const totalSimplifications = chunkCount * CEFR_LEVELS.length
  const estimatedMinutes = Math.ceil(totalSimplifications / 3) // ~3 per minute estimate
  console.log(`  ${colors.green}⏰ Estimated processing time: ${estimatedMinutes} minutes${colors.reset}`)
  console.log('')
  
  // Check existing simplifications
  console.log(`${colors.cyan}🔍 Checking existing simplifications...${colors.reset}`)
  const { existing, total: existingCount, identicalCount } = await getExistingSimplifications()
  
  console.log(`  Already processed: ${existingCount}`)
  console.log(`  Valid simplifications: ${existingCount - identicalCount}`)
  console.log(`  Identical text (failed): ${identicalCount}`)
  
  // Build list of missing simplifications
  const missing = []
  for (const level of CEFR_LEVELS) {
    for (let chunk = 0; chunk < chunkCount; chunk++) {
      const key = `${level}-${chunk}`
      const existingSimp = existing[key]
      
      // Skip if we have a valid simplification
      if (existingSimp && 
          existingSimp.originalText !== existingSimp.simplifiedText && 
          existingSimp.qualityScore < 1) {
        continue
      }
      
      missing.push({ level, chunk })
    }
  }
  
  console.log(`  Missing: ${missing.length}`)
  
  if (identicalCount > 0) {
    console.log('')
    console.log(`${colors.yellow}⚠️  Warning: ${identicalCount} failed simplifications detected${colors.reset}`)
    console.log(`   These show identical text and will be replaced during processing`)
  }
  
  if (missing.length === 0) {
    console.log('')
    console.log(`${colors.green}✅ All simplifications complete!${colors.reset}`)
    await prisma.$disconnect()
    process.exit(0)
  }
  
  // Show breakdown by level
  console.log('')
  console.log(`${colors.cyan}📊 Missing by level:${colors.reset}`)
  for (const level of CEFR_LEVELS) {
    const levelMissing = missing.filter(m => m.level === level).length
    console.log(`  ${level}: ${levelMissing} chunks`)
  }
  
  // Process missing simplifications
  console.log('')
  console.log(`${colors.bright}📝 Processing missing simplifications...${colors.reset}`)
  console.log(`  Batch size: ${BATCH_SIZE}`)
  console.log(`  Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`)
  console.log(`  Delay between requests: 2000ms`)
  
  const totalTime = Math.ceil(missing.length / BATCH_SIZE) * (DELAY_BETWEEN_BATCHES / 1000) + 
                   missing.length * 2
  console.log(`  Estimated time: ${Math.ceil(totalTime / 60)} minutes`)
  console.log('')
  
  let successCount = 0
  let failCount = 0
  
  // Process in batches
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(missing.length / BATCH_SIZE)
    
    console.log(`${colors.bright}📦 Batch ${batchNumber}/${totalBatches} (${batch.length} items):${colors.reset}`)
    
    const batchResults = []
    for (const item of batch) {
      const result = await processSimplification(item.level, item.chunk)
      batchResults.push(result)
      
      if (result.success) {
        successCount++
      } else {
        failCount++
      }
      
      // Delay between requests within a batch
      if (batch.indexOf(item) < batch.length - 1) {
        console.log(`      ⏱️  Waiting 2000ms...`)
        await sleep(2000)
      }
    }
    
    const batchSuccess = batchResults.filter(r => r.success).length
    const batchFail = batchResults.filter(r => !r.success).length
    
    console.log(`  Batch results: ${batchSuccess} successful, ${batchFail} failed`)
    console.log(`  Overall progress: ${((successCount / missing.length) * 100).toFixed(1)}% (${successCount}/${missing.length} successful)`)
    
    // Delay between batches
    if (i + BATCH_SIZE < missing.length) {
      console.log(`  ⏱️  Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
      await sleep(DELAY_BETWEEN_BATCHES)
      console.log('')
    }
  }
  
  // Final summary
  console.log('')
  console.log('='.repeat(58))
  console.log(`${colors.bright}📊 FINAL SUMMARY:${colors.reset}`)
  console.log(`  Total processed: ${successCount + failCount}`)
  console.log(`  ${colors.green}Successful: ${successCount}${colors.reset}`)
  console.log(`  ${colors.red}Failed: ${failCount}${colors.reset}`)
  
  // Check final status
  const finalCheck = await getExistingSimplifications()
  console.log('')
  console.log(`${colors.cyan}✅ Final status:${colors.reset}`)
  console.log(`  Total simplifications in database: ${finalCheck.total}`)
  console.log(`  Remaining missing: ${(chunkCount * CEFR_LEVELS.length) - finalCheck.total}`)
  
  if (finalCheck.total >= chunkCount * CEFR_LEVELS.length) {
    console.log('')
    console.log(`${colors.green}${colors.bright}🎉 DR. JEKYLL & MR. HYDE FULLY PROCESSED!${colors.reset}`)
    console.log(`${colors.green}🧪 Gothic horror simplified for all CEFR levels!${colors.reset}`)
  }
  
  await prisma.$disconnect()
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error)
  prisma.$disconnect()
  process.exit(1)
})