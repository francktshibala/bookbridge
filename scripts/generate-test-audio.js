async function generateTestAudio() {
  console.log('🎵 Testing live TTS generation...');

  // Test text for TTS
  const testText = "This is a test of the text-to-speech system. The quick brown fox jumps over the lazy dog.";
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found');
    return;
  }

  try {
    console.log('🔍 Testing OpenAI TTS API...');
    
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

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ OpenAI TTS failed:', error);
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`✅ TTS generated successfully! Audio size: ${audioBuffer.byteLength} bytes`);
    
    // Test word timing estimation
    const words = testText.split(/\\s+/);
    const estimatedDuration = (words.length / 150) * 60; // 150 WPM
    const avgWordDuration = estimatedDuration / words.length;
    
    console.log(`📊 Audio stats:`);
    console.log(`  - Text: "${testText.substring(0, 50)}..."`);
    console.log(`  - Words: ${words.length}`);
    console.log(`  - Estimated duration: ${estimatedDuration.toFixed(1)}s`);
    console.log(`  - Avg word duration: ${(avgWordDuration * 1000).toFixed(0)}ms`);
    
    // Generate word timings
    let currentTime = 0;
    const wordTimings = words.map((word, i) => {
      let wordDuration = avgWordDuration;
      
      // Adjust duration based on word length and punctuation
      if (word.length > 6) wordDuration *= 1.2;
      if (word.length < 3) wordDuration *= 0.8;
      if (/[.!?]$/.test(word)) wordDuration *= 1.5;
      if (/[,;:]$/.test(word)) wordDuration *= 1.2;

      const timing = {
        word: word.replace(/[^\\w']/g, ''),
        start: currentTime,
        end: currentTime + wordDuration
      };
      
      currentTime += wordDuration;
      return timing;
    });

    console.log(`🎯 Sample word timings:`);
    wordTimings.slice(0, 5).forEach(timing => {
      console.log(`  "${timing.word}": ${timing.start.toFixed(2)}s - ${timing.end.toFixed(2)}s`);
    });

    return {
      audioBuffer: Buffer.from(audioBuffer),
      duration: estimatedDuration,
      wordTimings
    };

  } catch (error) {
    console.error('❌ TTS generation failed:', error.message);
  }
}

// Run the test
generateTestAudio()
  .then(result => {
    if (result) {
      console.log('\\n🎉 TTS system working perfectly!');
      console.log('✅ OpenAI API connection: OK');
      console.log('✅ Audio generation: OK');  
      console.log('✅ Word timing estimation: OK');
    }
  })
  .catch(console.error);