console.log('🧪 Testing OpenAI TTS directly...');

async function testOpenAITTS() {
  const testText = "Hello, this is a simple test of text-to-speech generation.";
  
  try {
    console.log(`🎵 Generating TTS for: "${testText}"`);
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: testText,
        voice: 'alloy',
        response_format: 'mp3',
        speed: 1.0
      })
    });
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      return;
    }
    
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ Success! Audio generated: ${audioBuffer.length} bytes`);
    
    // Check if we have the OpenAI API key
    const hasKey = !!process.env.OPENAI_API_KEY;
    console.log(`🔑 OpenAI API Key present: ${hasKey}`);
    if (hasKey) {
      console.log(`🔑 Key prefix: ${process.env.OPENAI_API_KEY.substring(0, 7)}...`);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testOpenAITTS();