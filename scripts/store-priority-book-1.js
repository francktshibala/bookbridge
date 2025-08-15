const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Era detection function (same as in simplify API)
const detectEra = (text) => {
  const sample = text.slice(0, 1000).toLowerCase();
  
  // Early Modern English (Shakespeare, 1500-1700)
  if (/\b(thou|thee|thy|thine|hath|doth|art)\b/.test(sample) || 
      /-(est|eth)\b/.test(sample) || 
      /\b(wherefore|whence|whither|prithee)\b/.test(sample)) {
    return 'early-modern';
  }
  
  // Victorian/19th century (1800-1900)
  if (/\b(whilst|shall|entailment|chaperone|governess)\b/.test(sample) || 
      /\b(drawing-room|morning-room|upon|herewith)\b/.test(sample)) {
    return 'victorian';
  }
  
  // American 19th century vernacular
  if (/\b(ain't|reckon|y'all|mighty|heap)\b/.test(sample) || 
      /\b(warn't|hain't|'bout|'nough)\b/.test(sample)) {
    return 'american-19c';
  }
  
  return 'modern';
};

// Chunk text into 400-word chunks
const chunkText = (text) => {
  const words = text.split(' ');
  const chunks = [];
  const wordsPerChunk = 400;
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }
  return chunks;
};

async function storePrideAndPrejudice() {
  console.log('=== STORING PRIDE & PREJUDICE (gutenberg-1342) ===');
  
  const bookId = 'gutenberg-1342';
  const bookMetadata = {
    id: bookId,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    publishYear: 1813,
    genre: 'Romance',
    language: 'English',
    publicDomain: true,
    description: { summary: 'A classic novel by Jane Austen about Elizabeth Bennet and Mr. Darcy' }
  };
  
  try {
    // Step 1: Ensure book metadata exists
    console.log('1. Checking/updating book metadata...');
    const { data: existingBook } = await supabase
      .from('books')
      .select('id')
      .eq('id', bookId)
      .single();
    
    if (!existingBook) {
      const { error: bookError } = await supabase
        .from('books')
        .insert([bookMetadata]);
      
      if (bookError) {
        console.error('Error inserting book metadata:', bookError);
        return;
      }
      console.log('✅ Book metadata inserted');
    } else {
      // Update existing with proper metadata
      const { error: updateError } = await supabase
        .from('books')
        .update(bookMetadata)
        .eq('id', bookId);
      
      if (updateError) {
        console.error('Error updating book metadata:', updateError);
        return;
      }
      console.log('✅ Book metadata updated');
    }
    
    // Step 2: Fetch full text from Project Gutenberg
    console.log('2. Fetching full text from Project Gutenberg...');
    const gutenbergUrl = 'https://www.gutenberg.org/files/1342/1342-0.txt';
    const response = await fetch(gutenbergUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Gutenberg: ${response.status}`);
    }
    
    let fullText = await response.text();
    
    // Clean up the text (remove Project Gutenberg headers/footers)
    const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
    const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';
    
    const startIndex = fullText.indexOf(startMarker);
    const endIndex = fullText.indexOf(endMarker);
    
    if (startIndex !== -1 && endIndex !== -1) {
      // Find the end of the start marker line
      const contentStart = fullText.indexOf('\n', startIndex) + 1;
      fullText = fullText.substring(contentStart, endIndex).trim();
    }
    
    console.log(`✅ Fetched text: ${fullText.length} characters`);
    
    // Step 3: Detect era
    const detectedEra = detectEra(fullText);
    console.log(`✅ Detected era: ${detectedEra}`);
    
    // Step 4: Chunk text first to calculate total chunks
    const chunks = chunkText(fullText);
    
    // Step 5: Store in book_content table  
    console.log('3. Storing full content...');
    const contentData = {
      bookId: bookId,
      title: bookMetadata.title,
      author: bookMetadata.author,
      fullText: fullText,
      wordCount: fullText.split(' ').length,
      era: detectedEra,
      totalChunks: chunks.length
    };
    
    const { error: contentError } = await supabase
      .from('book_content')
      .upsert([contentData]);
    
    if (contentError) {
      console.error('Error storing book content:', contentError);
      return;
    }
    console.log('✅ Full content stored');
    
    // Step 5: Chunk and store in book_chunks table
    console.log('4. Chunking and storing chunks...');
    
    // Delete existing chunks first
    await supabase
      .from('book_chunks')
      .delete()
      .eq('bookId', bookId);
    
    // Insert new chunks
    const chunkData = chunks.map((chunk, index) => ({
      bookId: bookId,
      chunkIndex: index,
      content: chunk,
      wordCount: chunk.split(' ').length
    }));
    
    // Insert in batches of 100 to avoid size limits
    const batchSize = 100;
    for (let i = 0; i < chunkData.length; i += batchSize) {
      const batch = chunkData.slice(i, i + batchSize);
      const { error: chunkError } = await supabase
        .from('book_chunks')
        .insert(batch);
      
      if (chunkError) {
        console.error(`Error storing chunk batch ${i}:`, chunkError);
        return;
      }
    }
    
    console.log(`✅ Stored ${chunks.length} chunks`);
    
    // Step 6: Summary
    console.log('\n🎉 PRIDE & PREJUDICE STORAGE COMPLETE');
    console.log(`📚 Book: ${bookMetadata.title} by ${bookMetadata.author}`);
    console.log(`📄 Content: ${fullText.length} characters, ${contentData.word_count} words`);
    console.log(`🔢 Chunks: ${chunks.length} chunks (400 words each)`);
    console.log(`🏛️ Era: ${detectedEra}`);
    console.log(`📋 Year: ${bookMetadata.publishYear}`);
    
  } catch (error) {
    console.error('Error storing Pride & Prejudice:', error);
  }
}

// Run the function
storePrideAndPrejudice();