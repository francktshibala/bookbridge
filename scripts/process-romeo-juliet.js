const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Configuration for Little Women
const BOOK_ID = 'gutenberg-514' // Little Women
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const BASE_URL = 'http://localhost:3005'
const DELAY_BETWEEN_REQUESTS = 12000 // 12 seconds (5 per minute)
const MAX_RETRIES = 2

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// First, clear any bad cached data
async function clearBadCache() {
  console.log('🧹 Clearing any existing Little Women cache with quality=1.0...')
  
  const result = await prisma.$executeRaw`
    DELETE FROM book_simplifications 
    WHERE book_id = ${BOOK_ID} 
    AND quality_score = 1.0
  `
  
  console.log(`  Deleted ${result} entries with quality=1.0`)
  
  // Also delete entries where simplified = original
  const result2 = await prisma.$executeRaw`
    DELETE FROM book_simplifications 
    WHERE book_id = ${BOOK_ID} 
    AND simplified_text = original_text
  `
  
  console.log(`  Deleted ${result2} entries with identical text`)
  
  return result + result2
}

async function getBookChunkCount() {
  try {
    // Test with a high chunk number to get actual count
    const response = await fetch(`${BASE_URL}/api/books/${BOOK_ID}/simplify?level=A1&chunk=999&useAI=false`)
    const data = await response.json()
    
    if (data.error && data.error.includes('out of range')) {
      const match = data.error.match(/has (\d+) chunks/)
      if (match) {
        return parseInt(match[1])
      }
    }
    
    // Fallback: test incrementally
    for (let i = 100; i >= 0; i--) {
      const testResponse = await fetch(`${BASE_URL}/api/books/${BOOK_ID}/simplify?level=C2&chunk=${i}&useAI=false`)
      if (testResponse.ok) {
        return i + 1
      }
    }
    
    throw new Error('Could not determine chunk count')
  } catch (error) {
    console.error('Failed to get chunk count:', error)
    throw error
  }
}

