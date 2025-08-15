const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

// Priority books configuration
const PRIORITY_BOOKS = [
  {
    id: 'gutenberg-11',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    publishYear: 1865,
    genre: 'Fantasy',
    description: JSON.stringify({ summary: "A young girl named Alice falls down a rabbit hole into a fantasy world" }),
    gutenbergNumber: 11
  },
  {
    id: 'gutenberg-84',
    title: 'Frankenstein',
    author: 'Mary Wollstonecraft Shelley',
    publishYear: 1818,
    genre: 'Gothic Horror',
    description: JSON.stringify({ summary: "A scientist creates a monster through an unorthodox scientific experiment" }),
    gutenbergNumber: 84
  },
  {
    id: 'gutenberg-514',
    title: 'Little Women',
    author: 'Louisa May Alcott',
    publishYear: 1868,
    genre: 'Coming-of-age',
    description: JSON.stringify({ summary: "The lives and struggles of four sisters growing up during the American Civil War" }),
    gutenbergNumber: 514
  },
  {
    id: 'gutenberg-1513',
    title: 'Romeo and Juliet',
    author: 'William Shakespeare',
    publishYear: 1597,
    genre: 'Tragedy',
    description: JSON.stringify({ summary: "The tragic love story of two young star-crossed lovers in Verona" }),
    gutenbergNumber: 1513
  }
];

