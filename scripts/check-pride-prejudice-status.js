const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  console.log('=== PRIDE & PREJUDICE SIMPLIFICATION STATUS ===');
  
  // Check simplifications for Pride & Prejudice
  const { data: simplifications, error } = await supabase
    .from('book_simplifications')
    .select('*')
    .eq('book_id', 'gutenberg-1342')
    .order('chunk_index', { ascending: true });
  
  if (error) {
    console.log('❌ Error fetching simplifications:', error.message);
    return;
  }
  
  console.log('📊 Total simplifications found:', simplifications?.length || 0);
  
  // Group by CEFR level
  const byLevel = {};
  simplifications?.forEach(s => {
    if (!byLevel[s.cefr_level]) byLevel[s.cefr_level] = [];
    byLevel[s.cefr_level].push(s);
  });
  
  console.log('\n📈 Simplifications by CEFR level:');
  ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].forEach(level => {
    const count = byLevel[level]?.length || 0;
    console.log(`  ${level}: ${count} chunks`);
  });
  
  // Check chunk coverage
  const { data: totalChunks } = await supabase
    .from('book_chunks')
    .select('chunk_index')
    .eq('book_id', 'gutenberg-1342')
    .order('chunk_index', { ascending: true });
  
  console.log(`\n📚 Total book chunks: ${totalChunks?.length || 0}`);
  
  // Check for gaps in simplifications
  if (totalChunks && simplifications) {
    const maxChunk = Math.max(...totalChunks.map(c => c.chunk_index));
    console.log(`📖 Chunk range: 0 to ${maxChunk}`);
    
    // Find missing chunks per level
    console.log('\n🔍 Missing chunks per level:');
    ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].forEach(level => {
      const levelChunks = byLevel[level]?.map(s => s.chunk_index).sort((a,b) => a-b) || [];
      const missing = [];
      for (let i = 0; i <= maxChunk; i++) {
        if (!levelChunks.includes(i)) missing.push(i);
      }
      if (missing.length > 0) {
        const preview = missing.slice(0, 10).join(', ');
        const suffix = missing.length > 10 ? '...' : '';
        console.log(`  ${level}: chunks ${preview}${suffix} (${missing.length} missing)`);
      } else {
        console.log(`  ${level}: ✅ Complete (${levelChunks.length} chunks)`);
      }
    });
    
    // Check quality of simplifications (sample a few)
    console.log('\n🎯 Quality check (first 3 simplifications):');
    const sampleSimplifications = simplifications.slice(0, 3);
    
    for (const simp of sampleSimplifications) {
      const { data: originalChunk } = await supabase
        .from('book_chunks')
        .select('chunk_text')
        .eq('book_id', 'gutenberg-1342')
        .eq('chunk_index', simp.chunk_index)
        .single();
        
      if (originalChunk) {
        console.log(`\n--- Chunk ${simp.chunk_index} (${simp.cefr_level}) ---`);
        console.log('Original (first 100 chars):', originalChunk.chunk_text.substring(0, 100) + '...');
        console.log('Simplified (first 100 chars):', simp.simplified_text.substring(0, 100) + '...');
        console.log('Similarity score:', simp.similarity_score);
        console.log('Same length?:', originalChunk.chunk_text.length === simp.simplified_text.length ? '⚠️  YES (potential issue)' : '✅ NO');
      }
    }
  }
})();