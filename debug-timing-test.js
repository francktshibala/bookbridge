// Quick timing test to verify highlighting vs audio sync issues
// Run this in browser console while audio is playing

console.log('🧪 TIMING TEST STARTED');
console.log('📋 Instructions:');
console.log('1. Start audio playback in the app');
console.log('2. Watch console for timing comparisons');
console.log('3. Listen to audio and note if highlighting is ahead/behind');

// Monitor audio element timing
function testAudioTiming() {
  const audio = document.querySelector('audio');
  if (!audio) {
    console.log('❌ No audio element found');
    return;
  }

  console.log('🎵 Found audio element:', audio);
  console.log('📊 Current time:', audio.currentTime);
  console.log('📊 Duration:', audio.duration);
  console.log('📊 Paused:', audio.paused);
  
  // Test timing accuracy over 5 seconds
  let startTime = performance.now();
  let startAudioTime = audio.currentTime;
  
  setTimeout(() => {
    let elapsed = (performance.now() - startTime) / 1000;
    let audioElapsed = audio.currentTime - startAudioTime;
    let drift = Math.abs(elapsed - audioElapsed);
    
    console.log('⏱️ TIMING TEST RESULTS:');
    console.log(`Wall clock elapsed: ${elapsed.toFixed(3)}s`);
    console.log(`Audio time elapsed: ${audioElapsed.toFixed(3)}s`);
    console.log(`Timing drift: ${(drift * 1000).toFixed(1)}ms`);
    console.log(drift < 0.05 ? '✅ Timing accurate' : '⚠️ Timing drift detected');
  }, 5000);
}

// Run test
testAudioTiming();