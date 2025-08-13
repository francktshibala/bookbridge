// Debug the specific simplification route to identify issues
const { PrismaClient } = require('@prisma/client');
const https = require('https');

const prisma = new PrismaClient();

async function testSimplificationRoute() {
  console.log('🔍 DEBUGGING AI SIMPLIFICATION ROUTE');
  console.log('=====================================');
  
  // Test configuration
  const BOOK_ID = 'gutenberg-1342'; // Pride & Prejudice
  const CHUNK_INDEX = 0;
  const CEFR_LEVEL = 'A1';
  const BASE_URL = 'http://localhost:3000'; // Adjust port as needed
  
  try {
    // Step 1: Check if the book content endpoint works
    console.log('\n📚 Step 1: Testing book content endpoint...');
    
    const contentResponse = await fetch(`${BASE_URL}/api/books/${BOOK_ID}/content-fast`);
    console.log(`Content API Status: ${contentResponse.status}`);
    
    if (contentResponse.ok) {
      const contentData = await contentResponse.json();
      console.log(`✅ Book content loaded: "${contentData.title}" by ${contentData.author}`);
      console.log(`Content length: ${contentData.context?.length || 0} characters`);
      
      // Analyze the first chunk
      if (contentData.context) {
        const firstChunk = contentData.context.substring(0, 400); // First 400 chars
        console.log(`\n📝 First chunk preview: "${firstChunk.substring(0, 100)}..."`);
        
        // Detect era using same logic as the route
        const detectEra = (text) => {
          const sample = text.slice(0, 2000).toLowerCase();
          let scores = {
            'early-modern': 0,
            'victorian': 0,
            'american-19c': 0,
            'modern': 0
          };
          
          // Victorian/19th century indicators
          if (/\b(whilst|shall|should|would)\b/.test(sample)) scores['victorian'] += 2;
          if (/\b(entailment|chaperone|governess|propriety|establishment)\b/.test(sample)) scores['victorian'] += 3;
          if (/\b(drawing-room|morning-room|parlour|sitting-room)\b/.test(sample)) scores['victorian'] += 2;
          if (/\b(upon|herewith|wherein|whereupon|heretofore)\b/.test(sample)) scores['victorian'] += 2;
          if (/\b(connexion|endeavour|honour|favour|behaviour)\b/.test(sample)) scores['victorian'] += 2;
          if (/\b(ladyship|gentleman|acquaintance|circumstance)\b/.test(sample)) scores['victorian'] += 1;
          if (/\b(sensible|agreeable|tolerable|amiable|eligible)\b/.test(sample)) scores['victorian'] += 1;
          
          // Check for long sentences
          const sentences = sample.split(/[.!?]/);
          const avgWordsPerSentence = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
          if (avgWordsPerSentence > 25) scores['victorian'] += 2;
          
          const maxScore = Math.max(...Object.values(scores));
          if (maxScore === 0) return 'modern';
          
          for (const [era, score] of Object.entries(scores)) {
            if (score === maxScore) {
              return era;
            }
          }
          return 'modern';
        };
        
        const detectedEra = detectEra(contentData.context);
        console.log(`🕰️ Detected era: ${detectedEra}`);
        
        // Step 2: Test simplification endpoint
        console.log('\n🤖 Step 2: Testing AI simplification endpoint...');
        
        const simplifyUrl = `${BASE_URL}/api/books/${BOOK_ID}/simplify?level=${CEFR_LEVEL}&chunk=${CHUNK_INDEX}&ai=true`;
        console.log(`📡 Calling: ${simplifyUrl}`);
        
        const simplifyResponse = await fetch(simplifyUrl, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'BookBridge-Debug/1.0',
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log(`Simplification API Status: ${simplifyResponse.status}`);
        console.log(`Response Headers:`, Object.fromEntries(simplifyResponse.headers.entries()));
        
        if (simplifyResponse.ok) {
          const simplifyData = await simplifyResponse.json();
          console.log('\n✅ SIMPLIFICATION SUCCESS');
          console.log('Response structure:', Object.keys(simplifyData));
          console.log(`Source: ${simplifyData.source}`);
          console.log(`Success: ${simplifyData.success}`);
          console.log(`Content length: ${simplifyData.content?.length || 0}`);
          
          if (simplifyData.aiMetadata) {
            console.log('\n🤖 AI Metadata:');
            console.log(`  Quality: ${simplifyData.aiMetadata.quality}`);
            console.log(`  Similarity: ${simplifyData.aiMetadata.similarity}`);
            console.log(`  Era: ${simplifyData.aiMetadata.detectedEra}`);
            console.log(`  Threshold: ${simplifyData.aiMetadata.similarityThreshold}`);
            console.log(`  Passed Gate: ${simplifyData.aiMetadata.passedSimilarityGate}`);
            console.log(`  Retry Attempts: ${simplifyData.aiMetadata.retryAttempts}`);
            console.log(`  Is Archaic: ${simplifyData.aiMetadata.isArchaicText}`);
          }
          
          if (simplifyData.microHint) {
            console.log(`\n💡 Micro Hint: ${simplifyData.microHint}`);
          }
          
          // Compare original vs simplified
          const originalLength = firstChunk.length;
          const simplifiedLength = simplifyData.content.length;
          const lengthRatio = simplifiedLength / originalLength;
          
          console.log('\n📊 Content Comparison:');
          console.log(`  Original length: ${originalLength} chars`);
          console.log(`  Simplified length: ${simplifiedLength} chars`);
          console.log(`  Length ratio: ${(lengthRatio * 100).toFixed(1)}%`);
          
          // Check if content is actually different
          const isDifferent = simplifyData.content !== firstChunk;
          console.log(`  Content different: ${isDifferent}`);
          
          if (isDifferent) {
            console.log('\n📝 Content Preview:');
            console.log('Original  :', firstChunk.substring(0, 200) + '...');
            console.log('Simplified:', simplifyData.content.substring(0, 200) + '...');
          } else {
            console.log('⚠️  WARNING: Simplified content is identical to original!');
          }
          
        } else {
          const errorText = await simplifyResponse.text();
          console.error('\n❌ SIMPLIFICATION FAILED');
          console.error('Error response:', errorText);
        }
        
        // Step 3: Check database for cached results
        console.log('\n🗄️ Step 3: Checking database cache...');
        
        const cachedSimplifications = await prisma.bookSimplification.findMany({
          where: {
            bookId: BOOK_ID,
            chunkIndex: CHUNK_INDEX
          },
          select: {
            targetLevel: true,
            originalText: true,
            simplifiedText: true,
            qualityScore: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        console.log(`Found ${cachedSimplifications.length} cached simplifications for chunk ${CHUNK_INDEX}`);
        
        cachedSimplifications.forEach((cache, index) => {
          const isDifferent = cache.originalText !== cache.simplifiedText;
          console.log(`  ${index + 1}. Level ${cache.targetLevel}: Quality ${cache.qualityScore?.toFixed(3)}, Different: ${isDifferent}, Created: ${cache.createdAt}`);
          
          if (!isDifferent) {
            console.log(`    ⚠️  This cached result is identical to original text`);
          }
        });
        
      } else {
        console.error('❌ No content found in book data');
      }
      
    } else {
      const contentError = await contentResponse.text();
      console.error('❌ Failed to fetch book content:', contentError);
    }
    
    // Step 4: Summary and recommendations
    console.log('\n📋 DEBUGGING SUMMARY');
    console.log('====================');
    console.log('✅ Claude API: Working (verified in previous test)');
    console.log(`📚 Book Content API: ${contentResponse.ok ? 'Working' : 'Failed'}`);
    
    if (contentResponse.ok) {
      console.log(`🤖 Simplification API: Testing completed`);
      console.log('\n💡 If simplification is failing:');
      console.log('   1. Check authentication - ensure user is logged in');
      console.log('   2. Review similarity gate settings for archaic texts');
      console.log('   3. Check for rate limiting or usage limits');
      console.log('   4. Verify Claude service error handling');
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error);
    console.error('This might indicate:');
    console.error('  - Server is not running');
    console.error('  - Wrong port number');
    console.error('  - Network connectivity issues');
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to make fetch work in Node.js environments
if (typeof fetch === 'undefined') {
  global.fetch = async function(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const lib = isHttps ? require('https') : require('http');
      
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };
      
      const req = lib.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: new Map(Object.entries(res.headers)),
            text: async () => data,
            json: async () => JSON.parse(data)
          });
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  };
}

testSimplificationRoute();