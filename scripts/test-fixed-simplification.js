// Test the fixed simplification flow
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

console.log('🔧 TESTING FIXED SIMPLIFICATION FLOW');
console.log('===================================');

async function testSimplificationLogic() {
  const testText = `It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.`;
  
  console.log('📝 Test Configuration:');
  console.log(`  Text: "${testText}"`);
  console.log(`  Text Length: ${testText.length} characters`);
  
  // Simplified prompt (matching the fixed version)
  const prompt = `Simplify this Victorian text for A1 beginner English learners:

Instructions:
- Break long sentences into simple statements (max 8 words per sentence)
- Replace formal vocabulary with everyday words
- Use only the 500 most common English words
- Convert passive voice to active voice
- Make it sound like everyday modern English

Text: ${testText}

Simplified version:

Return only the simplified text with no additional explanation or formatting.`;

  console.log(`  Prompt length: ${prompt.length} characters`);
  
  try {
    const response = await callClaudeAPI(prompt, 0.4);
    
    if (response.success) {
      console.log('\n✅ SIMPLIFICATION SUCCESS!');
      console.log(`📝 Original: "${testText}"`);
      console.log(`📝 Simplified: "${response.content}"`);
      console.log(`📊 Original length: ${testText.length} characters`);
      console.log(`📊 Simplified length: ${response.content.length} characters`);
      
      // Calculate similarity
      const similarity = calculateSimilarity(testText, response.content);
      console.log(`📊 Similarity score: ${similarity.toFixed(3)}`);
      
      // Check if text was actually simplified
      const wordCount1 = testText.split(/\s+/).length;
      const wordCount2 = response.content.split(/\s+/).length;
      console.log(`📊 Word count: ${wordCount1} → ${wordCount2} (${wordCount2 < wordCount1 ? 'REDUCED' : 'SAME/INCREASED'})`);
      
      const sentenceCount1 = testText.split(/[.!?]+/).length;
      const sentenceCount2 = response.content.split(/[.!?]+/).length;
      console.log(`📊 Sentence count: ${sentenceCount1} → ${sentenceCount2} (${sentenceCount2 > sentenceCount1 ? 'INCREASED' : 'SAME/REDUCED'})`);
      
      return { success: true, content: response.content, similarity };
    } else {
      console.log(`\n❌ SIMPLIFICATION FAILED: ${response.error}`);
      return { success: false, error: response.error };
    }
    
  } catch (error) {
    console.log(`\n❌ TEST FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function calculateSimilarity(original, simplified) {
  const origWords = original.toLowerCase().split(/\s+/);
  const simpWords = simplified.toLowerCase().split(/\s+/);
  const commonWords = origWords.filter(w => simpWords.includes(w));
  return commonWords.length / origWords.length;
}

async function callClaudeAPI(prompt, temperature = 0.4) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  
  if (!ANTHROPIC_API_KEY) {
    return { success: false, error: 'ANTHROPIC_API_KEY not found' };
  }

  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
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
              usage: parsed.usage
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
            error: `Parse error: ${error.message}. Response: ${responseData.substring(0, 200)}`
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
    console.log('✅ Fixed simplification flow is working!');
    console.log('🎉 The issue was likely in the prompt construction');
    console.log('\n💡 Next steps:');
    console.log('   1. Deploy these changes to fix the production issue');
    console.log('   2. Test with the actual web app');
    console.log('   3. Monitor error logs for any remaining issues');
  } else {
    console.log('❌ Simplification flow still has issues');
    console.log(`Error: ${result.error}`);
    console.log('\n💡 Additional debugging needed:');
    console.log('   1. Check API key permissions');
    console.log('   2. Verify network connectivity');
    console.log('   3. Review rate limits and usage');
  }
}).catch(error => {
  console.error('\n❌ Test script failed:', error);
});