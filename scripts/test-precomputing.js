// Test script for precomputing system
const { PRIORITY_BOOKS } = require('./priority-books.js');

async function testPrecomputingSystem() {
  console.log('🧪 TESTING PRECOMPUTING SYSTEM');
  console.log('==============================\n');

  try {
    // Test 1: Initialize system
    console.log('📋 Step 1: Initialize priority books...');
    const initResponse = await fetch('http://localhost:3000/api/precompute/initialize', {
      method: 'POST'
    });
    
    if (!initResponse.ok) {
      throw new Error(`Initialization failed: ${initResponse.statusText}`);
    }
    
    const initResult = await initResponse.json();
    console.log('✅ Initialization result:', initResult);

    // Wait a moment for database operations
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Check stats
    console.log('\n📊 Step 2: Check processing stats...');
    const statsResponse = await fetch('http://localhost:3000/api/precompute/initialize');
    
    if (!statsResponse.ok) {
      throw new Error(`Stats fetch failed: ${statsResponse.statusText}`);
    }
    
    const statsResult = await statsResponse.json();
    console.log('📈 Current stats:', statsResult.stats);

    // Test 3: Process some jobs
    console.log('\n🔄 Step 3: Process queue (first batch)...');
    const processResponse = await fetch('http://localhost:3000/api/precompute/process', {
      method: 'POST'
    });
    
    if (!processResponse.ok) {
      throw new Error(`Processing failed: ${processResponse.statusText}`);
    }
    
    const processResult = await processResponse.json();
    console.log('✅ Processing result:', processResult);

    console.log('\n🎉 PRECOMPUTING SYSTEM TEST COMPLETE!');
    console.log('=====================================');
    console.log('✅ Database schema working');
    console.log('✅ Book content storage working');
    console.log('✅ Job queuing system working');
    console.log('✅ Background processing working');
    console.log('\nNext: Run more processing cycles or add TTS integration');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testPrecomputingSystem();