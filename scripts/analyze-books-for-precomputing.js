const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeBooks() {
  console.log('📚 ANALYZING BOOK COLLECTION FOR PRECOMPUTING...');
  
  const { data: books } = await supabase
    .from('books')
    .select('id, title, author, genre')
    .order('title')
    .limit(50);
  
  console.log('\n🎯 TOP PRECOMPUTING CANDIDATES:');
  
  console.log('\nSHAKESPEARE (Archaic - High Priority):');
  books?.filter(b => b.author && b.author.includes('Shakespeare')).forEach(b => 
    console.log(`  - ${b.id}: ${b.title}`));
  
  console.log('\nVICTORIAN AUTHORS (Archaic - High Priority):');  
  books?.filter(b => b.author && (b.author.includes('Austen') || b.author.includes('Dickens') || b.author.includes('Brontë'))).forEach(b => 
    console.log(`  - ${b.id}: ${b.title} by ${b.author}`));
    
  console.log('\n19TH CENTURY AMERICAN (Archaic - High Priority):');
  books?.filter(b => b.author && (b.author.includes('Twain') || b.author.includes('Hawthorne'))).forEach(b => 
    console.log(`  - ${b.id}: ${b.title} by ${b.author}`));
    
  console.log('\nOTHER CLASSICS (Medium Priority):');
  const processed = new Set();
  books?.filter(b => {
    if (!b.author) return false;
    const isArchaic = b.author.includes('Shakespeare') || b.author.includes('Austen') || 
                     b.author.includes('Dickens') || b.author.includes('Brontë') || 
                     b.author.includes('Twain') || b.author.includes('Hawthorne');
    return !isArchaic;
  }).slice(0, 10).forEach(b => 
    console.log(`  - ${b.id}: ${b.title} by ${b.author}`));

  console.log('\n📊 RECOMMENDATION: Start with top 15-20 archaic books first (Shakespeare + Victorian + 19th American)');
  console.log('These benefit most from our archaic text bypass feature.');
}

analyzeBooks().catch(console.error);