async function storeBook(bookConfig) {
  console.log(`\n=== STORING ${bookConfig.title.toUpperCase()} ===`);
  
  try {
    // Step 1: Update book metadata
    console.log('1. Updating book metadata...');
    const bookMetadata = {
      id: bookConfig.id,
      title: bookConfig.title,
      author: bookConfig.author,
      publishYear: bookConfig.publishYear,
      genre: bookConfig.genre,
      language: 'English',
      publicDomain: true,
      description: typeof bookConfig.description === 'string' ? bookConfig.description : JSON.stringify(bookConfig.description)
    };

    await prisma.book.upsert({
      where: { id: bookConfig.id },
      update: bookMetadata,
      create: bookMetadata
    });
    console.log('✅ Book metadata updated');

    // Step 2: Fetch full text from Project Gutenberg
    console.log('2. Fetching full text from Project Gutenberg...');
    const gutenbergUrl = `https://www.gutenberg.org/files/${bookConfig.gutenbergNumber}/${bookConfig.gutenbergNumber}-0.txt`;
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
      const contentStart = fullText.indexOf('\n', startIndex) + 1;
      fullText = fullText.substring(contentStart, endIndex).trim();
    }
    
    // Clean up line endings and formatting
    fullText = fullText
      .replace(/\r\n/g, '\n')  // Convert Windows line endings
      .replace(/\r/g, '\n')    // Convert Mac line endings
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // Reduce multiple blank lines
      .replace(/\[Illustration[^\]]*\]/g, '')  // Remove illustration markers
      .trim();
    
    // Find the actual start of the content
    if (bookConfig.id === 'gutenberg-11') {
      // Alice starts with "Alice was beginning to get very tired"
      const contentStart = fullText.search(/Alice was beginning to get very tired/);
      if (contentStart !== -1) {
        fullText = fullText.substring(contentStart).trim();
      }
    } else if (bookConfig.id === 'gutenberg-84') {
      // Frankenstein often starts with "Letter 1" or "To Mrs. Saville, England"
      const contentStart = fullText.search(/Letter 1|To Mrs\. Saville|St\. Petersburgh/);
      if (contentStart !== -1) {
        fullText = fullText.substring(contentStart).trim();
      }
    } else if (bookConfig.id === 'gutenberg-514') {
      // Little Women starts with "Christmas won't be Christmas"
      const contentStart = fullText.search(/Christmas won't be Christmas/);
      if (contentStart !== -1) {
        fullText = fullText.substring(contentStart).trim();
      }
    } else if (bookConfig.id === 'gutenberg-1513') {
      // Romeo and Juliet starts with character list or "PROLOGUE"
      const contentStart = fullText.search(/PROLOGUE|Dramatis Personae|Two households/);
      if (contentStart !== -1) {
        fullText = fullText.substring(contentStart).trim();
      }
    }
    
    console.log(`✅ Fetched text: ${fullText.length} characters`);
    
    // Step 3: Detect era
    const detectedEra = detectEra(fullText);
    console.log(`✅ Detected era: ${detectedEra}`);
    
    // Step 4: Chunk text
    const chunks = chunkText(fullText);
    console.log(`✅ Created ${chunks.length} chunks`);
    
    // Step 5: Store in book_content table
    console.log('3. Storing full content...');
    
    await prisma.bookContent.upsert({
      where: { bookId: bookConfig.id },
      update: {
        title: bookConfig.title,
        author: bookConfig.author,
        fullText: fullText,
        wordCount: fullText.split(' ').length,
        era: detectedEra,
        totalChunks: chunks.length
      },
      create: {
        bookId: bookConfig.id,
        title: bookConfig.title,
        author: bookConfig.author,
        fullText: fullText,
        wordCount: fullText.split(' ').length,
        era: detectedEra,
        totalChunks: chunks.length
      }
    });
    console.log('✅ Full content stored');
    
    // Step 6: Store chunks
    console.log('4. Storing chunks...');
    
    // Delete existing chunks
    await prisma.bookChunk.deleteMany({
      where: { 
        bookId: bookConfig.id,
        cefrLevel: 'original'
      }
    });
    
    // Insert new chunks in batches
    const batchSize = 100;
    let totalInserted = 0;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const chunkData = batch.map((chunk, index) => ({
        bookId: bookConfig.id,
        cefrLevel: 'original',
        chunkIndex: i + index,
        chunkText: chunk,
        wordCount: chunk.split(' ').length,
        isSimplified: false
      }));
      
      await prisma.bookChunk.createMany({
        data: chunkData
      });
      
      totalInserted += chunkData.length;
      console.log(`  Inserted batch ${Math.floor(i/batchSize) + 1}: ${chunkData.length} chunks`);
    }
    
    console.log(`✅ Stored ${totalInserted} chunks total`);
    
    // Step 7: Verify storage
    const storedContent = await prisma.bookContent.findUnique({
      where: { bookId: bookConfig.id },
      include: {
        _count: {
          select: { chunks: true }
        }
      }
    });
    
    console.log(`\n🎉 STORAGE COMPLETE - ${bookConfig.title.toUpperCase()}`);
    console.log(`📚 Book: ${storedContent.title} by ${storedContent.author}`);
    console.log(`📄 Content: ${storedContent.fullText.length} characters, ${storedContent.wordCount} words`);
    console.log(`🔢 Chunks: ${storedContent._count.chunks} stored (expected: ${storedContent.totalChunks})`);
    console.log(`🏛️ Era: ${storedContent.era}`);
    console.log(`📋 Book ID: ${storedContent.bookId}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error storing ${bookConfig.title}:`, error.message);
    return false;
  }
}

async function storeAllRemainingBooks() {
  console.log('=== STORING ALL REMAINING PRIORITY BOOKS ===');
  console.log(`📚 Books to store: ${PRIORITY_BOOKS.length}`);
  
  let successCount = 0;
  const results = [];
  
  for (const book of PRIORITY_BOOKS) {
    const success = await storeBook(book);
    results.push({ book: book.title, success });
    if (success) successCount++;
    
    // Small delay between books to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== BATCH STORAGE COMPLETE ===');
  console.log(`✅ Successfully stored: ${successCount}/${PRIORITY_BOOKS.length} books`);
  
  console.log('\n📊 Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${result.book}`);
  });
  
  if (successCount === PRIORITY_BOOKS.length) {
    console.log('\n🎉 ALL PRIORITY BOOKS STORED SUCCESSFULLY!');
    console.log('📋 Ready for Phase 2: Generate 30 precomputed simplifications');
    console.log('📋 Total: 5 books × 6 CEFR levels = 30 simplification versions');
  } else {
    console.log(`\n⚠️  ${PRIORITY_BOOKS.length - successCount} books failed to store`);
  }
  
  await prisma.$disconnect();
}

// Run the batch storage
storeAllRemainingBooks();