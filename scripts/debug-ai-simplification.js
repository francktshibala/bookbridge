// Direct test of AI simplification for Pride & Prejudice
const { claudeService } = require('../lib/ai/claude-service');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleText = `It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.`;

// Detect era (same logic as in route.ts)
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
      console.log(`Era detection scores: ${JSON.stringify(scores)} -> ${era}`);
      return era;
    }
  }
  
  return 'modern';
};

async function debugAISimplification() {
  console.log('=== DEBUGGING AI SIMPLIFICATION PROCESS ===');
  
  const bookId = 'gutenberg-1342';
  const testChunk = 99; // Use a chunk that hasn't been processed yet
  
  try {
    // First test direct AI simplification
    console.log('\n=== TESTING DIRECT AI SIMPLIFICATION ===');
    const era = detectEra(sampleText);
    console.log('Detected era:', era);
    
    // Temperature for Victorian A1
    const temperature = era === 'victorian' ? 0.45 : 0.35;
    console.log('Temperature for A1:', temperature);
    
    // Assertive Victorian A1 prompt
    const prompt = `AGGRESSIVELY SIMPLIFY this Victorian text for beginners:

MANDATORY CHANGES:
- Break ALL long periodic sentences (25+ words) into simple statements
- Replace formal vocabulary with everyday words
- Maximum 8 words per sentence
- Use ONLY the 500 most common English words
- Convert passive voice to active voice
- Explain social terms inline: "entailment" → "family land rules"
- Remove ALL complex phrases like "shall not be wanting" → "will help"

PRESERVE: Names, basic story events
SIMPLIFY: Everything else without compromise

Text: ${sampleText}

Simplified:`;

    console.log('Prompt preview:', prompt.substring(0, 200) + '...');
    
    try {
      const response = await claudeService.query(prompt, {
        userId: 'test-user',
        maxTokens: 500,
        temperature: temperature,
        responseMode: 'brief'
      });
      
      console.log('\n=== RESULT ===');
      console.log('Simplified text:', response.content);
      
      // Compare
      const origWords = sampleText.toLowerCase().split(/\s+/);
      const simpWords = response.content.toLowerCase().split(/\s+/);
      const commonWords = origWords.filter(w => simpWords.includes(w));
      const similarity = commonWords.length / origWords.length;
      
      console.log('\n=== ANALYSIS ===');
      console.log('Word overlap:', (similarity * 100).toFixed(1) + '%');
      console.log('Text changed:', ((1 - similarity) * 100).toFixed(1) + '%');
      
      if (similarity > 0.9) {
        console.log('⚠️  PROBLEM: Text is nearly identical!');
      } else if (similarity < 0.6) {
        console.log('✅ SUCCESS: Text has been significantly simplified!');
      } else {
        console.log('✓ Text has been moderately simplified.');
      }
      
    } catch (error) {
      console.error('Direct AI test failed:', error);
    }
    
    // Now test via API
    console.log('\n=== TESTING VIA API ===');
    
    // Clear any existing cache for this specific test
    console.log('🗑️  Clearing test chunk cache...');
    await prisma.bookSimplification.deleteMany({
      where: {
        bookId: bookId,
        chunkIndex: testChunk
      }
    });
    
    console.log('✅ Cache cleared for chunk', testChunk);
    
    // Test each CEFR level with detailed logging
    const levels = ['A1', 'A2', 'B1'];
    
    for (const level of levels) {
      console.log(`\n=== TESTING ${level} SIMPLIFICATION ===`);
      
      const apiUrl = `http://localhost:3003/api/books/${bookId}/simplify?level=${level}&chunk=${testChunk}&ai=true`;
      console.log(`🔗 API URL: ${apiUrl}`);
      
      const startTime = Date.now();
      
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'BookBridge-Debug/1.0'
          }
        });
        
        const responseTime = Date.now() - startTime;
        console.log(`⏱️  Response time: ${responseTime}ms`);
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`❌ Error response: ${errorText.substring(0, 200)}...`);
          continue;
        }
        
        const result = await response.json();
        
        console.log(`\n📋 ${level} Response Analysis:`);
        console.log(`  Success: ${result.success}`);
        console.log(`  Source: ${result.source}`);
        console.log(`  Content length: ${result.content?.length || 0} chars`);
        
        if (result.aiMetadata) {
          console.log(`  AI Quality: ${result.aiMetadata.quality}`);
          console.log(`  AI Similarity: ${result.aiMetadata.similarity}`);
          console.log(`  AI Era: ${result.aiMetadata.detectedEra}`);
          console.log(`  Similarity Threshold: ${result.aiMetadata.similarityThreshold}`);
          console.log(`  Passed Similarity Gate: ${result.aiMetadata.passedSimilarityGate}`);
          console.log(`  Retry Attempts: ${result.aiMetadata.retryAttempts}`);
        }
        
        if (result.microHint) {
          console.log(`  Micro Hint: ${result.microHint}`);
        }
        
        // Check if it was cached
        const wasGenerated = result.source !== 'cache';
        if (wasGenerated) {
          console.log(`  📝 Content Preview: "${result.content?.substring(0, 100)}..."`);
          
          // Check if content is actually different from original
          const originalResponse = await fetch(`http://localhost:3003/api/books/${bookId}/simplify?level=original&chunk=${testChunk}`);
          if (originalResponse.ok) {
            const originalResult = await originalResponse.json();
            const isDifferent = result.content !== originalResult.content;
            console.log(`  🔍 Content Different from Original: ${isDifferent}`);
            
            if (!isDifferent && result.source === 'ai_simplified') {
              console.log(`  ⚠️  WARNING: AI claims simplification but content is identical!`);
            }
          }
        }
        
        console.log(`  ✅ ${level} test complete`);
        
      } catch (error) {
        console.log(`  ❌ ${level} failed: ${error.message}`);
      }
      
      // Brief delay between levels
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Check what was actually stored
    console.log('\n=== DATABASE VERIFICATION ===');
    const storedSimplifications = await prisma.bookSimplification.findMany({
      where: {
        bookId: bookId,
        chunkIndex: testChunk
      },
      select: {
        targetLevel: true,
        originalText: true,
        simplifiedText: true,
        qualityScore: true,
        createdAt: true
      }
    });
    
    console.log(`📊 Stored simplifications for chunk ${testChunk}: ${storedSimplifications.length}`);
    
    storedSimplifications.forEach(s => {
      const isDifferent = s.originalText !== s.simplifiedText;
      console.log(`  ${s.targetLevel}: Quality ${s.qualityScore}, Different: ${isDifferent}`);
      
      if (!isDifferent) {
        console.log(`    ⚠️  ${s.targetLevel}: Simplified text is identical to original`);
      } else {
        console.log(`    ✅ ${s.targetLevel}: Text was actually simplified`);
      }
    });
    
    console.log('\n=== DIAGNOSIS ===');
    
    if (storedSimplifications.length === 0) {
      console.log('❌ No simplifications were cached - API might be failing');
    } else {
      const allIdentical = storedSimplifications.every(s => s.originalText === s.simplifiedText);
      
      if (allIdentical) {
        console.log('❌ All simplifications are identical to original text');
        console.log('💡 Issue: AI simplification is not actually changing the content');
        console.log('💡 Possible causes:');
        console.log('   - Authentication not working for AI calls');
        console.log('   - AI similarity gate failing (too conservative)');
        console.log('   - Text already at target CEFR level');
      } else {
        console.log('✅ Some simplifications contain different content');
        console.log('💡 System is working but may need tuning');
      }
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugAISimplification();