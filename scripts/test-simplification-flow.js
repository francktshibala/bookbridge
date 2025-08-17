// Test the complete simplification flow with better error tracking
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  const env = fs.readFileSync(envFile, 'utf8');
  env.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key] = value.replace(/"/g, '');
    }
  });
}

console.log('🔍 TESTING COMPLETE SIMPLIFICATION FLOW');
console.log('======================================');

// Test the Claude service directly with the same logic as the simplification route
async function testSimplificationLogic() {
  const testText = `It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.`;
  
  const cefrLevel = 'A1';
  const era = 'victorian'; // Pride & Prejudice
  
  console.log('📝 Test Configuration:');
  console.log(`  Text: "${testText.substring(0, 100)}..."`);
  console.log(`  CEFR Level: ${cefrLevel}`);
  console.log(`  Era: ${era}`);
  console.log(`  Text Length: ${testText.length} characters`);
  
  // Dynamic temperature by era, CEFR level and retry attempt (from route.ts)
  const getTemperature = (level, era, attempt) => {
    const temperatureMatrix = {
      'early-modern': {
        A1: [0.50, 0.45, 0.40],
        A2: [0.45, 0.40, 0.35],
        B1: [0.40, 0.35, 0.30],
        B2: [0.35, 0.30, 0.25],
        C1: [0.30, 0.25, 0.20],
        C2: [0.25, 0.20, 0.15]
      },
      'victorian': {
        A1: [0.45, 0.40, 0.35],
        A2: [0.40, 0.35, 0.30],
        B1: [0.35, 0.30, 0.25],
        B2: [0.30, 0.25, 0.20],
        C1: [0.25, 0.20, 0.15],
        C2: [0.20, 0.15, 0.10]
      },
      'american-19c': {
        A1: [0.40, 0.35, 0.30],
        A2: [0.35, 0.30, 0.25],
        B1: [0.30, 0.25, 0.20],
        B2: [0.25, 0.20, 0.15],
        C1: [0.20, 0.15, 0.10],
        C2: [0.15, 0.10, 0.05]
      },
      'modern': {
        A1: [0.35, 0.30, 0.25],
        A2: [0.30, 0.25, 0.20],
        B1: [0.25, 0.20, 0.15],
        B2: [0.20, 0.15, 0.10],
        C1: [0.15, 0.10, 0.05],
        C2: [0.10, 0.05, 0.02]
      }
    };
    
    const eraMatrix = temperatureMatrix[era] || temperatureMatrix['modern'];
    const temps = eraMatrix[level];
    return temps[Math.min(attempt, temps.length - 1)];
  };

  // Simplification prompt (from route.ts)
  const getSimplificationPrompt = (level, era) => {
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

Text: ${testText}

Simplified:`;

    return prompt;
  };

  // Calculate semantic similarity (from route.ts)
  const calculateSemanticSimilarity = (original, simplified) => {
    const originalWords = original.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const simplifiedWords = simplified.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const importantWords = originalWords.filter(w => w.length > 4);
    const preservedImportant = importantWords.filter(w => 
      simplifiedWords.some(sw => sw.includes(w) || w.includes(sw))
    );
    const conceptPreservation = preservedImportant.length / Math.max(importantWords.length, 1);
    
    const lengthRatio = Math.min(simplified.length, original.length) / Math.max(simplified.length, original.length);
    
    const commonWords = originalWords.filter(w => simplifiedWords.includes(w));
    const wordOverlap = commonWords.length / Math.max(originalWords.length, 1);
    
    const originalSentences = original.split(/[.!?]+/).length;
    const simplifiedSentences = simplified.split(/[.!?]+/).length;
    const structuralRatio = Math.min(originalSentences, simplifiedSentences) / Math.max(originalSentences, simplifiedSentences);
    
    const similarity = (
      conceptPreservation * 0.4 +
      wordOverlap * 0.25 +
      lengthRatio * 0.20 +
      structuralRatio * 0.15
    );
    
    return Math.min(1.0, Math.max(0.0, similarity));
  };

  // Test with different retry attempts
  const MAX_RETRIES = 2;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\n🔄 Attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
    
    const temperature = getTemperature(cefrLevel, era, attempt);
    const prompt = getSimplificationPrompt(cefrLevel, era);
    
    console.log(`  Temperature: ${temperature}`);
    console.log(`  Prompt length: ${prompt.length} characters`);
    
    try {
      // Call Claude API directly
      const response = await callClaudeAPI(prompt, temperature);
      
      if (response.success) {
        const simplifiedText = response.content.trim();
        console.log(`  ✅ Claude API Success`);
        console.log(`  Response length: ${simplifiedText.length} characters`);
        console.log(`  Model used: ${response.model || 'claude-3-5-haiku-20241022'}`);
        
        // Calculate similarity
        const similarity = calculateSemanticSimilarity(testText, simplifiedText);
        console.log(`  Similarity score: ${similarity.toFixed(3)}`);
        
        // Era and CEFR level-specific similarity thresholds (from route.ts)
        const BASE_THRESHOLDS = {
          'early-modern': 0.65,
          'victorian': 0.70,
          'american-19c': 0.75,
          'modern': 0.82
        };
        
        const baseThreshold = BASE_THRESHOLDS[era] || 0.82;
        let threshold = baseThreshold;
        
        const isArchaic = era === 'early-modern' || era === 'victorian' || era === 'american-19c';
        if (isArchaic) {
          if (cefrLevel === 'A1') {
            threshold = baseThreshold * 0.75;
          } else if (cefrLevel === 'A2') {
            threshold = baseThreshold * 0.80;
          } else if (cefrLevel === 'B1') {
            threshold = baseThreshold * 0.85;
          }
        }
        
        console.log(`  Similarity threshold: ${threshold.toFixed(3)} (base: ${baseThreshold}, archaic: ${isArchaic})`);
        
        // Check similarity gate
        if (isArchaic) {
          console.log(`  ✅ Archaic text - bypassing similarity gate`);
          console.log(`  Quality: modernized`);
          
          console.log('\n📝 Content Comparison:');
          console.log(`Original  : "${testText.substring(0, 150)}..."`);
          console.log(`Simplified: "${simplifiedText.substring(0, 150)}..."`);
          
          return {
            success: true,
            quality: 'modernized',
            similarity: similarity,
            content: simplifiedText
          };
        } else if (similarity >= threshold) {
          const quality = similarity >= 0.95 ? 'excellent' : 
                         similarity >= 0.90 ? 'good' : 'acceptable';
          console.log(`  ✅ Passed similarity gate`);
          console.log(`  Quality: ${quality}`);
          
          return {
            success: true,
            quality: quality,
            similarity: similarity,
            content: simplifiedText
          };
        } else {
          console.log(`  ⚠️  Failed similarity gate: ${similarity.toFixed(3)} < ${threshold.toFixed(3)}`);
          
          if (attempt === MAX_RETRIES) {
            console.log(`  ❌ All attempts failed - returning best result`);
            return {
              success: false,
              quality: 'failed',
              similarity: similarity,
              content: simplifiedText
            };
          } else {
            console.log(`  🔄 Will retry with higher temperature...`);
          }
        }
        
      } else {
        console.log(`  ❌ Claude API failed: ${response.error}`);
        
        if (attempt === MAX_RETRIES) {
          return {
            success: false,
            error: response.error,
            quality: 'failed'
          };
        }
      }
      
    } catch (error) {
      console.log(`  ❌ Attempt failed: ${error.message}`);
      
      if (attempt === MAX_RETRIES) {
        return {
          success: false,
          error: error.message,
          quality: 'failed'
        };
      }
    }
  }
}

// Helper to call Claude API
async function callClaudeAPI(prompt, temperature = 0.4) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  
  if (!ANTHROPIC_API_KEY) {
    return { success: false, error: 'ANTHROPIC_API_KEY not found' };
  }

  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1500,
      temperature: temperature,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          
          if (res.statusCode === 200) {
            resolve({
              success: true,
              content: parsed.content[0].text,
              usage: parsed.usage,
              model: parsed.model
            });
          } else {
            resolve({
              success: false,
              error: `HTTP ${res.statusCode}: ${parsed.error?.message || 'Unknown error'}`
            });
          }
        } catch (error) {
          resolve({
            success: false,
            error: `Parse error: ${responseData.substring(0, 200)}`
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: `Request error: ${error.message}`
      });
    });

    req.write(data);
    req.end();
  });
}

// Run the test
testSimplificationLogic().then(result => {
  console.log('\n🏁 FINAL RESULT:');
  console.log('================');
  
  if (result.success) {
    console.log('✅ Simplification flow working correctly!');
    console.log(`Quality: ${result.quality}`);
    console.log(`Similarity: ${result.similarity?.toFixed(3) || 'N/A'}`);
  } else {
    console.log('❌ Simplification flow failed');
    console.log(`Error: ${result.error || 'Unknown error'}`);
    console.log(`Quality: ${result.quality || 'unknown'}`);
  }
  
  console.log('\n💡 Recommendations:');
  if (result.success) {
    console.log('   - The Claude API and simplification logic are working');
    console.log('   - If you\'re seeing failures in the app, check:');
    console.log('     1. User authentication (userId parameter)');
    console.log('     2. Server-side environment variables');
    console.log('     3. Database connection and caching');
  } else {
    console.log('   - Claude API or simplification logic has issues');
    console.log('   - Check API key validity and rate limits');
    console.log('   - Review error messages above for specific issues');
  }
}).catch(error => {
  console.error('\n❌ Test script failed:', error);
});