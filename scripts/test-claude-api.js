// Test script to verify Claude API functionality
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  const env = fs.readFileSync(envFile, 'utf8');
  env.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && key.startsWith('ANTHROPIC_API_KEY')) {
      process.env[key] = value.replace(/"/g, '');
    }
  });
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
  process.exit(1);
}

console.log('✅ Found API key (length:', ANTHROPIC_API_KEY.length, ')');

// Test Claude API directly
function testClaudeAPI() {
  const data = JSON.stringify({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: "Please simplify this text for A1 English learners: 'The magnificent edifice stood majestically against the azure sky, its ornate architecture displaying intricate craftsmanship.'"
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

  console.log('🔄 Testing Claude API...');

  const req = https.request(options, (res) => {
    console.log('📊 Status Code:', res.statusCode);
    console.log('📋 Headers:', res.headers);

    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        
        if (res.statusCode === 200) {
          console.log('✅ Claude API is working!');
          console.log('📝 Response:', parsed.content[0].text);
          console.log('💰 Usage:', parsed.usage);
        } else {
          console.error('❌ Claude API error:', parsed);
        }
      } catch (error) {
        console.error('❌ Failed to parse response:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error);
  });

  req.write(data);
  req.end();
}

// Test the API
testClaudeAPI();