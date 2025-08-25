// Verify all audio chunks were generated successfully
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const EXPECTED_CHUNKS = 172; // Per level

async function verifyAudioFiles() {
  console.log('🔍 Verifying gutenberg-84 audio completion...\n');
  
  const missing = [];
  let totalExpected = 0;
  let totalFound = 0;
  
  for (const level of CEFR_LEVELS) {
    console.log(`📋 Checking ${level} level...`);
    
    const levelMissing = [];
    for (let i = 0; i < EXPECTED_CHUNKS; i++) {
      totalExpected++;
      const fileName = `gutenberg-84/${level.toLowerCase()}/chunk_${i}.mp3`;
      
      const { data, error } = await supabase.storage
        .from('audio-files')
        .list(`gutenberg-84/${level.toLowerCase()}`, {
          search: `chunk_${i}.mp3`
        });
      
      if (!data || data.length === 0) {
        levelMissing.push(i);
        missing.push(`${level}/chunk_${i}`);
      } else {
        totalFound++;
      }
    }
    
    if (levelMissing.length === 0) {
      console.log(`   ✅ Complete - All ${EXPECTED_CHUNKS} chunks found`);
    } else {
      console.log(`   ❌ Missing ${levelMissing.length} chunks: ${levelMissing.slice(0,5).join(', ')}${levelMissing.length > 5 ? '...' : ''}`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Expected: ${totalExpected} chunks`);
  console.log(`   Found: ${totalFound} chunks`);
  console.log(`   Missing: ${missing.length} chunks`);
  console.log(`   Success Rate: ${(totalFound/totalExpected*100).toFixed(1)}%`);
  
  if (missing.length > 0) {
    console.log(`\n🔧 To retry missing chunks:`);
    console.log(`   Run: node scripts/retry-missing-audio.js`);
    console.log(`   Or manually check these chunks: ${missing.slice(0,10).join(', ')}`);
  } else {
    console.log(`\n🎉 ALL AUDIO FILES GENERATED SUCCESSFULLY!`);
  }
}

verifyAudioFiles().catch(console.error);