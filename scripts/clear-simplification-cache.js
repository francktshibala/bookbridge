const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearCache() {
  console.log('🧹 CLEARING ALL SIMPLIFICATION CACHE...');
  
  // Check for different possible table names
  const tables = ['book_simplifications', 'bookSimplification', 'bookSimplifications'];
  let foundTable = null;
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log('✅ Found table: ' + table + ' with ' + count + ' entries');
        foundTable = table;
        
        // Delete all entries
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .neq('id', 'impossible-id'); // Delete all records
        
        if (deleteError) {
          console.log('❌ Error clearing cache:', deleteError.message);
        } else {
          console.log('✅ Cleared all ' + count + ' cache entries from ' + table);
          console.log('🚀 Fresh start - no more poisoned cache!');
        }
        break;
      }
    } catch (e) {
      console.log('❌ Table ' + table + ': ' + e.message);
    }
  }
  
  if (!foundTable) {
    console.log('❌ No simplification cache table found');
  }
}

clearCache().catch(console.error);