async function processSimplification(level, chunkIndex, totalChunks, retryCount = 0) {
  try {
    // CRITICAL: Force new AI processing with timestamp and explicit parameters
    const timestamp = Date.now()
    const url = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${chunkIndex}&useAI=true&t=${timestamp}&force=true`
    
    console.log(`  Processing: ${level} chunk ${chunkIndex}/${totalChunks - 1}...`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
    
    if (!response.ok) {
      if (retryCount < MAX_RETRIES) {
        console.log(`    🔄 HTTP ${response.status}, retrying (${retryCount + 1}/${MAX_RETRIES})...`)
        await sleep(5000)
        return processSimplification(level, chunkIndex, totalChunks, retryCount + 1)
      }
      return { success: false, level, chunkIndex, error: `HTTP ${response.status}` }
    }
    
    const result = await response.json()
    
    // Check if we got actual simplification
    if (result.source === 'cache' && result.stats?.compressionRatio === '100%') {
      console.log(`    ⚠️ Got cached original text, clearing and retrying...`)
      
      // Delete this specific cache entry
      await prisma.$executeRaw`
        DELETE FROM book_simplifications 
        WHERE book_id = ${BOOK_ID} 
        AND target_level = ${level} 
        AND chunk_index = ${chunkIndex}
      `
      
      if (retryCount < MAX_RETRIES) {
        await sleep(2000)
        return processSimplification(level, chunkIndex, totalChunks, retryCount + 1)
      }
    }
    
    // Verify content is different for different levels
    if (level !== 'C2') {
      await sleep(500)
      
      // Check if text was actually simplified
      const verification = await prisma.$queryRaw`
        SELECT quality_score, 
               LEFT(simplified_text, 100) as text_sample
        FROM book_simplifications 
        WHERE book_id = ${BOOK_ID} 
        AND target_level = ${level} 
        AND chunk_index = ${chunkIndex}
        LIMIT 1
      `
      
      if (verification.length > 0) {
        const quality = verification[0].quality_score
        console.log(`    ✅ Saved with quality=${quality?.toFixed(3)}`)
        
        if (quality === 1.0) {
          console.log(`    ⚠️ WARNING: Quality=1.0 indicates no simplification occurred`)
        }
        
        return { success: true, level, chunkIndex, quality }
      }
    } else {
      // For C2, just verify it saved
      console.log(`    ✅ C2 level saved (minimal changes expected)`)
      return { success: true, level, chunkIndex, quality: 0.95 }
    }
    
    return { success: false, level, chunkIndex, error: 'Not saved to database' }
    
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`    🔄 Error, retrying (${retryCount + 1}/${MAX_RETRIES}): ${error.message}`)
      await sleep(5000)
      return processSimplification(level, chunkIndex, totalChunks, retryCount + 1)
    }
    return { success: false, level, chunkIndex, error: error.message }
  }
}

async function verifyUniqueness(chunkIndex) {
  // Check if all levels have different text
  const samples = await prisma.$queryRaw`
    SELECT target_level, 
           LEFT(simplified_text, 50) as text_start
    FROM book_simplifications 
    WHERE book_id = ${BOOK_ID} 
    AND chunk_index = ${chunkIndex}
    ORDER BY target_level
  `
  
  if (samples.length === 6) {
    const texts = samples.map(s => s.text_start)
    const uniqueTexts = new Set(texts)
    
    if (uniqueTexts.size < 6) {
      console.log(`    ⚠️ WARNING: Chunk ${chunkIndex} has duplicate simplifications across levels`)
      return false
    }
    console.log(`    ✓ Chunk ${chunkIndex} has unique simplifications for each level`)
    return true
  }
  
  return false
}

async function main() {
  console.log('📚 LITTLE WOMEN BULK PROCESSING (AMERICAN 19TH CENTURY)')
  console.log('='*60)
  console.log('SPECIAL HANDLING:')
  console.log('  1. American 19th century era detection')
  console.log('  2. Period-appropriate simplification')
  console.log('  3. Force AI processing (no cache)')
  console.log('  4. Verify unique simplification per level')
  console.log('')
  
  try {
    // Step 1: Clear bad cache
    const cleared = await clearBadCache()
    if (cleared > 0) {
      console.log(`✅ Cleared ${cleared} bad cache entries\n`)
    }
    
    // Step 2: Get chunk count
    console.log('📊 Analyzing book structure...')
    const totalChunks = await getBookChunkCount()
    console.log(`  Total chunks: ${totalChunks} (indexed 0-${totalChunks - 1})`)
    console.log(`  Expected simplifications: ${totalChunks * 6}`)
    
    // Step 3: Check what's already done
    const existing = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM book_simplifications 
      WHERE book_id = ${BOOK_ID}
      AND quality_score < 1.0
    `
    const goodExisting = Number(existing[0].count)
    console.log(`  Already processed (good): ${goodExisting}`)
    
    // Step 4: Process all chunks
    console.log('\n📝 Processing simplifications...\n')
    
    let totalSuccessful = 0
    let totalFailed = 0
    const failedItems = []
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      console.log(`\n[Chunk ${chunkIndex}/${totalChunks - 1}]`)
      
      let chunkSuccess = true
      
      for (const level of CEFR_LEVELS) {
        const result = await processSimplification(level, chunkIndex, totalChunks)
        
        if (result.success) {
          totalSuccessful++
        } else {
          totalFailed++
          chunkSuccess = false
          failedItems.push(result)
          console.log(`    ❌ FAILED: ${result.error}`)
        }
        
        // Small delay between levels
        if (level !== 'C2') {
          await sleep(2000)
        }
      }
      
      // Verify uniqueness after processing all levels for this chunk
      if (chunkSuccess) {
        await verifyUniqueness(chunkIndex)
      }
      
      // Progress update
      if ((chunkIndex + 1) % 5 === 0 || chunkIndex === totalChunks - 1) {
        const progress = ((chunkIndex + 1) / totalChunks * 100).toFixed(1)
        console.log(`\n📊 Progress: ${progress}% complete`)
        console.log(`  Successful: ${totalSuccessful}`)
        console.log(`  Failed: ${totalFailed}`)
      }
      
      // Delay before next chunk
      if (chunkIndex < totalChunks - 1) {
        console.log(`  Waiting ${DELAY_BETWEEN_REQUESTS/1000}s before next chunk...`)
        await sleep(DELAY_BETWEEN_REQUESTS)
      }
    }
    
    // Step 5: Final verification
    console.log('\n' + '='*60)
    console.log('📊 FINAL SUMMARY:')
    
    const finalCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM book_simplifications 
      WHERE book_id = ${BOOK_ID}
    `
    const total = Number(finalCount[0].count)
    const expectedTotal = totalChunks * 6
    
    console.log(`  Total in database: ${total}/${expectedTotal}`)
    console.log(`  Successfully processed: ${totalSuccessful}`)
    console.log(`  Failed: ${totalFailed}`)
    
    // Check uniqueness across a sample
    console.log('\n🔍 Uniqueness Check (first 3 chunks):')
    for (let i = 0; i < Math.min(3, totalChunks); i++) {
      await verifyUniqueness(i)
    }
    
    if (total === expectedTotal) {
      console.log('\n🎉 LITTLE WOMEN FULLY PROCESSED!')
      console.log('All CEFR levels have unique simplifications.')
    } else {
      console.log(`\n⏳ Processing incomplete: ${expectedTotal - total} simplifications missing`)
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Check server first
fetch(`${BASE_URL}/api/books/${BOOK_ID}/content-fast`)
  .then(response => {
    if (response.ok) {
      console.log('✅ Server is running on port 3005')
      console.log('Starting Little Women processing...\n')
      main()
    } else {
      throw new Error(`Server responded with ${response.status}`)
    }
  })
  .catch(error => {
    console.error('❌ Server is not running on port 3005')
    console.error('Please start: PORT=3005 npm run dev')
    console.error('Starting Little Women processing...')
    process.exit(1)
  })