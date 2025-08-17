const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Test configuration
const BOOK_ID = 'gutenberg-514' // Little Women
const BASE_URL = 'http://localhost:3005'
const TEST_CHUNKS = [0, 1, 2] // Just test first 3 chunks
const TEST_LEVELS = ['A1', 'A2', 'B1'] // Test 3 levels

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testSimplification(level, chunkIndex) {
  try {
    const timestamp = Date.now()
    const url = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${level}&chunk=${chunkIndex}&useAI=true&t=${timestamp}&force=true`
    
    console.log(`  Testing: ${level} chunk ${chunkIndex}...`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const result = await response.json()
    
    // Check if AI was used
    if (result.source !== 'ai_simplified') {
      console.log(`    ⚠️ Not AI simplified: source=${result.source}`)
      return { success: false, level, chunkIndex, error: `Source: ${result.source}` }
    }
    
    // Check quality score
    const quality = result.qualityScore || result.aiMetadata?.similarity || 0
    console.log(`    ✅ AI simplified: quality=${quality.toFixed(3)}, era=${result.aiMetadata?.detectedEra}`)
    
    // Verify it's not identical text (quality should not be exactly 1.0)
    if (quality === 1.0) {
      console.log(`    ⚠️ WARNING: Quality=1.0 may indicate identical text`)
    }
    
    return { 
      success: true, 
      level, 
      chunkIndex, 
      quality,
      era: result.aiMetadata?.detectedEra,
      source: result.source
    }
    
  } catch (error) {
    console.log(`    ❌ FAILED: ${error.message}`)
    return { success: false, level, chunkIndex, error: error.message }
  }
}

async function verifyUniqueness(chunkIndex) {
  // Check if all tested levels have different text
  const samples = await prisma.bookSimplification.findMany({
    where: {
      bookId: BOOK_ID,
      chunkIndex: chunkIndex,
      targetLevel: { in: TEST_LEVELS }
    },
    select: {
      targetLevel: true,
      simplifiedText: true,
      qualityScore: true
    }
  })
  
  if (samples.length === TEST_LEVELS.length) {
    const texts = samples.map(s => s.simplifiedText.substring(0, 50))
    const uniqueTexts = new Set(texts)
    
    console.log(`    📝 Chunk ${chunkIndex} text samples:`)
    samples.forEach(s => {
      const preview = s.simplifiedText.substring(0, 40) + '...'
      console.log(`      ${s.targetLevel}: "${preview}" (q=${s.qualityScore.toFixed(3)})`)
    })
    
    if (uniqueTexts.size < TEST_LEVELS.length) {
      console.log(`    ⚠️ WARNING: Only ${uniqueTexts.size}/${TEST_LEVELS.length} unique texts`)
      return false
    } else {
      console.log(`    ✅ All ${TEST_LEVELS.length} levels have unique text`)
      return true
    }
  }
  
  console.log(`    ⚠️ Missing simplifications: found ${samples.length}/${TEST_LEVELS.length}`)
  return false
}

async function main() {
  console.log('🧪 TESTING LITTLE WOMEN SIMPLIFICATION FIX')
  console.log('='.repeat(50))
  console.log(`Testing chunks: ${TEST_CHUNKS.join(', ')}`)
  console.log(`Testing levels: ${TEST_LEVELS.join(', ')}`)
  console.log('Expected era: american-19c (archaic text handling)')
  console.log('')
  
  let totalTests = 0
  let totalSuccess = 0
  const results = []
  
  for (const chunkIndex of TEST_CHUNKS) {
    console.log(`\n🔍 Testing Chunk ${chunkIndex}:`)
    
    let chunkSuccess = 0
    
    for (const level of TEST_LEVELS) {
      const result = await testSimplification(level, chunkIndex)
      results.push(result)
      totalTests++
      
      if (result.success) {
        totalSuccess++
        chunkSuccess++
      }
      
      // Small delay between levels
      await sleep(2000)
    }
    
    // Verify uniqueness for this chunk
    if (chunkSuccess === TEST_LEVELS.length) {
      await sleep(1000) // Let database commit
      await verifyUniqueness(chunkIndex)
    }
    
    // Delay before next chunk
    if (chunkIndex < TEST_CHUNKS[TEST_CHUNKS.length - 1]) {
      console.log(`  Waiting 8s before next chunk...`)
      await sleep(8000)
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY:')
  console.log(`  Total tests: ${totalTests}`)
  console.log(`  Successful: ${totalSuccess}`)
  console.log(`  Failed: ${totalTests - totalSuccess}`)
  console.log(`  Success rate: ${(totalSuccess/totalTests*100).toFixed(1)}%`)
  
  // Show era detection results
  const eras = results.filter(r => r.era).map(r => r.era)
  if (eras.length > 0) {
    const uniqueEras = [...new Set(eras)]
    console.log(`  Detected eras: ${uniqueEras.join(', ')}`)
  }
  
  if (totalSuccess === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Ready for full book processing.')
  } else {
    console.log('\n⚠️ Some tests failed. Check issues before full processing.')
    
    // Show failed tests
    const failed = results.filter(r => !r.success)
    if (failed.length > 0) {
      console.log('\nFailed tests:')
      failed.forEach(f => {
        console.log(`  ${f.level} chunk ${f.chunkIndex}: ${f.error}`)
      })
    }
  }
  
  await prisma.$disconnect()
}

// Check server first
fetch(`${BASE_URL}/api/books/${BOOK_ID}/content-fast`)
  .then(response => {
    if (response.ok) {
      console.log('✅ Server is running')
      main()
    } else {
      throw new Error(`Server responded with ${response.status}`)
    }
  })
  .catch(error => {
    console.error('❌ Server is not running on port 3000')
    console.error('Please start: npm run dev')
    process.exit(1)
  })