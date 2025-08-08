import { ElevenLabsWebSocketService } from '../lib/elevenlabs-websocket';

// Test texts of different lengths
const testTexts = [
  {
    name: "SHORT",
    text: "Hello world! This is a test.",
    expectedWords: 6
  },
  {
    name: "MEDIUM", 
    text: "This is a medium length text to test ElevenLabs WebSocket behavior with more words and sentences.",
    expectedWords: 16
  },
  {
    name: "LONG",
    text: "Hello world! This is a test of ElevenLabs WebSocket text-to-speech with perfect synchronization. The highlighting should work smoothly across all words.",
    expectedWords: 21
  }
];

async function testElevenLabsPatterns() {
  console.log('🔬 ELEVENLABS PATTERN ANALYSIS');
  console.log('=' .repeat(50));

  for (const testCase of testTexts) {
    console.log(`\n📝 Testing ${testCase.name} TEXT:`);
    console.log(`Text: "${testCase.text}"`);
    console.log(`Length: ${testCase.text.length} chars, ${testCase.expectedWords} words`);
    
    // Track events for this test
    let characterEvents: any[] = [];
    
    const websocket = new ElevenLabsWebSocketService();
    
    try {
      await websocket.streamTTS({
        text: testCase.text,
        voiceId: 'pNInz6obpgDQGcFmaJgB',
        onCharacterTiming: (timing) => {
          characterEvents.push({
            char: timing.character,
            startTime: timing.startTime,
            duration: timing.duration,
            eventIndex: characterEvents.length
          });
          
          console.log(`  [${characterEvents.length}] "${timing.character}" at ${timing.startTime.toFixed(3)}s`);
        },
        onAudioStart: () => {
          console.log(`🎵 Audio started for ${testCase.name}`);
        },
        onComplete: () => {
          console.log(`✅ ${testCase.name} completed`);
          
          // Analysis
          console.log(`\n📊 ${testCase.name} ANALYSIS:`);
          console.log(`  Character events: ${characterEvents.length}`);
          console.log(`  Expected chars: ${testCase.text.length}`);
          console.log(`  Event ratio: ${(characterEvents.length / testCase.text.length * 100).toFixed(1)}%`);
          
          if (characterEvents.length > 0) {
            console.log(`  First event: "${characterEvents[0].char}" at ${characterEvents[0].startTime}s`);
            console.log(`  Last event: "${characterEvents[characterEvents.length-1].char}" at ${characterEvents[characterEvents.length-1].startTime}s`);
            
            // Check for overflow
            const overflowEvents = characterEvents.filter((_, i) => i >= testCase.text.length);
            if (overflowEvents.length > 0) {
              console.log(`  ⚠️  OVERFLOW: ${overflowEvents.length} extra events beyond text length`);
              console.log(`  Overflow chars: ${overflowEvents.map(e => e.char).join('')}`);
            }
            
            // Word boundary analysis
            const wordBoundaries = characterEvents.filter(e => 
              e.char === ' ' || /[.!?]/.test(e.char)
            );
            console.log(`  Word boundaries: ${wordBoundaries.length} events`);
            console.log(`  Expected boundaries: ~${testCase.expectedWords - 1}`);
          }
          
          console.log('-'.repeat(40));
        },
        onError: (error) => {
          console.error(`❌ ${testCase.name} error:`, error);
        }
      });
      
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error(`❌ Error testing ${testCase.name}:`, error);
    }
  }
  
  console.log('\n🎯 PATTERN ANALYSIS COMPLETE');
  console.log('Check above for differences in event patterns between text lengths');
}

// Run the analysis
testElevenLabsPatterns().catch(console.error);